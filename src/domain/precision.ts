/**
 * Alerta de falsa precisão (tempo de aplicação, percentuais).
 */
import { normalize } from './text';

export const PRECISION_WARNING = 'Esse nível de precisão é realmente necessário para a decisão terapêutica?';

export function hasExcessivePrecision(input: string | null | undefined): boolean {
  if (!input) return false;
  const t = normalize(input);
  if (/\d{1,2}:\d{2}:\d{2}/.test(t)) return true; // 17:23:14
  if (/segundo/.test(t) && /(hora|minuto)/.test(t)) return true; // 17 horas, 23 minutos e 14 segundos
  if (/\d+[.,]\d{2,}\s*%/.test(t)) return true; // 73,45%
  if (/\d+\s*(minutos?|min)\b/.test(t) && /\d+\s*(horas?|h)\b/.test(t) && /\d+\s*(dias?)\b/.test(t)) return true;
  return false;
}
