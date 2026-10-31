import type { PostgrestError } from '@supabase/supabase-js';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/** Converte erros do Postgrest em AppError, sem vazar detalhes internos para a UI. */
export function check(error: PostgrestError | null, op: string): void {
  if (!error) return;
  logger.error('db.error', { op, code: error.code, message: error.message });
  if (error.code === '42501' || error.message.includes('row-level security')) throw new AppError('FORBIDDEN', 'Acesso negado a este registro.');
  if (error.code === '23505') throw new AppError('CONFLICT', 'Já existe um registro com esses dados (ex.: código interno repetido).');
  if (error.code === '23514') throw new AppError('VALIDATION', 'Os dados não atendem às regras do sistema.');
  throw new AppError('INTERNAL', 'Erro ao acessar o banco de dados.');
}
