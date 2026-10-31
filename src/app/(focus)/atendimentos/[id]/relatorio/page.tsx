import Link from 'next/link';
import { pageCtx, orNotFound } from '@/application/page';
import { getReportBundle } from '@/application/reports';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/misc';
import { Logo } from '@/components/layout/logo';
import { AuditButton, EditSummary, PrintButton, RegenerateButton } from '@/components/session/report-actions';
import { STAGE_LABELS } from '@/domain/gps';
import type { MiraStage } from '@/domain/types';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Relatório' };

function Section({ title, children, tone = 'neutral' }: { title: string; children: React.ReactNode; tone?: 'neutral' | 'sage' | 'lavender' }) {
  return (
    <section className={cn('break-inside-avoid rounded-2xl p-5', tone === 'sage' ? 'bg-sage-50' : tone === 'lavender' ? 'bg-lavender-50' : 'bg-white border border-sand-200')}>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">{title}</h2>
      <div className="text-[15px] leading-relaxed text-ink-900">{children}</div>
    </section>
  );
}

function Text({ v }: { v: string | null | undefined }) {
  return v ? <p className="whitespace-pre-wrap">{v}</p> : <p className="text-ink-300">Não registrado.</p>;
}

export default async function ReportPage({ params, searchParams }: PageProps<'/atendimentos/[id]/relatorio'>) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.v === 'cliente' ? 'cliente' : 'interno';
  const ctx = await pageCtx();
  const { session, internal, client, audit } = await orNotFound(getReportBundle(ctx, id));

  return (
    <div className="min-h-dvh bg-sand-50">
      <header className="no-print sticky top-0 z-20 border-b border-sand-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
          <Link href={`/clientes/${session.client_id}`} className="rounded-lg px-2 py-1 text-sm text-ink-500 hover:bg-sand-100">← Ficha</Link>
          <div className="flex rounded-xl bg-sand-100 p-1 text-sm">
            <Link href="?v=interno" className={cn('rounded-lg px-3 py-1.5', tab === 'interno' && 'bg-white shadow-sm')}>Interno</Link>
            <Link href="?v=cliente" className={cn('rounded-lg px-3 py-1.5', tab === 'cliente' && 'bg-white shadow-sm')}>Para o cliente</Link>
          </div>
          <div className="ml-auto"><PrintButton /></div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {!internal || !client ? (
          <EmptyState>O relatório fica disponível ao final da sessão. <Link className="underline" href={`/atendimentos/${id}`}>Voltar ao atendimento</Link></EmptyState>
        ) : tab === 'interno' ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-ink-500">Relatório interno · confidencial</p>
                <h1 className="font-serif text-3xl">{internal.header.client}</h1>
                <p className="text-sm text-ink-500">{internal.header.code} · {internal.header.date} · {internal.header.mode}</p>
              </div>
              <Logo className="h-10 w-10" />
            </div>
            <Section title="Objetivo" tone="sage"><Text v={internal.header.objective} /></Section>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Card className="p-4"><p className="text-ink-500">Índice de Neutralidade</p><p className="font-serif text-2xl">{internal.header.neutralityIndex ?? '—'}</p></Card>
              <Card className="p-4"><p className="text-ink-500">Triagem</p><p className="font-serif text-2xl capitalize">{internal.header.triageLevel ?? '—'}</p></Card>
            </div>
            <Section title="Relato do cliente"><Text v={internal.relatoCliente} /></Section>
            <Section title="Resultados radiestésicos">
              {internal.resultadosRadiestesicos.length === 0 ? <Text v={null} /> : (
                <ol className="space-y-2">
                  {internal.resultadosRadiestesicos.map((r, i) => (
                    <li key={i} className="flex flex-col gap-0.5 border-b border-sand-100 pb-2 last:border-0 sm:flex-row sm:gap-3">
                      <Badge className="w-fit shrink-0" tone="neutral">{STAGE_LABELS[r.stage as MiraStage] ?? r.stage}</Badge>
                      <span className="flex-1 text-ink-700">{r.question}</span>
                      <span className="font-semibold text-sage-700">{r.answer}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
            <Section title="Interpretação terapêutica"><Text v={internal.interpretacao} /></Section>
            <Section title="Hipóteses (possível origem simbólico-energética)">
              {internal.hipoteses.length === 0 ? <Text v={null} /> : (
                <ul className="space-y-2">
                  {internal.hipoteses.map((h, i) => (
                    <li key={i}>
                      <p>{h.description}</p>
                      <p className="text-xs text-ink-500">{[h.element, h.category, h.role].filter(Boolean).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Intervenções">
              {internal.intervencoes.length === 0 ? <Text v={null} /> : (
                <ul className="space-y-2">
                  {internal.intervencoes.map((iv, i) => (
                    <li key={i}>
                      <p className="font-medium">{iv.name}{iv.chart ? ` — ${iv.chart}` : ''}</p>
                      <p className="text-sm text-ink-700">{[iv.description, iv.duration && `Duração: ${iv.duration}`, iv.frequency && `Frequência: ${iv.frequency}`, iv.reevaluateOn && `Reavaliar em ${iv.reevaluateOn}`].filter(Boolean).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Reavaliação">
              {!internal.reavaliacao ? <Text v={null} /> : (
                <div className="space-y-2">
                  <p><span className="text-ink-500">Antes:</span> {internal.reavaliacao.before ?? '—'} · <span className="text-ink-500">Depois:</span> {internal.reavaliacao.after ?? '—'}</p>
                  {internal.reavaliacao.steps.map((st, i) => <p key={i} className="text-sm">{st.question} → <strong>{st.answer}</strong></p>)}
                  {internal.reavaliacao.notes && <p className="text-sm">{internal.reavaliacao.notes}</p>}
                </div>
              )}
            </Section>
            <Section title="Observações"><Text v={internal.observacoes} /></Section>

            <div className="print-break" />
            <Section title="Auditoria da sessão" tone="lavender">
              <div className="no-print mb-3"><AuditButton sessionId={id} hasAudit={!!audit} /></div>
              {!audit ? (
                <p className="text-sm text-ink-500">Ainda não auditada. A auditoria analisa clareza, indução, contradições, excesso de investigação e afastamento do objetivo.</p>
              ) : (
                <div className="space-y-4 text-sm">
                  {([
                    ['Pontos positivos', audit.positives],
                    ['Pontos de atenção', audit.attention_points],
                    ['Contradições encontradas', audit.contradictions],
                    ['Sugestões para a próxima sessão', audit.next_session_suggestions],
                  ] as const).map(([t, items]) => (
                    <div key={t}>
                      <p className="font-semibold">{t}</p>
                      {items.length === 0 ? <p className="text-ink-500">Nenhum.</p> : <ul className="list-disc pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                    </div>
                  ))}
                  <div>
                    <p className="font-semibold">Perguntas que poderiam ser reformuladas</p>
                    {audit.reformulations.length === 0 ? <p className="text-ink-500">Nenhuma.</p> : (
                      <ul className="space-y-1">{audit.reformulations.map((r, i) => <li key={i}>“{r.question}” → <em>“{r.suggestion}”</em></li>)}</ul>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-500">Fonte: {audit.source === 'heuristica' ? 'regras do MIRA' : 'regras do MIRA + IA'}</p>
                </div>
              )}
            </Section>
          </>
        ) : (
          <article className="space-y-5 rounded-[var(--radius-card)] bg-white p-6 shadow-sm sm:p-10 print:p-0 print:shadow-none">
            <div className="flex items-center justify-between border-b border-sand-200 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-sage-700">Relatório de sessão</p>
                <h1 className="font-serif text-3xl">{client.name}</h1>
                <p className="text-sm text-ink-500">{client.date}</p>
              </div>
              <Logo className="h-12 w-12" />
            </div>
            <Section title="Objetivo" tone="sage"><p>{client.objective}</p></Section>
            <Section title="Resumo da sessão">
              <p className="whitespace-pre-wrap">{client.summary}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3"><EditSummary sessionId={id} summary={client.summary} /><span className="no-print"><RegenerateButton sessionId={id} /></span></div>
            </Section>
            {client.aspects.length > 0 && (
              <Section title="Aspectos investigados">
                <ul className="list-disc space-y-1 pl-5">{client.aspects.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </Section>
            )}
            {client.harmonizations.length > 0 && (
              <Section title="Harmonizações realizadas">
                <ul className="list-disc space-y-1 pl-5">{client.harmonizations.map((a, i) => <li key={i}>{a}</li>)}</ul>
              </Section>
            )}
            {client.selfCare && <Section title="Recomendações de autocuidado" tone="lavender"><p className="whitespace-pre-wrap">{client.selfCare}</p></Section>}
            {client.nextReevaluation && <Section title="Próxima reavaliação"><p>{client.nextReevaluation}</p></Section>}
            <p className="border-t border-sand-200 pt-4 text-xs leading-relaxed text-ink-500">{client.disclaimer}</p>
          </article>
        )}
      </main>
    </div>
  );
}
