/**
 * GPS MIRA — indica em que etapa e em que dimensão a investigação está.
 */
import type { MiraStage, SessionContext, SessionPhase } from './types';
import { MIRA_STAGES } from './types';

export const STAGE_LABELS: Record<MiraStage, string> = {
  preparar: 'Preparar',
  objetivo: 'Definir objetivo',
  triagem: 'Triagem de segurança',
  macro: 'Investigação macro',
  priorizar: 'Priorizar',
  aprofundar: 'Aprofundar',
  hipotese: 'Formular hipótese',
  intervencao: 'Escolher intervenção',
  harmonizar: 'Harmonizar',
  reavaliar: 'Reavaliar',
  auditar: 'Auditar',
  registrar: 'Registrar',
};

export interface GpsDomain {
  key: string;
  label: string;
  items: string[];
  /** Nó de entrada na árvore principal (usado no Modo Livre). */
  entryNode: string;
}

export const GPS_DOMAINS: GpsDomain[] = [
  { key: 'campo_pessoal', label: 'Campo pessoal', entryNode: 'campos.selecao', items: ['Emocional', 'Mental', 'Hábitos', 'Comportamento', 'Crenças', 'Espiritual', 'Bem-estar físico (linguagem energética)'] },
  { key: 'sistema_energetico', label: 'Sistema energético', entryNode: 'energetico.selecao', items: ['Chakras', 'Aura', 'Vitalidade', 'Equilíbrio', 'Polaridade'] },
  { key: 'relacionamentos', label: 'Relacionamentos', entryNode: 'rel.selecao', items: ['Afetivo', 'Família', 'Amizades', 'Trabalho', 'Limites pessoais'] },
  { key: 'areas_vida', label: 'Áreas da vida', entryNode: 'areas.selecao', items: ['Pessoal', 'Saúde e bem-estar', 'Relacionamentos', 'Família', 'Profissional', 'Financeiro', 'Estudos', 'Criatividade', 'Propósito', 'Espiritualidade', 'Lazer'] },
  { key: 'ambiente', label: 'Ambiente', entryNode: 'amb.selecao', items: ['Residência', 'Quarto', 'Escritório', 'Local de trabalho', 'Espaço terapêutico', 'Objeto'] },
];

/** Atalhos do Modo Livre (destinos válidos para "ir para"). */
export const FREE_MODE_JUMPS: { label: string; node: string }[] = [
  { label: 'Pergunta inicial', node: 'macro.inicio' },
  ...GPS_DOMAINS.map((d) => ({ label: d.label, node: d.entryNode })),
  { label: 'Hipótese de origem', node: 'origem.tipo' },
  { label: 'Intervenção', node: 'intervencao.apropriada' },
];

const PHASE_STAGE: Partial<Record<SessionPhase, MiraStage>> = {
  objetivo: 'objetivo',
  preparacao: 'preparar',
  triagem: 'triagem',
  reavaliacao: 'reavaliar',
  registro: 'registrar',
  encerrada: 'auditar',
};

export interface GpsView {
  stage: MiraStage;
  stageIndex: number;
  stages: { key: MiraStage; label: string; status: 'feito' | 'atual' | 'pendente' }[];
  breadcrumb: string[];
}

export function buildGps(phase: SessionPhase, nodeStage: MiraStage | null, ctx: SessionContext): GpsView {
  const stage: MiraStage = (phase === 'investigacao' && nodeStage) || PHASE_STAGE[phase] || 'macro';
  const stageIndex = MIRA_STAGES.indexOf(stage);
  const breadcrumb = [ctx.gps_domain, ctx.element, ctx.element_detail, ctx.hypothesis_category].filter((x): x is string => !!x);
  return {
    stage,
    stageIndex,
    stages: MIRA_STAGES.map((key, i) => ({
      key,
      label: STAGE_LABELS[key],
      status: i < stageIndex ? 'feito' : i === stageIndex ? 'atual' : 'pendente',
    })),
    breadcrumb,
  };
}
