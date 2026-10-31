import 'server-only';
import { z } from 'zod';

/** Variáveis de ambiente do servidor, validadas na primeira leitura. */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  MIRA_ENCRYPTION_KEY: z
    .string()
    .regex(/^[A-Za-z0-9+/=]{43,44}$/, 'MIRA_ENCRYPTION_KEY deve ser 32 bytes em base64 (openssl rand -base64 32)'),
  MIRA_AI_PROVIDER: z.enum(['anthropic', 'openai', 'none']).default('none'),
  MIRA_AI_MODEL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  MIRA_AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuração inválida do ambiente: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
