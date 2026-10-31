'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { startSessionAction } from '@/app/actions/sessions';
import { Button } from '@/components/ui/button';
import { Field, Select, Textarea } from '@/components/ui/field';
import { ErrorText } from '@/components/ui/misc';
import { MODES } from '@/domain/modes';
import { SESSION_MODES } from '@/domain/types';
import { cn } from '@/lib/cn';

const EXAMPLES = ['Questão financeira.', 'Ansiedade relacionada ao trabalho.', 'Sensação de estagnação.', 'Relacionamentos.', 'Harmonização de ambiente.'];

export function NewSessionForm({ clients, preselected }: { clients: { id: string; full_name: string; internal_code: string }[]; preselected?: string }) {
  const [state, action, pending] = useActionState(startSessionAction, undefined);
  const [complaint, setComplaint] = useState('');
  const [mode, setMode] = useState<(typeof SESSION_MODES)[number]>('mira');

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Field label="Cliente" htmlFor="clientId">
          <Select id="clientId" name="clientId" required defaultValue={preselected ?? ''}>
            <option value="" disabled>Selecione um cliente existente…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name} — {c.internal_code}</option>
            ))}
          </Select>
        </Field>
        <Link href="/clientes/novo?next=atendimento" className="text-sm text-sage-700 underline">+ Cadastrar novo cliente</Link>
      </div>

      <Field label="Qual é o principal objetivo desta sessão?" htmlFor="complaint" hint="Escreva livremente. O MIRA vai sugerir um objetivo investigável para você aprovar ou editar.">
        <Textarea id="complaint" name="complaint" required value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Ex.: Ela quer trabalhar a questão financeira." className="min-h-28 text-base" />
      </Field>
      <div className="-mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button type="button" key={e} onClick={() => setComplaint(e)} className="rounded-full bg-sand-100 px-3 py-1 text-xs text-ink-700 hover:bg-sand-200">
            {e}
          </button>
        ))}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-700">Modo de operação</legend>
        <input type="hidden" name="mode" value={mode} />
        <div className="grid gap-2 sm:grid-cols-2">
          {SESSION_MODES.map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn('rounded-2xl border p-3 text-left transition-colors', mode === m ? 'border-sage-500 bg-sage-50' : 'border-sand-200 bg-white hover:bg-sand-50')}
            >
              <p className="font-medium">{MODES[m].label}</p>
              <p className="text-xs text-ink-500">{MODES[m].description}</p>
              {MODES[m].disclaimer && <p className="mt-1 text-[11px] italic text-lavender-700">{MODES[m].disclaimer}</p>}
            </button>
          ))}
        </div>
      </fieldset>

      <ErrorText>{state?.error}</ErrorText>
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? 'Preparando objetivo…' : 'Continuar'}
      </Button>
    </form>
  );
}
