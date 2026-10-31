'use client';
import { useRef, useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { chatAction } from '@/app/actions/ai';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  source?: 'sistema' | 'ia' | 'aviso';
  link?: { href: string; label: string };
}

const QUICK = ['Qual é a próxima pergunta?', '/pergunta', 'Me ajude a interpretar sem extrapolar.', '/auditar ', '/estudar chakras', '/ajuda'];

export function ChatPanel({ sessionId, className }: { sessionId?: string; className?: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', source: 'sistema', content: 'Olá! Sou a MIRA IA. Ajudo a formular perguntas, auditar, interpretar sem extrapolar e estudar. Eu não respondo pelo pêndulo — quem decide é você. Digite /ajuda para ver os comandos.' },
  ]);
  const [input, setInput] = useState('');
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  function send(text: string) {
    const content = text.trim();
    if (!content) return;
    const history = messages.filter((m) => m.source !== 'sistema').map(({ role, content }) => ({ role, content })).slice(-10);
    setMessages((m) => [...m, { role: 'user', content }]);
    setInput('');
    start(async () => {
      const r = await chatAction({ message: content, sessionId: sessionId ?? null, history });
      setMessages((m) => [...m, r.ok ? { role: 'assistant', content: r.data.text, source: r.data.source, link: r.data.link } : { role: 'assistant', content: r.error, source: 'aviso' }]);
    });
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={cn('max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed', m.role === 'user' ? 'ml-auto bg-sage-600 text-white' : m.source === 'aviso' ? 'bg-amber-50 text-ink-900' : 'bg-sand-100 text-ink-900')}>
            {m.role === 'assistant' && m.source && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">{m.source === 'ia' ? 'MIRA IA' : m.source === 'aviso' ? 'Aviso' : 'Sistema MIRA'}</p>}
            {m.content}
            {m.link && (
              <Link href={m.link.href} className="mt-2 block font-medium text-sage-700 underline">
                {m.link.label} →
              </Link>
            )}
          </div>
        ))}
        {pending && <p className="text-xs text-ink-500">MIRA está pensando…</p>}
        <div ref={endRef} />
      </div>
      <div className="border-t border-sand-200 p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => (q.endsWith(' ') ? setInput(q) : send(q))} className="shrink-0 rounded-full bg-sand-100 px-3 py-1 text-xs text-ink-700 hover:bg-sand-200">
              {q.trim()}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor="chat-input" className="sr-only">Mensagem para a MIRA IA</label>
          <input id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escreva ou use /comandos…" className="h-11 flex-1 rounded-xl border border-sand-300 px-3 text-sm focus:border-lavender-500 focus:outline-none" />
          <Button type="submit" disabled={pending || !input.trim()}>Enviar</Button>
        </form>
      </div>
    </div>
  );
}
