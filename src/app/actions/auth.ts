'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServer } from '@/data/supabase/server';
import { logger } from '@/lib/logger';

const loginSchema = z.object({ email: z.string().trim().email('E-mail inválido.'), password: z.string().min(6, 'Senha muito curta.') });

export async function signInAction(_prev: { error?: string } | undefined, fd: FormData): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({ email: fd.get('email'), password: fd.get('password') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const db = await createSupabaseServer();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) {
    logger.warn('auth.login_failed', { reason: error.code ?? error.message });
    return { error: 'E-mail ou senha incorretos.' };
  }
  const next = String(fd.get('next') ?? '/');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function signOutAction() {
  const db = await createSupabaseServer();
  await db.auth.signOut();
  redirect('/login');
}
