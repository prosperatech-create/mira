import 'server-only';
import type { AppCtx } from './context';
import { questionAuditSchema as inputSchema } from './schemas';
import { auditQuestionHeuristic, PROTECTED_LABELS, type QuestionLabel } from '@/domain/question-auditor';
import { auditSession as auditSessionDomain } from '@/domain/session-audit';
import { runJson } from '@/ai/service';
import { questionAuditPrompt, questionAuditSchema, sessionAuditPrompt, sessionAuditSchema } from '@/ai/prompts';
import { getSession, listSteps } from '@/data/repositories/sessions';
import {
  insertAuditResult,
  insertQuestionAudit,
  listHypotheses,
  listQuestionAudits,
  listSessionInterventions,
} from '@/data/repositories/records';
import { notFound, validation } from '@/lib/errors';

export interface QuestionAuditView {
  question: string;
  labels: QuestionLabel[];
  explanation: string;
  suggestion: string | null;
  source: 'heuristica' | 'ia+heuristica';
  aiNote?: string;
}

/** Auditor de perguntas: heurística determinística + IA (que não remove rótulos protegidos). */
export async function auditQuestion(ctx: AppCtx, raw: unknown): Promise<QuestionAuditView> {
  const input = inputSchema.parse(raw);
  let objective: string | null = null;
  if (input.sessionId) objective = (await getSession(ctx.db, input.sessionId))?.objective ?? null;

  const h = auditQuestionHeuristic(input.question, objective);
  const ai = await runJson(
    { db: ctx.db, userId: ctx.user.id, sessionId: input.sessionId, task: 'auditor_pergunta', messages: [{ role: 'user', content: questionAuditPrompt(input.question, objective, h.labels) }], maxTokens: 600, temperature: 0.1 },
    questionAuditSchema,
  );

  let view: QuestionAuditView;
  if (ai.ok) {
    const merged = new Set<QuestionLabel>(ai.value.labels);
    h.labels.filter((l) => PROTECTED_LABELS.includes(l)).forEach((l) => merged.add(l));
    if (merged.size > 1) merged.delete('BOA');
    view = {
      question: input.question,
      labels: [...merged],
      explanation: ai.value.explanation,
      suggestion: merged.has('BOA') ? null : ai.value.suggestion ?? h.suggestion,
      source: 'ia+heuristica',
    };
  } else {
    view = {
      question: input.question,
      labels: h.labels,
      explanation: h.reasons.join(' '),
      suggestion: h.suggestion,
      source: 'heuristica',
      aiNote: ai.reason === 'indisponivel' ? undefined : ai.message,
    };
  }
  await insertQuestionAudit(ctx.db, {
    owner_id: ctx.user.id,
    session_id: input.sessionId ?? null,
    question: view.question,
    labels: view.labels,
    suggestion: view.suggestion,
    explanation: view.explanation,
    source: view.source,
  });
  return view;
}

export async function recentQuestionAudits(ctx: AppCtx) {
  return listQuestionAudits(ctx.db, { limit: 10 });
}

/** Auditoria da sessão: métricas determinísticas + redação pela IA (achados do sistema são preservados). */
export async function auditSession(ctx: AppCtx, sessionId: string) {
  const s = await getSession(ctx.db, sessionId);
  if (!s) throw notFound('Sessão');
  if (s.phase !== 'registro' && s.phase !== 'encerrada') throw validation('A auditoria é feita ao final da sessão.');
  const [stepRows, hyps, ivs, qa] = await Promise.all([
    listSteps(ctx.db, s.id),
    listHypotheses(ctx.db, [s.id]),
    listSessionInterventions(ctx.db, [s.id]),
    listQuestionAudits(ctx.db, { sessionId: s.id, limit: 50 }),
  ]);
  const steps = stepRows.map((r) => ({
    seq: r.seq, nodeKey: r.node_key, stage: r.stage, questionText: r.question_text, answerValue: r.answer_value,
    answerLabel: r.answer_label, answerText: r.answer_text, contextAfter: r.context_after ?? {}, undone: r.undone,
  }));
  const findings = auditSessionDomain({
    steps,
    hypotheses: hyps.length,
    interventions: ivs.length,
    precisionWarnings: ivs.filter((i) => i.precision_warning).length,
    flaggedQuestions: qa.filter((q) => !q.labels.includes('BOA')).map((q) => ({ question: q.question, labels: q.labels, suggestion: q.suggestion })),
    startedAt: s.started_at,
    endedAt: s.ended_at,
    neutralityIndex: s.neutrality_index,
    objective: s.objective,
  });

  const ai = await runJson(
    {
      db: ctx.db, userId: ctx.user.id, sessionId: s.id, task: 'auditoria_sessao', maxTokens: 1500, temperature: 0.2,
      messages: [{
        role: 'user',
        content: sessionAuditPrompt({
          objective: s.objective,
          metrics: findings.metrics,
          findings: { attentionPoints: findings.attentionPoints, contradictions: findings.contradictions },
          steps: steps.filter((x) => !x.undone).map((x) => ({ q: x.questionText, a: x.answerText ? `${x.answerLabel} (${x.answerText.slice(0, 120)})` : x.answerLabel })),
        }),
      }],
    },
    sessionAuditSchema,
  );

  const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
  const result = ai.ok
    ? {
        positives: ai.value.positives.length ? ai.value.positives : findings.positives,
        attentionPoints: union(findings.attentionPoints, ai.value.attentionPoints),
        reformulations: [...findings.reformulations, ...ai.value.reformulations],
        contradictions: union(findings.contradictions, ai.value.contradictions),
        nextSessionSuggestions: ai.value.nextSessionSuggestions.length ? ai.value.nextSessionSuggestions : findings.nextSessionSuggestions,
        source: 'ia+heuristica' as const,
      }
    : { ...findings, source: 'heuristica' as const };

  await insertAuditResult(ctx.db, {
    owner_id: ctx.user.id,
    session_id: s.id,
    metrics: findings.metrics as unknown as Record<string, unknown>,
    positives: result.positives,
    attention_points: result.attentionPoints,
    reformulations: result.reformulations,
    contradictions: result.contradictions,
    next_session_suggestions: result.nextSessionSuggestions,
    source: result.source,
  });
  return { ...result, metrics: findings.metrics };
}
