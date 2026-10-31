import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'sage' | 'lavender' | 'amber' | 'rose';
const TONES: Record<Tone, string> = {
  neutral: 'bg-sand-100 text-ink-700',
  sage: 'bg-sage-100 text-sage-700',
  lavender: 'bg-lavender-100 text-lavender-700',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
};

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', TONES[tone], className)}>{children}</span>;
}

export function Alert({ children, tone = 'amber', title }: { children: ReactNode; tone?: 'amber' | 'rose' | 'lavender' | 'sage'; title?: string }) {
  const styles = {
    amber: 'bg-amber-50 border-amber-600/20 text-ink-900',
    rose: 'bg-rose-50 border-rose-600/30 text-ink-900',
    lavender: 'bg-lavender-50 border-lavender-500/20 text-ink-900',
    sage: 'bg-sage-50 border-sage-500/20 text-ink-900',
  }[tone];
  return (
    <div role={tone === 'rose' ? 'alert' : 'status'} className={cn('rounded-2xl border px-4 py-3 text-sm leading-relaxed', styles)}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl text-ink-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-sand-50 px-4 py-6 text-center text-sm text-ink-500">{children}</p>;
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm text-rose-600">
      {children}
    </p>
  );
}
