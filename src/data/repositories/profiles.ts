import type { Db } from '../supabase/server';
import type { ProfileRow } from '../rows';
import { check } from './_util';

export async function getProfile(db: Db, id: string): Promise<ProfileRow | null> {
  const { data, error } = await db.from('profiles').select('*').eq('id', id).maybeSingle();
  check(error, 'profiles.get');
  return data as ProfileRow | null;
}

export async function listProfiles(db: Db): Promise<ProfileRow[]> {
  const { data, error } = await db.from('profiles').select('*').order('created_at');
  check(error, 'profiles.list');
  return (data ?? []) as ProfileRow[];
}

export async function updateProfileRole(db: Db, id: string, role: ProfileRow['role']): Promise<void> {
  const { error } = await db.from('profiles').update({ role }).eq('id', id);
  check(error, 'profiles.role');
}

export async function updateProfileName(db: Db, id: string, full_name: string): Promise<void> {
  const { error } = await db.from('profiles').update({ full_name }).eq('id', id);
  check(error, 'profiles.name');
}
