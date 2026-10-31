'use server';
import { revalidatePath } from 'next/cache';
import { act } from './_act';
import { auditQuestion, auditSession } from '@/application/audits';
import { chat } from '@/application/assistant';
import { generateReports, updateClientSummary } from '@/application/reports';

export async function auditQuestionAction(input: { question: string; sessionId?: string | null }) {
  return act((ctx) => auditQuestion(ctx, input));
}
export async function chatAction(input: { message: string; sessionId?: string | null; history: { role: 'user' | 'assistant'; content: string }[] }) {
  return act((ctx) => chat(ctx, input));
}
export async function auditSessionAction(sessionId: string) {
  return act(async (ctx) => {
    const r = await auditSession(ctx, sessionId);
    revalidatePath(`/atendimentos/${sessionId}/relatorio`);
    return r;
  });
}
export async function regenerateReportsAction(sessionId: string, aiSummary: boolean) {
  return act(async (ctx) => {
    const r = await generateReports(ctx, sessionId, { aiSummary });
    revalidatePath(`/atendimentos/${sessionId}/relatorio`);
    return { aiNote: r.aiNote };
  });
}
export async function updateClientSummaryAction(sessionId: string, summary: string) {
  return act(async (ctx) => {
    await updateClientSummary(ctx, sessionId, summary);
    revalidatePath(`/atendimentos/${sessionId}/relatorio`);
  });
}
