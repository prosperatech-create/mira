# Parte 8 — MVP

## Escopo implementado (15 itens do briefing)

| # | Item | Status | Onde |
|---|---|---|---|
| 1 | Login | ✅ e-mail/senha (Supabase Auth), proxy de sessão | `/login`, `src/proxy.ts` |
| 2 | Dashboard | ✅ hoje, em andamento, pendentes, recentes, acompanhamentos, gráficos, evolução | `/` |
| 3 | Cadastro de clientes | ✅ com consentimento, criptografia de notas, exportar/excluir | `/clientes` |
| 4 | Novo atendimento | ✅ cliente existente/novo, modo | `/atendimentos/novo` |
| 5 | Objetivo | ✅ transformador (IA ou template) + Aprovar/Editar | runner, fase `objetivo` |
| 6 | Preparação do operador | ✅ 4 perguntas + Índice de Neutralidade | fase `preparacao` |
| 7 | GPS MIRA | ✅ 12 etapas + trilha da dimensão; navegação no Modo Livre | `GpsBar` |
| 8 | Árvore guiada | ✅ motor configurável + árvore seed de 34 nós, 4 modos | `tree-engine.ts` |
| 9 | Registro de respostas | ✅ cada passo com texto exibido, resposta, contexto; desfazer auditável | `session_steps` |
| 10 | Notas | ✅ durante a sessão e na ficha (criptografadas) | gaveta Notas |
| 11 | Reavaliação | ✅ árvore de reavaliação + antes × depois | fase `reavaliacao` |
| 12 | Histórico do cliente | ✅ linha do tempo, recorrências, comparação A×B | `/clientes/:id` |
| 13 | Relatório da sessão | ✅ interno + cliente, impressão/PDF pelo navegador | `/atendimentos/:id/relatorio` |
| 14 | MIRA IA | ✅ chat com comandos, contexto pseudonimizado | gaveta + `/mira-ia` |
| 15 | Auditor de perguntas | ✅ regras + IA | gaveta + `/auditor` |

Também incluídos no MVP por serem baratos e importantes: triagem de segurança, auditoria da sessão, intervenções com gráfico e tempo (alerta de falsa precisão), painel admin (papéis, IA on/off, logs), `admin_logs`, `ai_logs`, catálogo inicial de gráficos e intervenções.

## Fora do MVP (já preparado no schema/arquitetura)

- **Fase 2:** biblioteca de gráficos completa (imagens no Storage, favoritos/notas — tabelas prontas), protocolos, construtor de biômetros (export imagem/PDF), editor visual de árvores, PDF server-side, RAG, Academia MIRA, análise longitudinal.
- **Fase 3:** PWA, offline parcial, app móvel, voz/transcrição, importação de documentos, analytics, automações, login Google.

## Critérios de aceite do MVP

1. Grazi consegue fazer o fluxo completo do item 52 do briefing numa única tela, no celular.
2. Sem chave de IA, todo o fluxo funciona (objetivo por template, auditor e auditoria heurísticos).
3. Triagem crítica impede a investigação e mostra orientação de ajuda.
4. Responder NÃO à regra de prioridade sempre retorna ao nível anterior.
5. Uma terapeuta nunca vê dados de outra (RLS); admin não vê dados clínicos.
6. Relatório do cliente nunca contém percentuais ou afirmações absolutas do tipo "bloqueado".

## Qualidade atual

- `npm test` — 27 testes (motor de árvores, regra de prioridade, modos, máquina de estados, triagem, neutralidade, auditor, precisão, linguagem, auditoria, guardrails).
- `npm run typecheck`, `npm run lint`, `npm run build` — passando.
- Migrations + seed aplicadas em PostgreSQL 16 local com verificação manual das políticas RLS.
- **Ainda não testado:** o fluxo no navegador contra um Supabase real (o ambiente de desenvolvimento não tinha Docker). É o primeiro passo recomendado ao subir o projeto (ver README).
