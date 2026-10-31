import 'server-only';
import { z } from 'zod';
import { requireAdmin, type AppCtx } from './context';
import { listProfiles, updateProfileRole } from '@/data/repositories/profiles';
import { insertAdminLog, listAdminLogs, listAiLogs, listSettings, setSetting } from '@/data/repositories/logs';
import { listTrees } from '@/data/repositories/trees';
import { getProvider } from '@/ai/providers';
import { PROMPT_VERSION } from '@/ai/guardrails';
import { PROMPTS_VERSION } from '@/ai/prompts';
import { validation } from '@/lib/errors';

export async function getAdminOverview(ctx: AppCtx) {
  requireAdmin(ctx);
  const provider = getProvider();
  const [users, settings, adminLogs, aiLogs, trees] = await Promise.all([
    listProfiles(ctx.db),
    listSettings(ctx.db),
    listAdminLogs(ctx.db, 50),
    listAiLogs(ctx.db, 50),
    listTrees(ctx.db),
  ]);
  return {
    users,
    settings,
    adminLogs,
    aiLogs,
    trees,
    ai: { provider: provider?.name ?? 'nenhum', model: provider?.model ?? null, promptVersion: `${PROMPT_VERSION} / ${PROMPTS_VERSION}` },
  };
}

export async function setUserRole(ctx: AppCtx, userId: string, role: string) {
  requireAdmin(ctx);
  const r = z.enum(['terapeuta', 'admin']).parse(role);
  if (userId === ctx.user.id && r !== 'admin') throw validation('Você não pode remover seu próprio acesso de administrador.');
  await updateProfileRole(ctx.db, userId, r);
  await insertAdminLog(ctx.db, { actor_id: ctx.user.id, action: 'user.role', entity: 'profiles', entity_id: userId, details: { role: r } });
}

const BOOLEAN_SETTINGS = ['ai_enabled', 'ai_log_content'];

export async function toggleSetting(ctx: AppCtx, key: string, value: boolean) {
  requireAdmin(ctx);
  if (!BOOLEAN_SETTINGS.includes(key)) throw validation('Configuração inválida.');
  await setSetting(ctx.db, key, value, ctx.user.id);
  await insertAdminLog(ctx.db, { actor_id: ctx.user.id, action: 'settings.update', entity: 'settings', details: { key, value } });
}
