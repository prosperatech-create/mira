import Link from 'next/link';
import { pageCtx, orNotFound } from '@/application/page';
import { getClientProfile } from '@/application/clients';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { LinkButton, buttonClass } from '@/components/ui/button';
import { Badge, EmptyState } from '@/components/ui/misc';
import { PhaseBadge } from '@/components/session/phase-badge';
import { DeleteClientButton, NoteForm } from '@/components/clients/client-actions';
import { formatDate, formatDateTime, formatShortDate } from '@/lib/format';

export const metadata = { title: 'Ficha do cliente' };

function Recurrence({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-ink-300">—</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((i) => (
            <Badge key={i.label} tone="neutral">{i.label} · {i.count}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function ClientPage({ params, searchParams }: PageProps<'/clientes/[id]'>) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await pageCtx();
  const p = await orNotFound(getClientProfile(ctx, id));
  const c = p.client;
  const compareA = p.sessions.find((s) => s.id === sp.a);
  const compareB = p.sessions.find((s) => s.id === sp.b);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-500">{c.internal_code}</p>
          <h1 className="font-serif text-3xl">{c.full_name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/atendimentos/novo?cliente=${c.id}`}>+ Novo atendimento</LinkButton>
          <LinkButton href={`/clientes/${c.id}/editar`} variant="secondary" size="sm">Editar</LinkButton>
          <a href={`/clientes/${c.id}/exportar`} className={buttonClass('ghost', 'sm')}>Exportar dados</a>
          <DeleteClientButton id={c.id} name={c.full_name} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Ficha" />
          <CardBody className="space-y-2 text-sm">
            {[
              ['Nascimento', formatDate(c.birth_date)],
              ['Telefone', c.phone ?? '—'],
              ['E-mail', c.email ?? '—'],
              ['Profissão', c.profession ?? '—'],
              ['Consentimento', c.consent_at ? `${formatDate(c.consent_at)} (${c.consent_text_version})` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span className="text-ink-500">{k}</span>
                <span className="text-right">{v}</span>
              </div>
            ))}
            {c.observations && <p className="whitespace-pre-wrap rounded-xl bg-sand-50 p-3 text-ink-700">{c.observations}</p>}
            {c.private_notes && (
              <div className="rounded-xl bg-lavender-50 p-3">
                <p className="text-xs font-semibold text-lavender-700">Anotações privadas</p>
                <p className="whitespace-pre-wrap text-ink-700">{c.private_notes}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recorrências" subtitle="Frequência entre sessões. Correlação não é causalidade." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Recurrence title="Objetivos" items={p.recurrences.objectives.map((o) => ({ ...o, label: o.label.length > 50 ? `${o.label.slice(0, 50)}…` : o.label }))} />
            <Recurrence title="Chakras" items={p.recurrences.chakras} />
            <Recurrence title="Áreas da vida" items={p.recurrences.areas} />
            <Recurrence title="Gráficos" items={p.recurrences.charts} />
            <Recurrence title="Intervenções" items={p.recurrences.interventions} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Linha do tempo" subtitle="Selecione duas sessões para comparar" />
        <CardBody>
          {p.sessions.length === 0 ? (
            <EmptyState>Nenhuma sessão registrada.</EmptyState>
          ) : (
            <form className="space-y-3">
              <ol className="relative space-y-4 border-l-2 border-sage-100 pl-5">
                {p.sessions.map((s) => (
                  <li key={s.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-sage-500 ring-4 ring-white" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-lg">{formatShortDate(s.started_at)}</span>
                      <PhaseBadge phase={s.phase} />
                      <label className="ml-auto flex items-center gap-1 text-xs text-ink-500">
                        <input type="radio" name="a" value={s.id} defaultChecked={sp.a === s.id} /> A
                      </label>
                      <label className="flex items-center gap-1 text-xs text-ink-500">
                        <input type="radio" name="b" value={s.id} defaultChecked={sp.b === s.id} /> B
                      </label>
                    </div>
                    <Link href={s.phase === 'encerrada' ? `/atendimentos/${s.id}/relatorio` : `/atendimentos/${s.id}`} className="block text-sm text-ink-700 hover:underline">
                      {s.objective ?? s.complaint_text}
                    </Link>
                    {s.elements.length > 0 && <p className="mt-1 text-xs text-ink-500">Elementos: {s.elements.join(' · ')}</p>}
                    {s.reevaluation?.after && <p className="text-xs text-ink-500">Reavaliação: {s.reevaluation.after}</p>}
                  </li>
                ))}
              </ol>
              {p.sessions.length > 1 && (
                <button className={buttonClass('secondary', 'sm')} type="submit">Comparar A × B</button>
              )}
            </form>
          )}
        </CardBody>
      </Card>

      {compareA && compareB && (
        <Card>
          <CardHeader title="Comparação de sessões" subtitle="Observações lado a lado, sem inferir causalidade." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            {[compareA, compareB].map((s, i) => (
              <div key={s.id} className="space-y-2 rounded-xl bg-sand-50 p-4 text-sm">
                <p className="font-semibold">{i === 0 ? 'A' : 'B'} · {formatDate(s.started_at)}</p>
                <p><span className="text-ink-500">Objetivo:</span> {s.objective ?? s.complaint_text}</p>
                <p><span className="text-ink-500">Elementos:</span> {s.elements.join(', ') || '—'}</p>
                <p><span className="text-ink-500">Hipóteses:</span> {s.hypotheses.map((h) => h.description).join(' | ') || '—'}</p>
                <p><span className="text-ink-500">Intervenções:</span> {s.interventions.map((iv) => [iv.interventions?.name, iv.charts?.name].filter(Boolean).join(' · ')).join(' | ') || '—'}</p>
                <p><span className="text-ink-500">Reavaliação:</span> {s.reevaluation ? `antes: ${s.reevaluation.before ?? '—'} · depois: ${s.reevaluation.after ?? '—'}` : '—'}</p>
                <p><span className="text-ink-500">Relato da cliente:</span> {s.client_report ?? '—'}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Anotações privadas" subtitle="Criptografadas e visíveis apenas para você" />
        <CardBody className="space-y-4">
          <NoteForm clientId={c.id} />
          {p.notes.length === 0 ? (
            <EmptyState>Nenhuma anotação.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {p.notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-sand-50 p-3 text-sm">
                  <p className="text-xs text-ink-500">{formatDateTime(n.createdAt)}{n.sessionId ? ' · durante sessão' : ''}</p>
                  <p className="whitespace-pre-wrap">{n.content}</p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
