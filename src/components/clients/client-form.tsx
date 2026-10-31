'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { Alert, ErrorText } from '@/components/ui/misc';

export interface ClientFormValues {
  full_name?: string;
  internal_code?: string;
  birth_date?: string | null;
  phone?: string | null;
  email?: string | null;
  profession?: string | null;
  observations?: string | null;
  private_notes?: string | null;
}

type FormAction = (prev: { error?: string } | undefined, fd: FormData) => Promise<{ error?: string }>;

export function ClientForm({ action, initial, isNew, consentText, next }: { action: FormAction; initial?: ClientFormValues; isNew: boolean; consentText?: string; next?: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *" htmlFor="full_name">
          <Input id="full_name" name="full_name" required defaultValue={initial?.full_name} autoComplete="off" />
        </Field>
        <Field label="Código interno" htmlFor="internal_code" hint={isNew ? 'Deixe em branco para gerar automaticamente.' : undefined}>
          <Input id="internal_code" name="internal_code" defaultValue={initial?.internal_code} />
        </Field>
        <Field label="Data de nascimento (opcional)" htmlFor="birth_date">
          <Input id="birth_date" name="birth_date" type="date" defaultValue={initial?.birth_date ?? ''} />
        </Field>
        <Field label="Profissão (opcional)" htmlFor="profession">
          <Input id="profession" name="profession" defaultValue={initial?.profession ?? ''} />
        </Field>
        <Field label="Telefone (opcional)" htmlFor="phone">
          <Input id="phone" name="phone" inputMode="tel" defaultValue={initial?.phone ?? ''} />
        </Field>
        <Field label="E-mail (opcional)" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ''} />
        </Field>
      </div>
      <Field label="Observações" htmlFor="observations" hint="Evite registrar informações desnecessárias (minimização de dados).">
        <Textarea id="observations" name="observations" defaultValue={initial?.observations ?? ''} />
      </Field>
      <Field label="Anotações privadas da terapeuta" htmlFor="private_notes" hint="Armazenadas com criptografia. Visíveis apenas para você.">
        <Textarea id="private_notes" name="private_notes" defaultValue={initial?.private_notes ?? ''} />
      </Field>
      {isNew && (
        <Alert tone="lavender" title="Consentimento">
          <p className="mb-3">{consentText}</p>
          <label className="flex items-start gap-2 font-medium">
            <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-sage-600" />
            A cliente leu e concordou com o termo acima.
          </label>
        </Alert>
      )}
      <ErrorText>{state?.error}</ErrorText>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Salvando…' : isNew ? 'Cadastrar cliente' : 'Salvar alterações'}
      </Button>
    </form>
  );
}
