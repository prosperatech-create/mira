# Parte 3 — Modelo de dados

Schema completo em [`supabase/migrations/20261031000001_schema.sql`](../supabase/migrations/20261031000001_schema.sql) e políticas em [`…000002_rls.sql`](../supabase/migrations/20261031000002_rls.sql). Testado em PostgreSQL 16 (com stub de `auth`), incluindo os cenários de RLS abaixo.

## Diagrama (simplificado)

```
auth.users 1─1 profiles ──< clients ──< sessions ──< session_steps
                   │            │           ├──< hypotheses
                   │            │           ├──< session_interventions >── interventions (catálogo)
                   │            │           │                          └─> charts ──< chart_favorites
                   │            │           ├──< audit_results
                   │            │           ├──< question_audits
                   │            │           └──< reports (interno | cliente)
                   │            └──< client_notes (conteúdo criptografado)
                   ├──< protocols · biometers                         (fase 2)
                   └──< ai_logs · admin_logs
investigation_trees ──< tree_nodes            sessions.active_tree_id → investigation_trees
knowledge_documents ──< knowledge_chunks (embedding vector(1536))     (fase 2 – RAG)
settings (chave/valor)
```

## Tabelas

| Tabela | Papel | Observações |
|---|---|---|
| `profiles` | `users` do briefing (1:1 com `auth.users`) | `role`: `terapeuta` \| `admin`. Criado por trigger no cadastro |
| `clients` | Ficha da cliente | Campos opcionais por minimização; `private_notes_enc` criptografado; **consentimento obrigatório** (CHECK) com data e versão do termo |
| `sessions` | Atendimento | `phase` (máquina de estados), objetivo sugerido/aprovado, preparação + índice, triagem, árvore/nó ativos, `context` (variáveis da árvore), reavaliação, registro estruturado, `version` (concorrência otimista) |
| `session_steps` | `questions` + `answers` do briefing | Cada passo guarda o **texto exato exibido**, a resposta informada, o contexto resultante e `undone` (respostas desfeitas continuam auditáveis) |
| `hypotheses` | Hipóteses de possível origem | elemento, categoria, papel (causa/consequência/ambos/não definido) |
| `investigation_trees` / `tree_nodes` | Árvores configuráveis | nós com `options`, `routes`, `alerts`, `alternatives` em JSONB; ver Parte 6 |
| `interventions` | Catálogo de categorias de intervenção | `requires_chart` |
| `session_interventions` | Intervenções realizadas | gráfico, início/término, duração, frequência, reavaliação, `precision_warning` |
| `charts` / `chart_favorites` | Biblioteca de gráficos | finalidade tradicional, quando usar/não usar, tags; favorito e notas por terapeuta |
| `protocols`, `biometers` | Fase 2 | já modelados |
| `client_notes` | Anotações privadas | `content_enc` (AES-256-GCM) |
| `question_audits` | Histórico do auditor de perguntas | rótulos, sugestão, fonte (heurística / IA+heurística) |
| `audit_results` | Auditoria da sessão | métricas + pontos positivos/atenção/contradições/sugestões |
| `reports` | Relatórios gerados | `interno` e `cliente`, JSON estruturado |
| `knowledge_documents` / `knowledge_chunks` | RAG | pgvector |
| `ai_logs` | Uso da IA | tarefa, provedor, modelo, latência, tokens, flags de guardrail. Conteúdo **não** é gravado por padrão |
| `admin_logs` | Ações sensíveis | criação/exclusão/exportação de cliente, papéis, configurações |
| `settings` | Configurações | `ai_enabled`, `ai_log_content`, termo de consentimento |

## Segurança no banco (RLS)

- `is_admin()`, `my_role()`, `owns_client()`, `owns_session()` — funções `security definer` usadas nas políticas.
- **Dados clínicos**: política `owner_id = auth.uid()` para tudo (clients, sessions, steps, hipóteses, intervenções, notas, auditorias, relatórios).
- **Políticas restritivas** impedem vincular uma sessão a cliente de outra terapeuta, ou um passo/nota a sessão alheia.
- **Catálogo/árvores/conhecimento**: leitura para autenticados, escrita só admin.
- **Logs**: cada um insere os próprios; só admin lê.
- **Perfil**: a pessoa edita o próprio nome, mas não pode promover o próprio papel.

Cenários verificados localmente: terapeuta A vê só seus clientes; admin não vê clientes de A; tentativa de criar sessão para cliente de A como outro usuário → bloqueada pela política `sessions_client_guard`; autopromoção a admin → bloqueada.

## LGPD — como o modelo ajuda

- Minimização: só nome e consentimento são obrigatórios.
- Consentimento com data/versão; exportação JSON completa (`/clientes/:id/exportar`); exclusão em cascata da cliente e de todo o histórico.
- Criptografia de anotações privadas; logs sem conteúdo clínico; IA recebe dados pseudonimizados.
- Backups: usar os backups diários do Supabase (PITR no plano Pro) + `pg_dump` agendado e criptografado (ver README).
