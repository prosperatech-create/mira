-- MIRA — Método Integrado de Radiestesia Aplicada
-- Migration 001: schema principal
-- Convenções: snake_case, uuid PK, timestamptz, owner_id = terapeuta dona do dado clínico.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- ───────────────────────── Tipos ─────────────────────────
create type user_role as enum ('terapeuta', 'admin');
create type session_mode as enum ('mira', 'terapeutica', 'tera', 'livre');
create type session_phase as enum (
  'objetivo', 'preparacao', 'triagem', 'investigacao',
  'reavaliacao', 'registro', 'encerrada', 'cancelada'
);
create type mira_stage as enum (
  'preparar', 'objetivo', 'triagem', 'macro', 'priorizar', 'aprofundar',
  'hipotese', 'intervencao', 'harmonizar', 'reavaliar', 'auditar', 'registrar'
);
create type node_kind as enum ('yes_no', 'select', 'origin', 'measure', 'text', 'intervention', 'route', 'end');
create type triage_level as enum ('nenhum', 'atencao', 'critico');
create type report_kind as enum ('interno', 'cliente');

-- ───────────────────────── Usuários ─────────────────────────
-- users = auth.users (Supabase Auth) + profiles (dados de aplicação)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role user_role not null default 'terapeuta',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Clientes ─────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete restrict,
  internal_code text not null,
  full_name text not null,
  birth_date date,
  phone text,
  email text,
  profession text,
  observations text,
  private_notes_enc text,                      -- AES-256-GCM (aplicação)
  consent_given boolean not null default false,
  consent_at timestamptz,
  consent_text_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, internal_code),
  constraint consent_required check (consent_given = true and consent_at is not null)
);
create index clients_owner_idx on clients(owner_id, full_name);

-- ───────────────────── Árvores de investigação ─────────────────────
create table investigation_trees (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  purpose text not null default 'investigacao' check (purpose in ('investigacao', 'reavaliacao')),
  entry_node_key text not null,
  version int not null default 1,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tree_nodes (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references investigation_trees(id) on delete cascade,
  key text not null,                 -- identificador estável, ex.: 'chakra.qual'
  stage mira_stage not null,
  kind node_kind not null,
  category text,                     -- ex.: 'sistema_energetico'
  question text not null,            -- aceita {{variaveis}} do contexto
  explanation text,
  options jsonb not null default '[]'::jsonb,      -- NodeOption[]
  routes jsonb not null default '[]'::jsonb,       -- Route[] (nós 'route' ou fallback)
  alerts jsonb not null default '[]'::jsonb,       -- NodeAlert[]
  alternatives jsonb not null default '[]'::jsonb, -- reformulações
  is_anchor boolean not null default false,        -- ponto de retorno da regra de prioridade
  tags text[] not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tree_id, key)
);

-- ───────────────────────── Catálogo ─────────────────────────
create table charts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_path text,
  category text not null,
  traditional_purpose text,
  origin text,
  description text,
  when_used text,
  when_not_used text,
  combinations text,
  observations text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chart_favorites (          -- favorito + notas por terapeuta
  chart_id uuid not null references charts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  favorite boolean not null default true,
  notes text,
  primary key (chart_id, user_id)
);

create table interventions (            -- categorias de intervenção
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  requires_chart boolean not null default false,
  position int not null default 0,
  is_active boolean not null default true
);

create table protocols (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  steps jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table biometers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  decision_purpose text not null,
  shape text not null check (shape in ('semicircular','circular','linear','percentual','categorias','intensidade','prioridade')),
  categories jsonb not null default '[]'::jsonb,
  include_other boolean not null default false,
  include_none boolean not null default false,
  include_not_now boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Sessões ─────────────────────────
create table sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete restrict,
  client_id uuid not null references clients(id) on delete cascade,
  mode session_mode not null default 'mira',
  phase session_phase not null default 'objetivo',
  -- objetivo
  complaint_text text not null,                -- descrição livre da terapeuta
  objective_suggested text,
  objective text,                              -- aprovado/editado
  objective_approved_at timestamptz,
  -- preparação
  preparation jsonb,                           -- {neutral, expecting, tired, priorKnowledge}
  neutrality_index int check (neutrality_index between 0 and 100),
  -- triagem
  triage jsonb,                                -- {flags: string[], notes}
  triage_level triage_level,
  triage_acknowledged boolean not null default false,
  -- motor de árvores
  active_tree_id uuid references investigation_trees(id),
  current_node_key text,
  context jsonb not null default '{}'::jsonb,
  -- reavaliação
  reevaluation jsonb,                          -- {before, after, notes}
  -- registro estruturado
  client_report text,                          -- RELATO DO CLIENTE
  interpretation text,                         -- INTERPRETAÇÃO TERAPÊUTICA
  observations text,                           -- OBSERVAÇÕES
  self_care text,                              -- recomendações de autocuidado
  next_followup_date date,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  version int not null default 0,              -- concorrência otimista
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_owner_idx on sessions(owner_id, started_at desc);
create index sessions_client_idx on sessions(client_id, started_at desc);

-- respostas (cada passo da árvore = pergunta exibida + resposta informada pela terapeuta)
create table session_steps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  seq int not null,
  tree_id uuid references investigation_trees(id),
  node_key text not null,
  stage mira_stage not null,
  question_text text not null,                 -- texto exato exibido
  answer_value text not null,                  -- sim | nao | neutro | nao_sei | reformular | <opção>
  answer_label text not null,
  answer_text text,                            -- texto livre / medida
  context_after jsonb not null default '{}'::jsonb,
  undone boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);
create index session_steps_session_idx on session_steps(session_id, seq);

create table hypotheses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  element text,
  category text,
  role text check (role in ('causa','consequencia','ambos','nao_definido')),
  description text not null,
  created_at timestamptz not null default now()
);

create table session_interventions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  intervention_id uuid references interventions(id),
  chart_id uuid references charts(id),
  protocol_id uuid references protocols(id),
  description text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_text text,
  frequency text,
  reevaluate_on date,
  precision_warning boolean not null default false,
  created_at timestamptz not null default now()
);

create table client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  content_enc text not null,                   -- AES-256-GCM (aplicação)
  created_at timestamptz not null default now()
);

create table question_audits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  session_id uuid references sessions(id) on delete cascade,
  question text not null,
  labels text[] not null,
  suggestion text,
  explanation text,
  source text not null check (source in ('heuristica','ia+heuristica')),
  created_at timestamptz not null default now()
);

create table audit_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  metrics jsonb not null,
  positives text[] not null default '{}',
  attention_points text[] not null default '{}',
  reformulations jsonb not null default '[]'::jsonb,
  contradictions text[] not null default '{}',
  next_session_suggestions text[] not null default '{}',
  source text not null check (source in ('heuristica','ia+heuristica')),
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  owner_id uuid not null references profiles(id),
  kind report_kind not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, kind)
);

-- ───────────────────── Base de conhecimento (RAG) ─────────────────────
create table knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null check (source_type in ('pdf','texto','apostila','anotacao','livro','protocolo','tabela')),
  storage_path text,
  license_note text,
  tags text[] not null default '{}',
  uploaded_by uuid references profiles(id),
  status text not null default 'pendente' check (status in ('pendente','processado','erro')),
  created_at timestamptz not null default now()
);

create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references knowledge_documents(id) on delete cascade,
  chunk_index int not null,
  section text,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

-- ───────────────────── Operação, IA e auditoria ─────────────────────
create table ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  session_id uuid references sessions(id) on delete set null,
  task text not null,
  provider text not null,
  model text,
  status text not null check (status in ('ok','erro','bloqueado','indisponivel')),
  latency_ms int,
  input_tokens int,
  output_tokens int,
  guardrail_flags text[] not null default '{}',
  error text,
  content jsonb,                                -- só se settings.ai_log_content = true
  created_at timestamptz not null default now()
);

create table admin_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,                         -- client.create, client.delete, client.export, user.role…
  entity text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Gatilhos ─────────────────────────
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['profiles','clients','investigation_trees','tree_nodes','charts','protocols','biometers','sessions','reports'] loop
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- cria o perfil ao cadastrar usuário no Supabase Auth
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();
