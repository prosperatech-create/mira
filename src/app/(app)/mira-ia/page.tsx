import { pageCtx } from '@/application/page';
import { aiAvailable } from '@/ai/service';
import { ChatPanel } from '@/components/ai/chat-panel';
import { Card } from '@/components/ui/card';
import { Alert, PageHeader } from '@/components/ui/misc';

export const metadata = { title: 'MIRA IA' };

export default async function MiraIaPage() {
  const ctx = await pageCtx();
  const available = await aiAvailable(ctx.db);
  return (
    <div>
      <PageHeader title="MIRA IA" subtitle="Formular, auditar, interpretar sem extrapolar e estudar. A IA nunca responde pelo pêndulo." />
      {!available && (
        <div className="mb-4">
          <Alert tone="lavender">A IA não está configurada ou foi desativada. Os comandos do sistema (/pergunta, /auditar, /grafico, /novo…) continuam funcionando com as regras do MIRA.</Alert>
        </div>
      )}
      <Card className="h-[70dvh] overflow-hidden"><ChatPanel /></Card>
    </div>
  );
}
