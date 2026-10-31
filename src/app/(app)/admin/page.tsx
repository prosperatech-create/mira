import { redirect } from 'next/navigation';
import { pageCtx } from '@/application/page';
import { getAdminOverview } from '@/application/admin';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, PageHeader } from '@/components/ui/misc';
import { RoleSelect, SettingToggle } from '@/components/admin-controls';
import { formatDateTime } from '@/lib/format';

export const metadata = { title: 'Administração' };

export default async function AdminPage() {
  const ctx = await pageCtx();
  if (ctx.user.role !== 'admin') redirect('/');
  const o = await getAdminOverview(ctx);
  return (
    <div className="space-y-5">
      <PageHeader title="Administração" subtitle="Usuários, IA, árvores e logs. Dados clínicos permanecem visíveis apenas para a terapeuta responsável." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Usuários" subtitle="Novos usuários são criados no painel do Supabase (Auth › Add user)." />
          <CardBody>
            <ul className="divide-y divide-sand-200">
              {o.users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div><p className="font-medium">{u.full_name || u.email}</p><p className="text-xs text-ink-500">{u.email}</p></div>
                  <RoleSelect userId={u.id} role={u.role} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Inteligência artificial" />
          <CardBody className="space-y-3 text-sm">
            <p>Provedor: <Badge tone="lavender">{o.ai.provider}</Badge> {o.ai.model && <span className="text-ink-500">· {o.ai.model}</span>}</p>
            <p className="text-xs text-ink-500">Prompts: {o.ai.promptVersion}. Provedor e chave são definidos por variáveis de ambiente no servidor (nunca no navegador).</p>
            {o.settings.filter((s) => typeof s.value === 'boolean').map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3 rounded-xl bg-sand-50 p-3">
                <div><p className="font-mono text-xs">{s.key}</p><p className="text-xs text-ink-500">{s.description}</p></div>
                <SettingToggle k={s.key} value={s.value as boolean} />
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Árvores de investigação" subtitle="Editor visual chega na fase 2; hoje edite pela tabela tree_nodes ou pelo seed." />
          <CardBody>
            <ul className="space-y-1 text-sm">
              {o.trees.map((t) => (
                <li key={t.id} className="flex justify-between"><span>{t.name} <span className="text-ink-500">({t.slug})</span></span><span className="text-ink-500">{t.node_count} nós</span></li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Logs administrativos" />
          <CardBody>
            <ul className="max-h-72 space-y-1 overflow-y-auto text-xs">
              {o.adminLogs.map((l) => (
                <li key={l.id} className="flex justify-between gap-2"><span><span className="font-mono">{l.action}</span> · {l.profiles?.email}</span><span className="text-ink-500">{formatDateTime(l.created_at)}</span></li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Uso da IA" subtitle="Conteúdo não é registrado, salvo se ai_log_content estiver ativado." />
          <CardBody className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-ink-500"><tr><th className="py-1">Quando</th><th>Tarefa</th><th>Status</th><th>Modelo</th><th>Latência</th><th>Tokens</th><th>Guardrails</th></tr></thead>
              <tbody>
                {o.aiLogs.map((l) => (
                  <tr key={l.id} className="border-t border-sand-100">
                    <td className="py-1">{formatDateTime(l.created_at)}</td><td>{l.task}</td>
                    <td><Badge tone={l.status === 'ok' ? 'sage' : l.status === 'bloqueado' ? 'amber' : 'rose'}>{l.status}</Badge></td>
                    <td>{l.model ?? '—'}</td><td>{l.latency_ms ? `${l.latency_ms} ms` : '—'}</td>
                    <td>{l.input_tokens ?? '—'}/{l.output_tokens ?? '—'}</td><td>{l.guardrail_flags.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
