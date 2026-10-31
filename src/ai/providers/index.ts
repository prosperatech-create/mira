import 'server-only';
import { serverEnv } from '@/lib/env';
import type { AIProvider } from '../types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';

const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-5-5',
  openai: 'gpt-4.1',
} as const;

/** Fábrica do provedor configurado. Retorna null quando não há IA configurada. */
export function getProvider(): AIProvider | null {
  const env = serverEnv();
  switch (env.MIRA_AI_PROVIDER) {
    case 'anthropic':
      return env.ANTHROPIC_API_KEY ? new AnthropicProvider(env.ANTHROPIC_API_KEY, env.MIRA_AI_MODEL || DEFAULT_MODELS.anthropic) : null;
    case 'openai':
      return env.OPENAI_API_KEY ? new OpenAIProvider(env.OPENAI_API_KEY, env.MIRA_AI_MODEL || DEFAULT_MODELS.openai) : null;
    default:
      return null;
  }
}
