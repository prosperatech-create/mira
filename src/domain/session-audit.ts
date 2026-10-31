/**
 * Auditoria da sessão — métricas e achados determinísticos.
 * A IA pode redigir a análise, mas parte sempre destas métricas.
 */
import type { StepRecord } from './types';

export interface SessionMetrics {
  totalSteps: number;
  activeSteps: number;
  answerChanges: number;
  reformulations: number;
  neutralOrUnknown: number;
  neutralRate: number;
  elementsInvestigated: string[];
  domainsVisited: string[];
  originRoles: string[];
  hypotheses: number;
  interventions: number;
  precisionWarnings: number;
  flaggedQuestions: number;
  durationMinutes: number | null;
  neutralityIndex: number | null;
}

export interface SessionAuditInput {
  steps: StepRecord[];
  hypotheses: number;
  interventions: number;
  precisionWarnings: number;
  flaggedQuestions: { question: string; labels: string[]; suggestion: string | null }[];
  startedAt: string;
  endedAt?: string | null;
  neutralityIndex: number | null;
  objective: string | null;
}

export interface SessionAuditFindings {
  metrics: SessionMetrics;
  positives: string[];
  attentionPoints: string[];
  reformulations: { question: string; suggestion: string }[];
  contradictions: string[];
  nextSessionSuggestions: string[];
}

export function computeSessionMetrics(input: SessionAuditInput): SessionMetrics {
  const active = input.steps.filter((s) => !s.undone);
  const elements = new Set<string>();
  const domains = new Set<string>();
  const roles: string[] = [];
  for (const s of active) {
    if (s.contextAfter.element) elements.add(s.contextAfter.element);
    if (s.contextAfter.gps_domain) domains.add(s.contextAfter.gps_domain);
    if (s.nodeKey === 'origem.tipo') roles.push(s.answerValue);
  }
  const neutral = active.filter((s) => s.answerValue === 'neutro' || s.answerValue === 'nao_sei').length;
  const end = input.endedAt ? new Date(input.endedAt).getTime() : null;
  const start = new Date(input.startedAt).getTime();
  return {
    totalSteps: input.steps.length,
    activeSteps: active.length,
    answerChanges: input.steps.filter((s) => s.undone).length,
    reformulations: active.filter((s) => s.answerValue === 'reformular').length,
    neutralOrUnknown: neutral,
    neutralRate: active.length ? Math.round((neutral / active.length) * 100) : 0,
    elementsInvestigated: [...elements],
    domainsVisited: [...domains],
    originRoles: roles,
    hypotheses: input.hypotheses,
    interventions: input.interventions,
    precisionWarnings: input.precisionWarnings,
    flaggedQuestions: input.flaggedQuestions.length,
    durationMinutes: end ? Math.max(0, Math.round((end - start) / 60000)) : null,
    neutralityIndex: input.neutralityIndex,
  };
}

/** Mesmo nó + mesmo elemento respondido com SIM e NÃO em momentos diferentes. */
export function findContradictions(steps: StepRecord[]): string[] {
  const seen = new Map<string, { value: string; question: string }>();
  const out: string[] = [];
  for (const s of steps.filter((x) => !x.undone)) {
    if (s.answerValue !== 'sim' && s.answerValue !== 'nao') continue;
    const id = `${s.nodeKey}|${s.questionText}`;
    const prev = seen.get(id);
    if (prev && prev.value !== s.answerValue) {
      out.push(`"${s.questionText}" recebeu respostas diferentes (${prev.value.toUpperCase()} e depois ${s.answerValue.toUpperCase()}).`);
    }
    seen.set(id, { value: s.answerValue, question: s.questionText });
  }
  return out;
}

export function auditSession(input: SessionAuditInput): SessionAuditFindings {
  const m = computeSessionMetrics(input);
  const positives: string[] = [];
  const attention: string[] = [];
  const next: string[] = [];

  if (input.objective) positives.push('A sessão teve um objetivo definido e aprovado antes da investigação.');
  if (m.neutralityIndex !== null) positives.push('A preparação da terapeuta foi registrada antes da leitura.');
  if (m.hypotheses > 0) positives.push('As hipóteses foram registradas como hipóteses de possível origem, separadas dos resultados.');
  if (m.interventions > 0) positives.push('As intervenções foram registradas com contexto.');
  if (m.flaggedQuestions === 0) positives.push('Nenhuma pergunta livre foi sinalizada pelo auditor.');

  if (m.answerChanges >= 3) attention.push(`Houve ${m.answerChanges} respostas desfeitas/alteradas. Mudanças frequentes podem indicar dúvida ou interferência de expectativa.`);
  if (m.reformulations >= 3) attention.push(`${m.reformulations} pedidos de reformulação: algumas perguntas podem estar pouco claras.`);
  if (m.neutralRate >= 30 && m.activeSteps >= 5) attention.push(`${m.neutralRate}% das respostas foram neutras/indefinidas. Considere perguntas de controle e pausas.`);
  if (m.activeSteps > 40) attention.push(`A sessão teve ${m.activeSteps} passos: possível excesso de investigação.`);
  if (m.domainsVisited.length > 3) attention.push(`Foram visitadas ${m.domainsVisited.length} dimensões do GPS: verifique se a investigação se manteve próxima ao objetivo inicial.`);
  if (m.precisionWarnings > 0) attention.push('Houve registro com precisão excessiva (tempo/percentual). Evite falsa precisão.');
  if (m.neutralityIndex !== null && m.neutralityIndex < 75) attention.push(`O Índice de Neutralidade foi ${m.neutralityIndex}. Leituras dessa sessão merecem interpretação cautelosa.`);
  if (m.originRoles.includes('consequencia') && m.hypotheses === 0) attention.push('Um elemento foi marcado como consequência, mas nenhuma hipótese foi registrada.');
  if (m.interventions > 0 && !input.steps.some((s) => s.stage === 'reavaliar' && !s.undone)) attention.push('Houve intervenção sem reavaliação registrada.');

  const contradictions = findContradictions(input.steps);

  if (m.elementsInvestigated.length) next.push(`Reavaliar: ${m.elementsInvestigated.slice(0, 3).join(', ')}.`);
  if (m.neutralityIndex !== null && m.neutralityIndex < 75) next.push('Reservar tempo extra para a preparação da terapeuta.');
  if (m.reformulations >= 3) next.push('Revisar e auditar previamente as perguntas que exigiram reformulação.');
  next.push('Perguntar à consulente como percebeu os dias seguintes, registrando o relato separadamente dos resultados.');

  return {
    metrics: m,
    positives,
    attentionPoints: attention,
    reformulations: input.flaggedQuestions
      .filter((q) => q.suggestion)
      .map((q) => ({ question: q.question, suggestion: q.suggestion as string })),
    contradictions,
    nextSessionSuggestions: next,
  };
}
