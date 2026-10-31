'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addNoteAction, deleteClientAction } from '@/app/actions/clients';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { ErrorText } from '@/components/ui/misc';

export function DeleteClientButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-rose-600"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Excluir definitivamente ${name} e todo o histórico de sessões? Esta ação não pode ser desfeita.`)) return;
          start(async () => {
            const r = await deleteClientAction(id);
            if (r && !r.ok) setError(r.error);
          });
        }}
      >
        {pending ? 'Excluindo…' : 'Excluir'}
      </Button>
      <ErrorText>{error}</ErrorText>
    </>
  );
}

export function NoteForm({ clientId, sessionId, onSaved }: { clientId: string; sessionId?: string; onSaved?: () => void }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addNoteAction({ clientId, sessionId, content });
          if (!r.ok) return setError(r.error);
          setContent('');
          setError(undefined);
          onSaved?.();
          router.refresh();
        });
      }}
    >
      <label htmlFor="note" className="sr-only">Nova anotação</label>
      <Textarea id="note" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Anotação privada (criptografada)…" />
      <ErrorText>{error}</ErrorText>
      <Button type="submit" size="sm" variant="secondary" disabled={pending || !content.trim()}>
        {pending ? 'Salvando…' : 'Salvar anotação'}
      </Button>
    </form>
  );
}
