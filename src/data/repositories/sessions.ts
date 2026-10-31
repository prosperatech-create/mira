import type { Db } from '../supabase/server';
import type { SessionRow, StepRow } from '../rows';
import { conflict } from '@/lib/errors';
import { check } from './_util';

export type SessionPatch = Partial<Omit<SessionRow, 'id' | 'owner_id' | 'client_id' | 'created_at' | 'updated_at' | 'version'>>;

export async function insertSession(db: Db, row: Pick<SessionRow, 'owner_id' | 'client_id' | 'mode' | 'complaint_text' | 'objective_suggested'>): Promise<SessionRow> {
  const { data, error } = await db.from('sessions').insert({ ...row, context: { mode: row.mode } }).select('*').single();
  check(error, 'sessions.insert');
  return data as SessionRow;
}

export async function getSession(db: Db, id: string): Promise<SessionRow | null> {
  const { data, error } = await db.from('sessions').select('*').eq('id', id).maybeSingle();
  check(error, 'sessions.get');
  return data as SessionRow | null;
}

/** Atualização com concorrência otimista: falha se outra aba alterou a sessão. */
export async function updateSession(db: Db, s: Pick<SessionRow, 'id' | 'version'>, patch: SessionPatch): Promise<SessionRow> {
  const { data, error } = await db
    .from('sessions')
    .update({ ...patch, version: s.version + 1 })
    .eq('id', s.id)
    .eq('version', s.version)
    .select('*')
    .maybeSingle();
  check(error, 'sessions.update');
  if (!data) throw conflict('A sessão foi alterada em outra janela. Recarregue a página para continuar.');
  return data as SessionRow;
}

export type SessionWithClient = SessionRow & { clients: { id: string; full_name: string; internal_code: string } | null };

export async function listSessions(
  db: Db,
  opts: { clientId?: string; phases?: string[]; since?: string; limit?: number } = {},
): Promise<SessionWithClient[]> {
  let q = db.from('sessions').select('*, clients(id, full_name, internal_code)').order('started_at', { ascending: false });
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  if (opts.phases) q = q.in('phase', opts.phases);
  if (opts.since) q = q.gte('started_at', opts.since);
  const { data, error } = await q.limit(opts.limit ?? 50);
  check(error, 'sessions.list');
  return (data ?? []) as SessionWithClient[];
}

export async function upcomingFollowups(db: Db, fromDate: string, limit = 6): Promise<SessionWithClient[]> {
  const { data, error } = await db
    .from('sessions')
    .select('*, clients(id, full_name, internal_code)')
    .gte('next_followup_date', fromDate)
    .order('next_followup_date')
    .limit(limit);
  check(error, 'sessions.followups');
  return (data ?? []) as SessionWithClient[];
}

export async function deleteSession(db: Db, id: string): Promise<void> {
  const { error } = await db.from('sessions').delete().eq('id', id);
  check(error, 'sessions.delete');
}

// ── passos ──
export async function listSteps(db: Db, sessionId: string): Promise<StepRow[]> {
  const { data, error } = await db.from('session_steps').select('*').eq('session_id', sessionId).order('seq');
  check(error, 'steps.list');
  return (data ?? []) as StepRow[];
}

export async function listStepsForSessions(db: Db, sessionIds: string[]): Promise<StepRow[]> {
  if (!sessionIds.length) return [];
  const { data, error } = await db.from('session_steps').select('*').in('session_id', sessionIds).eq('undone', false).order('seq');
  check(error, 'steps.listMany');
  return (data ?? []) as StepRow[];
}

export async function insertStep(db: Db, row: Omit<StepRow, 'id' | 'created_at' | 'undone'>): Promise<StepRow> {
  const { data, error } = await db.from('session_steps').insert(row).select('*').single();
  check(error, 'steps.insert');
  return data as StepRow;
}

export async function markStepUndone(db: Db, id: string): Promise<void> {
  const { error } = await db.from('session_steps').update({ undone: true }).eq('id', id);
  check(error, 'steps.undo');
}
