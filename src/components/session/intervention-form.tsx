'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/misc';
import { hasExcessivePrecision, PRECISION_WARNING } from '@/domain/precision';

export interface InterventionPayload {
  interventionId: string;
  chartId?: string | null;
  description?: string;
  startedAt?: string;
  endedAt?: string;
  durationText?: string;
  frequency?: string;
  reevaluateOn?: string;
}

export function InterventionForm({
  catalog,
  charts,
  pending,
  onSubmit,
}: {
  catalog: { id: string; name: string; requires_chart: boolean }[];
  charts: { id: string; name: string; category: string; traditional_purpose: string | null; when_not_used: string | null }[];
  pending: boolean;
  onSubmit: (p: InterventionPayload) => void;
}) {
  const [p, setP] = useState<InterventionPayload>({ interventionId: '' });
  const selected = catalog.find((c) => c.id === p.interventionId);
  const chart = charts.find((c) => c.id === p.chartId);
  const precision = [p.durationText, p.frequency].some((v) => hasExcessivePrecision(v));
  const set = (k: keyof InterventionPayload) => (e: { target: { value: string } }) => setP((x) => ({ ...x, [k]: e.target.value }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...p, chartId: p.chartId || null });
      }}
    >
      <Field label="Categoria da intervenção (indicada na investigação)" htmlFor="iv-cat">
        <Select id="iv-cat" required value={p.interventionId} onChange={set('interventionId')}>
          <option value="" disabled>Selecione…</option>
          {catalog.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      {(selected?.requires_chart || p.chartId) && (
        <Field label={`Gráfico radiônico${selected?.requires_chart ? ' *' : ''}`} htmlFor="iv-chart" hint="A escolha vem da investigação; o MIRA não associa problema a gráfico automaticamente.">
          <Select id="iv-chart" required={selected?.requires_chart} value={p.chartId ?? ''} onChange={set('chartId')}>
            <option value="">Selecione…</option>
            {charts.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.category})</option>)}
          </Select>
        </Field>
      )}
      {chart && (
        <p className="rounded-xl bg-sand-50 p-3 text-xs text-ink-700">
          <strong>Finalidade tradicional:</strong> {chart.traditional_purpose} {chart.when_not_used && <><br /><strong>Quando não usar:</strong> {chart.when_not_used}</>}
        </p>
      )}
      <Field label="Descrição" htmlFor="iv-desc">
        <Textarea id="iv-desc" value={p.description ?? ''} onChange={set('description')} placeholder="O que foi realizado" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Início" htmlFor="iv-start"><Input id="iv-start" type="datetime-local" value={p.startedAt ?? ''} onChange={set('startedAt')} /></Field>
        <Field label="Término" htmlFor="iv-end"><Input id="iv-end" type="datetime-local" value={p.endedAt ?? ''} onChange={set('endedAt')} /></Field>
        <Field label="Duração" htmlFor="iv-dur"><Input id="iv-dur" value={p.durationText ?? ''} onChange={set('durationText')} placeholder="ex.: 7 dias" /></Field>
        <Field label="Frequência" htmlFor="iv-freq"><Input id="iv-freq" value={p.frequency ?? ''} onChange={set('frequency')} placeholder="ex.: contínuo / 1x ao dia" /></Field>
        <Field label="Reavaliar em" htmlFor="iv-reav"><Input id="iv-reav" type="date" value={p.reevaluateOn ?? ''} onChange={set('reevaluateOn')} /></Field>
      </div>
      {precision && <Alert tone="amber">{PRECISION_WARNING}</Alert>}
      <Button type="submit" size="lg" disabled={pending || !p.interventionId || (selected?.requires_chart && !p.chartId)}>
        {pending ? 'Registrando…' : 'Registrar intervenção'}
      </Button>
    </form>
  );
}
