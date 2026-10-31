# Parte 9 — Estrutura do projeto

```
mira/
├─ docs/                         Partes 1–9 (este material)
├─ supabase/
│  ├─ migrations/
│  │  ├─ 20261031000001_schema.sql   tabelas, tipos, gatilhos
│  │  └─ 20261031000002_rls.sql      Row Level Security
│  └─ seed.sql                   GERADO: árvores MIRA, intervenções, gráficos, settings
├─ scripts/
│  └─ generate-seed.ts           gera seed.sql a partir de src/domain/seed (valida as árvores)
├─ src/
│  ├─ proxy.ts                   sessão Supabase + redirecionamento de login (Next 16)
│  ├─ app/                       ── UI (rotas) ──
│  │  ├─ login/
│  │  ├─ (app)/                  layout com navegação
│  │  │  ├─ page.tsx             dashboard
│  │  │  ├─ clientes/…           lista, novo, ficha, editar, exportar (route handler)
│  │  │  ├─ atendimentos/novo/
│  │  │  ├─ auditor/  mira-ia/  admin/
│  │  ├─ (focus)/atendimentos/[id]/          modo atendimento + relatorio/
│  │  └─ actions/                Server Actions (fina camada: auth → caso de uso → Result)
│  ├─ components/                ── UI (componentes) ──
│  │  ├─ ui/                     Button, Card, Field, Badge, Alert…
│  │  ├─ layout/  clients/  session/  ai/
│  ├─ application/               ── Application layer ──
│  │  ├─ context.ts  page.ts  schemas.ts (zod)
│  │  ├─ sessions.ts  clients.ts  audits.ts  reports.ts  assistant.ts  dashboard.ts  admin.ts
│  ├─ domain/                    ── Domain (TypeScript puro, sem I/O) ──
│  │  ├─ types.ts  conditions.ts  tree-engine.ts  session-machine.ts
│  │  ├─ preparation.ts  triage.ts  question-auditor.ts  precision.ts
│  │  ├─ gps.ts  modes.ts  objective.ts  language.ts  report.ts  session-audit.ts
│  │  ├─ seed/ (mira-tree.ts, catalog.ts)
│  │  └─ domain.test.ts
│  ├─ data/                      ── Data ──
│  │  ├─ supabase/server.ts      cliente com JWT do usuário (RLS)
│  │  ├─ crypto.ts               AES-256-GCM
│  │  ├─ rows.ts                 tipos das linhas
│  │  └─ repositories/           profiles, clients, sessions, trees, records, logs
│  ├─ ai/                        ── AI Services ──
│  │  ├─ service.ts              serviço central (único ponto de chamada)
│  │  ├─ providers/              anthropic.ts, openai.ts, index.ts (fábrica)
│  │  ├─ prompts.ts  guardrails.ts  types.ts
│  ├─ knowledge/retriever.ts     ── Knowledge/RAG ── (interface; pgvector na fase 2)
│  └─ lib/                       env (validado), errors, logger, format, cn
├─ .env.example
├─ next.config.ts                headers de segurança; sem cache de páginas
└─ vitest.config.ts
```

## Regras de dependência

- `domain` não importa nada de fora de `domain`.
- `data` conhece `domain` (tipos) e o Supabase.
- `ai` conhece `domain` e `data` (logs/settings).
- `application` orquestra `domain`, `data`, `ai`, `knowledge`.
- `app/actions` só chama `application`. `components` só chamam `app/actions` (nunca `ai` ou `data`).
- Arquivos com segredos ou acesso a dados importam `server-only`, o que quebra o build se forem importados por um componente cliente.
