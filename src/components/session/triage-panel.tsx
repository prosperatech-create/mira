'use client';
import { useMemo, useState } from 'react';
import { triageAction } from '@/app/actions/sessions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/field';
import { Alert, ErrorText } from '@/components/ui/misc';
import { evaluateTriage, TRIAGE_FLAGS } from '@/domain/triage';
import type { NeutralityResult } from '@/domain/preparation';
import { cn } from '@/lib/cn';
import { useServerAction } from './use-action';

export function TriagePanel({ sessionId, suggestions, neutrality }: { sessionId: string; suggestions: string[]; neutrality: NeutralityResult | null }) {
  const [flags, setFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [ack, setAck] = useState(false);
  const { pending, error, run } = useServerAction();
  const result = useMemo(() => evaluateTriage(flags), [flags]);
  const toggle = (k: string) => setFlags((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));

  return (
    <div className="space-y-4">
      {neutrality && (
        <Card className="flex items-center gap-4 p-5">
          <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-full font-serif text-2xl', neutrality.level === 'favoravel' ? 'bg-sage-100 text-sage-700' : neutrality.level === 'atencao' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600')}>
            {neutrality.index}
          </div>
          <div className="text-sm">
            <p className="font-semibold">Índice de Neutralidade da Sessão</p>
            {neutrality.messages.map((m) => <p key={m} className="text-ink-700">{m}</p>)}
            <p className="mt-1 text-xs text-ink-500">Indicador interno de atenção, não uma medida científica.</p>
          </div>
        </Card>
      )}
      <Card className="space-y-5 p-6">
        <div>
          <h2 className="font-serif text-2xl">Triagem de segurança</h2>
          <p className="text-sm text-ink-500">Antes da leitura radiestésica, a situação envolve algum destes pontos?</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRIAGE_FLAGS.map((f) => (
            <label key={f.key} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm', flags.includes(f.key) ? 'border-amber-600/40 bg-amber-50' : 'border-sand-200 bg-white hover:bg-sand-50')}>
              <input type="checkbox" className="h-4 w-4 accent-amber-600" checked={flags.includes(f.key)} onChange={() => toggle(f.key)} />
              <span className="flex-1">{f.label}</span>
              {suggestions.includes(f.key) && !flags.includes(f.key) && <span className="text-[11px] text-amber-600">sugerido pelo texto</span>}
            </label>
          ))}
        </div>
        <Textarea aria-label="Observações da triagem" placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {result.level !== 'nenhum' && (
          <Alert tone={result.level === 'critico' ? 'rose' : 'amber'} title={result.level === 'critico' ? 'Situação crítica' : 'Atenção'}>
            {result.messages.map((m) => <p key={m} className="mb-1">{m}</p>)}
            <label className="mt-3 flex items-start gap-2 font-medium">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              Li o aviso e vou orientar a consulente conforme necessário.
            </label>
          </Alert>
        )}

        <ErrorText>{error}</ErrorText>
        <Button
          size="lg"
          variant={result.level === 'critico' ? 'danger' : 'primary'}
          disabled={pending || (result.level !== 'nenhum' && !ack)}
          onClick={() => run(() => triageAction({ sessionId, flags, notes, acknowledged: result.level === 'nenhum' ? true : ack }))}
        >
          {pending ? 'Salvando…' : result.level === 'critico' ? 'Registrar e seguir para o encerramento' : 'Iniciar investigação'}
        </Button>
      </Card>
    </div>
  );
}
