'use client';
import { useState } from 'react';
import type { SessionView } from '@/application/sessions';
import { answerAction, finishInvestigationAction, jumpAction, reevaluationNotesAction, undoAction } from '@/app/actions/sessions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Alert, ErrorText } from '@/components/ui/misc';
import { PRECISION_WARNING } from '@/domain/precision';
import { AnswerPad } from './answer-pad';
import { InterventionForm, type InterventionPayload } from './intervention-form';
import { useServerAction } from './use-action';

export function InvestigationPanel({ view }: { view: SessionView }) {
  const node = view.node!;
  const s = view.session;
  const { pending, error, run } = useServerAction();
  const [hint, setHint] = useState<string | null>(null);
  const [precision, setPrecision] = useState(false);

  function answer(value: string, text?: string, intervention?: InterventionPayload) {
    run(
      () => answerAction({ sessionId: s.id, nodeKey: node.key, value, text, intervention }),
      (d) => {
        setHint(d.hint);
        setPrecision(d.precisionWarning);
      },
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-7">
        {node.reformulationCount > 0 && <p className="mb-2 text-xs font-medium text-lavender-700">Pergunta reformulada ({node.reformulationCount}×)</p>}
        <h2 className="font-serif text-2xl leading-snug text-ink-900 sm:text-[28px]" aria-live="polite">
          {node.question}
        </h2>
        {node.explanation && <p className="mt-3 text-sm leading-relaxed text-ink-500">{node.explanation}</p>}
        {node.alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {node.alerts.map((a, i) => (
              <Alert key={i} tone={a.level === 'critico' ? 'rose' : a.level === 'atencao' ? 'amber' : 'lavender'}>{a.message}</Alert>
            ))}
          </div>
        )}
        {hint && <div className="mt-4"><Alert tone="lavender">{hint}</Alert></div>}
        {precision && <div className="mt-4"><Alert tone="amber">{PRECISION_WARNING}</Alert></div>}
        <div className="mt-6">
          {node.kind === 'intervention' ? (
            <InterventionForm catalog={view.interventionsCatalog} charts={view.charts} pending={pending} onSubmit={(p) => answer('registrar', undefined, p)} />
          ) : (
            <AnswerPad node={node} pending={pending} onAnswer={(v, t) => answer(v, t)} />
          )}
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-sand-200 pt-4">
          <Button variant="ghost" size="sm" disabled={!view.canUndo || pending} onClick={() => run(() => undoAction(s.id), () => setHint(null))}>
            ↶ Desfazer última resposta
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (confirm(s.phase === 'reavaliacao' ? 'Concluir a reavaliação e seguir para o registro?' : 'Encerrar a investigação agora?')) run(() => finishInvestigationAction(s.id));
            }}
          >
            {s.phase === 'reavaliacao' ? 'Concluir reavaliação' : 'Encerrar investigação'}
          </Button>
        </div>
      </Card>

      {view.freeJumps.length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Modo Livre — ir para</p>
          <div className="flex flex-wrap gap-2">
            {view.freeJumps.map((j) => (
              <Button key={j.node} variant="soft" size="sm" disabled={pending} onClick={() => run(() => jumpAction(s.id, j.node))}>
                {j.label}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {s.phase === 'reavaliacao' && <ReevaluationNotes view={view} />}
    </div>
  );
}

function ReevaluationNotes({ view }: { view: SessionView }) {
  const s = view.session;
  const [before, setBefore] = useState(s.reevaluation?.before ?? (s.context.intensity_before ? `Intensidade ${s.context.intensity_before}/10` : ''));
  const [after, setAfter] = useState(s.reevaluation?.after ?? '');
  const [notes, setNotes] = useState(s.reevaluation?.notes ?? '');
  const [saved, setSaved] = useState(false);
  const { pending, error, run } = useServerAction();
  return (
    <Card className="space-y-3 p-5">
      <div>
        <h3 className="font-serif text-lg">Antes × Depois</h3>
        <p className="text-xs text-ink-500">Registre a percepção antes e depois da intervenção. Diferenças não comprovam causalidade.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Antes" htmlFor="rv-before"><Input id="rv-before" value={before} onChange={(e) => setBefore(e.target.value)} /></Field>
        <Field label="Depois" htmlFor="rv-after"><Input id="rv-after" value={after} onChange={(e) => setAfter(e.target.value)} placeholder={s.context.intensity_after ? `Intensidade ${s.context.intensity_after}/10` : ''} /></Field>
      </div>
      <Textarea aria-label="Notas da reavaliação" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas da reavaliação" />
      <ErrorText>{error}</ErrorText>
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => reevaluationNotesAction({ sessionId: s.id, before, after, notes }), () => setSaved(true))}>
        {pending ? 'Salvando…' : saved ? 'Salvo ✓' : 'Salvar antes × depois'}
      </Button>
    </Card>
  );
}
