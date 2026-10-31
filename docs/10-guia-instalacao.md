# Guia de instalação — Supabase + MIRA (passo a passo)

Tempo estimado: 30–40 minutos. Você só precisa do navegador e de um terminal no seu computador.

## 1. Criar o projeto no Supabase

1. Entre em <https://supabase.com/dashboard> e clique em **New project**.
2. Preencha:
   - **Name:** `mira`
   - **Database password:** gere uma senha forte e **guarde num gerenciador de senhas**.
   - **Region:** `South America (São Paulo)` (dados mais perto do Brasil, bom para a LGPD).
3. Clique em **Create new project** e espere 1–2 minutos até ele ficar pronto.

## 2. Criar as tabelas (3 arquivos SQL, nesta ordem)

No menu da esquerda, abra **SQL Editor** › **New query**. Para cada arquivo abaixo: abra o link, selecione tudo (Ctrl+A), copie, cole no editor e clique em **Run**. Deve aparecer "Success. No rows returned".

1. Schema: <https://raw.githubusercontent.com/prosperatech-create/mira/claude/mira-mvp/supabase/migrations/20261031000001_schema.sql>
2. Segurança (RLS): <https://raw.githubusercontent.com/prosperatech-create/mira/claude/mira-mvp/supabase/migrations/20261031000002_rls.sql>
3. Árvore MIRA e catálogo: <https://raw.githubusercontent.com/prosperatech-create/mira/claude/mira-mvp/supabase/seed.sql>

Confira em **Table Editor**: devem existir tabelas como `clients`, `sessions`, `tree_nodes` (com 34 linhas).

> Se o passo 1 der erro em `create extension vector`: vá em **Database › Extensions**, ative **vector** e rode o arquivo de novo numa query nova.

## 3. Configurar o login

1. **Authentication › Sign In / Providers**: em *Email*, deixe ligado e **desligue "Allow new users to sign up"** (só vocês criam contas).
2. **Authentication › Users › Add user › Create new user**:
   - Grazi: e-mail + senha, marque **Auto Confirm User**.
   - Edu: e-mail + senha, marque **Auto Confirm User**.
3. Volte ao **SQL Editor** e rode (trocando os e-mails):

```sql
update profiles set role = 'admin', full_name = 'Edu'   where email = 'EMAIL-DO-EDU';
update profiles set full_name = 'Grazi'                 where email = 'EMAIL-DA-GRAZI';
select email, role, full_name from profiles;
```

## 4. Pegar as chaves do projeto

Em **Project Settings › API** (ou o botão **Connect** no topo), copie:

- **Project URL** → algo como `https://xxxx.supabase.co`
- **anon public key** (ou *Publishable key*) → texto longo

⚠️ Nunca use a chave **service_role / secret** no MIRA.

## 5. Rodar o MIRA no seu computador (Ubuntu)

Instale o Node.js 22 (uma vez só):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v   # deve mostrar v22.x
```

Baixe e configure:

```bash
git clone https://github.com/prosperatech-create/mira.git
cd mira
git checkout claude/mira-mvp      # depois do merge do PR, use: git checkout main
npm install
cp .env.example .env.local
openssl rand -base64 32           # copie o resultado
nano .env.local
```

No `.env.local`, preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=cole-a-anon-key
MIRA_ENCRYPTION_KEY=cole-o-resultado-do-openssl
MIRA_AI_PROVIDER=none
```

Salve (Ctrl+O, Enter, Ctrl+X). **Guarde a MIRA_ENCRYPTION_KEY também no gerenciador de senhas**: sem ela, as anotações privadas não podem ser lidas.

```bash
npm run dev
```

Abra <http://localhost:3000> e entre com o e-mail da Grazi.

## 6. Roteiro de teste do atendimento completo

1. **Clientes › + Novo cliente**: "Maria Teste", marque o consentimento, salve.
2. **+ Novo atendimento**: escolha Maria, escreva "Ela quer trabalhar a questão financeira", modo **MIRA**, Continuar.
3. **Objetivo**: confira a sugestão e clique **Aprovar**.
4. **Preparação**: responda as 4 perguntas → veja o Índice de Neutralidade.
5. **Triagem**: não marque nada → **Iniciar investigação**.
6. Responda: SIM → *Sistema energético* → *Chakras* → SIM → *Cardíaco* → **NÃO** (confira que voltou para a lista de chakras: é a regra de prioridade) → *Cardíaco* de novo → SIM → *Deficiência* → *Emoções* → *Causa* → escreva uma hipótese → SIM (intervenção) → *Gráfico radiônico* + um gráfico → NÃO (outro fator).
7. **Reavaliação**: responda as perguntas e preencha antes × depois.
8. **Registro**: preencha relato e autocuidado → **Encerrar sessão e gerar relatório**.
9. No relatório: veja as abas **Interno** e **Para o cliente**, clique **Auditar sessão** e teste **Imprimir / salvar PDF**.
10. Abra a ficha da Maria: a sessão deve aparecer na linha do tempo.

Teste extra de segurança: crie outra sessão e marque **Ideação suicida** na triagem; a investigação deve ficar bloqueada.

Se algo der erro, copie a mensagem da tela **e** o que apareceu no terminal onde roda o `npm run dev` e envie na conversa.

## 7. (Opcional) Ligar a IA

Crie uma chave em <https://console.anthropic.com> e no `.env.local` troque:

```env
MIRA_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sua-chave
```

Pare o servidor (Ctrl+C) e rode `npm run dev` de novo.
