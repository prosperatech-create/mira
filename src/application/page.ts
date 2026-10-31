import 'server-only';
import { redirect, notFound as nextNotFound } from 'next/navigation';
import { AppError } from '@/lib/errors';
import { getCtx, type AppCtx } from './context';

/** Contexto para Server Components: redireciona para /login quando não autenticado. */
export async function pageCtx(): Promise<AppCtx> {
  try {
    return await getCtx();
  } catch (err) {
    if (err instanceof AppError && (err.code === 'UNAUTHENTICATED' || err.code === 'FORBIDDEN')) redirect('/login');
    throw err;
  }
}

/** Executa uma leitura e converte NOT_FOUND em 404 do Next. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof AppError && err.code === 'NOT_FOUND') nextNotFound();
    throw err;
  }
}
