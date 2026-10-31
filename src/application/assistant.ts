import 'server-only';
/**
 * MIRA IA (chat lateral) com comandos rápidos.
 * Comandos determinísticos são resolvidos pelo sistema; a IA só entra para linguagem/explicação/estudo.
 */
import type { AppCtx } from './context';
import { chatSchema } from './schemas';
import { auditQuestion } from './audits';
import { getSessionView } from './sessions';
import { runText } from '@/ai/service';
import { chatSystemAddendum } from '@/ai/prompts';
import { formatPassages, getRetriever } from '@/knowledge/retriever';
import { listCharts } from '@/data/repositories/records';
import { listSessions } from '@/data/repositories/sessions';
import { MODES } from '@/domain/modes';
import { normalize } from '@/domain/text';

export interface ChatReply {
  text: string;
  source: 'sistema' | 'ia' | 'aviso';
  link?: { href: string; label: string };
}

export const COMMANDS: { cmd: string; help: string }[] = [
  { cmd: '/novo', help: 'Novo atendimento' },
  { cmd: '/mira', help: 'Sobre o Modo MIRA' },
  { cmd: '/tera', help: 'Sobre o Modo T.E.R.A. (inspirado)' },
  { cmd: '/terapeutica', help: 'Sobre o Modo Radiestesia Terapêutica (inspirado)' },
  { cmd: '/pergunta', help: 'Pergunta atual da árvore (e ajuda para formulá-la)' },
  { cmd: '/auditar <pergunta>', help: 'Audita uma pergunta' },
  { cmd: '/grafico <nome>', help: 'Consulta a biblioteca de gráficos' },
  { cmd: '/biometro', help: 'Ajuda para planejar um biômetro' },
  { cmd: '/protocolo', help: 'Ajuda para esboçar um protocolo' },
  { cmd: '/estudar <tema>', help: 'Estudo guiado (tradição × evidência)' },
  { cmd: '/cliente', help: 'Lista de clientes' },
  { cmd: '/relatorio', help: 'Relatório da sessão' },
  { cmd: '/reavaliar', help: 'Orientações de reavaliação' },
];

function helpText(): string {
  return ['Comandos disponíveis:', ...COMMANDS.map((c) => `• ${c.cmd} — ${c.help}`)].join('\n');
}

async function sessionContext(ctx: AppCtx, sessionId?: string | null): Promise<{ text: string; view: Awaited<ReturnType<typeof getSessionView>> | null }> {
  if (!sessionId) return { text: 'Sem sessão aberta.', view: null };
  const view = await getSessionView(ctx, sessionId);
  const s = view.session;
  const lines = [
    `Consulente: código ${view.client.code} (nome não compartilhado)`,
    `Modo: ${view.mode.label}`,
    `Fase: ${s.phase} · Etapa GPS: ${view.gps.stage}`,
    `Objetivo: ${s.objective ?? s.objective_suggested ?? '(a definir)'}`,
    `Índice de Neutralidade: ${s.neutrality_index ?? '—'}`,
    `Elemento em foco: ${s.context.element || '—'} · Categoria de hipótese: ${s.context.hypothesis_category || '—'}`,
    view.node ? `Pergunta atual da árvore: "${view.node.question}"` : 'Sem pergunta ativa.',
    'Últimas respostas informadas pela terapeuta:',
    ...view.steps.slice(-8).map((st) => `- ${st.questionText} → ${st.answerLabel}${st.answerText ? ` (${st.answerText.slice(0, 80)})` : ''}`),
  ];
  return { text: lines.join('\n'), view };
}

export async function chat(ctx: AppCtx, raw: unknown): Promise<ChatReply> {
  const input = chatSchema.parse(raw);
  const msg = input.message.trim();
  const [cmd, ...rest] = msg.split(/\s+/);
  const arg = rest.join(' ').trim();
  const lower = normalize(cmd);

  // ── comandos determinísticos ──
  if (lower === '/ajuda' || lower === '/help') return { text: helpText(), source: 'sistema' };
  if (lower === '/novo') return { text: 'Vamos iniciar um novo atendimento.', source: 'sistema', link: { href: '/atendimentos/novo', label: 'Novo atendimento' } };
  if (lower === '/cliente') return { text: 'Abra a lista de clientes.', source: 'sistema', link: { href: '/clientes', label: 'Clientes' } };
  if (lower === '/mira' || lower === '/tera' || lower === '/terapeutica') {
    const m = MODES[lower.slice(1) as keyof typeof MODES];
    return { text: [m.label, m.description, m.disclaimer].filter(Boolean).join('\n'), source: 'sistema' };
  }
  if (lower === '/relatorio') {
    if (input.sessionId) return { text: 'O relatório fica disponível ao encerrar a sessão.', source: 'sistema', link: { href: `/atendimentos/${input.sessionId}/relatorio`, label: 'Relatório da sessão' } };
    const last = (await listSessions(ctx.db, { phases: ['encerrada'], limit: 1 }))[0];
    return last
      ? { text: 'Último relatório disponível:', source: 'sistema', link: { href: `/atendimentos/${last.id}/relatorio`, label: `Relatório — ${last.clients?.full_name ?? ''}` } }
      : { text: 'Ainda não há sessões encerradas.', source: 'sistema' };
  }
  if (lower === '/auditar') {
    if (!arg) return { text: 'Use: /auditar <sua pergunta>', source: 'sistema' };
    const r = await auditQuestion(ctx, { question: arg, sessionId: input.sessionId });
    return {
      text: [`Classificação: ${r.labels.join(' · ')}`, r.explanation, r.suggestion ? `Sugestão: "${r.suggestion}"` : null].filter(Boolean).join('\n\n'),
      source: r.source === 'heuristica' ? 'sistema' : 'ia',
    };
  }
  if (lower === '/grafico' && arg) {
    const charts = await listCharts(ctx.db);
    const found = charts.filter((c) => normalize(c.name).includes(normalize(arg)));
    if (!found.length) return { text: `Nenhum gráfico com "${arg}" na biblioteca. Disponíveis: ${charts.map((c) => c.name).join(', ')}.`, source: 'sistema' };
    return {
      text: found
        .map((c) => `${c.name} (${c.category})\nFinalidade tradicional: ${c.traditional_purpose ?? '—'}\nQuando costuma ser usado: ${c.when_used ?? '—'}\nQuando não usar: ${c.when_not_used ?? '—'}`)
        .join('\n\n') + '\n\nLembrete: a escolha do gráfico passa pela investigação — nunca "problema X = gráfico Y".',
      source: 'sistema',
    };
  }

  const { text: contextText, view } = await sessionContext(ctx, input.sessionId);

  if (lower === '/pergunta' && view?.node && !arg) {
    const base = `Pergunta atual definida pela árvore MIRA (etapa: ${view.gps.stages[view.gps.stageIndex]?.label}):\n\n"${view.node.question}"${view.node.explanation ? `\n\n${view.node.explanation}` : ''}\n\nConsulte o pêndulo e registre a resposta na tela principal.`;
    return { text: base, source: 'sistema' };
  }

  // ── IA para o restante ──
  const promptByCommand: Record<string, string> = {
    '/pergunta': `Sugira até 3 formulações de pergunta para o pêndulo, neutras e com uma única ideia, sobre: ${arg || 'o próximo passo da investigação'}. Não diga qual será a resposta.`,
    '/biometro': `Ajude a planejar um biômetro${arg ? ` sobre: ${arg}` : ''}. Antes de propor categorias, percorra: 1) Qual decisão o biômetro ajudará a tomar? 2) Quais categorias? 3) Há sobreposição? 4) Precisa de "Outro"? 5) De "Nenhum"? 6) De "Não investigar agora"? Sugira o formato (semicircular, circular, linear, percentual, categorias, intensidade, prioridade).`,
    '/protocolo': `Esboce um protocolo de atendimento${arg ? ` para: ${arg}` : ''}, em etapas, deixando claro que cada etapa depende da investigação com o pêndulo e da decisão da terapeuta.`,
    '/estudar': `Vamos estudar: ${arg || 'fundamentos da radiestesia'}. Explique em blocos curtos, diferenciando TRADIÇÃO de EVIDÊNCIA CIENTÍFICA, e termine com 3 perguntas de revisão (flashcards).`,
    '/reavaliar': 'Explique como conduzir a reavaliação desta sessão (antes × depois), sem tratar correlação como causalidade.',
  };
  const userContent = promptByCommand[lower] ?? msg;
  const passages = await getRetriever().search(userContent, { limit: 4 });
  const ai = await runText({
    db: ctx.db,
    userId: ctx.user.id,
    sessionId: input.sessionId,
    task: 'chat',
    maxTokens: 1200,
    temperature: 0.4,
    systemAddendum: chatSystemAddendum(contextText, formatPassages(passages)),
    messages: [...input.history.slice(-10), { role: 'user', content: userContent }],
  });
  if (ai.ok) return { text: ai.value, source: 'ia' };
  if (ai.reason === 'crise' || ai.reason === 'bloqueado') return { text: ai.message, source: 'aviso' };

  // ── sem IA: resposta determinística útil ──
  if (view?.node) {
    return {
      text: `${ai.message}\n\nPergunta atual da árvore: "${view.node.question}"\n\n${helpText()}`,
      source: 'sistema',
    };
  }
  return { text: `${ai.message}\n\n${helpText()}`, source: 'sistema' };
}
