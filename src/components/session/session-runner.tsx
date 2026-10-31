'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { SessionView } from '@/application/sessions';
import { cancelSessionAction } from '@/app/actions/sessions';
import { listSessionNotesAction } from '@/app/actions/clients';
import { Badge } from '@/components/ui/misc';
import { ChatPanel } from '@/components/ai/chat-panel';
import { NoteForm } from '@/components/clients/client-actions';
import { formatDateTime } from '@/lib/format';
import { Drawer } from './drawer';
import { GpsBar } from './gps-bar';
import { ObjectivePanel } from './objective-panel';
import { PreparationPanel } from './preparation-panel';
import { TriagePanel } from './triage-panel';
import { InvestigationPanel } from './investigation-panel';
import { RecordPanel } from './record-panel';
import { QuestionAuditor } from './question-auditor';
import { useServerAction } from './use-action';

type DrawerKind = 'notas' | 'historico' | 'ia' | 'auditor' | null;

/** Modo atendimento: sem distrações. Cliente, objetivo, etapa, pergunta, respostas e poucos botões. */
export function SessionRunner({ view }: { view: SessionView }) {
  const s = view.session;
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const close = useCallback(() => setDrawer(null), []);
  const { run } = useServerAction();

  return (
    <div className="min-h-dvh bg-sand-50">
      <header className="sticky top-0 z-20 border-b border-sand-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/" className="rounded-lg px-2 py-1 text-sm text-ink-500 hover:bg-sand-100" aria-label="Sair do modo atendimento">←</Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{view.client.name} <span className="text-xs text-ink-500">· {view.client.code}</span></p>
            <p className="truncate text-xs text-ink-500">{s.objective ?? 'Objetivo a definir'}</p>
          </div>
          <Badge tone="lavender" className="hidden sm:inline-flex">{view.mode.label}</Badge>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <GpsBar gps={view.gps} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-5">
        {view.mode.disclaimer && s.phase === 'objetivo' && <p className="mb-3 text-xs italic text-lavender-700">{view.mode.disclaimer}</p>}
        {s.phase === 'objetivo' && <ObjectivePanel sessionId={s.id} complaint={s.complaint_text} suggested={s.objective_suggested ?? ''} />}
        {s.phase === 'preparacao' && <PreparationPanel sessionId={s.id} />}
        {s.phase === 'triagem' && <TriagePanel sessionId={s.id} suggestions={view.triageSuggestions} neutrality={view.neutrality} />}
        {(s.phase === 'investigacao' || s.phase === 'reavaliacao') && view.node && <InvestigationPanel view={view} />}
        {s.phase === 'registro' && <RecordPanel view={view} />}
        {s.phase === 'cancelada' && (
          <p className="rounded-2xl bg-white p-6 text-center text-ink-500">Sessão cancelada. <Link href={`/clientes/${view.client.id}`} className="text-sage-700 underline">Voltar à ficha</Link></p>
        )}
        {s.phase === 'encerrada' && (
          <p className="rounded-2xl bg-white p-6 text-center">Sessão encerrada. <Link href={`/atendimentos/${s.id}/relatorio`} className="text-sage-700 underline">Ver relatório</Link></p>
        )}
      </main>

      <nav aria-label="Ferramentas da sessão" className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around px-2 py-2 text-xs">
          {([
            ['notas', 'Notas'],
            ['historico', 'Histórico'],
            ['auditor', 'Auditar'],
            ['ia', 'MIRA IA'],
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setDrawer(k)} className="min-w-16 rounded-xl px-3 py-2 text-ink-700 hover:bg-sand-100">
              {label}
            </button>
          ))}
          {s.phase !== 'encerrada' && s.phase !== 'cancelada' && (
            <button
              onClick={() => confirm('Cancelar esta sessão? O que já foi registrado será mantido.') && run(() => cancelSessionAction(s.id))}
              className="min-w-16 rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </nav>

      <Drawer open={drawer === 'notas'} onClose={close} title="Notas da sessão">
        <SessionNotes clientId={view.client.id} sessionId={s.id} />
      </Drawer>
      <Drawer open={drawer === 'historico'} onClose={close} title="Histórico desta sessão">
        <ol className="space-y-2 p-4 text-sm">
          {view.steps.length === 0 && <li className="text-ink-500">Nenhuma resposta registrada ainda.</li>}
          {view.steps.map((st) => (
            <li key={st.seq} className="rounded-xl bg-sand-50 p-3">
              <p className="text-ink-700">{st.questionText}</p>
              <p className="mt-1 font-semibold text-sage-700">→ {st.answerLabel}{st.answerText ? ` — ${st.answerText}` : ''}</p>
            </li>
          ))}
        </ol>
        <div className="px-4 pb-4"><Link href={`/clientes/${view.client.id}`} className="text-sm text-sage-700 underline">Abrir ficha completa da cliente</Link></div>
      </Drawer>
      <Drawer open={drawer === 'auditor'} onClose={close} title="Auditor de perguntas">
        <div className="p-4"><QuestionAuditor sessionId={s.id} /></div>
      </Drawer>
      <Drawer open={drawer === 'ia'} onClose={close} title="MIRA IA">
        <ChatPanel sessionId={s.id} />
      </Drawer>
    </div>
  );
}

function SessionNotes({ clientId, sessionId }: { clientId: string; sessionId: string }) {
  const [notes, setNotes] = useState<{ id: string; content: string; createdAt: string }[]>([]);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    listSessionNotesAction(sessionId).then((r) => {
      if (alive && r.ok) setNotes(r.data);
    });
    return () => {
      alive = false;
    };
  }, [sessionId, version]);
  const load = useCallback(() => setVersion((v) => v + 1), []);
  return (
    <div className="space-y-4 p-4">
      <NoteForm clientId={clientId} sessionId={sessionId} onSaved={load} />
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl bg-sand-50 p-3 text-sm">
            <p className="text-xs text-ink-500">{formatDateTime(n.createdAt)}</p>
            <p className="whitespace-pre-wrap">{n.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
