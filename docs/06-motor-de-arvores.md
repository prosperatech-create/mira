# Parte 6 — Motor de árvores (perguntas condicionais sem hardcode)

Implementação: [`src/domain/tree-engine.ts`](../src/domain/tree-engine.ts) + [`conditions.ts`](../src/domain/conditions.ts). Árvore inicial: [`src/domain/seed/mira-tree.ts`](../src/domain/seed/mira-tree.ts) → gera `supabase/seed.sql` (`npm run seed:generate`).

## Ideia central

O fluxo é **dado**, não código. Cada árvore é um conjunto de nós no banco (`tree_nodes`). O motor é uma função pura:

```
applyAnswer(árvore, nóAtual, respostaDaTerapeuta, contexto, histórico)
  → { próximoNó | fim, novoContexto, rótulo, dica }
```

A IA não participa: a mesma entrada sempre produz a mesma saída. Isso é testado (`src/domain/domain.test.ts`).

## Anatomia de um nó

```jsonc
{
  "key": "elemento.prioridade",          // identificador estável
  "stage": "priorizar",                   // etapa do GPS
  "kind": "yes_no",                       // yes_no | select | origin | measure | text | intervention | route | end
  "category": null,
  "question": "É apropriado aprofundar {{element}} agora, entre as prioridades desta sessão?",
  "explanation": "Desequilíbrio não significa prioridade…",
  "alternatives": ["{{element}} está entre as prioridades desta sessão?"],   // usadas em REFORMULAR
  "alerts": [{ "when": { "var": "category", "eq": "espiritual" }, "level": "atencao", "message": "…" }],
  "is_anchor": false,                      // ponto de retorno da regra de prioridade
  "tags": ["regra-prioridade"],
  "options": [
    { "value": "sim", "label": "Sim",
      "set": { "priority_confirmed": "sim" },
      "routes": [ { "when": { "var": "mode", "eq": "tera" }, "next": "medir.intensidade" },
                  { "next": "aprofundar.roteador" } ] },
    { "value": "nao", "label": "Não", "next": "@back" }
  ]
}
```

### Tipos de nó

| kind | UI | Resposta |
|---|---|---|
| `yes_no` | SIM · NÃO grandes; NEUTRO · NÃO SEI · REFORMULAR | `sim`/`nao`/`neutro`/`nao_sei`/`reformular` |
| `select` | lista de opções (+ Não sei / Reformular) | `value` da opção |
| `origin` | CAUSA · CONSEQUÊNCIA · AMBOS · NÃO DEFINIDO | idem |
| `measure` | controle 0–10 (indicador interno) ou "não medir" | `medida` + texto numérico |
| `text` | campo de texto | `registrar` + texto (ex.: hipótese) |
| `intervention` | formulário de intervenção | `registrar` + payload validado |
| `route` | invisível: roteia por condição | — |
| `end` | mensagem + continuar | `continuar` |

### Destinos

- chave de outro nó;
- `@stay` — permanece (reformular / neutro / não sei; exibe a próxima pergunta alternativa e uma dica);
- `@back` — **regra de prioridade**: volta ao nível anterior;
- `@end` — encerra a árvore (a máquina de estados decide a próxima fase).

### Condições (sem código)

```jsonc
{ "var": "mode", "eq": "tera" }
{ "var": "category", "in": ["campo", "espiritual"] }
{ "var": "investigate_prior", "exists": true }
{ "all": [ … ] } · { "any": [ … ] } · { "not": { … } }
```

Usadas em `options[].routes`, em nós `route` e em `alerts`.

### Contexto e templates

`options[].set` grava variáveis no contexto da sessão (`sessions.context`), aceitando `{{label}}`, `{{value}}`, `{{text}}` e outras variáveis. As perguntas usam `{{element}}`, `{{hypothesis_category}}` etc. Variáveis usadas pela árvore seed: `mode`, `gps_domain`, `element`, `element_detail`, `category`, `hypothesis_category`, `origin_role`, `intensity_before/after`, `has_intervention`, `need_more`.

## Regra de prioridade — `@back`

"Desequilíbrio não significa prioridade": antes de aprofundar, o nó `elemento.prioridade` pergunta se é apropriado. **NÃO** → `@back`.

O motor reconstrói, a partir do histórico, uma **pilha de nós-âncora** (`is_anchor = true`, em geral as seleções do GPS):

- responder um âncora que já está na pilha corta a pilha até ele;
- se o nó atual é âncora, volta ao âncora de baixo; senão, ao âncora do topo.

Exemplo testado: `macro.dominio` → `energetico.selecao` → `chakra.qual` (Cardíaco) → *NÃO é prioridade* → volta a `chakra.qual`; "nenhum destes" → `energetico.selecao`; "nenhum destes" → `macro.dominio`. Como é derivado do histórico, funciona também depois de **Desfazer**.

## Árvore seed MIRA (34 nós)

```
inicio.roteador ─(modo T.E.R.A.)→ tera.controle ─┐
       └────────────────────────────────────────▶ macro.inicio ─NÃO→ fim.sem_prioridade
                                                  │SIM (modo Terapêutica → terapeutica.camada)
                                                  ▼
                                          macro.dominio  (GPS)
     ┌───────────────┬──────────────┬──────────┴─────┬──────────────┐
 campos.selecao  energetico.selecao  rel.selecao  areas.selecao  amb.selecao
                   ├ chakra.existe → chakra.qual
                   └ aura.existe
                                   ▼
                       elemento.prioridade ─NÃO→ @back
                                   │SIM (T.E.R.A. → medir.intensidade)
                          aprofundar.roteador
            chakra.dimensao · aura.aspecto · campo.intensidade → campo.relacao
                                   ▼
                        aprofundar.categoria (12 categorias de hipótese)
                                   ▼
                     origem.tipo  CAUSA | CONSEQUÊNCIA | AMBOS | NÃO DEFINIDO
                                   │ (consequência → origem.anterior)
                          hipotese.registrar → (fator anterior? origem.reiniciar)
                                   ▼
                       intervencao.apropriada ─SIM→ intervencao.registrar
                                   ▼
                       outro.fator ─SIM→ macro.dominio  ─NÃO→ @end
```

Árvore `mira-reavaliacao`: prioridade ainda presente? → intensidade atual → precisa de outra intervenção? → a sessão pode ser encerrada?

## Validação estrutural

`validateTree()` verifica chaves duplicadas, destinos inexistentes, SIM/NÃO obrigatórios, seleções com ≥2 opções e nós de roteamento com fallback. Roda no gerador de seed e nos testes; será usada pelo **Editor visual de árvores** (fase 2) antes de publicar uma nova versão.

## Como Edu altera o fluxo sem código

- **Hoje (MVP):** editar `tree_nodes` pelo painel do Supabase (as políticas permitem só admin), ou editar `mira-tree.ts`, rodar `npm run seed:generate` e aplicar `seed.sql` (idempotente: atualiza por `tree_id + key`).
- **Fase 2:** editor visual (React Flow) que grava nós/arestas, valida com `validateTree()` e publica nova `version` da árvore; sessões em andamento continuam na versão em que começaram.
