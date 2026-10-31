import { LoginForm } from './login-form';
import { Logo } from '@/components/layout/logo';
import { InstallAppButton } from '@/components/layout/pwa';

export const metadata = { title: 'Entrar' };

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const sp = await searchParams;
  const next = typeof sp.next === 'string' ? sp.next : '/';
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-sand-50 to-sage-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="mx-auto h-12 w-12" />
          <h1 className="mt-4 font-serif text-3xl text-ink-900">MIRA</h1>
          <p className="mt-1 text-sm text-ink-500">Método Integrado de Radiestesia Aplicada</p>
        </div>
        <LoginForm next={next} />
        <InstallAppButton className="mt-4" />
        <p className="mt-6 text-center text-xs leading-relaxed text-ink-500">
          A terapeuta decide. O pêndulo é operado pela terapeuta.
          <br />O MIRA organiza o raciocínio.
        </p>
      </div>
    </main>
  );
}
