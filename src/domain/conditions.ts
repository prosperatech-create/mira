import type { Condition, SessionContext } from './types';

/** Avalia uma condição declarativa contra o contexto da sessão. Determinístico. */
export function evaluateCondition(cond: Condition | undefined, ctx: SessionContext): boolean {
  if (!cond) return true;
  if ('all' in cond) return cond.all.every((c) => evaluateCondition(c, ctx));
  if ('any' in cond) return cond.any.some((c) => evaluateCondition(c, ctx));
  if ('not' in cond) return !evaluateCondition(cond.not, ctx);
  const value = ctx[cond.var];
  if (cond.exists !== undefined) return cond.exists ? value !== undefined && value !== '' : value === undefined || value === '';
  if (cond.eq !== undefined) return value === cond.eq;
  if (cond.neq !== undefined) return value !== cond.neq;
  if (cond.in !== undefined) return value !== undefined && cond.in.includes(value);
  return true;
}

/** Substitui {{var}} pelo valor do contexto (ou por um texto neutro). */
export function renderTemplate(
  template: string,
  ctx: SessionContext,
  extra: Record<string, string> = {},
  fallback = 'este elemento',
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => {
    const v = extra[name] ?? ctx[name];
    return v !== undefined && v !== '' ? v : fallback;
  });
}
