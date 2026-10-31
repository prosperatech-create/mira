/**
 * Preparação da terapeuta → Índice de Neutralidade da Sessão.
 * NÃO é medida científica: é apenas um indicador interno de atenção.
 */
export interface PreparationAnswers {
  /** Você está emocionalmente neutra? */
  neutral: boolean;
  /** Está esperando uma resposta específica? */
  expecting: boolean;
  /** Está cansada ou muito ansiosa? */
  tired: boolean;
  /** Conhece informações que podem influenciar sua expectativa? */
  priorKnowledge: boolean;
}

export const PREPARATION_QUESTIONS: { key: keyof PreparationAnswers; text: string; riskWhen: boolean }[] = [
  { key: 'neutral', text: 'Você está emocionalmente neutra?', riskWhen: false },
  { key: 'expecting', text: 'Está esperando uma resposta específica?', riskWhen: true },
  { key: 'tired', text: 'Está cansada ou muito ansiosa?', riskWhen: true },
  { key: 'priorKnowledge', text: 'Conhece informações que podem influenciar sua expectativa?', riskWhen: true },
];

export type NeutralityLevel = 'favoravel' | 'atencao' | 'cuidado';

export interface NeutralityResult {
  index: number; // 0–100
  level: NeutralityLevel;
  messages: string[];
  requireControlQuestions: boolean;
}

export function computeNeutrality(a: PreparationAnswers): NeutralityResult {
  const messages: string[] = [];
  let risks = 0;
  if (!a.neutral) {
    risks++;
    messages.push('Você indicou não estar emocionalmente neutra. Considere alguns minutos de respiração antes de iniciar.');
  }
  if (a.expecting) {
    risks++;
    messages.push('Há sinais de possível expectativa prévia. Recomendamos utilizar perguntas de controle e registrar resultados antes de interpretá-los.');
  }
  if (a.tired) {
    risks++;
    messages.push('Cansaço ou ansiedade podem interferir na leitura. Prefira sessões mais curtas e objetivas.');
  }
  if (a.priorKnowledge) {
    risks++;
    messages.push('Informações prévias podem influenciar a expectativa. Formule perguntas abertas e evite confirmar hipóteses que você já tem.');
  }
  const index = Math.round(100 - risks * 25);
  const level: NeutralityLevel = index >= 75 ? 'favoravel' : index >= 50 ? 'atencao' : 'cuidado';
  if (risks === 0) messages.push('Boa condição de neutralidade relatada. Mantenha a atenção ao longo da sessão.');
  if (level === 'cuidado') messages.push('Considere reagendar ou realizar uma nova preparação antes de iniciar a leitura.');
  return { index, level, messages, requireControlQuestions: risks > 0 };
}

export const NEUTRALITY_DISCLAIMER =
  'O Índice de Neutralidade é um indicador interno de atenção, baseado na sua autoavaliação. Não é uma medida científica.';
