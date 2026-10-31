# Parte 5 — Fluxo MIRA: máquina de estados da sessão

Implementação: [`src/domain/session-machine.ts`](../src/domain/session-machine.ts) (pura, testada). Nenhuma camada — nem a UI, nem a IA — altera `sessions.phase` diretamente: todo caso de uso chama `transition(fase, evento)`, que lança erro se o evento não for permitido.

## Duas camadas de estado

1. **Fase da sessão** (`sessions.phase`) — macro, controla qual painel aparece.
2. **Etapa MIRA** (`tree_nodes.stage`) — fina, vem do nó atual da árvore e alimenta o GPS (12 etapas do briefing).

```
            APROVAR_OBJETIVO        CONCLUIR_PREPARACAO
 objetivo ───────────────────▶ preparacao ───────────────▶ triagem
                                                            │
                     CONCLUIR_TRIAGEM (nenhum | atenção+ciente)
                                                            ▼
                    ┌────────────────────────────── investigacao ◀──────────┐
                    │ CONCLUIR_INVESTIGACAO                │                 │
                    │ (sem intervenção)                    │ (com intervenção)│ CONCLUIR_REAVALIACAO
                    │                                      ▼                 │ (precisa de mais)
 CONCLUIR_TRIAGEM   │                                 reavaliacao ───────────┘
 (crítico+ciente)   │                                      │ CONCLUIR_REAVALIACAO (não precisa)
        └──────────▶▼◀─────────────────────────────────────┘
                 registro ───ENCERRAR───▶ encerrada
  (qualquer fase ativa) ───CANCELAR───▶ cancelada
```

| De | Evento | Guarda | Para |
|---|---|---|---|
| objetivo | APROVAR_OBJETIVO | objetivo não vazio | preparacao |
| preparacao | CONCLUIR_PREPARACAO | 4 respostas | triagem |
| triagem | CONCLUIR_TRIAGEM | se houver alerta, `acknowledged` | investigacao (ou **registro** se crítico) |
| investigacao | CONCLUIR_INVESTIGACAO | — | reavaliacao (se houve intervenção) / registro |
| reavaliacao | CONCLUIR_REAVALIACAO | — | investigacao (nó `intervencao.apropriada`) / registro |
| registro | ENCERRAR | — | encerrada (gera relatórios) |
| ativa | CANCELAR | — | cancelada |

## Mapeamento para as 12 etapas do briefing

| Etapa | Onde acontece |
|---|---|
| PREPARAR | fase `preparacao` → Índice de Neutralidade |
| DEFINIR OBJETIVO | fase `objetivo` → transformador de queixa (IA ou template) + Aprovar/Editar |
| TRIAGEM DE SEGURANÇA | fase `triagem` (determinística; crítico bloqueia investigação) |
| INVESTIGAÇÃO MACRO | nós `stage = macro` (ex.: `macro.inicio`) |
| PRIORIZAR | nós `priorizar` (GPS, seleção, **regra de prioridade**) |
| APROFUNDAR | nós `aprofundar` (dimensões de chakra, aura, campos, categoria de hipótese) |
| FORMULAR HIPÓTESE | nós `hipotese` (causa/consequência, fator anterior, registro) |
| ESCOLHER INTERVENÇÃO | nó `intervencao.apropriada` |
| HARMONIZAR | nó `intervencao.registrar` (categoria, gráfico, tempo) |
| REAVALIAR | fase `reavaliacao` (árvore `mira-reavaliacao` + antes × depois) |
| AUDITAR | botão "Auditar sessão" no relatório |
| REGISTRAR | fase `registro` → relato, interpretação, observações, autocuidado, próxima reavaliação |

## Consistência

- **Concorrência otimista:** `sessions.version` incrementa a cada atualização; uma segunda aba recebe "A sessão foi alterada em outra janela".
- **Pergunta já respondida:** a ação de responder confere `current_node_key`; respostas duplicadas são recusadas.
- **Desfazer:** marca o passo como `undone` (continua visível para a auditoria) e restaura nó e contexto anteriores. Hipóteses e intervenções não são desfeitas automaticamente (exigem correção explícita em nota) para não apagar registros clínicos silenciosamente.
