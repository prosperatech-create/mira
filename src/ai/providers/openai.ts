import { AIProviderError, type AIProvider, type AIRequest, type AIResponse } from '../types';

/** OpenAI via Chat Completions (HTTP direto, sem SDK). */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const;
  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async complete(req: AIRequest): Promise<AIResponse> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        max_completion_tokens: req.maxTokens ?? 1024,
        messages: [{ role: 'system', content: req.system }, ...req.messages],
        ...(req.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: req.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AIProviderError(`OpenAI respondeu ${res.status}: ${body.slice(0, 200)}`, res.status);
    }
    const data = (await res.json()) as {
      choices: { message: { content: string | null } }[];
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    return {
      text: data.choices[0]?.message.content ?? '',
      model: data.model,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  }
}
