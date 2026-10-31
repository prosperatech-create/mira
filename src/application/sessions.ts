import 'server-only';
/**
 * Casos de uso do atendimento. Orquestram domínio (regras), dados e IA.
 * Toda mudança de fase passa pela máquina de estados; todo avanço na árvore passa pelo motor.
 */
import type { AppCtx } from './context';
import {
  answerSchema,
  approveObjectiveSchema,
  preparationSchema,
  recordSchema,
  reevaluationNotesSchema,
  startSessionSchema,
  triageSchema,
} from './schemas';
import * as sessionsRepo from '@/data/repositories/sessions';
import { getClient } from '@/data/repositories/clients';
import { getTreeById, getTreeBySlug } from '@/data/repositories/trees';
import {
  insertHypothesis,
  insertSessionIntervention,
  listCharts,
  listHypotheses,
  listInterventions,
  listSessionInterventions,
} from '@/data/repositories/records';
import type { SessionRow, StepRow } from '@/data/rows';
import { runJson } from '@/ai/service';
import { objectivePrompt, objectiveSchema } from '@/ai/prompts';
import { applyAnswer, getNode, presentNode, resolveNodeKey, TreeEngineError } from '@/domain/tree-engine';
import { transition, isActivePhase } from '@/domain/session-machine';
import { computeNeutrality, type PreparationAnswers } from '@/domain/preparation';
import { evaluateTriage, suggestTriageFlags } from '@/domain/triage';
import { buildGps, FREE_MODE_JUMPS } from '@/domain/gps';
import { hasExcessivePrecision } from '@/domain/precision';
import { suggestObjectiveFallback } from '@/domain/objective';
import { MODES } from '@/domain/modes';
import type { InvestigationTree, SessionContext, StepRecord } from '@/domain/types';
import { conflict, notFound, validation } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const MAIN_TREE = 'mira-principal';
export const REEVALUATION_TREE = 'mira-reavaliacao';

async function loadSession(ctx: AppCtx, id: string): Promise<SessionRow> {
  const s = await sessionsRepo.getSession(ctx.db, id);
  if (!s) throw notFound('Sessão');
  return s;
}

function toStepRecord(s: StepRow): StepRecord {
  return {
    seq: s.seq,
    nodeKey: s.node_key,
    stage: s.stage,
    questionText: s.question_text,
    answerValue: s.answer_value,
    answerLabel: s.answer_label,
    answerText: s.answer_text,
    contextAfter: s.context_after ?? {},
    undone: s.undone,
    createdAt: s.created_at,
  };
}

// ───────────────────────── Início e objetivo ─────────────────────────

export async function startSession(ctx: AppCtx, raw: unknown) {
  const input = startSessionSchema.parse(raw);
  const client = await getClient(ctx.db, input.clientId);
  if (!client) throw notFound('Cliente');

  // IA sugere o objetivo; sem IA, um template determinístico.
  const ai = await runJson(
    { db: ctx.db, userId: ctx.user.id, task: 'objetivo', messages: [{ role: 'user', content: objectivePrompt(input.complaint, input.mode) }], maxTokens: 400 },
    objectiveSchema,
  );
  const suggested = ai.ok ? ai.value.objective : suggestObjectiveFallback(input.complaint);

  const session = await sessionsRepo.insertSession(ctx.db, {
    owner_id: ctx.user.id,
    client_id: client.id,
    mode: input.mode,
    complaint_text: input.complaint,
    objective_suggested: suggested,
  });
  logger.info('session.start', { sessionId: session.id, mode: input.mode, objectiveSource: ai.ok ? 'ia' : 'template' });
  return { id: session.id };
}

export async function approveObjective(ctx: AppCtx, raw: unknown) {
  const input = approveObjectiveSchema.parse(raw);
  const s = await loadSession(ctx, input.sessionId);
  const phase = transition(s.phase, { type: 'APROVAR_OBJETIVO', objective: input.objective });
  await sessionsRepo.updateSession(ctx.db, s, { phase, objective: input.objective, objective_approved_at: new Date().toISOString() });
}

// ───────────────────────── Preparação e triagem ─────────────────────────

export async function submitPreparation(ctx: AppCtx, raw: unknown) {
  const { sessionId, ...answers } = preparationSchema.parse(raw);
  const s = await loadSession(ctx, sessionId);
  const result = computeNeutrality(answers as PreparationAnswers);
  const phase = transition(s.phase, { type: 'CONCLUIR_PREPARACAO' });
  await sessionsRepo.updateSession(ctx.db, s, {
    phase,
    preparation: answers,
    neutrality_index: result.index,
    context: { ...s.context, neutrality_level: result.level },
  });
  return result;
}

export async function submitTriage(ctx: AppCtx, raw: unknown) {
  const input = triageSchema.parse(raw);
  const s = await loadSession(ctx, input.sessionId);
  const result = evaluateTriage(input.flags);
  const phase = transition(s.phase, { type: 'CONCLUIR_TRIAGEM', level: result.level, acknowledged: input.acknowledged });

  const patch: sessionsRepo.SessionPatch = {
    phase,
    triage: { flags: input.flags, notes: input.notes ?? undefined },
    triage_level: result.level,
    triage_acknowledged: input.acknowledged,
  };
  if (phase === 'investigacao') {
    const tree = await getTreeBySlug(ctx.db, MAIN_TREE);
    const context: SessionContext = { ...s.context, mode: s.mode, triage_level: result.level };
    patch.active_tree_id = tree.id;
    patch.current_node_key = resolveNodeKey(tree, tree.entryNodeKey, context);
    patch.context = context;
  }
  await sessionsRepo.updateSession(ctx.db, s, patch);
  return result;
}

export function triageSuggestions(text: string): string[] {
  return suggestTriageFlags(text);
}

// ───────────────────────── Visão do atendimento ─────────────────────────

export async function getSessionView(ctx: AppCtx, id: string) {
  const s = await loadSession(ctx, id);
  const client = await getClient(ctx.db, s.client_id);
  if (!client) throw notFound('Cliente');
  const stepRows = await sessionsRepo.listSteps(ctx.db, s.id);
  const steps = stepRows.map(toStepRecord);

  let tree: InvestigationTree | null = null;
  let node: ReturnType<typeof presentNode> | null = null;
  if (s.active_tree_id && s.current_node_key && (s.phase === 'investigacao' || s.phase === 'reavaliacao')) {
    tree = await getTreeById(ctx.db, s.active_tree_id);
    const treeSteps = stepRows.filter((r) => r.tree_id === tree!.id).map(toStepRecord);
    node = presentNode(tree, s.current_node_key, s.context, treeSteps);
  }

  const needsCatalog = node?.kind === 'intervention';
  const [interventionsCatalog, charts, sessionInterventions] = await Promise.all([
    needsCatalog ? listInterventions(ctx.db) : Promise.resolve([]),
    needsCatalog ? listCharts(ctx.db) : Promise.resolve([]),
    listSessionInterventions(ctx.db, [s.id]),
  ]);

  const lastActive = [...stepRows].reverse().find((r) => !r.undone && r.tree_id === s.active_tree_id);

  return {
    session: s,
    client: { id: client.id, name: client.full_name, code: client.internal_code },
    mode: MODES[s.mode],
    node,
    treeSlug: tree?.slug ?? null,
    gps: buildGps(s.phase, node?.stage ?? null, s.context),
    steps: steps.filter((x) => !x.undone).slice(-30),
    canUndo: !!lastActive && isActivePhase(s.phase),
    freeJumps: s.mode === 'livre' && s.phase === 'investigacao' ? FREE_MODE_JUMPS : [],
    interventionsCatalog,
    charts,
    sessionInterventions,
    triage: s.triage_level ? evaluateTriage(s.triage?.flags ?? []) : null,
    neutrality: s.preparation ? computeNeutrality(s.preparation as unknown as PreparationAnswers) : null,
    triageSuggestions: s.phase === 'triagem' ? suggestTriageFlags(`${s.complaint_text} ${s.objective ?? ''}`) : [],
  };
}

export type SessionView = Awaited<ReturnType<typeof getSessionView>>;

// ───────────────────────── Responder um nó ─────────────────────────

async function nextSeq(ctx: AppCtx, sessionId: string): Promise<number> {
  const rows = await sessionsRepo.listSteps(ctx.db, sessionId);
  return rows.length ? Math.max(...rows.map((r) => r.seq)) + 1 : 1;
}

export async function answerNode(ctx: AppCtx, raw: unknown) {
  const input = answerSchema.parse(raw);
  const s = await loadSession(ctx, input.sessionId);
  if (s.phase !== 'investigacao' && s.phase !== 'reavaliacao') throw validation('A sessão não está em investigação ou reavaliação.');
  if (!s.active_tree_id || !s.current_node_key) throw validation('Sessão sem árvore ativa.');
  if (s.current_node_key !== input.nodeKey) throw conflict('Esta pergunta já foi respondida (talvez em outra janela). Recarregue a página.');

  const tree = await getTreeById(ctx.db, s.active_tree_id);
  const stepRows = await sessionsRepo.listSteps(ctx.db, s.id);
  const history = stepRows.filter((r) => r.tree_id === tree.id).map(toStepRecord);
  const node = getNode(tree, input.nodeKey);
  const presented = presentNode(tree, node.key, s.context, history);

  const result = applyAnswer(tree, node.key, { value: input.value, text: input.text }, s.context, history);
  let precisionWarning = false;

  // Efeitos colaterais declarados pelo tipo/tag do nó.
  if (node.kind === 'intervention' && input.value === 'registrar') {
    if (!input.intervention) throw validation('Selecione a categoria da intervenção.');
    const iv = input.intervention;
    precisionWarning = [iv.durationText, iv.frequency, iv.startedAt, iv.endedAt].some((v) => hasExcessivePrecision(v));
    await insertSessionIntervention(ctx.db, {
      owner_id: ctx.user.id,
      session_id: s.id,
      intervention_id: iv.interventionId,
      chart_id: iv.chartId ?? null,
      protocol_id: null,
      description: iv.description,
      started_at: toTimestamp(iv.startedAt),
      ended_at: toTimestamp(iv.endedAt),
      duration_text: iv.durationText,
      frequency: iv.frequency,
      reevaluate_on: iv.reevaluateOn,
      precision_warning: precisionWarning,
    } as Parameters<typeof insertSessionIntervention>[1]);
  }
  if (node.tags.includes('registra-hipotese') && input.text?.trim()) {
    await insertHypothesis(ctx.db, {
      owner_id: ctx.user.id,
      session_id: s.id,
      element: s.context.element || null,
      category: s.context.hypothesis_category || null,
      role: s.context.origin_role || null,
      description: input.text.trim(),
    });
  }

  await sessionsRepo.insertStep(ctx.db, {
    session_id: s.id,
    owner_id: ctx.user.id,
    seq: await nextSeq(ctx, s.id),
    tree_id: tree.id,
    node_key: node.key,
    stage: node.stage,
    question_text: presented.question,
    answer_value: input.value,
    answer_label: result.answerLabel,
    answer_text: input.text?.trim() || null,
    context_after: result.contextAfter,
  });

  if (!result.finished) {
    await sessionsRepo.updateSession(ctx.db, s, { current_node_key: result.nextNodeKey, context: result.contextAfter });
    return { finished: false, hint: result.hint ?? null, precisionWarning };
  }

  // Árvore terminou → máquina de estados decide a próxima fase.
  if (tree.purpose === 'investigacao') {
    const interventions = await listSessionInterventions(ctx.db, [s.id]);
    const hasIntervention = interventions.length > 0 || result.contextAfter.has_intervention === 'sim';
    const phase = transition(s.phase, { type: 'CONCLUIR_INVESTIGACAO', hasIntervention });
    await enterPhase(ctx, s, phase, result.contextAfter);
  } else {
    const needMore = result.contextAfter.need_more === 'sim';
    const phase = transition(s.phase, { type: 'CONCLUIR_REAVALIACAO', needMore });
    await enterPhase(ctx, s, phase, result.contextAfter);
  }
  return { finished: true, hint: result.hint ?? null, precisionWarning };
}

function toTimestamp(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Ajusta árvore/nó ativo ao entrar numa nova fase. */
async function enterPhase(ctx: AppCtx, s: SessionRow, phase: SessionRow['phase'], context: SessionContext) {
  if (phase === 'reavaliacao') {
    const tree = await getTreeBySlug(ctx.db, REEVALUATION_TREE);
    const ctxR = { ...context, need_more: '', can_close: '' };
    await sessionsRepo.updateSession(ctx.db, s, { phase, active_tree_id: tree.id, current_node_key: resolveNodeKey(tree, tree.entryNodeKey, ctxR), context: ctxR });
  } else if (phase === 'investigacao') {
    const tree = await getTreeBySlug(ctx.db, MAIN_TREE);
    await sessionsRepo.updateSession(ctx.db, s, { phase, active_tree_id: tree.id, current_node_key: 'intervencao.apropriada', context });
  } else {
    await sessionsRepo.updateSession(ctx.db, s, { phase, active_tree_id: null, current_node_key: null, context });
  }
}

/** Desfaz a última resposta da árvore ativa (fica registrada como "desfeita" para a auditoria). */
export async function undoLastStep(ctx: AppCtx, sessionId: string) {
  const s = await loadSession(ctx, sessionId);
  if (s.phase !== 'investigacao' && s.phase !== 'reavaliacao') throw validation('Só é possível desfazer durante a investigação ou reavaliação.');
  const rows = await sessionsRepo.listSteps(ctx.db, s.id);
  const active = rows.filter((r) => !r.undone && r.tree_id === s.active_tree_id);
  const last = active[active.length - 1];
  if (!last) throw validation('Não há respostas para desfazer nesta etapa.');
  const tree = await getTreeById(ctx.db, s.active_tree_id!);
  const node = tree.nodes.find((n) => n.key === last.node_key);
  if (node?.kind === 'intervention' || node?.tags.includes('registra-hipotese')) {
    throw validation('Hipóteses e intervenções registradas não são desfeitas automaticamente. Registre uma observação de correção nas notas.');
  }
  await sessionsRepo.markStepUndone(ctx.db, last.id);
  const prev = active[active.length - 2];
  const anyPrev = [...rows].reverse().find((r) => !r.undone && r.id !== last.id);
  const context = prev?.context_after ?? anyPrev?.context_after ?? { ...s.context };
  await sessionsRepo.updateSession(ctx.db, s, { current_node_key: last.node_key, context });
}

/** Modo Livre: ir diretamente para um ponto da árvore (fica registrado). */
export async function jumpToNode(ctx: AppCtx, sessionId: string, nodeKey: string) {
  const s = await loadSession(ctx, sessionId);
  if (s.mode !== 'livre') throw validation('A navegação livre só está disponível no Modo Livre.');
  if (s.phase !== 'investigacao' || !s.active_tree_id) throw validation('A sessão não está em investigação.');
  if (!FREE_MODE_JUMPS.some((j) => j.node === nodeKey)) throw validation('Destino de navegação inválido.');
  const tree = await getTreeById(ctx.db, s.active_tree_id);
  const target = resolveNodeKey(tree, nodeKey, s.context);
  const current = s.current_node_key ? getNode(tree, s.current_node_key) : null;
  await sessionsRepo.insertStep(ctx.db, {
    session_id: s.id,
    owner_id: ctx.user.id,
    seq: await nextSeq(ctx, s.id),
    tree_id: tree.id,
    node_key: current?.key ?? target,
    stage: current?.stage ?? 'macro',
    question_text: `Navegação livre para "${FREE_MODE_JUMPS.find((j) => j.node === nodeKey)?.label}"`,
    answer_value: 'navegacao',
    answer_label: 'Navegação (Modo Livre)',
    answer_text: null,
    context_after: s.context,
  });
  await sessionsRepo.updateSession(ctx.db, s, { current_node_key: target });
}

/** Botão "Encerrar investigação": segue para reavaliação (se houve intervenção) ou registro. */
export async function finishInvestigation(ctx: AppCtx, sessionId: string) {
  const s = await loadSession(ctx, sessionId);
  if (s.phase === 'reavaliacao') {
    const phase = transition(s.phase, { type: 'CONCLUIR_REAVALIACAO', needMore: false });
    return enterPhase(ctx, s, phase, s.context);
  }
  const interventions = await listSessionInterventions(ctx.db, [s.id]);
  const phase = transition(s.phase, { type: 'CONCLUIR_INVESTIGACAO', hasIntervention: interventions.length > 0 });
  await enterPhase(ctx, s, phase, s.context);
}

// ───────────────────────── Reavaliação, registro, encerramento ─────────────────────────

export async function saveReevaluationNotes(ctx: AppCtx, raw: unknown) {
  const input = reevaluationNotesSchema.parse(raw);
  const s = await loadSession(ctx, input.sessionId);
  await sessionsRepo.updateSession(ctx.db, s, {
    reevaluation: { before: input.before ?? undefined, after: input.after ?? undefined, notes: input.notes ?? undefined },
  });
}

export async function saveRecord(ctx: AppCtx, raw: unknown) {
  const { sessionId, ...fields } = recordSchema.parse(raw);
  const s = await loadSession(ctx, sessionId);
  if (s.phase !== 'registro' && s.phase !== 'encerrada') throw validation('O registro é feito ao final da sessão.');
  await sessionsRepo.updateSession(ctx.db, s, fields);
}

export async function closeSession(ctx: AppCtx, raw: unknown) {
  const { sessionId, ...fields } = recordSchema.parse(raw);
  const s = await loadSession(ctx, sessionId);
  const phase = transition(s.phase, { type: 'ENCERRAR' });
  await sessionsRepo.updateSession(ctx.db, s, { ...fields, phase, ended_at: new Date().toISOString() });
}

export async function cancelSession(ctx: AppCtx, sessionId: string) {
  const s = await loadSession(ctx, sessionId);
  const phase = transition(s.phase, { type: 'CANCELAR' });
  await sessionsRepo.updateSession(ctx.db, s, { phase, ended_at: new Date().toISOString(), active_tree_id: null, current_node_key: null });
}

export async function getSessionHypotheses(ctx: AppCtx, sessionId: string) {
  return listHypotheses(ctx.db, [sessionId]);
}

export { TreeEngineError };
