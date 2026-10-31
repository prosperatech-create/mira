/**
 * Tipos de domínio do MIRA. Puros (sem dependência de framework, banco ou IA).
 */

export const SESSION_MODES = ['mira', 'terapeutica', 'tera', 'livre'] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export const SESSION_PHASES = [
  'objetivo',
  'preparacao',
  'triagem',
  'investigacao',
  'reavaliacao',
  'registro',
  'encerrada',
  'cancelada',
] as const;
export type SessionPhase = (typeof SESSION_PHASES)[number];

/** As 12 etapas conceituais do fluxo MIRA (seção 3 do briefing). */
export const MIRA_STAGES = [
  'preparar',
  'objetivo',
  'triagem',
  'macro',
  'priorizar',
  'aprofundar',
  'hipotese',
  'intervencao',
  'harmonizar',
  'reavaliar',
  'auditar',
  'registrar',
] as const;
export type MiraStage = (typeof MIRA_STAGES)[number];

export const NODE_KINDS = ['yes_no', 'select', 'origin', 'measure', 'text', 'intervention', 'route', 'end'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

/** Respostas padrão do pêndulo. */
export const PENDULUM_ANSWERS = ['sim', 'nao', 'neutro', 'nao_sei', 'reformular'] as const;
export type PendulumAnswer = (typeof PENDULUM_ANSWERS)[number];

export const PENDULUM_LABELS: Record<PendulumAnswer, string> = {
  sim: 'Sim',
  nao: 'Não',
  neutro: 'Neutro',
  nao_sei: 'Não sei',
  reformular: 'Reformular',
};

/** Contexto da sessão: variáveis usadas por condições e templates ({{element}}). */
export type SessionContext = Record<string, string>;

/**
 * Destino de uma opção:
 *  - chave de nó ('chakra.qual')
 *  - '@back'  → retorna ao último nó-âncora visitado (regra de prioridade)
 *  - '@stay'  → permanece no mesmo nó (reformular / neutro)
 *  - '@end'   → encerra a árvore
 */
export type Target = string;

export type Condition =
  | { var: string; eq?: string; neq?: string; in?: string[]; exists?: boolean }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export interface Route {
  when?: Condition;
  next: Target;
}

export interface NodeOption {
  value: string;
  label: string;
  /** Destino simples. */
  next?: Target;
  /** Destinos condicionais, avaliados em ordem; o primeiro que casar vence. */
  routes?: Route[];
  /** Variáveis gravadas no contexto. Aceita {{label}}, {{value}}, {{text}} e {{var}}. */
  set?: Record<string, string>;
  /** Dica exibida quando a opção mantém o nó (@stay). */
  hint?: string;
}

export interface NodeAlert {
  when?: Condition;
  level: 'info' | 'atencao' | 'critico';
  message: string;
}

export interface TreeNode {
  key: string;
  stage: MiraStage;
  kind: NodeKind;
  category?: string | null;
  question: string;
  explanation?: string | null;
  options: NodeOption[];
  routes: Route[];
  alerts: NodeAlert[];
  alternatives: string[];
  isAnchor: boolean;
  tags: string[];
  position?: number;
}

export interface InvestigationTree {
  id: string;
  slug: string;
  name: string;
  purpose: 'investigacao' | 'reavaliacao';
  entryNodeKey: string;
  nodes: TreeNode[];
}

/** Passo já registrado (resposta da terapeuta). */
export interface StepRecord {
  seq: number;
  nodeKey: string;
  stage: MiraStage;
  questionText: string;
  answerValue: string;
  answerLabel: string;
  answerText?: string | null;
  contextAfter: SessionContext;
  undone: boolean;
  createdAt?: string;
}

export interface AnswerInput {
  value: string;
  /** Texto livre (nós 'text'), medida (nós 'measure') etc. */
  text?: string;
}
