import 'server-only';
import type { AppCtx } from './context';
import { countClients, recentClients } from '@/data/repositories/clients';
import { listSessions, upcomingFollowups } from '@/data/repositories/sessions';
import { chartUsage, listSessionInterventions } from '@/data/repositories/records';
import { todayISO } from '@/lib/format';

export async function getDashboard(ctx: AppCtx) {
  const today = todayISO();
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const startOfToday = new Date(`${today}T00:00:00`).toISOString();
  const [todaySessions, active, recent, followups, charts, last30, totalClients] = await Promise.all([
    listSessions(ctx.db, { since: startOfToday, limit: 20 }),
    listSessions(ctx.db, { phases: ['objetivo', 'preparacao', 'triagem', 'investigacao', 'reavaliacao', 'registro'], limit: 20 }),
    recentClients(ctx.db, 6),
    upcomingFollowups(ctx.db, today, 6),
    chartUsage(ctx.db, 5),
    listSessions(ctx.db, { since: since30, limit: 200 }),
    countClients(ctx.db),
  ]);
  const inProgress = active.filter((s) => s.started_at >= startOfToday);
  const pending = active.filter((s) => s.started_at < startOfToday);
  const recentInterventions = await listSessionInterventions(ctx.db, last30.slice(0, 30).map((s) => s.id));

  const perClient = new Map<string, { name: string; id: string; count: number }>();
  for (const s of last30) {
    if (!s.clients) continue;
    const cur = perClient.get(s.client_id) ?? { name: s.clients.full_name, id: s.client_id, count: 0 };
    cur.count++;
    perClient.set(s.client_id, cur);
  }

  return {
    todaySessions,
    inProgress,
    pending,
    recentClients: recent,
    followups,
    charts,
    recentInterventions: recentInterventions.slice(-5).reverse(),
    evolution: [...perClient.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    totals: { clients: totalClients, sessions30: last30.length, closed30: last30.filter((s) => s.phase === 'encerrada').length },
  };
}
