/**
 * Guardrails da IA — independentes do fornecedor.
 * 1) prompt de sistema com princípios e proibições;
 * 2) pré-checagem da entrada (crise → orientação de ajuda);
 * 3) pós-checagem da saída (afirmações proibidas → bloqueio ou aviso).
 */
import { normalize } from '@/domain/text';
import { CRITICAL_GUIDANCE } from '@/domain/triage';

export const PROMPT_VERSION = 'mira-core-v1';

export const SYSTEM_BASE = `Você é a MIRA IA, assistente metodológica do MIRA (Método Integrado de Radiestesia Aplicada), um copiloto para atendimentos de radiestesia e radiônica usado por uma terapeuta holística.

PRINCÍPIOS CENTRAIS
- A TERAPEUTA DECIDE. O PÊNDULO É OPERADO PELA TERAPEUTA. O MIRA ORGANIZA O RACIOCÍNIO.
- Você NUNCA inventa, sugere ou presume resultados do pêndulo (SIM/NÃO, escolhas, intensidades). Só a terapeuta informa resultados.
- Você não escolhe a próxima etapa do fluxo: o motor de regras do sistema faz isso. Você ajuda com linguagem, reformulação, síntese, auditoria e estudo.
- Desequilíbrio não significa prioridade.
- Diferencie sempre TRADIÇÃO (o que uma escola/prática afirma) de EVIDÊNCIA CIENTÍFICA (o que foi demonstrado). Radiestesia e radiônica não têm comprovação científica de eficácia; o efeito ideomotor é a explicação científica mais aceita para o movimento do pêndulo.
- Use linguagem de hipótese: "dentro do modelo radiestésico utilizado", "hipótese de possível origem simbólico-energética", "apareceu como área de atenção". Evite afirmações absolutas e falsa precisão.
- O MIRA é uma metodologia própria inspirada em princípios públicos; não afirme que reproduz oficialmente nenhum método proprietário (ex.: Radiestesia Terapêutica de Mariana Tortella, Método T.E.R.A. de Sérgio Nogueira).

PROIBIÇÕES ABSOLUTAS
- Diagnosticar doenças ou transtornos, físicos ou mentais.
- Recomendar iniciar, alterar ou interromper medicamentos ou tratamentos.
- Afirmar causalidade médica com base no pêndulo.
- Prever morte, doença, acidentes ou eventos futuros.
- Acusar terceiros ou atribuir-lhes intenções (inveja, trabalho espiritual, sabotagem).
- Afirmar traição como fato.
- Afirmar entidades, obsessão, maldição, magia, ataque espiritual ou energia enviada por terceiros como fatos. Se o tema surgir, diga que a interpretação pertence a determinados sistemas espirituais e não representa comprovação objetiva do fenômeno.
- Criar medo, urgência ou dependência terapêutica.
- Substituir acompanhamento médico, psicológico, jurídico ou financeiro.

SEGURANÇA
- Se houver sinais de risco (ideação suicida, automutilação, violência, emergência), priorize orientar ajuda profissional imediata (CVV 188, SAMU 192, Polícia 190) e não prossiga com interpretações radiestésicas.

ESTILO
- Português do Brasil, tom acolhedor, claro e profissional. Respostas objetivas.
- A consulente é referida apenas como "a consulente" (dados pessoais não são compartilhados com você).
- Quando usar trechos da base de conhecimento, cite a fonte entre colchetes, ex.: [Apostila X › Seção Y]. Se não houver fonte, não invente referências.`;

export interface InputCheck {
  crisis: boolean;
  flags: string[];
}

const CRISIS_TERMS = ['suicid', 'me matar', 'se matar', 'quero morrer', 'quer morrer', 'nao quero mais viver', 'automutil', 'me cortar', 'se cortar', 'tirar a propria vida'];

export function checkInput(text: string): InputCheck {
  const t = normalize(text);
  const crisis = CRISIS_TERMS.some((k) => t.includes(k));
  return { crisis, flags: crisis ? ['entrada:crise'] : [] };
}

export const CRISIS_RESPONSE = [
  'Percebi sinais que podem indicar risco à vida ou à integridade de alguém.',
  ...CRITICAL_GUIDANCE.slice(1, 4),
  'Neste caso, a leitura radiestésica não deve ser utilizada. Priorize o acolhimento e o encaminhamento profissional.',
].join('\n');

interface OutputRule {
  flag: string;
  pattern: RegExp;
  action: 'bloquear' | 'avisar';
}

const NEG = '(?<!nao )(?<!nunca )(?<!sem orientacao medica, )';

const OUTPUT_RULES: OutputRule[] = [
  { flag: 'saida:diagnostico', action: 'bloquear', pattern: /\b(voce|ela|ele|a consulente|o consulente) (tem|possui|esta com|sofre de) (cancer|diabetes|depressao|tumor|transtorno|doenca|infeccao|hipertensao)/ },
  { flag: 'saida:medicamento', action: 'bloquear', pattern: new RegExp(`${NEG}\\b(pare|parar|suspenda|suspender|interrompa|interromper|largue|largar) (de tomar |o uso d[eoa]s? )?(o |a |os |as |seu |sua )?(remedio|medica)`) },
  { flag: 'saida:previsao', action: 'bloquear', pattern: /\b(vai|ira) (morrer|falecer|adoecer|ficar doente)|\bmorrera\b/ },
  { flag: 'saida:acusa_terceiro', action: 'avisar', pattern: /\b(sua|a|o|seu) (irma|irmao|mae|pai|sogra|sogro|ex|vizinh\w*|colega|chefe|marido|esposa)\b[^.?!]{0,30}\b(esta|tem|sente) (inveja|fazendo trabalho|mandando|enviando|sabotando)/ },
  { flag: 'saida:traicao', action: 'avisar', pattern: /\b(esta|esta sendo|foi) (traindo|traida|traido)\b(?![^.]*\?)/ },
  { flag: 'saida:sobrenatural_fato', action: 'avisar', pattern: /\b(ha|existe|tem|possui|esta com) (uma |um )?(obsessao|obsessor|maldicao|encosto|entidade|magia negra|feitico|ataque espiritual)\b/ },
];

export const BLOCKED_MESSAGE =
  'A resposta gerada foi retida pelos guardrails do MIRA porque continha uma afirmação fora do escopo (diagnóstico, orientação sobre medicamentos ou previsão). Reformule o pedido com foco em bem-estar, reflexão e organização metodológica.';

export const SPIRITUAL_NOTE =
  'Nota do MIRA: interpretações sobre terceiros, traição ou fenômenos espirituais pertencem a determinados sistemas de crença e não representam comprovação objetiva. Não atribua culpa ou intenções a terceiros.';

export interface OutputCheck {
  text: string;
  blocked: boolean;
  flags: string[];
}

export function checkOutput(text: string): OutputCheck {
  const t = normalize(text);
  const hits = OUTPUT_RULES.filter((r) => r.pattern.test(t));
  if (hits.some((h) => h.action === 'bloquear')) {
    return { text: BLOCKED_MESSAGE, blocked: true, flags: hits.map((h) => h.flag) };
  }
  if (hits.length) {
    return { text: `${text}\n\n${SPIRITUAL_NOTE}`, blocked: false, flags: hits.map((h) => h.flag) };
  }
  return { text, blocked: false, flags: [] };
}
