'use client';
import { useState } from 'react';
import { auditSessionAction, regenerateReportsAction, updateClientSummaryAction } from '@/app/actions/ai';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { Alert, ErrorText } from '@/components/ui/misc';
import { useServerAction } from './use-action';

export function PrintButton({ label = 'Imprimir / salvar PDF' }: { label?: string }) {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()}>
      {label}
    </Button>
  );
}

export function AuditButton({ sessionId, hasAudit }: { sessionId: string; hasAudit: boolean }) {
  const { pending, error, run } = useServerAction();
  return (
    <div>
      <Button variant="soft" disabled={pending} onClick={() => run(() => auditSessionAction(sessionId))}>
        {pending ? 'Auditando…' : hasAudit ? 'Auditar novamente' : 'Auditar sessão'}
      </Button>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

export function RegenerateButton({ sessionId }: { sessionId: string }) {
  const { pending, error, run } = useServerAction();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => regenerateReportsAction(sessionId, true), (d) => setNote(d.aiNote))}>
        {pending ? 'Gerando…' : 'Redigir resumo com MIRA IA'}
      </Button>
      {note && <Alert tone="amber">{note}</Alert>}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

export function EditSummary({ sessionId, summary }: { sessionId: string; summary: string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(summary);
  const { pending, error, run } = useServerAction();
  if (!editing)
    return (
      <button className="no-print text-xs text-sage-700 underline" onClick={() => setEditing(true)}>
        Editar resumo
      </button>
    );
  return (
    <div className="no-print space-y-2">
      <Textarea aria-label="Resumo para o cliente" value={text} onChange={(e) => setText(e.target.value)} className="min-h-32" />
      <p className="text-xs text-ink-500">O MIRA suaviza automaticamente afirmações absolutas e percentuais.</p>
      <ErrorText>{error}</ErrorText>
      <Button size="sm" disabled={pending} onClick={() => run(() => updateClientSummaryAction(sessionId, text), () => setEditing(false))}>
        Salvar
      </Button>
    </div>
  );
}
