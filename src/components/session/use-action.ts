'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Result } from '@/lib/errors';

/** Executa uma Server Action, mostra erro amigável e atualiza a tela. */
export function useServerAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const router = useRouter();
  function run<T>(fn: () => Promise<Result<T> | undefined | void>, onOk?: (data: T) => void) {
    setError(undefined);
    start(async () => {
      const r = await fn();
      if (r && !r.ok) {
        setError(r.error);
        return;
      }
      if (r && r.ok) onOk?.(r.data);
      router.refresh();
    });
  }
  return { pending, error, setError, run };
}
