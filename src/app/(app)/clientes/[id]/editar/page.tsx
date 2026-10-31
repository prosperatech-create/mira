import { pageCtx, orNotFound } from '@/application/page';
import { getClientProfile } from '@/application/clients';
import { updateClientAction } from '@/app/actions/clients';
import { ClientForm } from '@/components/clients/client-form';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/misc';

export const metadata = { title: 'Editar cliente' };

export default async function EditClientPage({ params }: PageProps<'/clientes/[id]/editar'>) {
  const { id } = await params;
  const ctx = await pageCtx();
  const { client } = await orNotFound(getClientProfile(ctx, id));
  return (
    <div className="max-w-3xl">
      <PageHeader title={`Editar — ${client.full_name}`} />
      <Card className="p-5 sm:p-6">
        <ClientForm action={updateClientAction.bind(null, id)} isNew={false} initial={{ ...client, private_notes: client.private_notes }} />
      </Card>
    </div>
  );
}
