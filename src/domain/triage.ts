/**
 * Triagem de segurança — 100% determinística.
 * Não bloqueia o atendimento, exceto em situações críticas.
 */
import { normalize } from './text';

export type TriageSeverity = 'atencao' | 'critico';

export interface TriageFlagDef {
  key: string;
  label: string;
  severity: TriageSeverity;
  /** Palavras-chave (normalizadas) que sugerem marcar o item. */
  keywords: string[];
}

export const TRIAGE_FLAGS: TriageFlagDef[] = [
  { key: 'sintomas_fisicos', label: 'Sintomas físicos importantes', severity: 'atencao', keywords: ['dor ', 'dores', 'sangr', 'febre', 'desmai', 'falta de ar', 'sintoma'] },
  { key: 'doenca', label: 'Doença diagnosticada ou suspeita', severity: 'atencao', keywords: ['doenca', 'cancer', 'tumor', 'diabet', 'diagnost', 'depressao', 'hipertens'] },
  { key: 'medicamento', label: 'Uso de medicamento', severity: 'atencao', keywords: ['remedio', 'medicament', 'medicacao', 'antidepress', 'tarja'] },
  { key: 'crise_psicologica', label: 'Crise psicológica', severity: 'atencao', keywords: ['crise', 'panico', 'surto', 'desespero'] },
  { key: 'ideacao_suicida', label: 'Ideação suicida', severity: 'critico', keywords: ['suicid', 'me matar', 'se matar', 'tirar a propria vida', 'nao quero mais viver', 'quero morrer'] },
  { key: 'automutilacao', label: 'Automutilação', severity: 'critico', keywords: ['automutil', 'se cortar', 'me cortar', 'se machuca'] },
  { key: 'abuso', label: 'Abuso', severity: 'atencao', keywords: ['abuso', 'abusad', 'assedi'] },
  { key: 'violencia', label: 'Violência', severity: 'atencao', keywords: ['violencia', 'agredi', 'apanha', 'bate nela', 'ameaca'] },
  { key: 'gravidez', label: 'Gravidez', severity: 'atencao', keywords: ['gravid', 'gestante', 'gestacao'] },
  { key: 'emergencia', label: 'Emergência em curso', severity: 'critico', keywords: ['emergencia', 'urgente', 'risco de vida'] },
  { key: 'juridico', label: 'Questões jurídicas', severity: 'atencao', keywords: ['processo', 'advogad', 'juridic', 'justica', 'divorcio', 'heranca'] },
  { key: 'financeiro_alto_risco', label: 'Decisões financeiras de alto risco', severity: 'atencao', keywords: ['investir', 'investimento', 'emprestimo', 'cripto', 'acoes', 'apostar', 'aposta', 'vender a casa'] },
];

export const TRIAGE_WARNING =
  'Esta questão pode envolver uma área que necessita de avaliação profissional especializada. O MIRA pode continuar auxiliando na dimensão de bem-estar e reflexão, mas a leitura radiestésica não deve ser utilizada como diagnóstico ou substituição de acompanhamento profissional.';

export const CRITICAL_GUIDANCE = [
  'Situação crítica identificada: a investigação radiestésica fica bloqueada nesta sessão.',
  'Priorize o acolhimento e oriente a busca imediata de ajuda profissional.',
  'CVV — Centro de Valorização da Vida: ligue 188 (24h, gratuito) ou acesse cvv.org.br.',
  'SAMU: 192 · Polícia: 190 · Em risco imediato, procure a emergência mais próxima.',
  'Você ainda pode registrar observações e encerrar a sessão.',
];

export type TriageLevel = 'nenhum' | 'atencao' | 'critico';

export interface TriageResult {
  level: TriageLevel;
  flags: string[];
  messages: string[];
}

/** Sugere itens a partir do texto livre (a terapeuta confirma). */
export function suggestTriageFlags(text: string): string[] {
  const t = ` ${normalize(text)} `;
  return TRIAGE_FLAGS.filter((f) => f.keywords.some((k) => t.includes(k))).map((f) => f.key);
}

export function evaluateTriage(flags: string[]): TriageResult {
  const defs = TRIAGE_FLAGS.filter((f) => flags.includes(f.key));
  const unknown = flags.filter((k) => !TRIAGE_FLAGS.some((f) => f.key === k));
  if (unknown.length) throw new Error(`Itens de triagem desconhecidos: ${unknown.join(', ')}`);
  if (defs.some((d) => d.severity === 'critico')) {
    return { level: 'critico', flags, messages: [TRIAGE_WARNING, ...CRITICAL_GUIDANCE] };
  }
  if (defs.length) return { level: 'atencao', flags, messages: [TRIAGE_WARNING] };
  return { level: 'nenhum', flags: [], messages: [] };
}
