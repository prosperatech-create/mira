/** Formatos das linhas do banco usados pelos repositórios. */
import type { MiraStage, NodeKind, SessionMode, SessionPhase } from '@/domain/types';

export interface ProfileRow { id: string; email: string; full_name: string; role: 'terapeuta' | 'admin'; active: boolean; created_at: string }

export interface ClientRow {
  id: string; owner_id: string; internal_code: string; full_name: string; birth_date: string | null; phone: string | null;
  email: string | null; profession: string | null; observations: string | null; private_notes_enc: string | null;
  consent_given: boolean; consent_at: string | null; consent_text_version: string | null; created_at: string; updated_at: string;
}

export interface SessionRow {
  id: string; owner_id: string; client_id: string; mode: SessionMode; phase: SessionPhase; complaint_text: string;
  objective_suggested: string | null; objective: string | null; objective_approved_at: string | null;
  preparation: Record<string, boolean> | null; neutrality_index: number | null;
  triage: { flags: string[]; notes?: string } | null; triage_level: 'nenhum' | 'atencao' | 'critico' | null; triage_acknowledged: boolean;
  active_tree_id: string | null; current_node_key: string | null; context: Record<string, string>;
  reevaluation: { before?: string; after?: string; notes?: string } | null;
  client_report: string | null; interpretation: string | null; observations: string | null; self_care: string | null;
  next_followup_date: string | null; started_at: string; ended_at: string | null; version: number; created_at: string; updated_at: string;
}

export interface StepRow {
  id: string; session_id: string; owner_id: string; seq: number; tree_id: string | null; node_key: string; stage: MiraStage;
  question_text: string; answer_value: string; answer_label: string; answer_text: string | null;
  context_after: Record<string, string>; undone: boolean; created_at: string;
}

export interface TreeRow { id: string; slug: string; name: string; purpose: 'investigacao' | 'reavaliacao'; entry_node_key: string; is_active: boolean }
export interface TreeNodeRow {
  id: string; tree_id: string; key: string; stage: MiraStage; kind: NodeKind; category: string | null; question: string;
  explanation: string | null; options: unknown; routes: unknown; alerts: unknown; alternatives: unknown; is_anchor: boolean; tags: string[]; position: number;
}
