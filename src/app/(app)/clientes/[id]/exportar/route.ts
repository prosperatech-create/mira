import { NextResponse } from 'next/server';
import { getCtx } from '@/application/context';
import { exportClientData } from '@/application/clients';
import { AppError } from '@/lib/errors';

/** Exportação de dados da cliente (LGPD — direito de portabilidade). */
export async function GET(_req: Request, ctx: RouteContext<'/clientes/[id]/exportar'>) {
  try {
    const { id } = await ctx.params;
    const app = await getCtx();
    const data = await exportClientData(app, id);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="mira-cliente-${data.client.internal_code}.json"`,
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    const status = err instanceof AppError ? (err.code === 'NOT_FOUND' ? 404 : err.code === 'UNAUTHENTICATED' ? 401 : 403) : 500;
    return NextResponse.json({ error: err instanceof AppError ? err.message : 'Erro ao exportar.' }, { status });
  }
}
