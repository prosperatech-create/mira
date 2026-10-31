'use client';
import { useState } from 'react';
import { preparationAction } from '@/app/actions/sessions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorText } from '@/components/ui/misc';
import { NEUTRALITY_DISCLAIMER, PREPARATION_QUESTIONS, type PreparationAnswers } from '@/domain/preparation';
import { cn } from '@/lib/cn';
import { useServerAction } from './use-action';

export function PreparationPanel({ sessionId }: { sessionId: string }) {
  const [answers, setAnswers] = useState<Partial<PreparationAnswers>>({});
  const { pending, error, run } = useServerAction();
  const complete = PREPARATION_QUESTIONS.every((q) => answers[q.key] !== undefined);
  return (
    <Card className="space-y-5 p-6">
      <div>
        <h2 className="font-serif text-2xl">Preparação da terapeuta</h2>
        <p className="text-sm text-ink-500">Respire, solte expectativas e responda com sinceridade.</p>
      </div>
      <ul className="space-y-3">
        {PREPARATION_QUESTIONS.map((q) => (
          <li key={q.key} className="flex flex-col gap-2 rounded-2xl bg-sand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <span id={`q-${q.key}`} className="text-[15px]">{q.text}</span>
            <div role="radiogroup" aria-labelledby={`q-${q.key}`} className="flex gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={answers[q.key] === v}
                  onClick={() => setAnswers((a) => ({ ...a, [q.key]: v }))}
                  className={cn('h-11 min-w-20 rounded-xl border px-4 text-sm font-medium', answers[q.key] === v ? 'border-sage-600 bg-sage-600 text-white' : 'border-sand-300 bg-white hover:bg-sand-100')}
                >
                  {v ? 'Sim' : 'Não'}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-500">{NEUTRALITY_DISCLAIMER}</p>
      <ErrorText>{error}</ErrorText>
      <Button size="lg" disabled={!complete || pending} onClick={() => run(() => preparationAction({ sessionId, ...(answers as PreparationAnswers) }))}>
        {pending ? 'Calculando…' : 'Concluir preparação'}
      </Button>
    </Card>
  );
}
