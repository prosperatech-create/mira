# MIRA — Método Integrado de Radiestesia Aplicada

Copiloto metodológico para atendimentos de radiestesia e radiônica.

> **A terapeuta decide. O pêndulo é operado pela terapeuta. O MIRA organiza o raciocínio.**
> O MIRA não é um oráculo: ele nunca inventa ou escolhe resultados do pêndulo.

Stack: **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL + Auth + RLS) · camada de IA própria (Claude / OpenAI)**.

## Documentação

| Parte | Documento |
|---|---|
| 1 | [Visão do produto](docs/01-visao-do-produto.md) |
| 2 | [Arquitetura](docs/02-arquitetura.md) (inclui decisões técnicas) |
| 3 | [Modelo de dados](docs/03-modelo-de-dados.md) |
| 4 | [Mapa de telas](docs/04-mapa-de-telas.md) |
| 5 | [Fluxo MIRA — máquina de estados](docs/05-fluxo-mira.md) |
| 6 | [Motor de árvores](docs/06-motor-de-arvores.md) |
| 7 | [IA: prompts e guardrails](docs/07-ia-e-guardrails.md) |
| 8 | [MVP](docs/08-mvp.md) |
| 9 | [Estrutura do projeto](docs/09-estrutura-do-projeto.md) |
| — | [Guia de instalação passo a passo (Supabase)](docs/10-guia-instalacao.md) |

## Rodando localmente

Pré-requisitos: Node.js ≥ 20.9, Docker e [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
supabase start                 # sobe Postgres, Auth e Studio locais
supabase db reset              # aplica migrations + seed (árvores MIRA, catálogo)
cp .env.example .env.local     # preencha URL e anon key exibidas pelo `supabase start`
openssl rand -base64 32        # cole em MIRA_ENCRYPTION_KEY
npm run dev                    # http://localhost:3000
```

### Criar usuários

O cadastro público fica desligado. Crie os usuários no Studio (`http://127.0.0.1:54323` › Authentication › Add user) — por exemplo Grazi e Edu — e promova o administrador:

```sql
update profiles set role = 'admin', full_name = 'Edu' where email = 'edu@exemplo.com';
update profiles set full_name = 'Grazi' where email = 'grazi@exemplo.com';
```

### Ativar a IA (opcional)

```env
MIRA_AI_PROVIDER=anthropic        # ou openai
ANTHROPIC_API_KEY=...             # ou OPENAI_API_KEY
# MIRA_AI_MODEL=claude-sonnet-5-5
```

Sem IA, o sistema funciona integralmente com regras e heurísticas determinísticas.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | testes de domínio e guardrails (Vitest) |
| `npm run typecheck` · `npm run lint` | TypeScript e ESLint |
| `npm run seed:generate` | regera `supabase/seed.sql` a partir de `src/domain/seed/*` (valida as árvores) |
| `npm run db:reset` | `supabase db reset` |

## Produção (sugestão)

- Supabase Cloud (região São Paulo, `sa-east-1`) + Vercel (ou qualquer host Node).
- `supabase link && supabase db push` para aplicar as migrations; rodar `seed.sql` uma vez.
- Variáveis de ambiente no host (nunca no código). Guarde `MIRA_ENCRYPTION_KEY` em cofre: sem ela as anotações privadas não podem ser lidas.
- Backups: backups diários do Supabase (PITR no plano Pro) + `pg_dump` agendado e criptografado.
- Auth: senha forte, expiração de sessão e, quando disponível, MFA para o administrador.

## Privacidade (LGPD)

Consentimento obrigatório com versão do termo · coleta mínima · anotações privadas criptografadas (AES-256-GCM) · RLS por terapeuta · admin sem acesso a dados clínicos · exportação JSON e exclusão em cascata · `admin_logs` para ações sensíveis · IA com dados pseudonimizados e sem gravação de conteúdo por padrão.

## Aviso

O MIRA é uma metodologia própria, inspirada em princípios gerais e publicamente conhecidos. Não reproduz oficialmente nenhum método proprietário e não representa Mariana Tortella, Sérgio Nogueira ou o Método T.E.R.A. Radiestesia e radiônica são práticas integrativas sem comprovação científica de eficácia; o sistema não realiza diagnósticos e não substitui acompanhamento médico, psicológico, jurídico ou financeiro.
