'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/', label: 'Início', icon: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z' },
  { href: '/clientes', label: 'Clientes', icon: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0' },
  { href: '/atendimentos/novo', label: 'Atender', icon: 'M12 5v14M5 12h14', primary: true },
  { href: '/auditor', label: 'Auditor', icon: 'M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z' },
  { href: '/mira-ia', label: 'MIRA IA', icon: 'M4 5h16v11H8l-4 4z' },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const items = isAdmin ? [...ITEMS, { href: '/admin', label: 'Admin', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 .5-1.5-1L15 4h-4l-.5 2.5-1.5 1L7 7 5 11l2 1v0l-2 1 2 4 2-.5 1.5 1L11 20h4l.5-2.5 1.5-1 2 .5 2-4z' }] : ITEMS;
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1">
      {items.map((it) => {
        const active = it.href === '/' ? path === '/' : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors',
              'primary' in it && it.primary ? 'bg-sage-600 text-white hover:bg-sage-700 my-2' : active ? 'bg-sage-100 text-sage-700 font-medium' : 'text-ink-700 hover:bg-sand-100',
            )}
          >
            <Icon d={it.icon} />
            {'primary' in it && it.primary ? 'Novo atendimento' : it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Navegação" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-white/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((it) => {
          const active = it.href === '/' ? path === '/' : path.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  'flex min-w-14 flex-col items-center gap-0.5 py-2 text-[11px]',
                  'primary' in it && it.primary ? 'text-white' : active ? 'text-sage-700' : 'text-ink-500',
                )}
              >
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', 'primary' in it && it.primary && 'bg-sage-600')}>
                  <Icon d={it.icon} />
                </span>
                <span className={cn('primary' in it && it.primary && 'text-sage-700')}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
