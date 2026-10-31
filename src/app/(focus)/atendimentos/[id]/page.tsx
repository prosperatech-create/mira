import { redirect } from 'next/navigation';
import { pageCtx, orNotFound } from '@/application/page';
import { getSessionView } from '@/application/sessions';
import { SessionRunner } from '@/components/session/session-runner';

export const metadata = { title: 'Atendimento' };

export default async function SessionPage({ params }: PageProps<'/atendimentos/[id]'>) {
  const { id } = await params;
  const ctx = await pageCtx();
  const view = await orNotFound(getSessionView(ctx, id));
  if (view.session.phase === 'encerrada') redirect(`/atendimentos/${id}/relatorio`);
  return <SessionRunner view={view} />;
}
