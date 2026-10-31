import Link from 'next/link';
import { pageCtx } from '@/application/page';
import { signOutAction } from '@/app/actions/auth';
import { BottomNav, SideNav } from '@/components/layout/nav';
import { Logo } from '@/components/layout/logo';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await pageCtx();
  return (
    <div className="min-h-dvh md:flex">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sand-200 bg-white/70 px-4 py-6 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-3 px-2">
          <Logo className="h-9 w-9" />
          <div>
            <p className="font-serif text-xl leading-none">MIRA</p>
            <p className="text-[11px] text-ink-500">Radiestesia aplicada</p>
          </div>
        </Link>
        <SideNav isAdmin={ctx.user.role === 'admin'} />
        <div className="mt-auto border-t border-sand-200 pt-4 text-sm">
          <p className="truncate px-2 font-medium text-ink-700">{ctx.user.fullName}</p>
          <p className="px-2 text-xs text-ink-500">{ctx.user.role === 'admin' ? 'Administrador' : 'Terapeuta'}</p>
          <form action={signOutAction}>
            <button className="mt-2 rounded-lg px-2 py-1 text-xs text-ink-500 hover:bg-sand-100">Sair</button>
          </form>
        </div>
      </aside>
      <div className="flex-1">
        <header className="no-print flex items-center justify-between border-b border-sand-200 bg-white/80 px-4 py-3 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="font-serif text-lg">MIRA</span>
          </Link>
          <div className="flex items-center gap-2">
            {ctx.user.role === 'admin' && <Link href="/admin" className="text-xs text-ink-500">Admin</Link>}
            <form action={signOutAction}>
              <button className="text-xs text-ink-500">Sair</button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
