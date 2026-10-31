import { AIProviderError, type AIProvider, type AIRequest, type AIResponse } from '../types';

/** Anthropic Claude via Messages API (HTTP direto, sem SDK). */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic' as const;
  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async complete(req: AIRequest): Promise<AIResponse> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.3,
        system: req.json ? `${req.system}\n\nResponda SOMENTE com um objeto JSON válido, sem texto antes ou depois.` : req.system,
        messages: req.messages,
      }),
      signal: req.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AIProviderError(`Anthropic respondeu ${res.status}: ${body.slice(0, 200)}`, res.status);
    }
    const data = (await res.json()) as {
      content: { type: string; text?: string }[];
      model: string;
      usage?: { input_tokens: number; output_tokens: number };
    };
    return {
      text: data.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join(''),
      model: data.model,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
    };
  }
}
