/**
 * Árvore inicial MIRA (seed). Fonte única: gera supabase/seed.sql (scripts/generate-seed.ts)
 * e é validada nos testes. Depois de semeada, Edu pode alterá-la no banco sem tocar em código.
 */
import type { InvestigationTree, NodeAlert, NodeOption, Route, TreeNode } from '../types';

type NodeInput = Partial<TreeNode> & Pick<TreeNode, 'key' | 'stage' | 'kind' | 'question'>;

function node(n: NodeInput): TreeNode {
  return {
    category: null,
    explanation: null,
    options: [],
    routes: [],
    alerts: [],
    alternatives: [],
    isAnchor: false,
    tags: [],
    ...n,
  };
}

/** Opções SIM/NÃO; neutro, não sei e reformular usam o padrão do motor (@stay) se omitidos. */
function yesNo(sim: Partial<NodeOption> & { next?: string }, nao: Partial<NodeOption> & { next?: string }): NodeOption[] {
  return [
    { value: 'sim', label: 'Sim', ...sim },
    { value: 'nao', label: 'Não', ...nao },
  ];
}

function choices(items: string[], set: (label: string) => Record<string, string>, next: string): NodeOption[] {
  return items.map((label) => ({ value: slug(label), label, set: set(label), next }));
}

export function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

const VOLTAR: NodeOption = { value: 'voltar', label: 'Nenhum destes / voltar', next: '@back' };

const SPIRITUAL_ALERT: NodeAlert = {
  when: { var: 'category', eq: 'espiritual' },
  level: 'atencao',
  message:
    'Interpretações espirituais pertencem a determinados sistemas de crença e não representam comprovação objetiva do fenômeno. Respeite a crença da consulente e nunca atribua causas a terceiros.',
};
const RELATIONSHIP_ALERT: NodeAlert = {
  when: { var: 'category', eq: 'relacionamento' },
  level: 'info',
  message: 'Investigue a experiência da consulente na relação. Não atribua intenções, culpa ou sentimentos a terceiros.',
};
const CHAKRA_ALERT: NodeAlert = {
  when: { var: 'category', eq: 'chakra' },
  level: 'info',
  message: 'Associações de chakras são simbólicas, dentro do modelo radiestésico utilizado. Nunca as apresente como diagnóstico médico ou psicológico.',
};

const ROUTE_DEEPEN: Route[] = [
  { when: { var: 'category', eq: 'chakra' }, next: 'chakra.dimensao' },
  { when: { var: 'category', eq: 'aura' }, next: 'aura.aspecto' },
  { when: { var: 'category', in: ['campo', 'espiritual'] }, next: 'campo.intensidade' },
  { next: 'aprofundar.categoria' },
];

export const CHAKRAS = ['Básico', 'Sacral', 'Plexo Solar', 'Cardíaco', 'Laríngeo', 'Frontal', 'Coronário'];
export const LIFE_AREAS = [
  'Pessoal', 'Relacionamento amoroso', 'Família', 'Amizades', 'Profissional', 'Financeiro', 'Estudos',
  'Criatividade', 'Propósito', 'Espiritualidade', 'Lazer', 'Casa', 'Trabalho', 'Saúde e bem-estar',
];
export const HYPOTHESIS_CATEGORIES = [
  'Emoções', 'Crenças', 'Hábitos', 'Comportamentos', 'Conflitos internos', 'Experiências anteriores',
  'Relacionamentos', 'Ambiente', 'Sobrecarga', 'Limites', 'Padrões familiares percebidos',
  'Espiritualidade (conforme crença da consulente)',
];

export const miraMainTree: InvestigationTree = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'mira-principal',
  name: 'MIRA — Investigação principal',
  purpose: 'investigacao',
  entryNodeKey: 'inicio.roteador',
  nodes: [
    // ── Entrada por modo ──
    node({
      key: 'inicio.roteador',
      stage: 'macro',
      kind: 'route',
      question: 'Roteamento inicial conforme o modo da sessão',
      routes: [
        { when: { var: 'mode', eq: 'tera' }, next: 'tera.controle' },
        { next: 'macro.inicio' },
      ],
    }),
    node({
      key: 'tera.controle',
      stage: 'macro',
      kind: 'yes_no',
      question: 'Pergunta de controle: o pêndulo está respondendo de forma clara e confiável para esta sessão?',
      explanation: 'Modo T.E.R.A. (inspirado, não oficial): uma pergunta de controle antes de iniciar ajuda a perceber interferências de expectativa.',
      options: yesNo(
        { next: 'macro.inicio' },
        { next: '@stay', hint: 'Retome a preparação: respire, solte a expectativa e repita a pergunta de controle.' },
      ),
    }),

    // ── MACRO ──
    node({
      key: 'macro.inicio',
      stage: 'macro',
      kind: 'yes_no',
      question: 'Existe algum fator prioritário e apropriado para ser investigado em relação ao objetivo desta sessão?',
      explanation: 'Pergunta de abertura. Ela não pressupõe problema: apenas verifica se há algo prioritário e apropriado agora.',
      alternatives: [
        'Neste momento, é apropriado investigar algum fator prioritário relacionado ao objetivo da sessão?',
        'Há algum aspecto relacionado ao objetivo desta sessão que seja prioritário e apropriado investigar agora?',
      ],
      options: yesNo(
        { routes: [{ when: { var: 'mode', eq: 'terapeutica' }, next: 'terapeutica.camada' }, { next: 'macro.dominio' }] },
        { next: 'fim.sem_prioridade' },
      ),
      tags: ['abertura'],
    }),
    node({
      key: 'terapeutica.camada',
      stage: 'priorizar',
      kind: 'select',
      isAnchor: true,
      question: 'Por qual camada é prioritário iniciar a varredura?',
      explanation: 'Modo Radiestesia Terapêutica (inspirado, não oficial): varredura por camadas — campos, chakras, aura e áreas da vida.',
      options: [
        { value: 'campos', label: 'Campos', next: 'campos.selecao', set: { gps_domain: 'Campo pessoal' } },
        { value: 'chakras', label: 'Chakras', next: 'chakra.existe', set: { gps_domain: 'Sistema energético' } },
        { value: 'aura', label: 'Aura', next: 'aura.existe', set: { gps_domain: 'Sistema energético' } },
        { value: 'areas', label: 'Áreas da vida', next: 'areas.selecao', set: { gps_domain: 'Áreas da vida' } },
        { value: 'outros', label: 'Outra dimensão do GPS', next: 'macro.dominio' },
      ],
    }),
    node({
      key: 'macro.dominio',
      stage: 'priorizar',
      kind: 'select',
      isAnchor: true,
      question: 'Em qual grande dimensão do GPS MIRA está o fator prioritário?',
      explanation: 'Percorra as opções com o pêndulo (ou use um biômetro) e registre a dimensão indicada.',
      options: [
        { value: 'campo_pessoal', label: 'Campo pessoal', next: 'campos.selecao', set: { gps_domain: 'Campo pessoal' } },
        { value: 'sistema_energetico', label: 'Sistema energético', next: 'energetico.selecao', set: { gps_domain: 'Sistema energético' } },
        { value: 'relacionamentos', label: 'Relacionamentos', next: 'rel.selecao', set: { gps_domain: 'Relacionamentos' } },
        { value: 'areas_vida', label: 'Áreas da vida', next: 'areas.selecao', set: { gps_domain: 'Áreas da vida' } },
        { value: 'ambiente', label: 'Ambiente', next: 'amb.selecao', set: { gps_domain: 'Ambiente' } },
        { value: 'nenhuma', label: 'Nenhuma destas', next: 'macro.revisar' },
      ],
    }),
    node({
      key: 'macro.revisar',
      stage: 'macro',
      kind: 'select',
      question: 'Nenhuma dimensão foi indicada. Como deseja seguir?',
      options: [
        { value: 'repetir', label: 'Voltar à pergunta inicial', next: 'macro.inicio' },
        { value: 'encerrar', label: 'Encerrar a investigação', next: 'fim.sem_prioridade' },
      ],
    }),

    // ── CAMPO PESSOAL ──
    node({
      key: 'campos.selecao',
      stage: 'priorizar',
      kind: 'select',
      isAnchor: true,
      category: 'campo_pessoal',
      question: 'Qual campo ou aspecto pessoal é prioritário em relação ao objetivo?',
      options: [
        ...choices(['Mental', 'Emocional', 'Físico (perspectiva energética)', 'Hábitos', 'Comportamento', 'Crenças'], (l) => ({ element: `Campo ${l.toLowerCase()}`, category: 'campo' }), 'elemento.prioridade'),
        { value: 'espiritual', label: 'Espiritual', set: { element: 'Campo espiritual', category: 'espiritual' }, next: 'elemento.prioridade' },
        VOLTAR,
      ],
    }),

    // ── SISTEMA ENERGÉTICO ──
    node({
      key: 'energetico.selecao',
      stage: 'priorizar',
      kind: 'select',
      isAnchor: true,
      category: 'sistema_energetico',
      question: 'Qual aspecto do sistema energético é prioritário?',
      options: [
        { value: 'chakras', label: 'Chakras', next: 'chakra.existe' },
        { value: 'aura', label: 'Aura', next: 'aura.existe' },
        ...choices(['Vitalidade', 'Equilíbrio', 'Polaridade'], (l) => ({ element: l, category: 'energetico' }), 'elemento.prioridade'),
        VOLTAR,
      ],
    }),
    node({
      key: 'chakra.existe',
      stage: 'priorizar',
      kind: 'yes_no',
      category: 'chakra',
      question: 'Existe algum chakra prioritário relacionado ao objetivo?',
      options: yesNo({ next: 'chakra.qual' }, { next: '@back' }),
    }),
    node({
      key: 'chakra.qual',
      stage: 'priorizar',
      kind: 'select',
      isAnchor: true,
      category: 'chakra',
      question: 'Qual chakra se apresenta como prioritário?',
      options: [
        ...CHAKRAS.map((c, i) => ({ value: slug(c), label: `${i + 1}. ${c}`, set: { element: `Chakra ${c}`, category: 'chakra' }, next: 'elemento.prioridade' })),
        VOLTAR,
      ],
    }),
    node({
      key: 'aura.existe',
      stage: 'priorizar',
      kind: 'yes_no',
      category: 'aura',
      question: 'Dentro do modelo radiestésico utilizado, existe algum aspecto da aura que mereça atenção em relação ao objetivo?',
      explanation: 'A aura é tratada aqui como conceito do modelo radiestésico, não como medição física cientificamente validada.',
      options: yesNo({ next: 'elemento.prioridade', set: { element: 'Aura', category: 'aura' } }, { next: '@back' }),
    }),

    // ── RELACIONAMENTOS ──
    node({
      key: 'rel.selecao',
      stage: 'priorizar',
      kind: 'select',
      isAnchor: true,
      category: 'relacionamentos',
      question: 'Em qual campo de relacionamentos está o fator prioritário?',
      options: [
        ...choices(['Afetivo', 'Família', 'Amizades', 'Trabalho', 'Limites pessoais'], (l) => ({ element: `Relacionamentos — ${l}`, category: 'relacionamento' }), 'elemento.prioridade'),
        VOLTAR,
      ],
    }),

    // ── ÁREAS DA VIDA ──
    node({
      key: 'areas.selecao',
      stage: 'priorizar',
      kind: 'select',
      isAnchor: true,
      category: 'areas_vida',
      question: 'Qual área da vida é prioritária em relação ao objetivo?',
      options: [...choices(LIFE_AREAS, (l) => ({ element: `Área: ${l}`, category: 'area_vida' }), 'elemento.prioridade'), VOLTAR],
    }),

    // ── AMBIENTE ──
    node({
      key: 'amb.selecao',
      stage: 'priorizar',
      kind: 'select',
      isAnchor: true,
      category: 'ambiente',
      question: 'Qual ambiente é prioritário investigar?',
      options: [
        ...choices(['Residência', 'Quarto', 'Escritório', 'Local de trabalho', 'Espaço terapêutico', 'Objeto'], (l) => ({ element: `Ambiente: ${l}`, category: 'ambiente' }), 'elemento.prioridade'),
        VOLTAR,
      ],
    }),

    // ── REGRA DE PRIORIDADE (desequilíbrio ≠ prioridade) ──
    node({
      key: 'elemento.prioridade',
      stage: 'priorizar',
      kind: 'yes_no',
      question: 'É apropriado aprofundar {{element}} agora, entre as prioridades desta sessão?',
      explanation: 'Desequilíbrio não significa prioridade. Se a resposta for NÃO, o MIRA retorna ao nível anterior.',
      alternatives: ['{{element}} está entre as prioridades desta sessão?'],
      alerts: [SPIRITUAL_ALERT, RELATIONSHIP_ALERT, CHAKRA_ALERT],
      options: yesNo(
        { routes: [{ when: { var: 'mode', eq: 'tera' }, next: 'medir.intensidade' }, { next: 'aprofundar.roteador' }], set: { priority_confirmed: 'sim' } },
        { next: '@back' },
      ),
      tags: ['regra-prioridade'],
    }),
    node({
      key: 'medir.intensidade',
      stage: 'aprofundar',
      kind: 'measure',
      question: 'Se apropriado, registre a intensidade da leitura para {{element}} (0 a 10).',
      explanation: 'Indicador interno da leitura, não uma medida científica. Útil para comparar antes × depois na reavaliação.',
      options: [{ value: 'medida', label: 'Registrar intensidade', set: { intensity_before: '{{text}}' }, next: 'aprofundar.roteador' }, { value: 'pular', label: 'Não medir agora', next: 'aprofundar.roteador' }],
    }),
    node({ key: 'aprofundar.roteador', stage: 'aprofundar', kind: 'route', question: 'Roteamento do aprofundamento por categoria', routes: ROUTE_DEEPEN }),

    // ── APROFUNDAR ──
    node({
      key: 'chakra.dimensao',
      stage: 'aprofundar',
      kind: 'select',
      category: 'chakra',
      question: 'Dentro do modelo utilizado, qual dimensão se destaca em {{element}}?',
      alerts: [CHAKRA_ALERT],
      options: choices(
        ['Equilíbrio', 'Excesso', 'Deficiência', 'Relação com outro chakra', 'Área da vida associada', 'Aspecto emocional associado'],
        (l) => ({ element_detail: l }),
        'aprofundar.categoria',
      ),
    }),
    node({
      key: 'aura.aspecto',
      stage: 'aprofundar',
      kind: 'select',
      category: 'aura',
      question: 'Dentro do modelo radiestésico utilizado, qual aspecto da aura se destaca?',
      options: choices(
        ['Necessidade de harmonização', 'Expansão', 'Retração', 'Equilíbrio', 'Homogeneidade'],
        (l) => ({ element_detail: l }),
        'aprofundar.categoria',
      ),
    }),
    node({
      key: 'campo.intensidade',
      stage: 'aprofundar',
      kind: 'measure',
      question: 'Se apropriado, registre a intensidade interna da leitura em {{element}} (0 a 10).',
      explanation: 'Indicador interno de atenção, sem pretensão de precisão.',
      alerts: [SPIRITUAL_ALERT],
      options: [{ value: 'medida', label: 'Registrar intensidade', set: { field_intensity: '{{text}}' }, next: 'campo.relacao' }, { value: 'pular', label: 'Não medir agora', next: 'campo.relacao' }],
    }),
    node({
      key: 'campo.relacao',
      stage: 'aprofundar',
      kind: 'select',
      question: '{{element}} se relaciona de forma prioritária com:',
      options: [
        { value: 'chakra', label: 'Algum chakra', set: { field_relation: 'chakra' }, next: 'aprofundar.categoria' },
        { value: 'area_vida', label: 'Alguma área da vida', set: { field_relation: 'área da vida' }, next: 'aprofundar.categoria' },
        { value: 'nenhuma', label: 'Nenhuma relação específica', next: 'aprofundar.categoria' },
        { value: 'nao_agora', label: 'Não investigar agora', next: 'aprofundar.categoria' },
      ],
    }),
    node({
      key: 'aprofundar.categoria',
      stage: 'aprofundar',
      kind: 'select',
      question: 'Qual categoria de hipótese parece mais relacionada a {{element}}?',
      explanation: 'Registre a categoria indicada. Ela orienta a hipótese, sem ser conclusão.',
      alerts: [SPIRITUAL_ALERT],
      options: [
        ...HYPOTHESIS_CATEGORIES.map((l) => ({
          value: slug(l),
          label: l,
          set: (l.startsWith('Espiritualidade') ? { hypothesis_category: l, category: 'espiritual' } : { hypothesis_category: l }) as Record<string, string>,
          next: 'origem.tipo',
        })),
        { value: 'nao_definido', label: 'Não definido', set: { hypothesis_category: 'Não definido' }, next: 'origem.tipo' },
      ],
    }),

    // ── HIPÓTESE / INVESTIGAÇÃO DE ORIGEM ──
    node({
      key: 'origem.tipo',
      stage: 'hipotese',
      kind: 'origin',
      question: 'O elemento identificado ({{element}}) parece atuar predominantemente como:',
      explanation: 'Investigação de origem: o resultado é uma hipótese de possível origem simbólico-energética, nunca a "causa real".',
      options: [
        { value: 'causa', label: 'Causa', set: { origin_role: 'causa' }, next: 'hipotese.registrar' },
        { value: 'consequencia', label: 'Consequência', set: { origin_role: 'consequencia' }, next: 'origem.anterior' },
        { value: 'ambos', label: 'Ambos', set: { origin_role: 'ambos' }, next: 'hipotese.registrar' },
        { value: 'nao_definido', label: 'Não definido', set: { origin_role: 'nao_definido' }, next: 'hipotese.registrar' },
      ],
    }),
    node({
      key: 'origem.anterior',
      stage: 'hipotese',
      kind: 'yes_no',
      question: 'É apropriado investigar um fator anterior relacionado a {{element}}?',
      options: yesNo(
        { next: 'hipotese.registrar', set: { investigate_prior: 'sim' } },
        { next: 'hipotese.registrar' },
      ),
    }),
    node({
      key: 'hipotese.registrar',
      stage: 'hipotese',
      kind: 'text',
      tags: ['registra-hipotese'],
      question: 'Registre a hipótese de possível origem simbólico-energética.',
      explanation: 'Escreva com linguagem de hipótese ("parece", "dentro do modelo utilizado"). Evite afirmações absolutas e não atribua culpa a terceiros.',
      options: [
        {
          value: 'registrar',
          label: 'Registrar hipótese',
          set: { last_hypothesis: '{{text}}' },
          routes: [{ when: { var: 'investigate_prior', eq: 'sim' }, next: 'origem.reiniciar' }, { next: 'intervencao.apropriada' }],
        },
      ],
    }),
    node({
      key: 'origem.reiniciar',
      stage: 'hipotese',
      kind: 'select',
      question: 'Hipótese registrada. Para investigar o fator anterior, por onde seguir?',
      options: [
        { value: 'gps', label: 'Escolher dimensão no GPS', next: 'macro.dominio', set: { investigate_prior: '' } },
        { value: 'pular', label: 'Seguir para intervenção', next: 'intervencao.apropriada', set: { investigate_prior: '' } },
      ],
    }),

    // ── INTERVENÇÃO ──
    node({
      key: 'intervencao.apropriada',
      stage: 'intervencao',
      kind: 'yes_no',
      question: 'É apropriada alguma intervenção neste momento?',
      options: yesNo({ next: 'intervencao.registrar' }, { next: 'outro.fator' }),
    }),
    node({
      key: 'intervencao.registrar',
      stage: 'harmonizar',
      kind: 'intervention',
      question: 'Registre a intervenção indicada (categoria, gráfico se houver, tempo e reavaliação).',
      explanation: 'A escolha da intervenção vem da investigação: o MIRA nunca associa automaticamente "problema X = gráfico Y".',
      options: [{ value: 'registrar', label: 'Registrar intervenção', set: { has_intervention: 'sim' }, next: 'outro.fator' }],
    }),
    node({
      key: 'outro.fator',
      stage: 'priorizar',
      kind: 'yes_no',
      question: 'Existe outro fator prioritário e apropriado a investigar nesta sessão?',
      explanation: 'Evite excesso de investigação: aprofunde apenas o que for prioritário.',
      options: yesNo({ next: 'macro.dominio', set: { element: '', element_detail: '', category: '', priority_confirmed: '' } }, { next: '@end' }),
    }),
    node({
      key: 'fim.sem_prioridade',
      stage: 'macro',
      kind: 'end',
      question: 'Nenhum fator prioritário foi indicado para investigação neste momento.',
      explanation: 'Isso também é um resultado válido. Registre-o e, se fizer sentido, siga para o registro da sessão.',
      options: [{ value: 'continuar', label: 'Seguir para o registro', next: '@end' }],
    }),
  ],
};

export const miraReevaluationTree: InvestigationTree = {
  id: '00000000-0000-4000-8000-000000000002',
  slug: 'mira-reavaliacao',
  name: 'MIRA — Reavaliação',
  purpose: 'reavaliacao',
  entryNodeKey: 'reav.prioridade',
  nodes: [
    node({
      key: 'reav.prioridade',
      stage: 'reavaliar',
      kind: 'yes_no',
      question: 'O fator anteriormente identificado ({{element}}) ainda apresenta prioridade?',
      options: yesNo(
        { next: 'reav.medir', set: { reav_still_priority: 'sim' } },
        { next: 'reav.medir', set: { reav_still_priority: 'nao' } },
      ),
    }),
    node({
      key: 'reav.medir',
      stage: 'reavaliar',
      kind: 'measure',
      question: 'Se apropriado, registre a intensidade atual da leitura para {{element}} (0 a 10).',
      explanation: 'Compare com o registro anterior apenas como indicador interno, sem conclusões causais.',
      options: [
        { value: 'medida', label: 'Registrar intensidade', set: { intensity_after: '{{text}}' }, next: 'reav.outra' },
        { value: 'pular', label: 'Não medir agora', next: 'reav.outra' },
      ],
    }),
    node({
      key: 'reav.outra',
      stage: 'reavaliar',
      kind: 'yes_no',
      question: 'Existe necessidade de outra intervenção relacionada ao objetivo inicial?',
      options: yesNo({ next: '@end', set: { need_more: 'sim' } }, { next: 'reav.encerrar', set: { need_more: 'nao' } }),
    }),
    node({
      key: 'reav.encerrar',
      stage: 'reavaliar',
      kind: 'yes_no',
      question: 'A sessão pode ser encerrada?',
      options: yesNo({ next: '@end', set: { can_close: 'sim' } }, { next: '@end', set: { can_close: 'nao', need_more: 'sim' } }),
    }),
  ],
};

export const SEED_TREES = [miraMainTree, miraReevaluationTree];
