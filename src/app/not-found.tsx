import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="font-serif text-3xl">Página não encontrada</h1>
      <p className="text-ink-500">O registro pode ter sido excluído ou você não tem acesso a ele.</p>
      <Link href="/" className="text-sage-700 underline">Voltar ao início</Link>
    </main>
  );
}
