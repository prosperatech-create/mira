'use client';
import { useState, useTransition } from 'react';
import { auditQuestionAction } from '@/app/actions/ai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { Badge, ErrorText } from '@/components/ui/misc';

type View = Extract<Awaited<ReturnType<typeof auditQuestionAction>>, { ok: true }>['data'];

export function QuestionAuditor({ sessionId }: { sessionId?: string }) {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<View>();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await auditQuestionAction({ question: q, sessionId });
            if (r.ok) {
              setResult(r.data);
              setError(undefined);
            } else setError(r.error);
          });
        }}
      >
        <label htmlFor="audit-q" className="text-sm font-medium text-ink-700">Pergunta que você pretende fazer ao pêndulo</label>
        <Textarea id="audit-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: A inveja da irmã está bloqueando a prosperidade dela?" />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" disabled={pending || q.trim().length < 3}>{pending ? 'Auditando…' : 'Auditar pergunta'}</Button>
      </form>
      {result && (
        <div className="space-y-3 rounded-2xl bg-sand-50 p-4" aria-live="polite">
          <div className="flex flex-wrap gap-1.5">
            {result.labels.map((l) => (
              <Badge key={l} tone={l === 'BOA' ? 'sage' : ['ACUSA TERCEIRO', 'ETICAMENTE PROBLEMÁTICA', 'FORA DO ESCOPO'].includes(l) ? 'rose' : 'amber'}>{l}</Badge>
            ))}
          </div>
          <p className="text-sm text-ink-700">{result.explanation}</p>
          {result.suggestion && (
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">Sugestão</p>
              <p className="mt-1 font-serif text-lg leading-snug">“{result.suggestion}”</p>
              <button className="mt-2 text-xs text-sage-700 underline" onClick={() => navigator.clipboard?.writeText(result.suggestion ?? '')}>Copiar</button>
            </div>
          )}
          <p className="text-[11px] text-ink-500">Fonte: {result.source === 'heuristica' ? 'regras do MIRA' : 'regras do MIRA + IA'}{result.aiNote ? ` · ${result.aiNote}` : ''}</p>
        </div>
      )}
    </div>
  );
}
