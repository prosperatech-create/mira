/** Catálogo inicial (seed): categorias de intervenção, gráficos e configurações. */

export const SEED_INTERVENTIONS = [
  { slug: 'grafico_radionico', name: 'Gráfico radiônico', requires_chart: true },
  { slug: 'harmonizacao_chakra', name: 'Harmonização de chakra', requires_chart: false },
  { slug: 'cromoterapia', name: 'Cromoterapia', requires_chart: false },
  { slug: 'cristaloterapia', name: 'Cristaloterapia', requires_chart: false },
  { slug: 'meditacao', name: 'Meditação', requires_chart: false },
  { slug: 'respiracao', name: 'Respiração', requires_chart: false },
  { slug: 'reflexao', name: 'Reflexão', requires_chart: false },
  { slug: 'autocuidado', name: 'Prática de autocuidado', requires_chart: false },
  { slug: 'ambiente', name: 'Ambiente', requires_chart: false },
  { slug: 'outra', name: 'Outra técnica', requires_chart: false },
];

const ORIGIN = 'Tradição radiônica popular (origem histórica não verificada)';

export const SEED_CHARTS = [
  { name: 'Decágono', category: 'potencializacao', traditional_purpose: 'Tradicionalmente usado como base para potencializar outros gráficos ou testemunhos.', when_used: 'Como suporte combinado a outro gráfico escolhido na investigação.', when_not_used: 'Não deve ser escolhido automaticamente; apenas se indicado na investigação.', tags: ['potencialização', 'base'] },
  { name: 'Nove Círculos', category: 'harmonizacao', traditional_purpose: 'Tradicionalmente associado a intenções de harmonização e realização de objetivos.', when_used: 'Quando a investigação indicar harmonização relacionada ao objetivo.', when_not_used: 'Não substitui ações práticas nem acompanhamento profissional.', tags: ['harmonização', 'objetivo'] },
  { name: 'Turbilhão', category: 'limpeza', traditional_purpose: 'Tradicionalmente usado em intenções de limpeza simbólico-energética.', when_used: 'Quando a investigação indicar limpeza como intervenção apropriada.', when_not_used: 'Evitar uso prolongado sem reavaliação.', tags: ['limpeza'] },
  { name: 'Desimpregnador', category: 'limpeza', traditional_purpose: 'Tradicionalmente usado para desimpregnação de objetos e ambientes.', when_used: 'Harmonização de ambientes e objetos, se indicado.', when_not_used: 'Não usar como resposta automática a queixas.', tags: ['limpeza', 'ambiente', 'objeto'] },
  { name: 'Equilibrador de chakras', category: 'equilibrio', traditional_purpose: 'Tradicionalmente usado em intenções de equilíbrio do sistema de chakras.', when_used: 'Quando a investigação de chakras indicar intervenção apropriada.', when_not_used: 'Associações de chakras não são diagnóstico; não usar para tratar sintomas físicos.', tags: ['chakras', 'equilíbrio'] },
  { name: 'Escudo simbólico', category: 'protecao_simbolica', traditional_purpose: 'Tradicionalmente usado como proteção simbólica, conforme a crença da consulente.', when_used: 'Se indicado e coerente com a crença da consulente.', when_not_used: 'Nunca reforçar medo ou ideia de ataque de terceiros.', tags: ['proteção simbólica'] },
  { name: 'Organizador de prioridades', category: 'organizacao', traditional_purpose: 'Usado como apoio simbólico para organização de prioridades e foco.', when_used: 'Questões de foco, rotina ou organização indicadas na investigação.', when_not_used: '—', tags: ['organização', 'foco'] },
  { name: 'Seta direcional', category: 'direcionamento', traditional_purpose: 'Tradicionalmente usado para direcionar a intenção do gráfico principal.', when_used: 'Em combinação, quando indicado.', when_not_used: 'Não usar isoladamente sem objetivo definido.', tags: ['direcionamento'] },
].map((c) => ({ ...c, origin: ORIGIN, description: `${c.traditional_purpose} Descrição tradicional, sem comprovação científica.` }));

export const SEED_SETTINGS: { key: string; value: unknown; description: string }[] = [
  { key: 'ai_enabled', value: true, description: 'Liga/desliga o uso de IA (o sistema funciona sem IA).' },
  { key: 'ai_log_content', value: false, description: 'Grava conteúdo de prompts/respostas em ai_logs (padrão: não, por privacidade).' },
  { key: 'consent_text_version', value: 'v1-2026-10', description: 'Versão do termo de consentimento vigente.' },
  { key: 'consent_text', value: 'Autorizo o registro das informações desta ficha e das sessões de radiestesia para fins de acompanhamento terapêutico integrativo, ciente de que a prática não substitui acompanhamento médico ou psicológico e de que posso solicitar a exportação ou exclusão dos meus dados a qualquer momento.', description: 'Texto do termo de consentimento.' },
];
