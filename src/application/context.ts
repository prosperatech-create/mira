import 'server-only';
import { createSupabaseServer, type Db } from '@/data/supabase/server';
import { getProfile } from '@/data/repositories/profiles';
import { AppError, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { TreeEngineError } from '@/domain/tree-engine';
import { TransitionError } from '@/domain/session-machine';
import { ZodError } from 'zod';

export interface CurrentUser {
  id: string;
  email: string;
  role: 'terapeuta' | 'admin';
  fullName: string;
}

export interface AppCtx {
  db: Db;
  user: CurrentUser;
}

/** Contexto autenticado da requisição. Lança UNAUTHENTICATED sem sessão válida. */
export async function getCtx(): Promise<AppCtx> {
  const db = await createSupabaseServer();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new AppError('UNAUTHENTICATED', 'Sessão expirada. Entre novamente.');
  const profile = await getProfile(db, data.user.id);
  if (!profile || !profile.active) throw new AppError('FORBIDDEN', 'Usuário inativo ou sem perfil.');
  return { db, user: { id: profile.id, email: profile.email, role: profile.role, fullName: profile.full_name || profile.email } };
}

export function requireAdmin(ctx: AppCtx): void {
  if (ctx.user.role !== 'admin') throw new AppError('FORBIDDEN', 'Apenas administradores podem realizar esta ação.');
}

/** Converte qualquer erro em Result amigável (usado pelas Server Actions). */
export async function toResult<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message, code: err.code };
    if (err instanceof TreeEngineError || err instanceof TransitionError) return { ok: false, error: err.message, code: 'VALIDATION' };
    if (err instanceof ZodError) return { ok: false, error: err.issues.map((i) => i.message).join(' · '), code: 'VALIDATION' };
    // redirect()/notFound() do Next precisam propagar
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    logger.error('action.unhandled', { message: err instanceof Error ? err.message : String(err) });
    return { ok: false, error: 'Ocorreu um erro inesperado. Tente novamente.', code: 'INTERNAL' };
  }
}
