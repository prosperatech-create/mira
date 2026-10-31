import Link from 'next/link';
import { pageCtx } from '@/application/page';
import { getDashboard } from '@/application/dashboard';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
import { Badge, EmptyState } from '@/components/ui/misc';
import { PhaseBadge } from '@/components/session/phase-badge';
import { formatDate, formatDateTime } from '@/lib/format';

export const metadata = { title: 'Início' };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default async function DashboardPage() {
  const ctx = await pageCtx();
  const d = await getDashboard(ctx);
  const firstName = ctx.user.fullName.split(/[\s@]/)[0];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-gradient-to-br from-sage-100 via-sand-50 to-lavender-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ink-500">{greeting()},</p>
          <h1 className="font-serif text-3xl text-ink-900">{firstName}</h1>
          <p className="mt-1 max-w-md text-sm text-ink-700">A terapeuta decide. O pêndulo é operado por você. O MIRA organiza o raciocínio.</p>
        </div>
        <LinkButton href="/atendimentos/novo" size="lg" className="w-full sm:w-auto">
          + Novo atendimento
        </LinkButton>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Clientes', d.totals.clients],
          ['Sessões (30 dias)', d.totals.sessions30],
          ['Encerradas (30 dias)', d.totals.closed30],
        ].map(([label, value]) => (
          <Card key={label} className="p-4 text-center">
            <p className="font-serif text-2xl text-sage-700">{value}</p>
            <p className="text-xs text-ink-500">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Atendimentos de hoje" subtitle="Sessões iniciadas hoje" />
          <CardBody>
            {d.todaySessions.length === 0 ? (
              <EmptyState>Nenhum atendimento hoje ainda.</EmptyState>
            ) : (
              <ul className="divide-y divide-sand-200">
                {d.todaySessions.map((s) => (
                  <li key={s.id}>
                    <Link href={s.phase === 'encerrada' ? `/atendimentos/${s.id}/relatorio` : `/atendimentos/${s.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-sand-50">
                      <div className="min-w-0">
                        <p className="font-medium">{s.clients?.full_name}</p>
                        <p className="truncate text-sm text-ink-500">{s.objective ?? s.complaint_text}</p>
                      </div>
                      <PhaseBadge phase={s.phase} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Sessões em andamento" subtitle="Continue de onde parou" />
          <CardBody>
            {d.inProgress.length + d.pending.length === 0 ? (
              <EmptyState>Nenhuma sessão em aberto.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {[...d.inProgress, ...d.pending].map((s) => (
                  <li key={s.id}>
                    <Link href={`/atendimentos/${s.id}`} className="flex items-center justify-between rounded-xl bg-sand-50 px-3 py-2 hover:bg-sand-100">
                      <span className="truncate text-sm">{s.clients?.full_name}</span>
                      {d.pending.includes(s) ? <Badge tone="amber">Pendente</Badge> : <PhaseBadge phase={s.phase} />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Clientes recentes" action={<Link href="/clientes" className="text-sm text-sage-700">Ver todos</Link>} />
          <CardBody>
            {d.recentClients.length === 0 ? (
              <EmptyState>
                Nenhum cliente ainda. <Link className="text-sage-700 underline" href="/clientes/novo">Cadastrar</Link>
              </EmptyState>
            ) : (
              <ul className="space-y-1">
                {d.recentClients.map((c) => (
                  <li key={c.id}>
                    <Link href={`/clientes/${c.id}`} className="flex justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-sand-50">
                      <span>{c.full_name}</span>
                      <span className="text-ink-500">{c.internal_code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Próximos acompanhamentos" subtitle="Reavaliações agendadas" />
          <CardBody>
            {d.followups.length === 0 ? (
              <EmptyState>Nenhuma reavaliação agendada.</EmptyState>
            ) : (
              <ul className="space-y-1 text-sm">
                {d.followups.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <Link href={`/clientes/${s.client_id}`} className="hover:underline">{s.clients?.full_name}</Link>
                    <span className="text-ink-500">{formatDate(s.next_followup_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Gráficos mais utilizados" />
          <CardBody>
            {d.charts.length === 0 ? (
              <EmptyState>Os gráficos registrados nas intervenções aparecerão aqui.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {d.charts.map((c) => (
                  <li key={c.name} className="flex items-center gap-3 text-sm">
                    <span className="flex-1">{c.name}</span>
                    <span className="h-2 rounded-full bg-sage-300" style={{ width: `${Math.max(12, (c.count / d.charts[0].count) * 80)}px` }} />
                    <span className="w-6 text-right text-ink-500">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Intervenções recentes" subtitle="Protocolos completos chegam na fase 2" />
          <CardBody>
            {d.recentInterventions.length === 0 ? (
              <EmptyState>Nenhuma intervenção registrada.</EmptyState>
            ) : (
              <ul className="space-y-1 text-sm">
                {d.recentInterventions.map((i) => (
                  <li key={i.id} className="flex justify-between gap-2">
                    <span>{i.interventions?.name}{i.charts ? ` · ${i.charts.name}` : ''}</span>
                    <span className="text-ink-500">{formatDateTime(i.created_at).slice(0, 5)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Acompanhamento de clientes" subtitle="Sessões nos últimos 30 dias" />
          <CardBody>
            {d.evolution.length === 0 ? (
              <EmptyState>Sem sessões recentes.</EmptyState>
            ) : (
              <ul className="space-y-1 text-sm">
                {d.evolution.map((e) => (
                  <li key={e.id} className="flex justify-between">
                    <Link href={`/clientes/${e.id}`} className="hover:underline">{e.name}</Link>
                    <span className="text-ink-500">{e.count} sessão(ões)</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-500">Frequência de sessões não indica evolução por si só. Veja a linha do tempo de cada cliente.</p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Biblioteca MIRA" />
          <CardBody className="space-y-2 text-sm text-ink-700">
            <p>Biblioteca de gráficos, protocolos, biômetros e Academia MIRA chegam na fase 2.</p>
            <p>Enquanto isso, use a <Link href="/mira-ia" className="text-sage-700 underline">MIRA IA</Link> com <code className="rounded bg-sand-100 px-1">/estudar</code> ou <code className="rounded bg-sand-100 px-1">/grafico</code>.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
