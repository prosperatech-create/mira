# Parte 2 — Arquitetura

## Visão geral

```
┌────────────────────────────────────────────────────────────┐
│ UI (Next.js App Router, React 19, Tailwind 4)               │
│  src/app/**  ·  src/components/**                           │
│  Server Components leem dados; Client Components só UI      │
└──────────────┬─────────────────────────────────────────────┘
               │ Server Actions (POST autenticado, validado com zod)
┌──────────────▼─────────────────────────────────────────────┐
│ Application Layer  (src/application/**)                     │
│  Casos de uso: iniciar sessão, responder nó, desfazer,      │
│  reavaliar, encerrar, gerar relatório, auditar, chat IA…    │
└───────┬───────────────────────┬────────────────────────────┘
        │                       │
┌───────▼──────────┐   ┌────────▼───────────┐   ┌──────────────────┐
│ Domain (puro TS) │   │ AI Services        │──▶│ Knowledge / RAG  │
│ src/domain/**    │   │ src/ai/**          │   │ src/knowledge/** │
│ máquina estados, │   │ serviço central,   │   │ (interface MVP,  │
│ motor de árvores,│   │ provedores, prompts│   │  pgvector fase 2)│
│ triagem, índice, │   │ guardrails, logs   │   └──────────────────┘
│ auditor heurístico│  └────────┬───────────┘
└───────┬──────────┘            │
┌───────▼───────────────────────▼────────────────────────────┐
│ Data (src/data/**): repositórios Supabase, criptografia     │
└──────────────┬─────────────────────────────────────────────┘
               │ supabase-js com JWT do usuário → RLS no Postgres
┌──────────────▼─────────────────────────────────────────────┐
│ Supabase: PostgreSQL 15+ · Auth (e-mail/senha) · RLS ·       │
│ pgvector (fase 2) · Storage (fase 2: imagens de gráficos)   │
└────────────────────────────────────────────────────────────┘
```

Regra de dependência: `UI → application → (domain, data, ai)`; `domain` não depende de nada (é testável sem banco nem rede); `ai` depende só de `domain` (tipos) e `data` (log). Componentes React **nunca** chamam a IA diretamente.

## Frontend

- **Next.js 16 (App Router)** + **React 19** + **TypeScript** estrito.
- **Tailwind CSS 4** com tokens próprios (paleta calma: areia, sálvia, lavanda suave, tinta). Componentes acessíveis próprios (botões com foco visível, labels, `aria-live` na pergunta atual, alvo de toque ≥ 44 px). Sem dependência de kit pesado: menos superfície para manter.
- **Mobile-first**: o modo atendimento é pensado para celular/tablet ao lado do pêndulo.
- `proxy.ts` (antigo middleware no Next 16) renova a sessão Supabase e redireciona não autenticados para `/login`.

## Backend

- **Server Actions** (Next) como API: cada ação valida a entrada com **zod**, obtém o usuário autenticado, chama um caso de uso e devolve `Result` tipado (`{ ok: true, data } | { ok: false, error }`).
- Route Handler apenas para **exportação de dados** do cliente (download JSON).
- Erros: classes `AppError` (`NotFound`, `Forbidden`, `Validation`, `Conflict`, `AIUnavailable`) mapeadas para mensagens amigáveis.
- Logs estruturados (`src/lib/logger.ts`, JSON em stdout) + `admin_logs` (ações sensíveis) + `ai_logs` (uso da IA).

## Banco

- **Supabase (PostgreSQL)**. Migrations SQL versionadas em `supabase/migrations/`; seed em `supabase/seed.sql`.
- **RLS em todas as tabelas.** Dados clínicos pertencem à terapeuta que os criou (`owner_id = auth.uid()`). O administrador gerencia configuração, árvores e catálogo, mas **não lê dados clínicos de outras terapeutas** (minimização LGPD).
- Anotações privadas são **criptografadas na aplicação** (AES-256-GCM, chave `MIRA_ENCRYPTION_KEY` só no servidor) antes de ir ao banco.

## IA

- **Serviço central** `src/ai/service.ts` — único ponto que fala com modelos.
- **Provedores plugáveis** (`AIProvider`): Anthropic Claude e OpenAI implementados via HTTP (`fetch`), sem SDK, trocáveis por `MIRA_AI_PROVIDER` / `MIRA_AI_MODEL`. Novo fornecedor = um arquivo novo.
- **Tarefas tipadas** (objetivo, auditor de pergunta, chat, auditoria da sessão, resumo para cliente), cada uma com prompt versionado e, quando JSON, schema zod de saída.
- **Guardrails** em 3 camadas: prompt de sistema com proibições; pré-checagem da entrada (crise); pós-checagem da saída (afirmações proibidas → bloqueio/reescrita + flag no log).
- **Pseudonimização:** a IA recebe "a consulente" + código interno, nunca nome, telefone ou e-mail.
- **Degradação graciosa:** sem chave de API o sistema continua 100% funcional — o fluxo é determinístico; auditor e auditoria de sessão usam heurísticas; objetivo usa template.

## RAG (Knowledge)

- Interface `KnowledgeRetriever` em `src/knowledge/` já consumida pela IA (citações de fonte no prompt).
- Tabelas `knowledge_documents` e `knowledge_chunks` (com `embedding vector(1536)` via pgvector) já existem no schema.
- MVP: retriever nulo (retorna vazio). Fase 2: upload (PDF/texto) → extração → chunking (~800 tokens, overlap 100) → embeddings → busca por similaridade + filtro por tags → resposta cita `documento › seção`.

## Decisões registradas (ADR resumido)

| # | Decisão | Motivo |
|---|---|---|
| 1 | Next.js 16 + Server Actions em vez de API REST separada | Um deploy, tipos de ponta a ponta, menos código |
| 2 | Supabase com RLS e JWT do usuário (sem service role na app) | Segurança no banco, mesmo se a app tiver bug |
| 3 | Árvores no banco (nós + opções JSON) | Edu altera o fluxo sem código |
| 4 | IA via `fetch` com camada própria | Independência de fornecedor, poucas dependências |
| 5 | Sem chave de IA → heurísticas | O atendimento nunca para por causa da IA |
| 6 | PDF no MVP via impressão do navegador (CSS de impressão) | Simples e bonito; PDF server-side na fase 2 |
| 7 | Conteúdo de prompts não é gravado no log por padrão | Minimização LGPD; ativável em `settings` |
| 8 | `questions`/`answers` do briefing modelados como `tree_nodes` (perguntas) + `session_steps` (respostas) + `question_audits` | Evita duplicação; cada resposta guarda o texto exato exibido |
