'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';

/** Registra o service worker (somente em produção). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
  }, []);
  return null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function subscribeDisplay(cb: () => void) {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const noop = () => () => {};

/** Botão "Instalar app": usa o prompt nativo (Chrome/Edge/Android) ou mostra instruções no iPhone/iPad. */
export function InstallAppButton({ className }: { className?: string }) {
  const standalone = useSyncExternalStore(subscribeDisplay, isStandalone, () => true);
  const ios = useSyncExternalStore(noop, isIos, () => false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (standalone || (!deferred && !ios)) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          } else setShowIosHelp((v) => !v);
        }}
        className={cn('inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sage-300 bg-sage-50 px-3 py-2 text-sm font-medium text-sage-700 hover:bg-sage-100')}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        Instalar app
      </button>
      {showIosHelp && (
        <p className="mt-2 rounded-xl bg-white p-3 text-xs leading-relaxed text-ink-700 shadow-sm">
          No iPhone/iPad (Safari): toque em <strong>Compartilhar</strong> (quadrado com seta) e depois em <strong>Adicionar à Tela de Início</strong>.
        </p>
      )}
    </div>
  );
}
