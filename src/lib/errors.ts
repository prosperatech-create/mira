/** Erros de aplicação com mensagens seguras para a interface. */
export type ErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'FORBIDDEN' | 'UNAUTHENTICATED' | 'CONFLICT' | 'AI_UNAVAILABLE' | 'INTERNAL';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what: string) => new AppError('NOT_FOUND', `${what} não encontrado(a).`);
export const forbidden = (msg = 'Você não tem permissão para esta ação.') => new AppError('FORBIDDEN', msg);
export const validation = (msg: string, details?: unknown) => new AppError('VALIDATION', msg, details);
export const conflict = (msg: string) => new AppError('CONFLICT', msg);

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; code: ErrorCode };
