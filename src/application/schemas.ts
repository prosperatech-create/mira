/** Validações de entrada (zod) compartilhadas pelas Server Actions. */
import { z } from 'zod';
import { SESSION_MODES } from '@/domain/types';
import { TRIAGE_FLAGS } from '@/domain/triage';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : null));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data inválida.');

export const uuid = z.string().uuid('Identificador inválido.');

export const clientInputSchema = z.object({
  full_name: z.string().trim().min(2, 'Informe o nome.').max(120),
  internal_code: optionalText(30),
  birth_date: optionalDate,
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\S+@\S+\.\S+$/.test(v), 'E-mail inválido.'),
  profession: optionalText(80),
  observations: optionalText(2000),
  private_notes: optionalText(5000),
});

export const clientCreateSchema = clientInputSchema.extend({
  consent: z.literal(true, { message: 'O consentimento da cliente é obrigatório para o cadastro.' }),
});

export const startSessionSchema = z.object({
  clientId: uuid,
  complaint: z.string().trim().min(3, 'Descreva o objetivo da sessão.').max(2000),
  mode: z.enum(SESSION_MODES),
});

export const approveObjectiveSchema = z.object({
  sessionId: uuid,
  objective: z.string().trim().min(10, 'O objetivo precisa ter ao menos 10 caracteres.').max(600),
});

export const preparationSchema = z.object({
  sessionId: uuid,
  neutral: z.boolean(),
  expecting: z.boolean(),
  tired: z.boolean(),
  priorKnowledge: z.boolean(),
});

export const triageSchema = z.object({
  sessionId: uuid,
  flags: z.array(z.enum(TRIAGE_FLAGS.map((f) => f.key) as [string, ...string[]])).max(TRIAGE_FLAGS.length),
  notes: optionalText(1000),
  acknowledged: z.boolean(),
});

export const interventionPayloadSchema = z.object({
  interventionId: uuid,
  chartId: uuid.optional().nullable(),
  description: optionalText(1000),
  startedAt: optionalText(40),
  endedAt: optionalText(40),
  durationText: optionalText(80),
  frequency: optionalText(80),
  reevaluateOn: optionalDate,
});

export const answerSchema = z.object({
  sessionId: uuid,
  nodeKey: z.string().min(1).max(120),
  value: z.string().min(1).max(80),
  text: z.string().max(4000).optional(),
  intervention: interventionPayloadSchema.optional(),
});

export const recordSchema = z.object({
  sessionId: uuid,
  client_report: optionalText(5000),
  interpretation: optionalText(5000),
  observations: optionalText(5000),
  self_care: optionalText(3000),
  next_followup_date: optionalDate,
});

export const reevaluationNotesSchema = z.object({
  sessionId: uuid,
  before: optionalText(1000),
  after: optionalText(1000),
  notes: optionalText(2000),
});

export const noteSchema = z.object({
  clientId: uuid,
  sessionId: uuid.optional().nullable(),
  content: z.string().trim().min(1, 'Escreva a anotação.').max(5000),
});

export const questionAuditSchema = z.object({
  question: z.string().trim().min(3, 'Escreva a pergunta.').max(600),
  sessionId: uuid.optional().nullable(),
});

export const chatSchema = z.object({
  message: z.string().trim().min(1).max(3000),
  sessionId: uuid.optional().nullable(),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(6000) })).max(20).default([]),
});
