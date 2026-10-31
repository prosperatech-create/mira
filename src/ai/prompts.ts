/**
 * Prompts por tarefa. Cada tarefa tem versão, construtor de mensagem e (quando JSON) schema de saída.
 * Edu poderá sobrescrever textos via tabela settings (fase 2: editor de prompts).
 */
import { z } from 'zod';
import { QUESTION_LABELS } from '@/domain/question-auditor';

export const PROMPTS_VERSION = 'tasks-v1';

// ── Objetivo ──
export const objectiveSchema = z.object({
  objective: z.string().min(10).max(400),
  rationale: z.string().max(400).optional(),
});
export function objectivePrompt(complaint: string, mode: string): string {
  return `Tarefa: transformar a descrição livre da terapeuta em UM objetivo investigável para a sessão de radiestesia.

Regras:
- Comece com "Investigar fatores simbólico-energéticos prioritários relacionados a…".
- Foque na experiência da consulente; não mencione terceiros como causa; não use diagnósticos.
- Não pressuponha problema, causa ou resultado. Máximo de 2 linhas.
- Se a descrição envolver saúde, medicação, crise ou risco, mantenha o foco em bem-estar e reflexão.

Modo da sessão: ${mode}
Descrição da terapeuta: """${complaint}"""

Responda em JSON: {"objective": "...", "rationale": "por que esta formulação é neutra (1 frase)"}`;
}

// ── Auditor de perguntas ──
export const questionAuditSchema = z.object({
  labels: z.array(z.enum(QUESTION_LABELS)).min(1),
  explanation: z.string().max(800),
  suggestion: z.string().max(400).nullable(),
});
export function questionAuditPrompt(question: string, objective: string | null, heuristicLabels: string[]): string {
  return `Tarefa: auditar uma pergunta que a terapeuta pretende fazer ao pêndulo.

Classifique com um ou mais rótulos: ${QUESTION_LABELS.join(', ')}.
- BOA: clara, única, neutra, dentro do escopo (use sozinha).
- VAGA: sem foco verificável. DUPLA: duas perguntas em uma.
- TENDENCIOSA: induz resposta. PRESSUPÕE RESPOSTA: assume causa/problema.
- ACUSA TERCEIRO: atribui intenção/efeito a outra pessoa.
- FORA DO ESCOPO: diagnóstico, medicação, previsão, decisões jurídicas/financeiras de alto risco.
- ETICAMENTE PROBLEMÁTICA: gera medo, invade privacidade de terceiros, afirma fenômeno espiritual/traição como fato.

Objetivo da sessão: ${objective ?? '(não informado)'}
Pré-análise heurística do sistema: ${heuristicLabels.join(', ')}
Pergunta: """${question}"""

Se não for BOA, sugira UMA reformulação aberta, focada na experiência da consulente, que possa ser respondida com SIM/NÃO, sem pressupor causa e sem citar terceiros como agentes.
Responda em JSON: {"labels": [...], "explanation": "...", "suggestion": "..." ou null}`;
}

// ── Auditoria da sessão ──
export const sessionAuditSchema = z.object({
  positives: z.array(z.string()).max(8),
  attentionPoints: z.array(z.string()).max(10),
  reformulations: z.array(z.object({ question: z.string(), suggestion: z.string() })).max(8),
  contradictions: z.array(z.string()).max(8),
  nextSessionSuggestions: z.array(z.string()).max(8),
});
export function sessionAuditPrompt(input: { objective: string | null; metrics: unknown; findings: unknown; steps: { q: string; a: string }[] }): string {
  return `Tarefa: auditar metodologicamente uma sessão de radiestesia já realizada. Você NÃO avalia se as respostas do pêndulo estão "certas"; avalia o método.

Analise: clareza das perguntas, perguntas duplas, indução, contradições, mudanças frequentes de resposta, excesso de investigação, precisão excessiva, causa × consequência, interpretações exageradas, possíveis vieses da terapeuta, afastamento do objetivo inicial.

Objetivo da sessão: ${input.objective ?? '(não informado)'}
Métricas calculadas pelo sistema (confiáveis): ${JSON.stringify(input.metrics)}
Achados determinísticos do sistema (mantenha-os, pode reformular): ${JSON.stringify(input.findings)}
Sequência de perguntas e respostas informadas pela terapeuta:
${input.steps.map((s, i) => `${i + 1}. ${s.q} → ${s.a}`).join('\n')}

Responda em JSON com as chaves: positives, attentionPoints, reformulations [{question, suggestion}], contradictions, nextSessionSuggestions. Frases curtas, construtivas, sem julgamento pessoal.`;
}

// ── Resumo para o cliente ──
export const clientSummarySchema = z.object({ summary: z.string().min(20).max(1200) });
export function clientSummaryPrompt(input: { objective: string; aspects: string[]; harmonizations: string[]; selfCare: string | null }): string {
  return `Tarefa: escrever o resumo de uma sessão de radiestesia para a consulente, em linguagem simples e acolhedora.

Regras: sem afirmações absolutas, sem percentuais, sem diagnóstico, sem prometer resultados, sem medo. Use "durante a leitura radiestésica… apareceu como área de atenção dentro do método utilizado". 1 a 2 parágrafos curtos.

Objetivo: ${input.objective}
Aspectos observados: ${input.aspects.join(' | ') || 'nenhum aspecto prioritário'}
Harmonizações realizadas: ${input.harmonizations.join(' | ') || 'nenhuma'}
Recomendações de autocuidado: ${input.selfCare ?? 'não informadas'}

Responda em JSON: {"summary": "..."}`;
}

// ── Chat ──
export function chatSystemAddendum(context: string, knowledge: string): string {
  return `CONTEXTO DA SESSÃO (dados fornecidos pelo sistema; a consulente é pseudonimizada):
${context}

BASE DE CONHECIMENTO INTERNA:
${knowledge}

Ao sugerir perguntas, entregue-as como sugestões para a terapeuta avaliar; nunca diga qual será a resposta do pêndulo. Lembre que o próximo passo do fluxo é decidido pelo motor de regras.`;
}
