/**
 * Linguagem segura para relatórios: suaviza afirmações absolutas e falsas precisões.
 * Aplicada ao relatório do cliente (determinístico) e como pós-checagem da IA.
 */
export const CLIENT_REPORT_DISCLAIMER =
  'Este relatório descreve uma sessão de radiestesia, prática integrativa de bem-estar. As observações refletem leituras dentro do método utilizado e não constituem diagnóstico médico, psicológico ou de qualquer outra natureza, nem substituem acompanhamento profissional.';

const REPLACEMENTS: [RegExp, string][] = [
  [/\s*\b(em\s+)?\d{1,3}([.,]\d+)?\s*%/g, ''],
  [/\bbloquead[oa]s?\b/gi, 'em atenção'],
  [/\bdescobrimos a causa( real)?\b/gi, 'levantamos uma hipótese de possível origem simbólico-energética'],
  [/\ba causa (real )?(é|foi)\b/gi, 'uma hipótese de possível origem é'],
  [/\bcom certeza\b/gi, 'possivelmente'],
  [/\bcomprovad[oa]\b/gi, 'observado na leitura'],
];

export function softenForClient(text: string): string {
  return REPLACEMENTS.reduce((acc, [re, rep]) => acc.replace(re, rep), text);
}

/** Frase padrão para descrever um elemento investigado no relatório do cliente. */
export function clientPhraseForElement(element: string): string {
  return `Durante a leitura radiestésica, ${element.toLowerCase().startsWith('chakra') ? 'o ' : ''}${element} apareceu como uma área de atenção dentro do método utilizado.`;
}
