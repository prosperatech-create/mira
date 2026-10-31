/**
 * Transformador de queixa em objetivo — fallback determinístico (sem IA).
 */
import { normalize } from './text';

const THEMES: [string[], string][] = [
  [['financ', 'dinheiro', 'prosper', 'divida', 'conta'], 'à experiência financeira atual'],
  [['marido', 'esposa', 'namor', 'relacion', 'casamento', 'brig'], 'à experiência atual em seus relacionamentos'],
  [['trabalho', 'emprego', 'carreira', 'profiss', 'chefe'], 'à experiência profissional atual'],
  [['ansied', 'medo', 'triste', 'cansad', 'estress', 'emoc'], 'ao bem-estar emocional atual'],
  [['estagn', 'nada da certo', 'travad', 'parad'], 'à sensação atual de estagnação'],
  [['casa', 'ambiente', 'quarto', 'escritorio', 'loja'], 'à harmonização do ambiente'],
  [['famil', 'mae', 'pai', 'filh'], 'às relações familiares'],
  [['espiritual', 'proposito', 'sentido'], 'à vivência de propósito e espiritualidade'],
];

export function suggestObjectiveFallback(complaint: string): string {
  const t = normalize(complaint);
  const found = THEMES.filter(([k]) => k.some((w) => t.includes(w))).map(([, label]) => label);
  if (found.length === 0) return 'Investigar fatores simbólico-energéticos prioritários relacionados ao objetivo trazido pela consulente nesta sessão.';
  const joined = found.length === 1 ? found[0] : `${found.slice(0, -1).join(', ')} e ${found[found.length - 1]}`;
  return `Investigar fatores simbólico-energéticos prioritários relacionados ${joined} da consulente.`;
}
