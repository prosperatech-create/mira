/**
 * Construção dos relatórios (interno e para o cliente) com separação rigorosa:
 * relato · resultados radiestésicos · interpretação · hipóteses · intervenções · reavaliação · observações.
 */
import { CLIENT_REPORT_DISCLAIMER, clientPhraseForElement, softenForClient } from './language';
import type { SessionMode, StepRecord } from './types';
import { MODES } from './modes';

export interface ReportHypothesis {
  element: string | null;
  category: string | null;
  role: string | null;
  description: string;
}

export interface ReportIntervention {
  name: string;
  chart: string | null;
  description: string | null;
  duration: string | null;
  frequency: string | null;
  reevaluateOn: string | null;
}

export interface SessionReportData {
  clientName: string;
  clientCode: string;
  date: string;
  mode: SessionMode;
  objective: string | null;
  complaint: string;
  neutralityIndex: number | null;
  triageLevel: string | null;
  steps: StepRecord[];
  hypotheses: ReportHypothesis[];
  interventions: ReportIntervention[];
  reevaluation: { before?: string; after?: string; notes?: string } | null;
  clientReport: string | null;
  interpretation: string | null;
  observations: string | null;
  selfCare: string | null;
  nextFollowup: string | null;
}

export interface InternalReport {
  kind: 'interno';
  header: { client: string; code: string; date: string; mode: string; objective: string | null; neutralityIndex: number | null; triageLevel: string | null };
  relatoCliente: string | null;
  resultadosRadiestesicos: { question: string; answer: string; stage: string }[];
  interpretacao: string | null;
  hipoteses: ReportHypothesis[];
  intervencoes: ReportIntervention[];
  reavaliacao: { before?: string; after?: string; notes?: string; steps: { question: string; answer: string }[] } | null;
  observacoes: string | null;
}

export interface ClientReport {
  kind: 'cliente';
  name: string;
  date: string;
  objective: string;
  summary: string;
  aspects: string[];
  harmonizations: string[];
  selfCare: string | null;
  nextReevaluation: string | null;
  disclaimer: string;
}

const ROLE_LABEL: Record<string, string> = {
  causa: 'parece atuar como causa',
  consequencia: 'parece atuar como consequência',
  ambos: 'parece atuar como causa e consequência',
  nao_definido: 'papel não definido',
};

export function buildInternalReport(d: SessionReportData): InternalReport {
  const active = d.steps.filter((s) => !s.undone);
  const reavSteps = active.filter((s) => s.stage === 'reavaliar');
  return {
    kind: 'interno',
    header: {
      client: d.clientName,
      code: d.clientCode,
      date: d.date,
      mode: MODES[d.mode].label,
      objective: d.objective,
      neutralityIndex: d.neutralityIndex,
      triageLevel: d.triageLevel,
    },
    relatoCliente: d.clientReport || d.complaint,
    resultadosRadiestesicos: active
      .filter((s) => s.stage !== 'reavaliar')
      .map((s) => ({ question: s.questionText, answer: s.answerText ? `${s.answerLabel} — ${s.answerText}` : s.answerLabel, stage: s.stage })),
    interpretacao: d.interpretation,
    hipoteses: d.hypotheses.map((h) => ({ ...h, role: h.role ? ROLE_LABEL[h.role] ?? h.role : null })),
    intervencoes: d.interventions,
    reavaliacao:
      d.reevaluation || reavSteps.length
        ? { ...(d.reevaluation ?? {}), steps: reavSteps.map((s) => ({ question: s.questionText, answer: s.answerText ? `${s.answerLabel} — ${s.answerText}` : s.answerLabel })) }
        : null,
    observacoes: d.observations,
  };
}

export function buildClientReport(d: SessionReportData): ClientReport {
  const elements = new Set<string>();
  for (const s of d.steps) if (!s.undone && s.contextAfter.element) elements.add(s.contextAfter.element);
  const aspects = [...elements].map(clientPhraseForElement);
  const harmonizations = d.interventions.map((i) =>
    softenForClient([i.name, i.chart ? `(gráfico: ${i.chart})` : null, i.description].filter(Boolean).join(' ')),
  );
  const summary =
    aspects.length > 0
      ? `Nesta sessão investigamos, com o apoio da radiestesia, aspectos relacionados ao seu objetivo. ${aspects.length === 1 ? 'Um ponto' : 'Alguns pontos'} apareceram como áreas de atenção dentro do método utilizado${harmonizations.length ? ', e foram realizadas harmonizações' : ''}. Essas observações são um convite à reflexão, não conclusões definitivas.`
      : 'Nesta sessão realizamos uma investigação radiestésica relacionada ao seu objetivo. Nenhum ponto específico se destacou como prioritário neste momento, o que também é um resultado válido.';
  return {
    kind: 'cliente',
    name: d.clientName,
    date: d.date,
    objective: softenForClient(d.objective ?? d.complaint),
    summary,
    aspects,
    harmonizations,
    selfCare: d.selfCare ? softenForClient(d.selfCare) : null,
    nextReevaluation: d.nextFollowup,
    disclaimer: CLIENT_REPORT_DISCLAIMER,
  };
}
