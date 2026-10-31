import { pageCtx } from '@/application/page';
import { recentQuestionAudits } from '@/application/audits';
import { QuestionAuditor } from '@/components/session/question-auditor';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge, EmptyState, PageHeader } from '@/components/ui/misc';

export const metadata = { title: 'Auditor de perguntas' };

export default async function AuditorPage() {
  const ctx = await pageCtx();
  const recent = await recentQuestionAudits(ctx);
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <PageHeader title="Auditor de perguntas" subtitle="Proteção contra perguntas vagas, duplas, tendenciosas ou que acusam terceiros." />
        <Card className="p-5"><QuestionAuditor /></Card>
      </div>
      <Card className="lg:col-span-2">
        <CardHeader title="Auditorias recentes" />
        <CardBody>
          {recent.length === 0 ? <EmptyState>Nenhuma pergunta auditada ainda.</EmptyState> : (
            <ul className="space-y-3">
              {recent.map((r) => (
                <li key={r.id} className="rounded-xl bg-sand-50 p-3 text-sm">
                  <p>“{r.question}”</p>
                  <div className="mt-1 flex flex-wrap gap-1">{r.labels.map((l) => <Badge key={l} tone={l === 'BOA' ? 'sage' : 'amber'}>{l}</Badge>)}</div>
                  {r.suggestion && <p className="mt-1 text-xs text-ink-500">Sugestão: {r.suggestion}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
