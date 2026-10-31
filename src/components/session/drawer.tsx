'use client';
import { useEffect, type ReactNode } from 'react';

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Fechar" className="absolute inset-0 bg-ink-900/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-sand-200 px-4 py-3">
          <h2 className="font-serif text-lg">{title}</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-ink-500 hover:bg-sand-100">Fechar</button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
