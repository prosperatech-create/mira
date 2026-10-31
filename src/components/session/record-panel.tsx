'use client';
import { useState } from 'react';
import type { SessionView } from '@/application/sessions';
import { closeSessionAction, saveRecordAction } from '@/app/actions/sessions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Alert, ErrorText } from '@/components/ui/misc';
import { useServerAction } from './use-action';

/** Registro estruturado: separa relato, interpretação, observações e recomendações. */
export function RecordPanel({ view }: { view: SessionView }) {
  const s = view.session;
  const [f, setF] = useState({
    client_report: s.client_report ?? '',
    interpretation: s.interpretation ?? '',
    observations: s.observations ?? '',
    self_care: s.self_care ?? '',
    next_followup_date: s.next_followup_date ?? '',
  });
  const { pending, error, run } = useServerAction();
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setSaved(false);
    setF((x) => ({ ...x, [k]: e.target.value }));
  };
  const results = view.steps.filter((x) => x.answerValue !== 'navegacao');

  return (
    <div className="space-y-4">
      {view.triage?.level === 'critico' && (
        <Alert tone="rose" title="Investigação bloqueada pela triagem">
          {view.triage.messages.slice(1).map((m) => <p key={m}>{m}</p>)}
        </Alert>
      )}
      <Card className="p-5">
        <h2 className="font-serif text-2xl">Registro do atendimento</h2>
        <p className="text-sm text-ink-500">Os resultados radiestésicos, hipóteses e intervenções já foram registrados automaticamente.</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-sand-50 p-3"><p className="font-serif text-xl">{results.length}</p><p className="text-xs text-ink-500">respostas</p></div>
          <div className="rounded-xl bg-sand-50 p-3"><p className="font-serif text-xl">{view.sessionInterventions.length}</p><p className="text-xs text-ink-500">intervenções</p></div>
          <div className="rounded-xl bg-sand-50 p-3"><p className="font-serif text-xl">{s.neutrality_index ?? '—'}</p><p className="text-xs text-ink-500">neutralidade</p></div>
        </div>
      </Card>
      <Card className="space-y-4 p-5">
        <Field label="Relato do cliente" htmlFor="r-client" hint="O que a consulente disse, com as palavras dela.">
          <Textarea id="r-client" value={f.client_report} onChange={set('client_report')} />
        </Field>
        <Field label="Interpretação terapêutica" htmlFor="r-interp" hint="Como você interpretou os resultados — com linguagem de hipótese.">
          <Textarea id="r-interp" value={f.interpretation} onChange={set('interpretation')} />
        </Field>
        <Field label="Observações" htmlFor="r-obs">
          <Textarea id="r-obs" value={f.observations} onChange={set('observations')} />
        </Field>
        <Field label="Recomendações de autocuidado" htmlFor="r-self" hint="Aparecem no relatório para o cliente.">
          <Textarea id="r-self" value={f.self_care} onChange={set('self_care')} />
        </Field>
        <Field label="Próxima reavaliação" htmlFor="r-next">
          <Input id="r-next" type="date" value={f.next_followup_date} onChange={set('next_followup_date')} className="max-w-xs" />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={pending} onClick={() => run(() => saveRecordAction({ sessionId: s.id, ...f }), () => setSaved(true))}>
            {saved ? 'Rascunho salvo ✓' : 'Salvar rascunho'}
          </Button>
          <Button size="lg" disabled={pending} onClick={() => run(() => closeSessionAction({ sessionId: s.id, ...f }))}>
            {pending ? 'Encerrando…' : 'Encerrar sessão e gerar relatório'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
