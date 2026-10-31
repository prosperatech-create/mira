'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="font-serif text-3xl">Algo não saiu como esperado</h1>
      <p className="max-w-md text-ink-500">Nada do que já foi registrado se perdeu. Tente novamente; se persistir, informe o código ao administrador.</p>
      {error.digest && <p className="font-mono text-xs text-ink-300">{error.digest}</p>}
      <button onClick={reset} className="rounded-xl bg-sage-600 px-4 py-2 text-white">Tentar novamente</button>
    </main>
  );
}
