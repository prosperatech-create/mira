import Link from 'next/link';
import { pageCtx } from '@/application/page';
import { listClients } from '@/data/repositories/clients';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
import { EmptyState, PageHeader } from '@/components/ui/misc';
import { Input } from '@/components/ui/field';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'Clientes' };

export default async function ClientsPage({ searchParams }: PageProps<'/clientes'>) {
  const ctx = await pageCtx();
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const clients = await listClients(ctx.db, q);
  return (
    <div>
      <PageHeader title="Clientes" subtitle="Fichas, histórico e evolução" action={<LinkButton href="/clientes/novo">+ Novo cliente</LinkButton>} />
      <form className="mb-4" role="search">
        <label htmlFor="q" className="sr-only">Buscar cliente</label>
        <Input id="q" name="q" placeholder="Buscar por nome ou código…" defaultValue={q} />
      </form>
      <Card>
        {clients.length === 0 ? (
          <div className="p-5"><EmptyState>{q ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}</EmptyState></div>
        ) : (
          <ul className="divide-y divide-sand-200">
            {clients.map((c) => (
              <li key={c.id}>
                <Link href={`/clientes/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-sand-50">
                  <div>
                    <p className="font-medium">{c.full_name}</p>
                    <p className="text-sm text-ink-500">{c.internal_code}{c.profession ? ` · ${c.profession}` : ''}</p>
                  </div>
                  <span className="text-xs text-ink-500">desde {formatDate(c.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
