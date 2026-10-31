'use client';
import { useState } from 'react';
import { approveObjectiveAction } from '@/app/actions/sessions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/field';
import { ErrorText } from '@/components/ui/misc';
import { useServerAction } from './use-action';

export function ObjectivePanel({ sessionId, complaint, suggested }: { sessionId: string; complaint: string; suggested: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(suggested);
  const { pending, error, run } = useServerAction();
  return (
    <Card className="space-y-5 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Descrição da terapeuta</p>
        <p className="mt-1 text-ink-700">“{complaint}”</p>
      </div>
      <div className="rounded-2xl bg-sage-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Objetivo sugerido</p>
        {editing ? (
          <Textarea aria-label="Objetivo" className="mt-2 text-base" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        ) : (
          <p className="mt-2 font-serif text-xl leading-snug text-ink-900">{text}</p>
        )}
      </div>
      <p className="text-xs text-ink-500">Um bom objetivo é investigável, centrado na experiência da consulente e não pressupõe causas nem culpados.</p>
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" disabled={pending} onClick={() => run(() => approveObjectiveAction({ sessionId, objective: text }))}>
          {pending ? 'Salvando…' : 'Aprovar'}
        </Button>
        {!editing && (
          <Button size="lg" variant="secondary" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>
    </Card>
  );
}
