/**
 * Base de conhecimento (RAG) — interface estável.
 * MVP: retriever nulo. Fase 2: PgVectorRetriever (knowledge_chunks.embedding + filtro por tags).
 */
export interface KnowledgePassage {
  documentTitle: string;
  section: string | null;
  content: string;
  score: number;
}

export interface KnowledgeRetriever {
  search(query: string, opts?: { limit?: number; tags?: string[] }): Promise<KnowledgePassage[]>;
}

export class NullRetriever implements KnowledgeRetriever {
  async search(): Promise<KnowledgePassage[]> {
    return [];
  }
}

export function getRetriever(): KnowledgeRetriever {
  return new NullRetriever();
}

/** Formata passagens para o prompt, com rótulo de citação. */
export function formatPassages(passages: KnowledgePassage[]): string {
  if (!passages.length) return 'Nenhum trecho da base de conhecimento interna foi encontrado para esta pergunta. Não invente referências.';
  return passages
    .map((p) => `[${p.documentTitle}${p.section ? ` › ${p.section}` : ''}]\n${p.content}`)
    .join('\n\n---\n\n');
}
