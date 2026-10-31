# Parte 7 — IA: arquitetura de prompts e guardrails

## Princípio

**Regras determinísticas controlam** fluxo, segurança, respostas, estados, permissões e sessões. **A IA ajuda** em linguagem, reformulação, interpretação, síntese, auditoria, geração de perguntas e estudo. A IA nunca escolhe a resposta do pêndulo, nem a próxima etapa.

## Camadas

```
Caso de uso (application/*)
   │  runJson(tarefa, schema) / runText(tarefa)
   ▼
src/ai/service.ts  ← ÚNICO ponto que conversa com modelos
   ├─ provedor configurado (providers/anthropic.ts | providers/openai.ts) via fetch
   ├─ settings.ai_enabled
   ├─ guardrail de ENTRADA  (crise → resposta de segurança, sem chamar o modelo)
   ├─ prompt de sistema base (SYSTEM_BASE) + adendo da tarefa
   ├─ timeout (MIRA_AI_TIMEOUT_MS)
   ├─ guardrail de SAÍDA   (bloquear | anexar aviso)
   ├─ parse + validação zod (tarefas JSON)
   └─ ai_logs (sem conteúdo, salvo ai_log_content = true)
```

Trocar de fornecedor = mudar `MIRA_AI_PROVIDER`/`MIRA_AI_MODEL`. Novo fornecedor = implementar `AIProvider.complete()` em um arquivo.

## Tarefas e prompts ([`src/ai/prompts.ts`](../src/ai/prompts.ts))

| Tarefa | Saída | Fallback sem IA |
|---|---|---|
| `objetivo` — transformador de queixa | JSON `{objective, rationale}` | template por temas (`domain/objective.ts`) |
| `auditor_pergunta` | JSON `{labels[], explanation, suggestion}` | heurística (`domain/question-auditor.ts`) |
| `auditoria_sessao` | JSON com as 5 seções | métricas e achados determinísticos (`domain/session-audit.ts`) |
| `resumo_cliente` | JSON `{summary}` | texto padrão (`domain/report.ts`) |
| `chat` (MIRA IA) | texto | comandos determinísticos + ajuda |

**Fusão IA + regras:** no auditor, a IA pode acrescentar rótulos, mas **não remove** `ACUSA TERCEIRO`, `FORA DO ESCOPO` e `ETICAMENTE PROBLEMÁTICA` detectados pelas regras. Na auditoria, os pontos de atenção e contradições calculados pelo sistema são sempre mantidos (união).

## Prompt de sistema base ([`src/ai/guardrails.ts`](../src/ai/guardrails.ts))

Contém: princípios (a terapeuta decide; não inventar resultados; desequilíbrio ≠ prioridade; tradição × evidência; efeito ideomotor; linguagem de hipótese; não reproduzir métodos proprietários), **proibições** (diagnosticar; orientar sobre medicamento; causalidade médica; prever morte/doença; acusar terceiros; afirmar traição; afirmar entidade/obsessão/maldição/magia como fato; criar medo; incentivar dependência), segurança (CVV 188, SAMU 192, 190) e estilo (pt-BR, "a consulente", citar fontes da base interna sem inventar).

## Guardrails programáticos

| Camada | Regra | Ação |
|---|---|---|
| Entrada | termos de crise (suicídio, automutilação…) | não chama o modelo; devolve orientação de ajuda; log `bloqueado` |
| Saída | diagnóstico ("ela tem depressão") | **bloqueia** |
| Saída | interromper medicamento (com exceção para negação: "nunca pare… sem orientação médica") | **bloqueia** |
| Saída | previsão de morte/doença | **bloqueia** |
| Saída | acusação a terceiro, traição como fato, fenômeno espiritual como fato | **anexa aviso** de sistema de crença |
| Relatório cliente | percentuais, "bloqueado", "a causa é" | suavização determinística (`softenForClient`) |

Testes: `src/ai/guardrails.test.ts`.

## Privacidade na IA

- Pseudonimização: o contexto enviado ao modelo usa o **código interno**, nunca nome, telefone, e-mail ou data de nascimento.
- Chaves de API só no servidor (`src/lib/env.ts` é `server-only`); componentes React nunca chamam a IA — só Server Actions → casos de uso → serviço central.
- `ai_logs` registra métricas e flags; conteúdo só com `ai_log_content = true`.

## RAG (fase 2)

`src/knowledge/retriever.ts` define `KnowledgeRetriever.search()`; o chat já injeta os trechos formatados como `[Documento › Seção]` e o prompt exige citação. Implementação prevista: upload no Storage → extração (PDF/texto) → chunks de ~800 tokens com sobreposição → embeddings → `knowledge_chunks.embedding` (pgvector, índice HNSW) → busca por similaridade com filtro por tags/licença.

## Comandos rápidos da MIRA IA

`/novo` `/mira` `/tera` `/terapeutica` `/pergunta` `/auditar <pergunta>` `/grafico <nome>` `/biometro` `/protocolo` `/estudar <tema>` `/cliente` `/relatorio` `/reavaliar` `/ajuda`. Os comandos de navegação, consulta e a pergunta atual da árvore são resolvidos pelo sistema; os de criação/estudo usam a IA com prompts específicos.
