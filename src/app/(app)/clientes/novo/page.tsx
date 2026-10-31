import { pageCtx } from '@/application/page';
import { getSetting } from '@/data/repositories/logs';
import { createClientAction } from '@/app/actions/clients';
import { ClientForm } from '@/components/clients/client-form';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/misc';

export const metadata = { title: 'Novo cliente' };

export default async function NewClientPage({ searchParams }: PageProps<'/clientes/novo'>) {
  const ctx = await pageCtx();
  const sp = await searchParams;
  const consentText = await getSetting<string>(ctx.db, 'consent_text', 'Autorizo o registro das informações para fins de acompanhamento terapêutico integrativo.');
  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo cliente" subtitle="Registre apenas o necessário." />
      <Card className="p-5 sm:p-6">
        <ClientForm action={createClientAction} isNew consentText={consentText} next={sp.next === 'atendimento' ? 'atendimento' : undefined} />
      </Card>
    </div>
  );
}
