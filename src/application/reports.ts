import 'server-only';
import type { AppCtx } from './context';
import { getSession, listSteps } from '@/data/repositories/sessions';
import { getClient } from '@/data/repositories/clients';
import { getReports, latestAuditResult, listHypotheses, listSessionInterventions, upsertReport } from '@/data/repositories/records';
import { buildClientReport, buildInternalReport, type ClientReport, type InternalReport, type SessionReportData } from '@/domain/report';
import { softenForClient } from '@/domain/language';
import { checkOutput } from '@/ai/guardrails';
import { runJson } from '@/ai/service';
import { clientSummaryPrompt, clientSummarySchema } from '@/ai/prompts';
import { notFound, validation } from '@/lib/errors';
import { formatDate } from '@/lib/format';

async function loadReportData(ctx: AppCtx, sessionId: string): Promise<SessionReportData> {
  const s = await getSession(ctx.db, sessionId);
  if (!s) throw notFound('Sessão');
  const client = await getClient(ctx.db, s.client_id);
  if (!client) throw notFound('Cliente');
  const [steps, hyps, ivs] = await Promise.all([listSteps(ctx.db, s.id), listHypotheses(ctx.db, [s.id]), listSessionInterventions(ctx.db, [s.id])]);
  return {
    clientName: client.full_name,
    clientCode: client.internal_code,
    date: formatDate(s.started_at),
    mode: s.mode,
    objective: s.objective,
    complaint: s.complaint_text,
    neutralityIndex: s.neutrality_index,
    triageLevel: s.triage_level,
    steps: steps.map((r) => ({
      seq: r.seq, nodeKey: r.node_key, stage: r.stage, questionText: r.question_text, answerValue: r.answer_value,
      answerLabel: r.answer_label, answerText: r.answer_text, contextAfter: r.context_after ?? {}, undone: r.undone,
    })),
    hypotheses: hyps.map((h) => ({ element: h.element, category: h.category, role: h.role, description: h.description })),
    interventions: ivs.map((i) => ({
      name: i.interventions?.name ?? 'Intervenção',
      chart: i.charts?.name ?? null,
      description: i.description,
      duration: i.duration_text,
      frequency: i.frequency,
      reevaluateOn: i.reevaluate_on ? formatDate(i.reevaluate_on) : null,
    })),
    reevaluation: s.reevaluation,
    clientReport: s.client_report,
    interpretation: s.interpretation,
    observations: s.observations,
    selfCare: s.self_care,
    nextFollowup: s.next_followup_date ? formatDate(s.next_followup_date) : null,
  };
}

/** Gera (ou regenera) os dois relatórios. Opcionalmente a IA redige o resumo para o cliente. */
export async function generateReports(ctx: AppCtx, sessionId: string, opts: { aiSummary?: boolean } = {}) {
  const s = await getSession(ctx.db, sessionId);
  if (!s) throw notFound('Sessão');
  if (s.phase !== 'encerrada' && s.phase !== 'registro') throw validation('Os relatórios são gerados ao final da sessão.');
  const data = await loadReportData(ctx, sessionId);
  const internal = buildInternalReport(data);
  const client = buildClientReport(data);
  let aiNote: string | null = null;

  if (opts.aiSummary) {
    const ai = await runJson(
      {
        db: ctx.db, userId: ctx.user.id, sessionId, task: 'resumo_cliente', maxTokens: 700,
        messages: [{ role: 'user', content: clientSummaryPrompt({ objective: client.objective, aspects: client.aspects, harmonizations: client.harmonizations, selfCare: client.selfCare }) }],
      },
      clientSummarySchema,
    );
    if (ai.ok) {
      const checked = checkOutput(ai.value.summary);
      if (!checked.blocked && checked.flags.length === 0) client.summary = softenForClient(ai.value.summary);
      else aiNote = 'O resumo da IA foi descartado pelos guardrails; mantido o texto padrão.';
    } else aiNote = ai.message;
  }

  await Promise.all([
    upsertReport(ctx.db, { session_id: sessionId, owner_id: ctx.user.id, kind: 'interno', content: internal }),
    upsertReport(ctx.db, { session_id: sessionId, owner_id: ctx.user.id, kind: 'cliente', content: client }),
  ]);
  return { internal, client, aiNote };
}

export async function getReportBundle(ctx: AppCtx, sessionId: string) {
  const s = await getSession(ctx.db, sessionId);
  if (!s) throw notFound('Sessão');
  const reports = await getReports(ctx.db, sessionId);
  let internal = reports.find((r) => r.kind === 'interno')?.content as unknown as InternalReport | undefined;
  let client = reports.find((r) => r.kind === 'cliente')?.content as unknown as ClientReport | undefined;
  if ((!internal || !client) && (s.phase === 'encerrada' || s.phase === 'registro')) {
    const gen = await generateReports(ctx, sessionId);
    internal = gen.internal;
    client = gen.client;
  }
  const audit = await latestAuditResult(ctx.db, sessionId);
  return { session: s, internal: internal ?? null, client: client ?? null, audit };
}

/** Edição do resumo do relatório do cliente pela terapeuta (sempre suavizado). */
export async function updateClientSummary(ctx: AppCtx, sessionId: string, summary: string) {
  const bundle = await getReportBundle(ctx, sessionId);
  if (!bundle.client) throw validation('Relatório ainda não disponível.');
  const content: ClientReport = { ...bundle.client, summary: softenForClient(summary.trim()).slice(0, 2000) };
  await upsertReport(ctx.db, { session_id: sessionId, owner_id: ctx.user.id, kind: 'cliente', content });
}
