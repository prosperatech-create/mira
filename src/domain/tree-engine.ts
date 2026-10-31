/**
 * Motor de árvores do MIRA.
 *
 * Recebe a árvore (dados vindos do banco), o nó atual, a resposta INFORMADA PELA TERAPEUTA
 * e o histórico, e calcula deterministicamente o próximo nó e o novo contexto.
 * Nenhuma IA participa desta decisão.
 */
import { evaluateCondition, renderTemplate } from './conditions';
import {
  PENDULUM_ANSWERS,
  PENDULUM_LABELS,
  type AnswerInput,
  type InvestigationTree,
  type NodeAlert,
  type NodeOption,
  type PendulumAnswer,
  type Route,
  type SessionContext,
  type StepRecord,
  type Target,
  type TreeNode,
} from './types';

export class TreeEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TreeEngineError';
  }
}

const SPECIAL_TARGETS = new Set(['@back', '@stay', '@end']);
const MAX_ROUTE_HOPS = 25;

/** Respostas que nunca avançam a árvore por padrão: pedem reformulação / pergunta de controle. */
const DEFAULT_STAY_HINTS: Partial<Record<PendulumAnswer, string>> = {
  reformular: 'Pergunta reformulada. Leia com calma e consulte o pêndulo novamente.',
  neutro:
    'Resposta neutra registrada. Considere uma pergunta de controle ou reformular antes de seguir.',
  nao_sei:
    'Resposta indefinida registrada. Faça uma pausa, retome a neutralidade e, se necessário, reformule.',
};

export interface EngineResult {
  /** Próximo nó a exibir; null quando a árvore terminou. */
  nextNodeKey: string | null;
  finished: boolean;
  stayed: boolean;
  contextAfter: SessionContext;
  answerLabel: string;
  hint?: string;
}

export function getNode(tree: InvestigationTree, key: string): TreeNode {
  const node = tree.nodes.find((n) => n.key === key);
  if (!node) throw new TreeEngineError(`Nó "${key}" não existe na árvore "${tree.slug}".`);
  return node;
}

function activeHistory(history: StepRecord[]): StepRecord[] {
  return history.filter((s) => !s.undone).sort((a, b) => a.seq - b.seq);
}

/**
 * Regra de prioridade ("desequilíbrio não significa prioridade"):
 * reconstrói a pilha de nós-âncora a partir do histórico e retorna ao nível anterior.
 *  - responder um âncora que já está na pilha corta a pilha até ele;
 *  - se o nó atual é âncora, volta ao âncora abaixo dele; senão, ao âncora do topo.
 */
export function anchorStack(tree: InvestigationTree, history: StepRecord[]): string[] {
  const stack: string[] = [];
  for (const step of activeHistory(history)) {
    const node = tree.nodes.find((n) => n.key === step.nodeKey);
    if (!node?.isAnchor) continue;
    const idx = stack.indexOf(step.nodeKey);
    if (idx >= 0) stack.length = idx + 1;
    else stack.push(step.nodeKey);
  }
  return stack;
}

export function findBackTarget(tree: InvestigationTree, currentKey: string, history: StepRecord[]): string {
  const stack = anchorStack(tree, history);
  const idx = stack.indexOf(currentKey);
  if (idx >= 0) return idx > 0 ? stack[idx - 1] : tree.entryNodeKey;
  return stack.length ? stack[stack.length - 1] : tree.entryNodeKey;
}

function resolveRoutes(routes: Route[], ctx: SessionContext): Target | undefined {
  return routes.find((r) => evaluateCondition(r.when, ctx))?.next;
}

function findOption(node: TreeNode, value: string): NodeOption | undefined {
  return node.options.find((o) => o.value === value);
}

function validateAnswer(node: TreeNode, answer: AnswerInput): void {
  const isPendulum = (PENDULUM_ANSWERS as readonly string[]).includes(answer.value);
  switch (node.kind) {
    case 'yes_no':
      if (!isPendulum) throw new TreeEngineError(`Resposta inválida "${answer.value}" para pergunta SIM/NÃO.`);
      return;
    case 'select':
    case 'origin':
      if (!findOption(node, answer.value) && !['reformular', 'neutro', 'nao_sei'].includes(answer.value))
        throw new TreeEngineError(`Opção "${answer.value}" não existe neste nó.`);
      return;
    case 'measure': {
      if (findOption(node, answer.value) && answer.value !== 'medida') return;
      const n = Number(String(answer.text ?? '').replace(',', '.'));
      if (!Number.isFinite(n) || n < 0 || n > 10)
        throw new TreeEngineError('Informe uma intensidade entre 0 e 10 (indicador interno da leitura).');
      return;
    }
    case 'text':
      if (!answer.text || !answer.text.trim()) throw new TreeEngineError('Este passo exige um registro em texto.');
      return;
    case 'intervention':
    case 'end':
    case 'route':
      return;
  }
}

/** Opção efetiva da resposta (inclui padrões para neutro / não sei / reformular). */
function effectiveOption(node: TreeNode, answer: AnswerInput): NodeOption {
  const explicit = findOption(node, answer.value);
  if (explicit) return explicit;
  if (node.kind === 'measure' || node.kind === 'text' || node.kind === 'intervention' || node.kind === 'end') {
    const first = node.options[0];
    if (first) return first;
    return { value: answer.value, label: 'Continuar', next: '@end' };
  }
  const p = answer.value as PendulumAnswer;
  if (DEFAULT_STAY_HINTS[p]) return { value: p, label: PENDULUM_LABELS[p], next: '@stay', hint: DEFAULT_STAY_HINTS[p] };
  throw new TreeEngineError(`O nó "${node.key}" não define destino para "${answer.value}".`);
}

function answerLabelFor(node: TreeNode, option: NodeOption, answer: AnswerInput): string {
  if (node.kind === 'measure' && answer.text) return `Intensidade ${answer.text}/10`;
  if (node.kind === 'yes_no' && (PENDULUM_ANSWERS as readonly string[]).includes(answer.value))
    return option.label || PENDULUM_LABELS[answer.value as PendulumAnswer];
  return option.label;
}

/** Calcula o próximo nó a partir da resposta da terapeuta. */
export function applyAnswer(
  tree: InvestigationTree,
  nodeKey: string,
  answer: AnswerInput,
  ctx: SessionContext,
  history: StepRecord[],
): EngineResult {
  const node = getNode(tree, nodeKey);
  if (node.kind === 'route') throw new TreeEngineError('Nós de roteamento não recebem respostas.');
  validateAnswer(node, answer);
  const option = effectiveOption(node, answer);
  const answerLabel = answerLabelFor(node, option, answer);

  // 1. aplica variáveis
  const contextAfter: SessionContext = { ...ctx };
  const extra = { label: option.label, value: answer.value, text: (answer.text ?? '').trim() };
  for (const [k, tpl] of Object.entries(option.set ?? {})) {
    contextAfter[k] = renderTemplate(tpl, contextAfter, extra, '');
  }

  // 2. resolve destino
  let target = (option.routes && resolveRoutes(option.routes, contextAfter)) ?? option.next ?? resolveRoutes(node.routes, contextAfter);
  if (!target) throw new TreeEngineError(`Sem destino definido em "${node.key}" para "${answer.value}".`);

  if (target === '@stay') {
    return { nextNodeKey: node.key, finished: false, stayed: true, contextAfter, answerLabel, hint: option.hint };
  }

  // 3. segue nós de roteamento e alvos especiais
  for (let hop = 0; hop < MAX_ROUTE_HOPS; hop++) {
    if (target === '@end') return { nextNodeKey: null, finished: true, stayed: false, contextAfter, answerLabel, hint: option.hint };
    if (target === '@back') target = findBackTarget(tree, node.key, history);
    const next = getNode(tree, target);
    if (next.kind !== 'route') {
      return { nextNodeKey: next.key, finished: false, stayed: false, contextAfter, answerLabel, hint: option.hint };
    }
    const routed = resolveRoutes(next.routes, contextAfter);
    if (!routed) throw new TreeEngineError(`Nó de roteamento "${next.key}" sem rota aplicável.`);
    target = routed;
  }
  throw new TreeEngineError('Ciclo de roteamento detectado na árvore.');
}

/** Resolve um nó (seguindo nós de roteamento) — usado para entrar numa árvore. */
export function resolveNodeKey(tree: InvestigationTree, key: string, ctx: SessionContext): string {
  let target = key;
  for (let hop = 0; hop < MAX_ROUTE_HOPS; hop++) {
    const n = getNode(tree, target);
    if (n.kind !== 'route') return n.key;
    const routed = resolveRoutes(n.routes, ctx);
    if (!routed || routed.startsWith('@')) throw new TreeEngineError(`Nó de roteamento "${n.key}" sem rota aplicável.`);
    target = routed;
  }
  throw new TreeEngineError('Ciclo de roteamento detectado na árvore.');
}

export interface PresentedOption {
  value: string;
  label: string;
}

export interface PresentedNode {
  key: string;
  stage: TreeNode['stage'];
  kind: TreeNode['kind'];
  category: string | null;
  question: string;
  explanation: string | null;
  options: PresentedOption[];
  alerts: Omit<NodeAlert, 'when'>[];
  reformulationCount: number;
}

/** Quantas vezes seguidas a última resposta neste nó foi "reformular". */
function consecutiveReformulations(nodeKey: string, history: StepRecord[]): number {
  const steps = activeHistory(history);
  let n = 0;
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].nodeKey !== nodeKey) break;
    if (steps[i].answerValue === 'reformular') n++;
    else break;
  }
  return n;
}

/** Prepara o nó para exibição (texto renderizado, alternativas, alertas aplicáveis). */
export function presentNode(
  tree: InvestigationTree,
  nodeKey: string,
  ctx: SessionContext,
  history: StepRecord[],
): PresentedNode {
  const node = getNode(tree, nodeKey);
  const reformulations = consecutiveReformulations(nodeKey, history);
  const base =
    reformulations > 0 && node.alternatives.length > 0
      ? node.alternatives[(reformulations - 1) % node.alternatives.length]
      : node.question;

  let options: PresentedOption[];
  if (node.kind === 'yes_no') {
    options = PENDULUM_ANSWERS.map((value) => ({ value, label: findOption(node, value)?.label ?? PENDULUM_LABELS[value] }));
  } else {
    options = node.options.map((o) => ({ value: o.value, label: renderTemplate(o.label, ctx) }));
  }

  return {
    key: node.key,
    stage: node.stage,
    kind: node.kind,
    category: node.category ?? null,
    question: renderTemplate(base, ctx),
    explanation: node.explanation ? renderTemplate(node.explanation, ctx) : null,
    options,
    alerts: node.alerts.filter((a) => evaluateCondition(a.when, ctx)).map(({ level, message }) => ({ level, message: renderTemplate(message, ctx) })),
    reformulationCount: reformulations,
  };
}

/** Valida a integridade estrutural de uma árvore (usado no seed, nos testes e no editor). */
export function validateTree(tree: InvestigationTree): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  for (const n of tree.nodes) {
    if (keys.has(n.key)) errors.push(`Chave duplicada: ${n.key}`);
    keys.add(n.key);
  }
  if (!keys.has(tree.entryNodeKey)) errors.push(`Nó de entrada inexistente: ${tree.entryNodeKey}`);

  const checkTarget = (from: string, t: Target | undefined) => {
    if (t === undefined) return;
    if (!SPECIAL_TARGETS.has(t) && !keys.has(t)) errors.push(`${from} aponta para nó inexistente "${t}"`);
  };

  for (const n of tree.nodes) {
    const values = new Set<string>();
    for (const o of n.options) {
      if (values.has(o.value)) errors.push(`${n.key}: opção duplicada "${o.value}"`);
      values.add(o.value);
      checkTarget(`${n.key}/${o.value}`, o.next);
      o.routes?.forEach((r) => checkTarget(`${n.key}/${o.value}/rota`, r.next));
      if (!o.next && !o.routes?.length && !n.routes.length) errors.push(`${n.key}/${o.value}: opção sem destino`);
    }
    n.routes.forEach((r) => checkTarget(`${n.key}/rota`, r.next));
    if (n.kind === 'yes_no') {
      for (const req of ['sim', 'nao']) if (!values.has(req)) errors.push(`${n.key}: pergunta SIM/NÃO sem destino para "${req}"`);
    }
    if ((n.kind === 'select' || n.kind === 'origin') && n.options.length < 2) errors.push(`${n.key}: seleção precisa de ao menos 2 opções`);
    if (n.kind === 'route') {
      if (!n.routes.length) errors.push(`${n.key}: nó de roteamento sem rotas`);
      else if (n.routes[n.routes.length - 1].when) errors.push(`${n.key}: última rota precisa ser incondicional (fallback)`);
    }
  }
  return errors;
}
