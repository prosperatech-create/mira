import type { Db } from '../supabase/server';
import type { ClientRow } from '../rows';
import { check } from './_util';

export type ClientInsert = Omit<ClientRow, 'id' | 'created_at' | 'updated_at'>;
export type ClientUpdate = Partial<Omit<ClientRow, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>;

export async function listClients(db: Db, search?: string): Promise<ClientRow[]> {
  let q = db.from('clients').select('*').order('full_name');
  if (search?.trim()) {
    const s = search.trim().replace(/[%,()]/g, ' ');
    q = q.or(`full_name.ilike.%${s}%,internal_code.ilike.%${s}%`);
  }
  const { data, error } = await q.limit(200);
  check(error, 'clients.list');
  return (data ?? []) as ClientRow[];
}

export async function recentClients(db: Db, limit = 5): Promise<ClientRow[]> {
  const { data, error } = await db.from('clients').select('*').order('updated_at', { ascending: false }).limit(limit);
  check(error, 'clients.recent');
  return (data ?? []) as ClientRow[];
}

export async function getClient(db: Db, id: string): Promise<ClientRow | null> {
  const { data, error } = await db.from('clients').select('*').eq('id', id).maybeSingle();
  check(error, 'clients.get');
  return data as ClientRow | null;
}

export async function insertClient(db: Db, row: ClientInsert): Promise<ClientRow> {
  const { data, error } = await db.from('clients').insert(row).select('*').single();
  check(error, 'clients.insert');
  return data as ClientRow;
}

export async function updateClient(db: Db, id: string, patch: ClientUpdate): Promise<void> {
  const { error } = await db.from('clients').update(patch).eq('id', id);
  check(error, 'clients.update');
}

export async function deleteClient(db: Db, id: string): Promise<void> {
  const { error } = await db.from('clients').delete().eq('id', id);
  check(error, 'clients.delete');
}

export async function countClients(db: Db): Promise<number> {
  const { count, error } = await db.from('clients').select('id', { count: 'exact', head: true });
  check(error, 'clients.count');
  return count ?? 0;
}
