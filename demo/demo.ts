/**
 * Prévia navegável do MIRA (demonstração). Usa o MESMO domínio do app real
 * (motor de árvores, árvore MIRA, triagem, neutralidade, auditor, relatórios),
 * com dados de exemplo em memória. Nada é salvo em servidor.
 */
import { applyAnswer, presentNode, resolveNodeKey, type PresentedNode } from '../src/domain/tree-engine';
import { miraMainTree, miraReevaluationTree } from '../src/domain/seed/mira-tree';
import { SEED_CHARTS, SEED_INTERVENTIONS } from '../src/domain/seed/catalog';
import { transition, PHASE_LABELS } from '../src/domain/session-machine';
import { computeNeutrality, PREPARATION_QUESTIONS, NEUTRALITY_DISCLAIMER, type PreparationAnswers } from '../src/domain/preparation';
import { evaluateTriage, suggestTriageFlags, TRIAGE_FLAGS } from '../src/domain/triage';
import { auditQuestionHeuristic } from '../src/domain/question-auditor';
import { buildGps } from '../src/domain/gps';
import { MODES } from '../src/domain/modes';
import { suggestObjectiveFallback } from '../src/domain/objective';
import { buildClientReport, buildInternalReport, type ReportIntervention, type ReportHypothesis } from '../src/domain/report';
import { auditSession } from '../src/domain/session-audit';
import { hasExcessivePrecision, PRECISION_WARNING } from '../src/domain/precision';
import type { InvestigationTree, SessionContext, SessionMode, SessionPhase, StepRecord } from '../src/domain/types';
import { SESSION_MODES } from '../src/domain/types';

// ───────── estado ─────────
interface Client { id: string; name: string; code: string; profession?: string; since: string; history: { date: string; objective: string; elements: string[] }[] }
interface Session {
  clientId: string; mode: SessionMode; phase: SessionPhase; complaint: string; objective: string; suggested: string;
  prep?: PreparationAnswers; neutrality?: number; triageFlags: string[]; tree: InvestigationTree | null; node: string | null;
  ctx: SessionContext; steps: StepRecord[]; hypotheses: ReportHypothesis[]; interventions: ReportIntervention[];
  before: string; after: string; record: { client_report: string; interpretation: string; observations: string; self_care: string; next: string };
  startedAt: string; endedAt?: string; hint?: string | null; precision?: boolean; error?: string;
}

const clients: Client[] = [
  { id: 'c1', name: 'Maria Souza', code: 'M26-1042', profession: 'Arquiteta', since: '2026-03-15', history: [
    { date: '2026-03-15', objective: 'Investigar fatores simbólico-energéticos relacionados à experiência profissional atual.', elements: ['Área: Profissional', 'Chakra Plexo Solar'] },
    { date: '2026-03-21', objective: 'Reavaliação da questão profissional.', elements: ['Chakra Plexo Solar'] },
    { date: '2026-04-05', objective: 'Investigar fatores relacionados à experiência atual em seus relacionamentos.', elements: ['Relacionamentos — Família', 'Campo emocional'] },
  ] },
  { id: 'c2', name: 'Ana Lima', code: 'M26-2210', profession: 'Professora', since: '2026-05-02', history: [
    { date: '2026-05-02', objective: 'Investigar fatores relacionados ao bem-estar emocional atual.', elements: ['Campo emocional', 'Aura'] },
  ] },
  { id: 'c3', name: 'Carla Mendes', code: 'M26-3381', since: '2026-09-10', history: [] },
];

let view: 'inicio' | 'clientes' | 'cliente' | 'novo' | 'sessao' | 'relatorio' | 'auditor' = 'inicio';
let currentClient = 'c1';
let s: Session | null = null;
let reportTab: 'interno' | 'cliente' = 'interno';
let drawer: 'historico' | 'auditor' | null = null;

const app = document.getElementById('app')!;
const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmt = (d: string) => new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR');
const client = (id: string) => clients.find((c) => c.id === id)!;

// ───────── layout ─────────
function shell(inner: string) {
  const nav = [['inicio', 'Início'], ['clientes', 'Clientes'], ['novo', '+ Novo atendimento'], ['auditor', 'Auditor']] as const;
  return `
  <div class="banner">Prévia de demonstração · dados de exemplo · nada é salvo · a versão real exige login e roda com Supabase</div>
  <div class="layout">
    <aside class="side">
      <div class="brand">${LOGO}<div><b>MIRA</b><small>Radiestesia aplicada</small></div></div>
      ${nav.map(([k, l]) => `<button class="nav ${k === 'novo' ? 'nav-primary' : view === k || (k === 'clientes' && view === 'cliente') ? 'active' : ''}" data-go="${k}">${l}</button>`).join('')}
      <div class="side-foot"><b>Grazi</b><small>Terapeuta</small></div>
    </aside>
    <main class="main">${inner}</main>
  </div>
  <nav class="bottom">${nav.map(([k, l]) => `<button data-go="${k}" class="${view === k ? 'on' : ''}">${k === 'novo' ? '<span class="plus">+</span>Atender' : l}</button>`).join('')}</nav>`;
}

const LOGO = `<svg viewBox="0 0 48 48" class="logo"><circle cx="24" cy="24" r="22" fill="#e1ebe2"/><circle cx="24" cy="24" r="14" fill="none" stroke="#5f8a68" stroke-width="2"/><circle cx="24" cy="24" r="6" fill="#7a6fa8" opacity=".85"/><line x1="24" y1="2" x2="24" y2="12" stroke="#5f8a68" stroke-width="2" stroke-linecap="round"/></svg>`;

// ───────── telas ─────────
function dashboard() {
  const h = new Date().getHours();
  return shell(`
  <section class="hero"><div><small>${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'},</small><h1>Grazi</h1>
  <p>A terapeuta decide. O pêndulo é operado por você. O MIRA organiza o raciocínio.</p></div>
  <button class="btn btn-lg" data-go="novo">+ Novo atendimento</button></section>
  <div class="stats"><div class="card stat"><b>${clients.length}</b><small>Clientes</small></div><div class="card stat"><b>4</b><small>Sessões (30 dias)</small></div><div class="card stat"><b>3</b><small>Encerradas (30 dias)</small></div></div>
  <div class="grid">
    <div class="card span2"><h2>Atendimentos de hoje</h2>${s ? `<a class="row" data-go="sessao"><div><b>${esc(client(s.clientId).name)}</b><small>${esc(s.objective || s.complaint)}</small></div><span class="badge lav">${PHASE_LABELS[s.phase]}</span></a>` : '<p class="empty">Nenhum atendimento hoje ainda. Clique em “Novo atendimento” para experimentar o fluxo completo.</p>'}</div>
    <div class="card"><h2>Clientes recentes</h2>${clients.map((c) => `<a class="row" data-client="${c.id}"><span>${esc(c.name)}</span><small>${c.code}</small></a>`).join('')}</div>
    <div class="card"><h2>Próximos acompanhamentos</h2><div class="row"><span>Maria Souza</span><small>12/11/2026</small></div><div class="row"><span>Ana Lima</span><small>18/11/2026</small></div></div>
    <div class="card"><h2>Gráficos mais utilizados</h2>${[['Nove Círculos', 3], ['Equilibrador de chakras', 2], ['Turbilhão', 1]].map(([n, c]) => `<div class="row"><span>${n}</span><span class="bar" style="width:${(c as number) * 26}px"></span></div>`).join('')}</div>
    <div class="card"><h2>Biblioteca MIRA</h2><p class="muted">Biblioteca de gráficos, protocolos, biômetros e Academia MIRA chegam na fase 2.</p></div>
  </div>`);
}

function clientsList() {
  return shell(`<div class="head"><h1>Clientes</h1></div><div class="card">${clients.map((c) => `<a class="row" data-client="${c.id}"><div><b>${esc(c.name)}</b><small>${c.code}${c.profession ? ' · ' + c.profession : ''}</small></div><small>desde ${fmt(c.since)}</small></a>`).join('')}</div>`);
}

function clientPage() {
  const c = client(currentClient);
  const counts = new Map<string, number>();
  c.history.forEach((h) => h.elements.forEach((e) => counts.set(e, (counts.get(e) ?? 0) + 1)));
  return shell(`<div class="head"><div><small>${c.code}</small><h1>${esc(c.name)}</h1></div><button class="btn" data-newfor="${c.id}">+ Novo atendimento</button></div>
  <div class="grid">
    <div class="card"><h2>Ficha</h2><div class="row"><span class="muted">Profissão</span><span>${esc(c.profession ?? '—')}</span></div><div class="row"><span class="muted">Consentimento</span><span>${fmt(c.since)} (v1)</span></div><div class="note">Anotações privadas ficam criptografadas e visíveis só para a terapeuta.</div></div>
    <div class="card span2"><h2>Recorrências</h2><p class="muted small">Frequência entre sessões. Correlação não é causalidade.</p><div class="chips">${[...counts].map(([k, v]) => `<span class="badge">${esc(k)} · ${v}</span>`).join('') || '<span class="muted">—</span>'}</div></div>
    <div class="card span3"><h2>Linha do tempo</h2>${c.history.length ? `<ol class="timeline">${c.history.map((h) => `<li><b>${fmt(h.date).slice(0, 5)}</b> <span class="badge sage">Encerrada</span><p>${esc(h.objective)}</p><small>Elementos: ${esc(h.elements.join(' · '))}</small></li>`).join('')}</ol>` : '<p class="empty">Nenhuma sessão registrada.</p>'}</div>
  </div>`);
}

function newSession() {
  return shell(`<div class="head"><div><h1>Novo atendimento</h1><p class="muted">Cliente, objetivo e modo. Em seguida: preparação e triagem.</p></div></div>
  <form class="card form" id="newform">
    <label>Cliente<select name="client">${clients.map((c) => `<option value="${c.id}" ${c.id === currentClient ? 'selected' : ''}>${esc(c.name)} — ${c.code}</option>`).join('')}</select></label>
    <label>Qual é o principal objetivo desta sessão?<textarea name="complaint" required placeholder="Ex.: Ela quer trabalhar a questão financeira.">Ela quer trabalhar a questão financeira.</textarea></label>
    <div class="chips">${['Questão financeira.', 'Ansiedade relacionada ao trabalho.', 'Sensação de estagnação.', 'Relacionamentos.', 'Harmonização de ambiente.'].map((e) => `<button type="button" class="chip" data-ex="${e}">${e}</button>`).join('')}</div>
    <fieldset><legend>Modo de operação</legend><div class="modes">${SESSION_MODES.map((m, i) => `<label class="mode"><input type="radio" name="mode" value="${m}" ${i === 0 ? 'checked' : ''}><b>${MODES[m].label}</b><small>${MODES[m].description}</small>${MODES[m].disclaimer ? `<em>${MODES[m].disclaimer}</em>` : ''}</label>`).join('')}</div></fieldset>
    <button class="btn btn-lg">Continuar</button>
  </form>`);
}

// ───────── sessão (modo atendimento) ─────────
function treeSteps() { return s!.steps.filter((x) => s!.tree && (x as StepRecord & { tree?: string }).tree === s!.tree.slug); }

function sessionScreen() {
  const ss = s!;
  const c = client(ss.clientId);
  let node: PresentedNode | null = null;
  if (ss.tree && ss.node) node = presentNode(ss.tree, ss.node, ss.ctx, treeSteps());
  const gps = buildGps(ss.phase, node?.stage ?? null, ss.ctx);
  let body = '';
  if (ss.phase === 'objetivo') body = `<div class="card pad">${MODES[ss.mode].disclaimer ? `<p class="disc">${MODES[ss.mode].disclaimer}</p>` : ''}<small class="cap">Descrição da terapeuta</small><p>“${esc(ss.complaint)}”</p>
    <div class="objbox"><small class="cap sage">Objetivo sugerido</small><textarea id="obj" class="serif">${esc(ss.suggested)}</textarea></div>
    <p class="muted small">Na versão real, a MIRA IA sugere o texto; sem IA, este modelo determinístico é usado (como aqui). Edite à vontade.</p>
    <div class="actions"><button class="btn btn-lg" data-act="approve">Aprovar</button></div></div>`;
  if (ss.phase === 'preparacao') body = `<div class="card pad"><h2 class="serif big">Preparação da terapeuta</h2><p class="muted">Respire, solte expectativas e responda com sinceridade.</p>
    ${PREPARATION_QUESTIONS.map((q) => `<div class="prep"><span>${q.text}</span><div><label class="tog"><input type="radio" name="${q.key}" value="1"><span>Sim</span></label><label class="tog"><input type="radio" name="${q.key}" value="0"><span>Não</span></label></div></div>`).join('')}
    <p class="muted small">${NEUTRALITY_DISCLAIMER}</p><button class="btn btn-lg" data-act="prep">Concluir preparação</button></div>`;
  if (ss.phase === 'triagem') {
    const n = computeNeutrality(ss.prep!);
    const sug = suggestTriageFlags(ss.complaint);
    body = `<div class="card pad neutral"><div class="ring ${n.level}">${n.index}</div><div><b>Índice de Neutralidade da Sessão</b>${n.messages.map((m) => `<p>${esc(m)}</p>`).join('')}<small class="muted">Indicador interno de atenção, não uma medida científica.</small></div></div>
    <div class="card pad"><h2 class="serif big">Triagem de segurança</h2><p class="muted">Antes da leitura radiestésica, a situação envolve algum destes pontos?</p>
    <div class="flags">${TRIAGE_FLAGS.map((f) => `<label class="flag ${ss.triageFlags.includes(f.key) ? 'on' : ''}"><input type="checkbox" data-flag="${f.key}" ${ss.triageFlags.includes(f.key) ? 'checked' : ''}>${f.label}${sug.includes(f.key) ? ' <small class="amber">sugerido</small>' : ''}</label>`).join('')}</div>
    ${triageAlert()}<button class="btn btn-lg ${evaluateTriage(ss.triageFlags).level === 'critico' ? 'danger' : ''}" data-act="triage">${evaluateTriage(ss.triageFlags).level === 'critico' ? 'Registrar e seguir para o encerramento' : 'Iniciar investigação'}</button></div>`;
  }
  if ((ss.phase === 'investigacao' || ss.phase === 'reavaliacao') && node) body = investigation(node);
  if (ss.phase === 'registro') body = recordPanel();
  return `<div class="banner">Prévia de demonstração · dados de exemplo · nada é salvo</div>
  <div class="focus">
    <header class="fhead"><button class="ghost" data-go="inicio">←</button><div class="grow"><b>${esc(c.name)}</b> <span class="muted small">· ${c.code}</span><small class="ell">${esc(ss.objective || 'Objetivo a definir')}</small></div><span class="badge lav hide-sm">${MODES[ss.mode].label}</span></header>
    <div class="gps"><div class="gbar">${gps.stages.map((x) => `<i class="${x.status}" title="${x.label}"></i>`).join('')}</div><div class="gtext"><b>${gps.stages[gps.stageIndex]?.label}</b>${gps.breadcrumb.map((b) => ` <span>›</span> ${esc(b)}`).join('')}</div></div>
    <main class="fmain">${ss.error ? `<div class="alert rose">${esc(ss.error)}</div>` : ''}${body}</main>
    <nav class="tools"><button data-drawer="historico">Histórico</button><button data-drawer="auditor">Auditar pergunta</button><button data-go="inicio">Sair</button></nav>
    ${drawer ? drawerHtml() : ''}
  </div>`;
}

function triageAlert() {
  const r = evaluateTriage(s!.triageFlags);
  if (r.level === 'nenhum') return '';
  return `<div class="alert ${r.level === 'critico' ? 'rose' : 'amber'}"><b>${r.level === 'critico' ? 'Situação crítica' : 'Atenção'}</b>${r.messages.map((m) => `<p>${esc(m)}</p>`).join('')}</div>`;
}

function investigation(node: PresentedNode) {
  const ss = s!;
  let pad = '';
  if (node.kind === 'yes_no') {
    pad = `<div class="yn">${node.options.filter((o) => o.value === 'sim' || o.value === 'nao').map((o) => `<button class="${o.value}" data-ans="${o.value}">${o.label.toUpperCase()}</button>`).join('')}</div>
    <div class="yn2">${node.options.filter((o) => o.value !== 'sim' && o.value !== 'nao').map((o) => `<button data-ans="${o.value}">${o.label}</button>`).join('')}</div>`;
  } else if (node.kind === 'select' || node.kind === 'origin') {
    pad = `<div class="opts ${node.options.length > 6 ? 'two' : ''} ${node.kind}">${node.options.map((o) => `<button class="${o.value === 'voltar' || o.value === 'nenhuma' ? 'dash' : ''}" data-ans="${o.value}">${esc(o.label)}</button>`).join('')}</div>
    <div class="actions"><button class="ghost" data-ans="nao_sei">Não sei</button><button class="ghost" data-ans="reformular">Reformular</button></div>`;
  } else if (node.kind === 'measure') {
    pad = `<div class="measure"><input type="range" min="0" max="10" value="5" id="meas" oninput="document.getElementById('measv').textContent=this.value"><b id="measv">5</b></div>
    <div class="actions"><button class="btn btn-lg" data-measure="1">Registrar intensidade</button>${node.options.filter((o) => o.value !== 'medida').map((o) => `<button class="btn2 btn-lg" data-ans="${o.value}">${o.label}</button>`).join('')}</div>`;
  } else if (node.kind === 'text') {
    pad = `<textarea id="txt" class="big" placeholder="Hipótese de possível origem simbólico-energética…">Dentro do modelo utilizado, parece haver relação com emoções contidas ligadas à segurança material.</textarea><div class="actions"><button class="btn btn-lg" data-text="1">${node.options[0]?.label ?? 'Registrar'}</button></div>`;
  } else if (node.kind === 'intervention') {
    pad = `<div class="form">
      <label>Categoria da intervenção (indicada na investigação)<select id="ivcat">${SEED_INTERVENTIONS.map((i) => `<option value="${i.slug}">${i.name}</option>`).join('')}</select></label>
      <label>Gráfico radiônico<select id="ivchart"><option value="">—</option>${SEED_CHARTS.map((c) => `<option>${c.name}</option>`).join('')}</select></label>
      <p class="muted small">A escolha vem da investigação: o MIRA nunca associa automaticamente “problema X = gráfico Y”.</p>
      <label>Descrição<textarea id="ivdesc">Gráfico com testemunho por 7 dias.</textarea></label>
      <div class="two-col"><label>Duração<input id="ivdur" value="7 dias" placeholder="ex.: 7 dias"></label><label>Frequência<input id="ivfreq" value="contínuo"></label></div>
      <p class="muted small">Experimente digitar “17 horas, 23 minutos e 14 segundos” na duração para ver o alerta de falsa precisão.</p>
      <button class="btn btn-lg" data-iv="1">Registrar intervenção</button></div>`;
  } else if (node.kind === 'end') {
    pad = `<button class="btn btn-lg" data-ans="continuar">${node.options[0]?.label ?? 'Continuar'}</button>`;
  }
  const reav = ss.phase === 'reavaliacao' ? `<div class="card pad"><h3 class="serif">Antes × Depois</h3><p class="muted small">Diferenças não comprovam causalidade.</p><div class="two-col"><label>Antes<input id="before" value="${esc(ss.before || (ss.ctx.intensity_before ? `Intensidade ${ss.ctx.intensity_before}/10` : 'Sensação de aperto financeiro'))}"></label><label>Depois<input id="after" value="${esc(ss.after || 'Mais calma ao pensar no tema')}"></label></div></div>` : '';
  return `<div class="card pad q">
    ${node.reformulationCount ? `<small class="lavtxt">Pergunta reformulada (${node.reformulationCount}×)</small>` : ''}
    <h2 class="question">${esc(node.question)}</h2>
    ${node.explanation ? `<p class="muted">${esc(node.explanation)}</p>` : ''}
    ${node.alerts.map((a) => `<div class="alert ${a.level === 'atencao' ? 'amber' : 'lav'}">${esc(a.message)}</div>`).join('')}
    ${ss.hint ? `<div class="alert lav">${esc(ss.hint)}</div>` : ''}
    ${ss.precision ? `<div class="alert amber">${PRECISION_WARNING}</div>` : ''}
    <div class="pad-area">${pad}</div>
    <div class="actions foot"><button class="ghost" data-act="undo" ${treeSteps().length ? '' : 'disabled'}>↶ Desfazer última resposta</button><button class="ghost" data-act="finish">${ss.phase === 'reavaliacao' ? 'Concluir reavaliação' : 'Encerrar investigação'}</button></div>
  </div>${reav}`;
}

function recordPanel() {
  const ss = s!;
  const crit = evaluateTriage(ss.triageFlags).level === 'critico';
  return `${crit ? `<div class="alert rose"><b>Investigação bloqueada pela triagem</b>${evaluateTriage(ss.triageFlags).messages.slice(1).map((m) => `<p>${esc(m)}</p>`).join('')}</div>` : ''}
  <div class="card pad"><h2 class="serif big">Registro do atendimento</h2><p class="muted">Resultados, hipóteses e intervenções já foram registrados automaticamente.</p>
  <div class="stats"><div class="stat"><b>${ss.steps.filter((x) => !x.undone).length}</b><small>respostas</small></div><div class="stat"><b>${ss.interventions.length}</b><small>intervenções</small></div><div class="stat"><b>${ss.neutrality ?? '—'}</b><small>neutralidade</small></div></div></div>
  <div class="card pad form">
    <label>Relato do cliente<small>O que a consulente disse, com as palavras dela.</small><textarea id="r1">Sente que o dinheiro “escapa” e que vive em alerta.</textarea></label>
    <label>Interpretação terapêutica<small>Com linguagem de hipótese.</small><textarea id="r2">Dentro do método utilizado, o plexo solar e o cardíaco apareceram como áreas de atenção ligadas à sensação de segurança.</textarea></label>
    <label>Observações<textarea id="r3"></textarea></label>
    <label>Recomendações de autocuidado<small>Aparecem no relatório para o cliente.</small><textarea id="r4">Respiração consciente 5 minutos ao acordar; anotar três pequenas conquistas por dia.</textarea></label>
    <label>Próxima reavaliação<input id="r5" type="date" value="2026-11-14"></label>
    <button class="btn btn-lg" data-act="close">Encerrar sessão e gerar relatório</button>
  </div>`;
}

function drawerHtml() {
  const ss = s!;
  const content = drawer === 'historico'
    ? `<ol class="hist">${ss.steps.filter((x) => !x.undone).map((x) => `<li><p>${esc(x.questionText)}</p><b>→ ${esc(x.answerLabel)}${x.answerText ? ' — ' + esc(x.answerText) : ''}</b></li>`).join('') || '<li class="muted">Nenhuma resposta ainda.</li>'}</ol>`
    : auditorForm();
  return `<div class="drawer"><div class="dback" data-drawer="close"></div><div class="dpanel"><div class="dhead"><b>${drawer === 'historico' ? 'Histórico desta sessão' : 'Auditor de perguntas'}</b><button class="ghost" data-drawer="close">Fechar</button></div>${content}</div></div>`;
}

let lastAudit: ReturnType<typeof auditQuestionHeuristic> | null = null;
let lastAuditQ = 'A inveja da irmã está bloqueando a prosperidade dela?';
function auditorForm() {
  return `<form id="auditform" class="form pad"><label>Pergunta que você pretende fazer ao pêndulo<textarea name="q">${esc(lastAuditQ)}</textarea></label><button class="btn">Auditar pergunta</button></form>
  ${lastAudit ? `<div class="auditres"><div class="chips">${lastAudit.labels.map((l) => `<span class="badge ${l === 'BOA' ? 'sage' : ['ACUSA TERCEIRO', 'ETICAMENTE PROBLEMÁTICA', 'FORA DO ESCOPO'].includes(l) ? 'rose' : 'amber'}">${l}</span>`).join('')}</div><p>${esc(lastAudit.reasons.join(' '))}</p>${lastAudit.suggestion ? `<div class="sugg"><small class="cap sage">Sugestão</small><p class="serif">“${esc(lastAudit.suggestion)}”</p></div>` : ''}<small class="muted">Fonte: regras do MIRA (na versão real, a IA complementa sem remover alertas).</small></div>` : ''}`;
}

function auditorPage() {
  return shell(`<div class="head"><div><h1>Auditor de perguntas</h1><p class="muted">Proteção contra perguntas vagas, duplas, tendenciosas ou que acusam terceiros.</p></div></div><div class="card">${auditorForm()}</div>
  <div class="card"><h2>Experimente também</h2><div class="chips">${['O marido dela está traindo ela?', 'Ela deve parar de tomar o remédio?', 'O chakra cardíaco está em excesso e o plexo em falta?', 'Existe algum fator prioritário relacionado ao objetivo desta sessão?'].map((q) => `<button class="chip" data-tryq="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`);
}

// ───────── relatório ─────────
function reportData() {
  const ss = s!;
  const c = client(ss.clientId);
  return {
    clientName: c.name, clientCode: c.code, date: fmt(ss.startedAt), mode: ss.mode, objective: ss.objective, complaint: ss.complaint,
    neutralityIndex: ss.neutrality ?? null, triageLevel: evaluateTriage(ss.triageFlags).level, steps: ss.steps, hypotheses: ss.hypotheses,
    interventions: ss.interventions, reevaluation: { before: ss.before, after: ss.after }, clientReport: ss.record.client_report,
    interpretation: ss.record.interpretation, observations: ss.record.observations, selfCare: ss.record.self_care, nextFollowup: ss.record.next ? fmt(ss.record.next) : null,
  };
}
let showAudit = false;
function reportScreen() {
  const d = reportData();
  const ir = buildInternalReport(d);
  const cr = buildClientReport(d);
  const sec = (t: string, b: string, tone = '') => `<section class="sec ${tone}"><h3>${t}</h3>${b || '<p class="muted">Não registrado.</p>'}</section>`;
  const p = (t?: string | null) => (t ? `<p>${esc(t)}</p>` : '');
  let body: string;
  if (reportTab === 'interno') {
    const a = auditSession({ steps: s!.steps, hypotheses: s!.hypotheses.length, interventions: s!.interventions.length, precisionWarnings: s!.precision ? 1 : 0, flaggedQuestions: lastAudit && !lastAudit.labels.includes('BOA') ? [{ question: lastAuditQ, labels: lastAudit.labels, suggestion: lastAudit.suggestion }] : [], startedAt: s!.startedAt, endedAt: s!.endedAt, neutralityIndex: s!.neutrality ?? null, objective: s!.objective });
    body = `<div class="rhead"><div><small class="cap">Relatório interno · confidencial</small><h1>${esc(ir.header.client)}</h1><small class="muted">${ir.header.code} · ${ir.header.date} · ${ir.header.mode}</small></div>${LOGO}</div>
    ${sec('Objetivo', p(ir.header.objective), 'sage')}
    <div class="stats"><div class="card stat"><small>Índice de Neutralidade</small><b>${ir.header.neutralityIndex ?? '—'}</b></div><div class="card stat"><small>Triagem</small><b>${ir.header.triageLevel}</b></div></div>
    ${sec('Relato do cliente', p(ir.relatoCliente))}
    ${sec('Resultados radiestésicos', `<ol class="results">${ir.resultadosRadiestesicos.map((r) => `<li><span>${esc(r.question)}</span><b>${esc(r.answer)}</b></li>`).join('')}</ol>`)}
    ${sec('Interpretação terapêutica', p(ir.interpretacao))}
    ${sec('Hipóteses (possível origem simbólico-energética)', ir.hipoteses.map((h) => `<p>${esc(h.description)}<br><small class="muted">${esc([h.element, h.category, h.role].filter(Boolean).join(' · '))}</small></p>`).join(''))}
    ${sec('Intervenções', ir.intervencoes.map((i) => `<p><b>${esc(i.name)}${i.chart ? ' — ' + esc(i.chart) : ''}</b><br><small>${esc([i.description, i.duration && 'Duração: ' + i.duration, i.frequency && 'Frequência: ' + i.frequency].filter(Boolean).join(' · '))}</small></p>`).join(''))}
    ${sec('Reavaliação', ir.reavaliacao ? `<p><span class="muted">Antes:</span> ${esc(ir.reavaliacao.before ?? '—')} · <span class="muted">Depois:</span> ${esc(ir.reavaliacao.after ?? '—')}</p>${ir.reavaliacao.steps.map((x) => `<p class="small">${esc(x.question)} → <b>${esc(x.answer)}</b></p>`).join('')}` : '')}
    ${sec('Observações', p(ir.observacoes))}
    <section class="sec lav"><h3>Auditoria da sessão</h3>${showAudit ? [['Pontos positivos', a.positives], ['Pontos de atenção', a.attentionPoints], ['Contradições encontradas', a.contradictions], ['Sugestões para a próxima sessão', a.nextSessionSuggestions]].map(([t, l]) => `<p><b>${t}</b></p><ul>${(l as string[]).map((x) => `<li>${esc(x)}</li>`).join('') || '<li class="muted">Nenhum.</li>'}</ul>`).join('') + (a.reformulations.length ? `<p><b>Perguntas que poderiam ser reformuladas</b></p><ul>${a.reformulations.map((r) => `<li>“${esc(r.question)}” → <em>“${esc(r.suggestion)}”</em></li>`).join('')}</ul>` : '') : '<button class="btn soft" data-act="audit">Auditar sessão</button>'}</section>`;
  } else {
    body = `<article class="clientrep"><div class="rhead"><div><small class="cap sage">Relatório de sessão</small><h1>${esc(cr.name)}</h1><small class="muted">${cr.date}</small></div>${LOGO}</div>
    ${sec('Objetivo', p(cr.objective), 'sage')}${sec('Resumo da sessão', p(cr.summary))}
    ${cr.aspects.length ? sec('Aspectos investigados', `<ul>${cr.aspects.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`) : ''}
    ${cr.harmonizations.length ? sec('Harmonizações realizadas', `<ul>${cr.harmonizations.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`) : ''}
    ${cr.selfCare ? sec('Recomendações de autocuidado', p(cr.selfCare), 'lav') : ''}${cr.nextReevaluation ? sec('Próxima reavaliação', p(cr.nextReevaluation)) : ''}
    <p class="disc2">${esc(cr.disclaimer)}</p></article>`;
  }
  return `<div class="banner">Prévia de demonstração · dados de exemplo · nada é salvo</div>
  <div class="focus"><header class="fhead"><button class="ghost" data-go="inicio">← Início</button><div class="tabs"><button class="${reportTab === 'interno' ? 'on' : ''}" data-tab="interno">Interno</button><button class="${reportTab === 'cliente' ? 'on' : ''}" data-tab="cliente">Para o cliente</button></div></header>
  <main class="fmain">${body}<p class="muted small center">Na versão real: botão “Imprimir / salvar PDF” e tudo fica salvo no histórico do cliente.</p><div class="center"><button class="btn" data-go="novo">Fazer outro atendimento</button></div></main></div>`;
}

// ───────── ações ─────────
function stepRecord(nodeKey: string, question: string, value: string, label: string, text: string | undefined, ctx: SessionContext, stage: StepRecord['stage']) {
  const rec = { seq: s!.steps.length + 1, nodeKey, stage, questionText: question, answerValue: value, answerLabel: label, answerText: text ?? null, contextAfter: ctx, undone: false, tree: s!.tree!.slug } as StepRecord & { tree: string };
  s!.steps.push(rec);
}

function answer(value: string, text?: string, iv?: { name: string; chart: string | null; description: string; duration: string; frequency: string }) {
  const ss = s!;
  ss.error = undefined;
  try {
    const tree = ss.tree!;
    const presented = presentNode(tree, ss.node!, ss.ctx, treeSteps());
    const r = applyAnswer(tree, ss.node!, { value, text }, ss.ctx, treeSteps());
    const node = tree.nodes.find((n) => n.key === ss.node)!;
    ss.precision = false;
    if (iv) {
      ss.precision = hasExcessivePrecision(iv.duration) || hasExcessivePrecision(iv.frequency);
      ss.interventions.push({ name: iv.name, chart: iv.chart, description: iv.description, duration: iv.duration, frequency: iv.frequency, reevaluateOn: null });
    }
    if (node.tags.includes('registra-hipotese') && text) ss.hypotheses.push({ element: ss.ctx.element || null, category: ss.ctx.hypothesis_category || null, role: ss.ctx.origin_role || null, description: text });
    stepRecord(node.key, presented.question, value, r.answerLabel, text, r.contextAfter, node.stage);
    ss.ctx = r.contextAfter;
    ss.hint = r.hint ?? null;
    if (!r.finished) { ss.node = r.nextNodeKey; return; }
    if (tree.purpose === 'investigacao') {
      ss.phase = transition(ss.phase, { type: 'CONCLUIR_INVESTIGACAO', hasIntervention: ss.interventions.length > 0 });
    } else {
      ss.phase = transition(ss.phase, { type: 'CONCLUIR_REAVALIACAO', needMore: r.contextAfter.need_more === 'sim' });
    }
    enterPhase();
  } catch (e) { ss.error = (e as Error).message; }
}

function enterPhase() {
  const ss = s!;
  if (ss.phase === 'reavaliacao') { ss.before ||= ss.ctx.intensity_before ? `Intensidade ${ss.ctx.intensity_before}/10` : 'Sensação de aperto financeiro'; ss.after ||= 'Mais calma ao pensar no tema'; ss.tree = miraReevaluationTree; ss.ctx = { ...ss.ctx, need_more: '', can_close: '' }; ss.node = resolveNodeKey(ss.tree, ss.tree.entryNodeKey, ss.ctx); }
  else if (ss.phase === 'investigacao') { ss.tree = miraMainTree; ss.node = ss.steps.some((x) => (x as StepRecord & { tree?: string }).tree === 'mira-principal') ? 'intervencao.apropriada' : resolveNodeKey(miraMainTree, miraMainTree.entryNodeKey, ss.ctx); }
  else { ss.tree = null; ss.node = null; }
}

function undo() {
  const ss = s!;
  const active = treeSteps().filter((x) => !x.undone);
  const last = active[active.length - 1];
  if (!last) return;
  const node = ss.tree!.nodes.find((n) => n.key === last.nodeKey);
  if (node?.kind === 'intervention' || node?.tags.includes('registra-hipotese')) { ss.error = 'Hipóteses e intervenções registradas não são desfeitas automaticamente. Registre uma correção nas notas.'; return; }
  last.undone = true;
  const prev = active[active.length - 2];
  ss.ctx = prev ? prev.contextAfter : { mode: ss.mode };
  ss.node = last.nodeKey;
  ss.hint = null;
}

function render() {
  const html = { inicio: dashboard, clientes: clientsList, cliente: clientPage, novo: newSession, sessao: sessionScreen, relatorio: reportScreen, auditor: auditorPage }[view]();
  app.innerHTML = html;
  window.scrollTo({ top: 0 });
}

app.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('[data-go],[data-client],[data-newfor],[data-ex],[data-act],[data-ans],[data-measure],[data-text],[data-iv],[data-drawer],[data-tab],[data-tryq]') as HTMLElement | null;
  if (!t) return;
  const d = t.dataset;
  if (d.go) { view = d.go === 'sessao' && !s ? 'novo' : (d.go as typeof view); drawer = null; return render(); }
  if (d.client) { currentClient = d.client; view = 'cliente'; return render(); }
  if (d.newfor) { currentClient = d.newfor; view = 'novo'; return render(); }
  if (d.ex) { (document.querySelector('textarea[name=complaint]') as HTMLTextAreaElement).value = d.ex; return; }
  if (d.tryq) { lastAuditQ = d.tryq; lastAudit = auditQuestionHeuristic(d.tryq, s?.objective); return render(); }
  if (d.tab) { reportTab = d.tab as typeof reportTab; return render(); }
  if (d.drawer) { drawer = d.drawer === 'close' ? null : (d.drawer as typeof drawer); return render(); }
  if (!s) return;
  if (d.ans) { answer(d.ans); return render(); }
  if (d.measure) { answer('medida', (document.getElementById('meas') as HTMLInputElement).value); return render(); }
  if (d.text) { const v = (document.getElementById('txt') as HTMLTextAreaElement).value; answer('registrar', v); return render(); }
  if (d.iv) {
    const cat = SEED_INTERVENTIONS.find((i) => i.slug === (document.getElementById('ivcat') as HTMLSelectElement).value)!;
    const chart = (document.getElementById('ivchart') as HTMLSelectElement).value || null;
    if (cat.requires_chart && !chart) { s.error = 'Selecione o gráfico radiônico indicado na investigação.'; return render(); }
    answer('registrar', undefined, { name: cat.name, chart, description: (document.getElementById('ivdesc') as HTMLTextAreaElement).value, duration: (document.getElementById('ivdur') as HTMLInputElement).value, frequency: (document.getElementById('ivfreq') as HTMLInputElement).value });
    return render();
  }
  const act = d.act;
  try {
    s.error = undefined;
    if (act === 'approve') { s.objective = (document.getElementById('obj') as HTMLTextAreaElement).value.trim(); s.phase = transition(s.phase, { type: 'APROVAR_OBJETIVO', objective: s.objective }); }
    if (act === 'prep') {
      const get = (k: string) => (document.querySelector(`input[name=${k}]:checked`) as HTMLInputElement | null)?.value;
      if (PREPARATION_QUESTIONS.some((q) => get(q.key) === undefined)) { s.error = 'Responda as quatro perguntas.'; return render(); }
      s.prep = Object.fromEntries(PREPARATION_QUESTIONS.map((q) => [q.key, get(q.key) === '1'])) as unknown as PreparationAnswers;
      s.neutrality = computeNeutrality(s.prep).index;
      s.phase = transition(s.phase, { type: 'CONCLUIR_PREPARACAO' });
    }
    if (act === 'triage') {
      const r = evaluateTriage(s.triageFlags);
      s.phase = transition(s.phase, { type: 'CONCLUIR_TRIAGEM', level: r.level, acknowledged: true });
      s.ctx = { ...s.ctx, mode: s.mode, triage_level: r.level };
      enterPhase();
    }
    if (act === 'undo') undo();
    if (act === 'finish') {
      if (s.phase === 'reavaliacao') s.phase = transition(s.phase, { type: 'CONCLUIR_REAVALIACAO', needMore: false });
      else s.phase = transition(s.phase, { type: 'CONCLUIR_INVESTIGACAO', hasIntervention: s.interventions.length > 0 });
      enterPhase();
    }
    if (act === 'close') {
      const v = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
      s.record = { client_report: v('r1'), interpretation: v('r2'), observations: v('r3'), self_care: v('r4'), next: v('r5') };
      s.phase = transition(s.phase, { type: 'ENCERRAR' });
      s.endedAt = new Date().toISOString();
      const c = client(s.clientId);
      c.history.push({ date: s.startedAt.slice(0, 10), objective: s.objective, elements: [...new Set(s.steps.filter((x) => !x.undone && x.contextAfter.element).map((x) => x.contextAfter.element))] });
      view = 'relatorio'; reportTab = 'interno'; showAudit = false;
    }
    if (act === 'audit') showAudit = true;
  } catch (err) { s.error = (err as Error).message; }
  render();
});

app.addEventListener('input', (e) => {
  const t = e.target as HTMLElement;
  if (t.id === 'before' && s) s.before = (t as HTMLInputElement).value;
  if (t.id === 'after' && s) s.after = (t as HTMLInputElement).value;
});
app.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.flag && s) { s.triageFlags = t.checked ? [...s.triageFlags, t.dataset.flag] : s.triageFlags.filter((f) => f !== t.dataset.flag); render(); }
});
app.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target as HTMLFormElement;
  const fd = new FormData(f);
  if (f.id === 'newform') {
    const complaint = String(fd.get('complaint') ?? '').trim();
    if (complaint.length < 3) return;
    const mode = fd.get('mode') as SessionMode;
    currentClient = String(fd.get('client'));
    s = { clientId: currentClient, mode, phase: 'objetivo', complaint, objective: '', suggested: suggestObjectiveFallback(complaint), triageFlags: [], tree: null, node: null, ctx: { mode }, steps: [], hypotheses: [], interventions: [], before: '', after: '', record: { client_report: '', interpretation: '', observations: '', self_care: '', next: '' }, startedAt: new Date().toISOString() };
    view = 'sessao'; drawer = null; render();
  }
  if (f.id === 'auditform') { lastAuditQ = String(fd.get('q') ?? ''); if (lastAuditQ.trim().length >= 3) lastAudit = auditQuestionHeuristic(lastAuditQ, s?.objective); render(); }
});

render();
