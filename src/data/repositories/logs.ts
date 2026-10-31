import type { Db } from '../supabase/server';
import { logger } from '@/lib/logger';
import { check } from './_util';

export interface AiLogInsert {
  user_id: string; session_id?: string | null; task: string; provider: string; model?: string | null;
  status: 'ok' | 'erro' | 'bloqueado' | 'indisponivel'; latency_ms?: number; input_tokens?: number | null; output_tokens?: number | null;
  guardrail_flags?: string[]; error?: string | null; content?: unknown;
}

/** Logs nunca devem derrubar a operação principal. */
export async function insertAiLog(db: Db, row: AiLogInsert): Promise<void> {
  const { error } = await db.from('ai_logs').insert(row);
  if (error) logger.warn('ai_log.insert_failed', { message: error.message });
}

export async function insertAdminLog(db: Db, row: { actor_id: string; action: string; entity?: string; entity_id?: string | null; details?: Record<string, unknown> }): Promise<void> {
  const { error } = await db.from('admin_logs').insert(row);
  if (error) logger.warn('admin_log.insert_failed', { message: error.message });
}

export async function listAdminLogs(db: Db, limit = 100) {
  const { data, error } = await db.from('admin_logs').select('*, profiles(email)').order('created_at', { ascending: false }).limit(limit);
  check(error, 'admin_logs.list');
  return (data ?? []) as { id: string; action: string; entity: string | null; entity_id: string | null; details: Record<string, unknown>; created_at: string; profiles: { email: string } | null }[];
}

export async function listAiLogs(db: Db, limit = 100) {
  const { data, error } = await db.from('ai_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  check(error, 'ai_logs.list');
  return (data ?? []) as { id: string; task: string; provider: string; model: string | null; status: string; latency_ms: number | null; input_tokens: number | null; output_tokens: number | null; guardrail_flags: string[]; error: string | null; created_at: string }[];
}

export async function getSetting<T>(db: Db, key: string, fallback: T): Promise<T> {
  const { data, error } = await db.from('settings').select('value').eq('key', key).maybeSingle();
  if (error) {
    logger.warn('settings.get_failed', { key, message: error.message });
    return fallback;
  }
  return (data?.value as T) ?? fallback;
}

export async function listSettings(db: Db) {
  const { data, error } = await db.from('settings').select('*').order('key');
  check(error, 'settings.list');
  return (data ?? []) as { key: string; value: unknown; description: string | null; updated_at: string }[];
}

export async function setSetting(db: Db, key: string, value: unknown, userId: string) {
  const { error } = await db.from('settings').update({ value, updated_by: userId }).eq('key', key);
  check(error, 'settings.set');
}
