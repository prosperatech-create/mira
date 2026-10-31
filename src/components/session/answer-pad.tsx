'use client';
import { useState } from 'react';
import type { PresentedNode } from '@/domain/tree-engine';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { cn } from '@/lib/cn';

/** Botões de resposta conforme o tipo do nó. A resposta vem SEMPRE da terapeuta. */
export function AnswerPad({ node, pending, onAnswer }: { node: PresentedNode; pending: boolean; onAnswer: (value: string, text?: string) => void }) {
  const [text, setText] = useState('');
  const [measure, setMeasure] = useState(5);

  if (node.kind === 'yes_no') {
    const main = node.options.filter((o) => o.value === 'sim' || o.value === 'nao');
    const secondary = node.options.filter((o) => o.value !== 'sim' && o.value !== 'nao');
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {main.map((o) => (
            <button
              key={o.value}
              disabled={pending}
              onClick={() => onAnswer(o.value)}
              className={cn(
                'h-20 rounded-2xl text-xl font-semibold tracking-wide shadow-sm transition active:scale-[0.98] disabled:opacity-50',
                o.value === 'sim' ? 'bg-sage-600 text-white hover:bg-sage-700' : 'bg-white text-ink-900 border-2 border-sand-300 hover:bg-sand-100',
              )}
            >
              {o.label.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {secondary.map((o) => (
            <button key={o.value} disabled={pending} onClick={() => onAnswer(o.value)} className="h-12 rounded-xl border border-sand-300 bg-white text-sm font-medium text-ink-700 hover:bg-sand-100 disabled:opacity-50">
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (node.kind === 'select' || node.kind === 'origin') {
    return (
      <div className="space-y-3">
        <div className={cn('grid gap-2', node.options.length > 6 ? 'sm:grid-cols-2' : '')}>
          {node.options.map((o) => (
            <button
              key={o.value}
              disabled={pending}
              onClick={() => onAnswer(o.value)}
              className={cn(
                'min-h-12 rounded-xl border px-4 py-3 text-left text-[15px] transition active:scale-[0.99] disabled:opacity-50',
                o.value === 'voltar' || o.value === 'nenhuma' ? 'border-dashed border-sand-300 text-ink-500 hover:bg-sand-50' : 'border-sand-200 bg-white hover:border-sage-300 hover:bg-sage-50',
                node.kind === 'origin' && 'text-center font-semibold uppercase tracking-wide',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => onAnswer('nao_sei')}>Não sei</Button>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => onAnswer('reformular')}>Reformular</Button>
        </div>
      </div>
    );
  }

  if (node.kind === 'measure') {
    const others = node.options.filter((o) => o.value !== 'medida');
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input type="range" min={0} max={10} step={1} value={measure} onChange={(e) => setMeasure(Number(e.target.value))} className="flex-1 accent-lavender-500" aria-label="Intensidade de 0 a 10" />
          <span className="w-14 text-center font-serif text-3xl text-lavender-700">{measure}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" disabled={pending} onClick={() => onAnswer('medida', String(measure))}>Registrar intensidade</Button>
          {others.map((o) => (
            <Button key={o.value} size="lg" variant="secondary" disabled={pending} onClick={() => onAnswer(o.value)}>{o.label}</Button>
          ))}
        </div>
      </div>
    );
  }

  if (node.kind === 'text') {
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onAnswer(node.options[0]?.value ?? 'registrar', text);
          setText('');
        }}
      >
        <Textarea aria-label="Registro" value={text} onChange={(e) => setText(e.target.value)} className="min-h-32 text-base" placeholder="Hipótese de possível origem simbólico-energética…" />
        <Button type="submit" size="lg" disabled={pending || !text.trim()}>{node.options[0]?.label ?? 'Registrar'}</Button>
      </form>
    );
  }

  if (node.kind === 'end') {
    return <Button size="lg" disabled={pending} onClick={() => onAnswer('continuar')}>{node.options[0]?.label ?? 'Continuar'}</Button>;
  }

  return null;
}
