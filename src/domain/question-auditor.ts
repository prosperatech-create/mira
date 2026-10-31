/**
 * Auditor de perguntas — camada heurística determinística.
 * A IA (quando configurada) complementa, mas NUNCA remove rótulos de risco detectados aqui.
 */
import { normalize } from './text';

export const QUESTION_LABELS = [
  'BOA',
  'VAGA',
  'DUPLA',
  'TENDENCIOSA',
  'PRESSUPÕE RESPOSTA',
  'ACUSA TERCEIRO',
  'FORA DO ESCOPO',
  'ETICAMENTE PROBLEMÁTICA',
] as const;
export type QuestionLabel = (typeof QUESTION_LABELS)[number];

/** Rótulos que a IA não pode remover. */
export const PROTECTED_LABELS: QuestionLabel[] = ['ACUSA TERCEIRO', 'FORA DO ESCOPO', 'ETICAMENTE PROBLEMÁTICA'];

export interface QuestionAuditResult {
  labels: QuestionLabel[];
  reasons: string[];
  suggestion: string | null;
}

const THIRD_PARTIES = ['irma', 'irmao', 'mae', 'pai', 'sogra', 'sogro', 'marido', 'esposa', 'mulher dele', 'namorad', 'ex ', 'ex-', 'vizinh', 'colega', 'chefe', 'cunhad', 'amiga', 'amigo', 'alguem', 'fulan', 'tia ', 'tio ', 'prima', 'primo'];
const ACCUSATION = ['inveja', 'ciume', 'olho gordo', 'feitico', 'macumba', 'trabalho feito', 'amarracao', 'mandou', 'enviou', 'praga', 'mau olhado', 'quer o mal', 'atrapalhando', 'bloqueando', 'sabotando', 'culpa'];
const SUPERNATURAL_FACT = ['maldicao', 'obsessor', 'obsessao', 'entidade', 'encosto', 'magia negra', 'macumba', 'feitico', 'ataque espiritual', 'espirito obsessor'];
const OUT_OF_SCOPE = ['cancer', 'tumor', 'doenca', 'diagnostic', 'remedio', 'medicament', 'parar de tomar', 'cirurgia', 'gravida', 'gestacao', 'sexo do bebe', 'quando vai morrer', 'vai morrer', 'loteria', 'mega-sena', 'mega sena', 'acoes', 'bitcoin', 'cripto', 'ganhar o processo', 'causa ganha', 'exame'];
const ETHICAL = ['traindo', 'traicao', 'trair', 'amante', 'morrer', 'morte de', 'vai voltar pra mim', 'vai voltar para mim', 'gosta de mim', 'pensa em mim', 'esta mentindo', 'mentindo', 'roubou'];
const PRESUPPOSE = ['esta bloqueando', 'esta causando', 'e a causa', 'por causa d', 'qual e o bloqueio', 'qual bloqueio', 'qual o trauma', 'que trauma', 'esta impedindo', 'esta travando', 'responsavel por', 'culpa d'];
const LEADING = ['nao e verdade que', 'certamente', 'com certeza', 'realmente', 'nao e mesmo', 'ne?', 'obviamente', 'confirma que', 'nao esta '];
const VAGUE_WORDS = ['algo', 'alguma coisa', 'coisa', 'tudo', 'tudo bem', 'energia ruim', 'negativ', 'ta bom', 'esta bom'];

function includesAny(t: string, list: string[]): string | undefined {
  return list.find((k) => t.includes(k));
}

export function auditQuestionHeuristic(question: string, objective?: string | null): QuestionAuditResult {
  const raw = question.trim();
  const t = ` ${normalize(raw)} `;
  const labels = new Set<QuestionLabel>();
  const reasons: string[] = [];

  if (raw.length < 12 || t.trim().split(/\s+/).length < 4) {
    labels.add('VAGA');
    reasons.push('A pergunta é curta demais para ter um foco claro.');
  } else if (includesAny(t, VAGUE_WORDS)) {
    labels.add('VAGA');
    reasons.push('Termos genéricos ("algo", "tudo", "energia ruim") deixam a pergunta sem foco verificável.');
  }

  const questionMarks = (raw.match(/\?/g) ?? []).length;
  const clauses = t.split(/ (?:e|ou) /).filter((c) => / (esta|existe|tem|ha|deve|precisa|vai|e|sao|estao)( |\?)/.test(` ${c} `));
  if (questionMarks > 1 || clauses.length >= 2) {
    labels.add('DUPLA');
    reasons.push('Parece haver duas perguntas em uma; o pêndulo só pode responder a uma de cada vez.');
  }

  const third = includesAny(t, THIRD_PARTIES);
  const accusation = includesAny(t, ACCUSATION);
  if (third && accusation) {
    labels.add('ACUSA TERCEIRO');
    labels.add('TENDENCIOSA');
    reasons.push(`A pergunta atribui uma intenção ou efeito a uma terceira pessoa ("${third.trim()}" + "${accusation}").`);
  }

  if (includesAny(t, PRESUPPOSE) || (accusation && accusation !== 'culpa')) {
    labels.add('PRESSUPÕE RESPOSTA');
    reasons.push('A pergunta já pressupõe uma causa ou um problema, em vez de verificar se ele existe.');
  }

  if (includesAny(t, LEADING)) {
    labels.add('TENDENCIOSA');
    reasons.push('A formulação induz uma resposta esperada.');
  }

  if (includesAny(t, OUT_OF_SCOPE)) {
    labels.add('FORA DO ESCOPO');
    reasons.push('Envolve diagnóstico, medicação, previsão ou decisão de alto risco — fora do escopo da radiestesia como apoio de bem-estar.');
  }

  const supernatural = includesAny(t, SUPERNATURAL_FACT);
  const ethical = includesAny(t, ETHICAL);
  if (ethical || (supernatural && (third || accusation))) {
    labels.add('ETICAMENTE PROBLEMÁTICA');
    reasons.push('Pode gerar medo, invadir a privacidade de terceiros ou afirmar como fato algo que pertence a um sistema de crença.');
  } else if (supernatural) {
    labels.add('TENDENCIOSA');
    reasons.push('Pressupõe um fenômeno espiritual como fato. Formule de modo aberto e respeitando a crença da consulente.');
  }

  if (labels.size === 0) {
    return { labels: ['BOA'], reasons: ['Pergunta clara, única e não tendenciosa.'], suggestion: null };
  }

  return { labels: [...labels], reasons, suggestion: suggestReformulation(raw, objective) };
}

const DOMAIN_HINTS: [string[], string][] = [
  [['prosperidade', 'dinheiro', 'financ', 'divida', 'emprego', 'salario'], 'à experiência financeira atual da consulente'],
  [['marido', 'esposa', 'namor', 'casamento', 'relacion', 'amor'], 'à experiência atual da consulente em seus relacionamentos'],
  [['trabalho', 'chefe', 'colega', 'carreira', 'profiss'], 'à experiência profissional atual da consulente'],
  [['casa', 'ambiente', 'quarto', 'escritorio'], 'ao ambiente da consulente'],
  [['ansied', 'medo', 'triste', 'emoc'], 'ao bem-estar emocional atual da consulente'],
];

/** Sugestão determinística de reformulação aberta, focada na consulente. */
export function suggestReformulation(question: string, objective?: string | null): string {
  const t = normalize(question + ' ' + (objective ?? ''));
  const area = DOMAIN_HINTS.find(([keys]) => keys.some((k) => t.includes(k)))?.[1] ?? 'ao objetivo desta sessão';
  const interpersonal = includesAny(` ${t} `, THIRD_PARTIES);
  return interpersonal
    ? `Existe algum fator relacionado às relações interpessoais que seja prioritário investigar em relação ${area}?`
    : `Existe algum fator prioritário e apropriado para ser investigado em relação ${area}?`;
}
