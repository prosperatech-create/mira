import 'server-only';
import { getCtx, toResult, type AppCtx } from '@/application/context';
import type { Result } from '@/lib/errors';

/** Envolve um caso de uso: autentica, executa e devolve Result serializável. */
export function act<T>(fn: (ctx: AppCtx) => Promise<T>): Promise<Result<T>> {
  return toResult(async () => fn(await getCtx()));
}
