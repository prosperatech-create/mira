import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const base = 'w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-300 focus:border-lavender-500 focus:outline-none focus:ring-2 focus:ring-lavender-100';

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'min-h-24 leading-relaxed', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, 'h-11', className)} {...props} />;
}
