'use client';
import { useActionState } from 'react';
import { signInAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ErrorText } from '@/components/ui/misc';
import { Card } from '@/components/ui/card';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, undefined);
  return (
    <Card className="p-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={6} />
        </Field>
        <ErrorText>{state?.error}</ErrorText>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </Card>
  );
}
