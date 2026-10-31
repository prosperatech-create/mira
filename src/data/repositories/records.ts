/** Hipóteses, intervenções, gráficos, notas, auditorias e relatórios. */
import type { Db } from '../supabase/server';
import { check } from './_util';

// ── hipóteses ──
export interface HypothesisRow { id: string; session_id: string; element: string | null; category: string | null; role: string | null; description: string; created_at: string }
export async function insertHypothesis(db: Db, row: Omit<HypothesisRow, 'id' | 'created_at'> & { owner_id: string }) {
  const { error } = await db.from('hypotheses').insert(row);
  check(error, 'hypotheses.insert');
}
export async function listHypotheses(db: Db, sessionIds: string[]): Promise<HypothesisRow[]> {
  if (!sessionIds.length) return [];
  const { data, error } = await db.from('hypotheses').select('*').in('session_id', sessionIds).order('created_at');
  check(error, 'hypotheses.list');
  return (data ?? []) as HypothesisRow[];
}

// ── catálogo ──
export interface InterventionRow { id: string; slug: string; name: string; requires_chart: boolean }
export async function listInterventions(db: Db): Promise<InterventionRow[]> {
  const { data, error } = await db.from('interventions').select('id, slug, name, requires_chart').eq('is_active', true).order('position');
  check(error, 'interventions.list');
  return (data ?? []) as InterventionRow[];
}
export interface ChartRow { id: string; name: string; category: string; traditional_purpose: string | null; when_used: string | null; when_not_used: string | null; tags: string[] }
export async function listCharts(db: Db): Promise<ChartRow[]> {
  const { data, error } = await db.from('charts').select('id, name, category, traditional_purpose, when_used, when_not_used, tags').eq('is_active', true).order('name');
  check(error, 'charts.list');
  return (data ?? []) as ChartRow[];
}

// ── intervenções da sessão ──
export interface SessionInterventionRow {
  id: string; session_id: string; intervention_id: string | null; chart_id: string | null; description: string | null;
  started_at: string | null; ended_at: string | null; duration_text: string | null; frequency: string | null; reevaluate_on: string | null;
  precision_warning: boolean; created_at: string;
  interventions: { name: string } | null; charts: { name: string } | null;
}
export async function insertSessionIntervention(db: Db, row: Omit<SessionInterventionRow, 'id' | 'created_at' | 'interventions' | 'charts'> & { owner_id: string }) {
  const { error } = await db.from('session_interventions').insert(row);
  check(error, 'session_interventions.insert');
}
export async function listSessionInterventions(db: Db, sessionIds: string[]): Promise<SessionInterventionRow[]> {
  if (!sessionIds.length) return [];
  const { data, error } = await db.from('session_interventions').select('*, interventions(name), charts(name)').in('session_id', sessionIds).order('created_at');
  check(error, 'session_interventions.list');
  return (data ?? []) as SessionInterventionRow[];
}
export async function chartUsage(db: Db, limit = 5): Promise<{ name: string; count: number }[]> {
  const { data, error } = await db.from('session_interventions').select('charts(name)').not('chart_id', 'is', null).limit(500);
  check(error, 'charts.usage');
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as unknown as { charts: { name: string } | null }[]) {
    if (r.charts?.name) counts.set(r.charts.name, (counts.get(r.charts.name) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}

// ── notas (conteúdo criptografado) ──
export interface NoteRow { id: string; client_id: string; session_id: string | null; content_enc: string; created_at: string }
export async function insertNote(db: Db, row: Omit<NoteRow, 'id' | 'created_at'> & { owner_id: string }) {
  const { error } = await db.from('client_notes').insert(row);
  check(error, 'notes.insert');
}
export async function listNotes(db: Db, filter: { clientId?: string; sessionId?: string }): Promise<NoteRow[]> {
  let q = db.from('client_notes').select('*').order('created_at', { ascending: false });
  if (filter.clientId) q = q.eq('client_id', filter.clientId);
  if (filter.sessionId) q = q.eq('session_id', filter.sessionId);
  const { data, error } = await q.limit(200);
  check(error, 'notes.list');
  return (data ?? []) as NoteRow[];
}

// ── auditor de perguntas ──
export interface QuestionAuditRow { id: string; session_id: string | null; question: string; labels: string[]; suggestion: string | null; explanation: string | null; source: string; created_at: string }
export async function insertQuestionAudit(db: Db, row: Omit<QuestionAuditRow, 'id' | 'created_at'> & { owner_id: string }) {
  const { error } = await db.from('question_audits').insert(row);
  check(error, 'question_audits.insert');
}
export async function listQuestionAudits(db: Db, opts: { sessionId?: string; limit?: number }): Promise<QuestionAuditRow[]> {
  let q = db.from('question_audits').select('*').order('created_at', { ascending: false });
  if (opts.sessionId) q = q.eq('session_id', opts.sessionId);
  const { data, error } = await q.limit(opts.limit ?? 20);
  check(error, 'question_audits.list');
  return (data ?? []) as QuestionAuditRow[];
}

// ── auditoria da sessão ──
export interface AuditResultRow {
  id: string; session_id: string; metrics: Record<string, unknown>; positives: string[]; attention_points: string[];
  reformulations: { question: string; suggestion: string }[]; contradictions: string[]; next_session_suggestions: string[]; source: string; created_at: string;
}
export async function insertAuditResult(db: Db, row: Omit<AuditResultRow, 'id' | 'created_at'> & { owner_id: string }) {
  const { error } = await db.from('audit_results').insert(row);
  check(error, 'audit_results.insert');
}
export async function latestAuditResult(db: Db, sessionId: string): Promise<AuditResultRow | null> {
  const { data, error } = await db.from('audit_results').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  check(error, 'audit_results.latest');
  return data as AuditResultRow | null;
}

// ── relatórios ──
export interface ReportRow { id: string; session_id: string; kind: 'interno' | 'cliente'; content: Record<string, unknown>; updated_at: string }
export async function upsertReport(db: Db, row: { session_id: string; owner_id: string; kind: 'interno' | 'cliente'; content: unknown }) {
  const { error } = await db.from('reports').upsert(row, { onConflict: 'session_id,kind' });
  check(error, 'reports.upsert');
}
export async function getReports(db: Db, sessionId: string): Promise<ReportRow[]> {
  const { data, error } = await db.from('reports').select('*').eq('session_id', sessionId);
  check(error, 'reports.get');
  return (data ?? []) as ReportRow[];
}
