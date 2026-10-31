import type { SessionMode } from './types';

export interface ModeInfo {
  label: string;
  description: string;
  disclaimer?: string;
  command: string;
}

export const MODES: Record<SessionMode, ModeInfo> = {
  mira: {
    label: 'Modo MIRA',
    description: 'Fluxo integrado completo: preparação, GPS, prioridade, hipótese, intervenção e reavaliação.',
    command: '/mira',
  },
  terapeutica: {
    label: 'Modo Radiestesia Terapêutica',
    description: 'Mais peso a campos, chakras, aura, áreas da vida, prioridades, hipótese de causa raiz, gráficos e reavaliação.',
    disclaimer: 'Modo inspirado em princípios públicos. Não representa oficialmente Mariana Tortella nem seu método.',
    command: '/terapeutica',
  },
  tera: {
    label: 'Modo T.E.R.A.',
    description: 'Mais peso a preparação, neutralidade, formulação das perguntas, GPS, prioridade, mensuração e reavaliação.',
    disclaimer: 'Modo inspirado em princípios públicos. Não representa oficialmente Sérgio Nogueira nem o Método T.E.R.A.',
    command: '/tera',
  },
  livre: {
    label: 'Modo Livre',
    description: 'A terapeuta decide manualmente cada etapa: o GPS fica clicável e é possível pular perguntas.',
    command: '/livre',
  },
};
