/** Contratos da camada de IA (independente de fornecedor). */
export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Pede saída JSON (o provedor ajusta a instrução/parâmetro). */
  json?: boolean;
  signal?: AbortSignal;
}

export interface AIResponse {
  text: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AIProvider {
  readonly name: 'anthropic' | 'openai';
  readonly model: string;
  complete(req: AIRequest): Promise<AIResponse>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}
