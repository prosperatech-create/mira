import { pageCtx } from '@/application/page';
import { listClients } from '@/data/repositories/clients';
import { NewSessionForm } from '@/components/session/new-session-form';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/misc';

export const metadata = { title: 'Novo atendimento' };

export default async function NewSessionPage({ searchParams }: PageProps<'/atendimentos/novo'>) {
  const ctx = await pageCtx();
  const sp = await searchParams;
  const clients = await listClients(ctx.db);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo atendimento" subtitle="Cliente, objetivo e modo. Em seguida: preparação e triagem." />
      <Card className="p-5 sm:p-6">
        <NewSessionForm clients={clients.map((c) => ({ id: c.id, full_name: c.full_name, internal_code: c.internal_code }))} preselected={typeof sp.cliente === 'string' ? sp.cliente : undefined} />
      </Card>
    </div>
  );
}
