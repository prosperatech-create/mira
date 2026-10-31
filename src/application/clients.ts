import 'server-only';
import type { z } from 'zod';
import type { AppCtx } from './context';
import { clientCreateSchema, clientInputSchema } from './schemas';
import * as repo from '@/data/repositories/clients';
import { listSessions, listStepsForSessions } from '@/data/repositories/sessions';
import { listHypotheses, listNotes, listSessionInterventions, insertNote } from '@/data/repositories/records';
import { getSetting, insertAdminLog } from '@/data/repositories/logs';
import { decrypt, encrypt } from '@/data/crypto';
import { notFound } from '@/lib/errors';

function generateCode(): string {
  const n = Math.floor(Math.random() * 9000 + 1000);
  const y = new Date().getFullYear().toString().slice(2);
  return `M${y}-${n}`;
}

export async function createClient(ctx: AppCtx, raw: unknown) {
  const input = clientCreateSchema.parse(raw);
  const consentVersion = await getSetting<string>(ctx.db, 'consent_text_version', 'v1');
  const row = await repo.insertClient(ctx.db, {
    owner_id: ctx.user.id,
    internal_code: input.internal_code ?? generateCode(),
    full_name: input.full_name,
    birth_date: input.birth_date,
    phone: input.phone,
    email: input.email,
    profession: input.profession,
    observations: input.observations,
    private_notes_enc: input.private_notes ? encrypt(input.private_notes) : null,
    consent_given: true,
    consent_at: new Date().toISOString(),
    consent_text_version: consentVersion,
  });
  await insertAdminLog(ctx.db, { actor_id: ctx.user.id, action: 'client.create', entity: 'clients', entity_id: row.id });
  return row;
}

export async function updateClient(ctx: AppCtx, id: string, raw: unknown) {
  const input: z.infer<typeof clientInputSchema> = clientInputSchema.parse(raw);
  const existing = await repo.getClient(ctx.db, id);
  if (!existing) throw notFound('Cliente');
  await repo.updateClient(ctx.db, id, {
    full_name: input.full_name,
    internal_code: input.internal_code ?? existing.internal_code,
    birth_date: input.birth_date,
    phone: input.phone,
    email: input.email,
    profession: input.profession,
    observations: input.observations,
    private_notes_enc: input.private_notes ? encrypt(input.private_notes) : null,
  });
}

export async function deleteClient(ctx: AppCtx, id: string) {
  const existing = await repo.getClient(ctx.db, id);
  if (!existing) throw notFound('Cliente');
  await repo.deleteClient(ctx.db, id);
  // O log não guarda dados pessoais, apenas o fato e o código interno.
  await insertAdminLog(ctx.db, { actor_id: ctx.user.id, action: 'client.delete', entity: 'clients', entity_id: id, details: { internal_code: existing.internal_code } });
}

export async function addNote(ctx: AppCtx, input: { clientId: string; sessionId?: string | null; content: string }) {
  await insertNote(ctx.db, { owner_id: ctx.user.id, client_id: input.clientId, session_id: input.sessionId ?? null, content_enc: encrypt(input.content) });
}

export async function listDecryptedNotes(ctx: AppCtx, filter: { clientId?: string; sessionId?: string }) {
  const notes = await listNotes(ctx.db, filter);
  return notes.map((n) => ({ id: n.id, sessionId: n.session_id, createdAt: n.created_at, content: safeDecrypt(n.content_enc) }));
}

function safeDecrypt(v: string | null): string {
  try {
    return decrypt(v);
  } catch {
    return '[não foi possível descriptografar esta anotação]';
  }
}

function countBy(values: string[]): { label: string; count: number }[] {
  const m = new Map<string, number>();
  values.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

/** Ficha completa: dados, linha do tempo, recorrências (sem inferir causalidade). */
export async function getClientProfile(ctx: AppCtx, id: string) {
  const client = await repo.getClient(ctx.db, id);
  if (!client) throw notFound('Cliente');
  const sessions = await listSessions(ctx.db, { clientId: id, limit: 100 });
  const ids = sessions.map((s) => s.id);
  const [steps, hypotheses, interventions, notes] = await Promise.all([
    listStepsForSessions(ctx.db, ids),
    listHypotheses(ctx.db, ids),
    listSessionInterventions(ctx.db, ids),
    listDecryptedNotes(ctx, { clientId: id }),
  ]);

  const chakras: string[] = [];
  const areas: string[] = [];
  const elementsBySession = new Map<string, Set<string>>();
  for (const s of steps) {
    const el = s.context_after?.element;
    if (!el) continue;
    const set = elementsBySession.get(s.session_id) ?? new Set<string>();
    set.add(el);
    elementsBySession.set(s.session_id, set);
  }
  for (const set of elementsBySession.values()) {
    for (const el of set) {
      if (el.startsWith('Chakra')) chakras.push(el);
      else if (el.startsWith('Área:')) areas.push(el.replace('Área: ', ''));
    }
  }

  return {
    client: { ...client, private_notes: safeDecrypt(client.private_notes_enc), private_notes_enc: undefined },
    sessions: sessions.map((s) => ({
      ...s,
      elements: [...(elementsBySession.get(s.id) ?? [])],
      interventions: interventions.filter((i) => i.session_id === s.id),
      hypotheses: hypotheses.filter((h) => h.session_id === s.id),
    })),
    notes,
    recurrences: {
      objectives: countBy(sessions.map((s) => s.objective ?? s.complaint_text).filter(Boolean)).slice(0, 5),
      chakras: countBy(chakras).slice(0, 7),
      areas: countBy(areas).slice(0, 7),
      charts: countBy(interventions.map((i) => i.charts?.name).filter((x): x is string => !!x)).slice(0, 5),
      interventions: countBy(interventions.map((i) => i.interventions?.name).filter((x): x is string => !!x)).slice(0, 5),
    },
  };
}

/** Exportação LGPD: todos os dados da cliente em JSON (descriptografados). */
export async function exportClientData(ctx: AppCtx, id: string) {
  const profile = await getClientProfile(ctx, id);
  const ids = profile.sessions.map((s) => s.id);
  const steps = await listStepsForSessions(ctx.db, ids);
  await insertAdminLog(ctx.db, { actor_id: ctx.user.id, action: 'client.export', entity: 'clients', entity_id: id });
  return {
    exported_at: new Date().toISOString(),
    system: 'MIRA — Método Integrado de Radiestesia Aplicada',
    client: profile.client,
    notes: profile.notes,
    sessions: profile.sessions.map((s) => ({
      ...s,
      clients: undefined,
      steps: steps.filter((st) => st.session_id === s.id).map((st) => ({ seq: st.seq, stage: st.stage, question: st.question_text, answer: st.answer_label, text: st.answer_text, at: st.created_at })),
    })),
  };
}
