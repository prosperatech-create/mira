# Parte 4 — Mapa de telas

## Navegação

```
/login
└─ (app)  — layout com menu lateral (desktop) e barra inferior (mobile)
   ├─ /                         Dashboard
   ├─ /clientes                 Lista + busca
   │  ├─ /clientes/novo         Cadastro (com consentimento)
   │  ├─ /clientes/:id          Ficha · recorrências · linha do tempo · comparação A×B · anotações
   │  ├─ /clientes/:id/editar
   │  └─ /clientes/:id/exportar (download JSON — LGPD)
   ├─ /atendimentos/novo        Cliente · objetivo livre · modo
   ├─ /auditor                  Auditor de perguntas
   ├─ /mira-ia                  Chat MIRA IA
   └─ /admin                    Usuários · IA · árvores · logs (só admin)
└─ (focus) — modo atendimento, sem menu
   ├─ /atendimentos/:id         Runner da sessão (todas as fases numa única tela)
   └─ /atendimentos/:id/relatorio  Interno | Para o cliente · auditoria · imprimir/PDF
```

## Telas e componentes

| Tela | Componentes principais | Notas |
|---|---|---|
| Login | `LoginForm` | e-mail/senha (Google na fase 2) |
| Dashboard | cards: hoje, em andamento/pendentes, clientes recentes, próximos acompanhamentos, gráficos mais usados, intervenções recentes, acompanhamento de clientes, biblioteca | botão principal **+ Novo atendimento** |
| Clientes | busca, lista | |
| Ficha | `ClientForm`, `DeleteClientButton`, `NoteForm`, linha do tempo, `Recurrence` | "correlação não é causalidade" |
| Novo atendimento | `NewSessionForm` (chips de exemplo, cartões de modo com avisos) | |
| **Runner** | `SessionRunner` → `ObjectivePanel` · `PreparationPanel` · `TriagePanel` · `InvestigationPanel` (`AnswerPad`, `InterventionForm`, antes×depois) · `RecordPanel`; `GpsBar`; gavetas Notas, Histórico, Auditar, MIRA IA | ver abaixo |
| Relatório | abas Interno / Cliente, `AuditButton`, `EditSummary`, `RegenerateButton`, `PrintButton` | CSS de impressão → PDF |
| Auditor | `QuestionAuditor`, auditorias recentes | |
| MIRA IA | `ChatPanel` (comandos rápidos) | |
| Admin | `RoleSelect`, `SettingToggle`, tabelas de logs | |

## O modo atendimento (tela mais importante)

Sem menu, sem distrações. Mostra apenas:

```
┌──────────────────────────────────────────┐
│ ←  Maria · M26-1234          Modo MIRA   │  cliente + objetivo (1 linha)
│ ▬▬▬▬▬▬▬▬▬▬▬▬ GPS (12 etapas)               │
│ PRIORIZAR · Sistema energético › Chakra… │
├──────────────────────────────────────────┤
│  É apropriado aprofundar Chakra          │  pergunta (grande, serifada)
│  Cardíaco agora, entre as prioridades?   │
│  Desequilíbrio não significa prioridade… │  pequena explicação
│  [ alerta, quando aplicável ]            │
│  ┌──────────┐ ┌──────────┐               │
│  │   SIM    │ │   NÃO    │               │  alvos de 80 px
│  └──────────┘ └──────────┘               │
│  [Neutro] [Não sei] [Reformular]         │
│  ↶ Desfazer · Encerrar investigação      │
├──────────────────────────────────────────┤
│ Notas · Histórico · Auditar · MIRA IA · Cancelar │  barra fixa inferior
└──────────────────────────────────────────┘
```

A terapeuta nunca precisa sair desta tela durante a leitura: objetivo, preparação, triagem, investigação, intervenção, reavaliação e registro acontecem nela.

## Design

Paleta calma (areia, sálvia, lavanda suave), tipografia serifada para títulos e perguntas, sem símbolos místicos (marca: círculos concêntricos discretos). Cards, etapas e indicadores visuais; foco visível; mobile-first.
