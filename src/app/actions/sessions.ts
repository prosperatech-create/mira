'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { act } from './_act';
import * as uc from '@/application/sessions';

export async function startSessionAction(_prev: { error?: string } | undefined, fd: FormData): Promise<{ error?: string }> {
  const r = await act((ctx) => uc.startSession(ctx, { clientId: fd.get('clientId'), complaint: fd.get('complaint'), mode: fd.get('mode') }));
  if (!r.ok) return { error: r.error };
  redirect(`/atendimentos/${r.data.id}`);
}

const refresh = (id: string) => revalidatePath(`/atendimentos/${id}`);

export async function approveObjectiveAction(input: { sessionId: string; objective: string }) {
  return act(async (ctx) => { await uc.approveObjective(ctx, input); refresh(input.sessionId); });
}
export async function preparationAction(input: { sessionId: string; neutral: boolean; expecting: boolean; tired: boolean; priorKnowledge: boolean }) {
  return act(async (ctx) => { const r = await uc.submitPreparation(ctx, input); refresh(input.sessionId); return r; });
}
export async function triageAction(input: { sessionId: string; flags: string[]; notes?: string; acknowledged: boolean }) {
  return act(async (ctx) => { const r = await uc.submitTriage(ctx, input); refresh(input.sessionId); return r; });
}
export async function answerAction(input: unknown) {
  return act(async (ctx) => { const r = await uc.answerNode(ctx, input); refresh((input as { sessionId: string }).sessionId); return r; });
}
export async function undoAction(sessionId: string) {
  return act(async (ctx) => { await uc.undoLastStep(ctx, sessionId); refresh(sessionId); });
}
export async function jumpAction(sessionId: string, nodeKey: string) {
  return act(async (ctx) => { await uc.jumpToNode(ctx, sessionId, nodeKey); refresh(sessionId); });
}
export async function finishInvestigationAction(sessionId: string) {
  return act(async (ctx) => { await uc.finishInvestigation(ctx, sessionId); refresh(sessionId); });
}
export async function reevaluationNotesAction(input: { sessionId: string; before?: string; after?: string; notes?: string }) {
  return act(async (ctx) => { await uc.saveReevaluationNotes(ctx, input); });
}
export async function saveRecordAction(input: Record<string, string | undefined> & { sessionId: string }) {
  return act(async (ctx) => { await uc.saveRecord(ctx, input); });
}
export async function closeSessionAction(input: Record<string, string | undefined> & { sessionId: string }) {
  const r = await act(async (ctx) => { await uc.closeSession(ctx, input); });
  if (!r.ok) return r;
  redirect(`/atendimentos/${input.sessionId}/relatorio`);
}
export async function cancelSessionAction(sessionId: string) {
  return act(async (ctx) => { await uc.cancelSession(ctx, sessionId); refresh(sessionId); });
}
