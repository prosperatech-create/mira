/**
 * Máquina de estados da sessão MIRA (fase macro do atendimento).
 * Toda transição é validada aqui — a UI e a IA não mudam a fase diretamente.
 */
import type { SessionPhase } from './types';

export type SessionEvent =
  | { type: 'APROVAR_OBJETIVO'; objective: string }
  | { type: 'CONCLUIR_PREPARACAO' }
  | { type: 'CONCLUIR_TRIAGEM'; level: 'nenhum' | 'atencao' | 'critico'; acknowledged: boolean }
  | { type: 'CONCLUIR_INVESTIGACAO'; hasIntervention: boolean }
  | { type: 'IR_PARA_REAVALIACAO' }
  | { type: 'CONCLUIR_REAVALIACAO'; needMore: boolean }
  | { type: 'ENCERRAR' }
  | { type: 'CANCELAR' };

export interface SessionSnapshot {
  phase: SessionPhase;
}

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransitionError';
  }
}

/** Tabela de transições permitidas (documentação viva — ver docs/05-fluxo-mira.md). */
export const TRANSITIONS: Record<SessionPhase, SessionPhase[]> = {
  objetivo: ['preparacao', 'cancelada'],
  preparacao: ['triagem', 'cancelada'],
  triagem: ['investigacao', 'registro', 'cancelada'],
  investigacao: ['reavaliacao', 'registro', 'cancelada'],
  reavaliacao: ['investigacao', 'registro', 'cancelada'],
  registro: ['encerrada', 'cancelada'],
  encerrada: [],
  cancelada: [],
};

export function canTransition(from: SessionPhase, to: SessionPhase): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Calcula a próxima fase a partir de um evento. Lança TransitionError se inválido. */
export function transition(current: SessionPhase, event: SessionEvent): SessionPhase {
  const next = nextPhase(current, event);
  if (!canTransition(current, next)) {
    throw new TransitionError(`Transição inválida: ${current} → ${next} (${event.type}).`);
  }
  return next;
}

function nextPhase(current: SessionPhase, event: SessionEvent): SessionPhase {
  switch (event.type) {
    case 'APROVAR_OBJETIVO':
      if (current !== 'objetivo') break;
      if (!event.objective.trim()) throw new TransitionError('O objetivo não pode ser vazio.');
      return 'preparacao';
    case 'CONCLUIR_PREPARACAO':
      if (current !== 'preparacao') break;
      return 'triagem';
    case 'CONCLUIR_TRIAGEM':
      if (current !== 'triagem') break;
      if (event.level !== 'nenhum' && !event.acknowledged)
        throw new TransitionError('É preciso confirmar a leitura do aviso de triagem antes de seguir.');
      // Situação crítica: a investigação radiestésica é bloqueada; só é possível registrar e encerrar.
      return event.level === 'critico' ? 'registro' : 'investigacao';
    case 'CONCLUIR_INVESTIGACAO':
      if (current !== 'investigacao') break;
      return event.hasIntervention ? 'reavaliacao' : 'registro';
    case 'IR_PARA_REAVALIACAO':
      if (current !== 'investigacao') break;
      return 'reavaliacao';
    case 'CONCLUIR_REAVALIACAO':
      if (current !== 'reavaliacao') break;
      return event.needMore ? 'investigacao' : 'registro';
    case 'ENCERRAR':
      if (current !== 'registro') break;
      return 'encerrada';
    case 'CANCELAR':
      if (current === 'encerrada' || current === 'cancelada') break;
      return 'cancelada';
  }
  throw new TransitionError(`Evento ${event.type} não é permitido na fase "${current}".`);
}

export const PHASE_LABELS: Record<SessionPhase, string> = {
  objetivo: 'Objetivo',
  preparacao: 'Preparação',
  triagem: 'Triagem de segurança',
  investigacao: 'Investigação',
  reavaliacao: 'Reavaliação',
  registro: 'Registro',
  encerrada: 'Encerrada',
  cancelada: 'Cancelada',
};

export function isActivePhase(p: SessionPhase): boolean {
  return p !== 'encerrada' && p !== 'cancelada';
}
