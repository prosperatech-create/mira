import 'server-only';
/**
 * Serviço central de IA — o ÚNICO ponto do sistema que conversa com modelos.
 * Responsável por: provedor, timeout, guardrails, parse/validação JSON e logs.
 */
import type { z } from 'zod';
import type { Db } from '@/data/supabase/server';
import { getSetting, insertAiLog } from '@/data/repositories/logs';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { getProvider } from './providers';
import { CRISIS_RESPONSE, SYSTEM_BASE, checkInput, checkOutput } from './guardrails';
import type { AIMessage } from './types';

export type AITask = 'objetivo' | 'auditor_pergunta' | 'auditoria_sessao' | 'chat' | 'resumo_cliente';

export type AIOutcome<T> =
  | { ok: true; value: T; flags: string[]; model: string }
  | { ok: false; reason: 'indisponivel' | 'desativada' | 'erro' | 'bloqueado' | 'crise'; message: string };

interface BaseOpts {
  db: Db;
  userId: string;
  sessionId?: string | null;
  task: AITask;
  messages: AIMessage[];
  systemAddendum?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function aiAvailable(db: Db): Promise<boolean> {
  return !!getProvider() && (await getSetting<boolean>(db, 'ai_enabled', true));
}

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('A resposta da IA não contém JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

async function run<T>(opts: BaseOpts, parse: (text: string) => T): Promise<AIOutcome<T>> {
  const provider = getProvider();
  if (!provider) return { ok: false, reason: 'indisponivel', message: 'IA não configurada. O MIRA segue funcionando com regras e heurísticas.' };
  if (!(await getSetting<boolean>(opts.db, 'ai_enabled', true)))
    return { ok: false, reason: 'desativada', message: 'IA desativada pelo administrador.' };

  const input = checkInput(opts.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n'));
  if (input.crisis) {
    await insertAiLog(opts.db, { user_id: opts.userId, session_id: opts.sessionId, task: opts.task, provider: provider.name, model: provider.model, status: 'bloqueado', guardrail_flags: input.flags });
    return { ok: false, reason: 'crise', message: CRISIS_RESPONSE };
  }

  const logContent = await getSetting<boolean>(opts.db, 'ai_log_content', false);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), serverEnv().MIRA_AI_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await provider.complete({
      system: opts.systemAddendum ? `${SYSTEM_BASE}\n\n${opts.systemAddendum}` : SYSTEM_BASE,
      messages: opts.messages,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      json: parse !== identity,
      signal: controller.signal,
    });
    const out = checkOutput(res.text);
    const latency = Date.now() - started;
    const base = {
      user_id: opts.userId, session_id: opts.sessionId, task: opts.task, provider: provider.name, model: res.model,
      latency_ms: latency, input_tokens: res.inputTokens ?? null, output_tokens: res.outputTokens ?? null, guardrail_flags: out.flags,
      content: logContent ? { messages: opts.messages, output: res.text } : undefined,
    };
    if (out.blocked) {
      await insertAiLog(opts.db, { ...base, status: 'bloqueado' });
      return { ok: false, reason: 'bloqueado', message: out.text };
    }
    const value = parse(parse === identity ? out.text : res.text);
    await insertAiLog(opts.db, { ...base, status: 'ok' });
    return { ok: true, value, flags: out.flags, model: res.model };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('ai.error', { task: opts.task, provider: provider.name, message });
    await insertAiLog(opts.db, { user_id: opts.userId, session_id: opts.sessionId, task: opts.task, provider: provider.name, model: provider.model, status: 'erro', latency_ms: Date.now() - started, error: message.slice(0, 300) });
    return { ok: false, reason: 'erro', message: controller.signal.aborted ? 'A IA demorou demais para responder.' : 'Não foi possível obter resposta da IA agora.' };
  } finally {
    clearTimeout(timer);
  }
}

const identity = (t: string) => t;

/** Tarefa de texto livre (chat). */
export function runText(opts: BaseOpts): Promise<AIOutcome<string>> {
  return run(opts, identity);
}

/** Tarefa com saída JSON validada por schema zod. */
export function runJson<S extends z.ZodTypeAny>(opts: BaseOpts, schema: S): Promise<AIOutcome<z.infer<S>>> {
  return run(opts, (text) => schema.parse(extractJson(text)));
}
