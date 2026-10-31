'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { act } from './_act';
import * as uc from '@/application/clients';
import { noteSchema } from '@/application/schemas';

function formToClient(fd: FormData) {
  const get = (k: string) => (fd.get(k) as string | null) ?? undefined;
  return {
    full_name: get('full_name'),
    internal_code: get('internal_code'),
    birth_date: get('birth_date'),
    phone: get('phone'),
    email: get('email'),
    profession: get('profession'),
    observations: get('observations'),
    private_notes: get('private_notes'),
    consent: fd.get('consent') === 'on' ? true : undefined,
  };
}

export async function createClientAction(_prev: { error?: string } | undefined, fd: FormData): Promise<{ error?: string }> {
  const r = await act((ctx) => uc.createClient(ctx, formToClient(fd)));
  if (!r.ok) return { error: r.error };
  const next = fd.get('next');
  redirect(next === 'atendimento' ? `/atendimentos/novo?cliente=${r.data.id}` : `/clientes/${r.data.id}`);
}

export async function updateClientAction(id: string, _prev: { error?: string } | undefined, fd: FormData): Promise<{ error?: string }> {
  const r = await act((ctx) => uc.updateClient(ctx, id, formToClient(fd)));
  if (!r.ok) return { error: r.error };
  redirect(`/clientes/${id}`);
}

export async function deleteClientAction(id: string) {
  const r = await act((ctx) => uc.deleteClient(ctx, id));
  if (!r.ok) return r;
  revalidatePath('/clientes');
  redirect('/clientes');
}

export async function addNoteAction(input: { clientId: string; sessionId?: string | null; content: string }) {
  return act(async (ctx) => {
    await uc.addNote(ctx, noteSchema.parse(input));
    revalidatePath(`/clientes/${input.clientId}`);
  });
}

export async function listSessionNotesAction(sessionId: string) {
  return act((ctx) => uc.listDecryptedNotes(ctx, { sessionId }));
}
