-- MIRA — Migration 002: Row Level Security
-- Regra: dados clínicos só são visíveis para a terapeuta dona (owner_id).
-- Admin gerencia configuração/catálogo/árvores/logs, mas não lê dados clínicos alheios.

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active);
$$;

alter table profiles enable row level security;
alter table clients enable row level security;
alter table investigation_trees enable row level security;
alter table tree_nodes enable row level security;
alter table charts enable row level security;
alter table chart_favorites enable row level security;
alter table interventions enable row level security;
alter table protocols enable row level security;
alter table biometers enable row level security;
alter table sessions enable row level security;
alter table session_steps enable row level security;
alter table hypotheses enable row level security;
alter table session_interventions enable row level security;
alter table client_notes enable row level security;
alter table question_audits enable row level security;
alter table audit_results enable row level security;
alter table reports enable row level security;
alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;
alter table ai_logs enable row level security;
alter table admin_logs enable row level security;
alter table settings enable row level security;

-- profiles
create policy profiles_self_read on profiles for select using (id = auth.uid() or is_admin());
create or replace function my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

-- a própria pessoa edita nome, mas não pode promover o próprio papel
create policy profiles_self_update on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = my_role());
create policy profiles_admin_update on profiles for update using (is_admin()) with check (is_admin());

-- tabelas clínicas: dona tem acesso total
do $$ declare t text; begin
  foreach t in array array['clients','sessions','session_steps','hypotheses','session_interventions',
                           'client_notes','question_audits','audit_results','reports','protocols','biometers'] loop
    execute format('create policy %I_owner_all on %I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
  end loop;
end $$;

-- catálogo e árvores: leitura para autenticados, escrita para admin
do $$ declare t text; begin
  foreach t in array array['investigation_trees','tree_nodes','charts','interventions','knowledge_documents','knowledge_chunks'] loop
    execute format('create policy %I_read on %I for select using (auth.role() = ''authenticated'')', t, t);
    execute format('create policy %I_admin_write on %I for all using (is_admin()) with check (is_admin())', t, t);
  end loop;
end $$;

create policy chart_favorites_own on chart_favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- settings: leitura autenticada, escrita admin
create policy settings_read on settings for select using (auth.role() = 'authenticated');
create policy settings_admin_write on settings for all using (is_admin()) with check (is_admin());

-- logs: qualquer autenticado insere os próprios; só admin lê
create policy ai_logs_insert on ai_logs for insert with check (user_id = auth.uid());
create policy ai_logs_admin_read on ai_logs for select using (is_admin());
create policy admin_logs_insert on admin_logs for insert with check (actor_id = auth.uid());
create policy admin_logs_admin_read on admin_logs for select using (is_admin());

-- políticas RESTRITIVAS: impedem vincular registros a clientes/sessões de outra terapeuta
create or replace function owns_client(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from clients where id = cid and owner_id = auth.uid());
$$;
create or replace function owns_session(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sessions where id = sid and owner_id = auth.uid());
$$;

create policy sessions_client_guard on sessions as restrictive for all
  using (true) with check (owns_client(client_id));
create policy client_notes_client_guard on client_notes as restrictive for all
  using (true) with check (owns_client(client_id) and (session_id is null or owns_session(session_id)));
do $$ declare t text; begin
  foreach t in array array['session_steps','hypotheses','session_interventions','audit_results','reports'] loop
    execute format('create policy %I_session_guard on %I as restrictive for all using (true) with check (owns_session(session_id))', t, t);
  end loop;
end $$;
create policy question_audits_session_guard on question_audits as restrictive for all
  using (true) with check (session_id is null or owns_session(session_id));
