import { describe, expect, it } from 'vitest';
import { applyAnswer, presentNode, validateTree, TreeEngineError } from './tree-engine';
import { miraMainTree, miraReevaluationTree } from './seed/mira-tree';
import type { SessionContext, StepRecord } from './types';
import { transition, TransitionError } from './session-machine';
import { computeNeutrality } from './preparation';
import { evaluateTriage, suggestTriageFlags } from './triage';
import { auditQuestionHeuristic } from './question-auditor';
import { hasExcessivePrecision } from './precision';
import { softenForClient } from './language';
import { auditSession } from './session-audit';
import { suggestObjectiveFallback } from './objective';

/** Simula uma sessão: aplica respostas em sequência e devolve histórico. */
function walk(mode: string, answers: [string, string?][]) {
  let ctx: SessionContext = { mode };
  const history: StepRecord[] = [];
  const first = applyAnswerStart(ctx);
  let key: string | null = first;
  const visited: string[] = [];
  for (const [value, text] of answers) {
    if (!key) throw new Error('árvore terminou antes');
    visited.push(key);
    const r = applyAnswer(miraMainTree, key, { value, text }, ctx, history);
    history.push({ seq: history.length + 1, nodeKey: key, stage: 'macro', questionText: key, answerValue: value, answerLabel: r.answerLabel, contextAfter: r.contextAfter, undone: false });
    ctx = r.contextAfter;
    key = r.nextNodeKey;
  }
  return { key, ctx, visited, history };
}

/** Resolve o nó de entrada (que pode ser um nó de roteamento). */
function applyAnswerStart(ctx: SessionContext): string {
  const entry = miraMainTree.nodes.find((n) => n.key === miraMainTree.entryNodeKey)!;
  if (entry.kind !== 'route') return entry.key;
  for (const r of entry.routes) {
    if (!r.when || ('var' in r.when && ctx[r.when.var] === r.when.eq)) return r.next;
  }
  throw new Error('sem rota');
}

describe('árvores seed', () => {
  it('são estruturalmente válidas', () => {
    expect(validateTree(miraMainTree)).toEqual([]);
    expect(validateTree(miraReevaluationTree)).toEqual([]);
  });
});

describe('motor de árvores', () => {
  it('percorre o fluxo completo: macro → chakra → prioridade → hipótese → intervenção → fim', () => {
    const r = walk('mira', [
      ['sim'], // macro.inicio
      ['sistema_energetico'],
      ['chakras'],
      ['sim'], // chakra.existe
      ['cardiaco'],
      ['sim'], // elemento.prioridade
      ['deficiencia'],
      ['emocoes'],
      ['causa'],
      ['registrar', 'Hipótese de possível origem ligada a emoções contidas.'],
      ['sim'], // intervenção apropriada
      ['registrar'],
      ['nao'], // outro fator
    ]);
    expect(r.key).toBeNull();
    expect(r.ctx.element).toBe('Chakra Cardíaco');
    expect(r.ctx.origin_role).toBe('causa');
    expect(r.ctx.has_intervention).toBe('sim');
    expect(r.visited).toContain('chakra.dimensao');
  });

  it('aplica a regra de prioridade: NÃO retorna ao último nó-âncora', () => {
    const r = walk('mira', [['sim'], ['sistema_energetico'], ['chakras'], ['sim'], ['cardiaco'], ['nao']]);
    expect(r.key).toBe('chakra.qual');
    const r2 = walk('mira', [['sim'], ['sistema_energetico'], ['chakras'], ['sim'], ['cardiaco'], ['nao'], ['voltar']]);
    expect(r2.key).toBe('energetico.selecao');
    const r3 = walk('mira', [['sim'], ['sistema_energetico'], ['chakras'], ['sim'], ['cardiaco'], ['nao'], ['voltar'], ['voltar']]);
    expect(r3.key).toBe('macro.dominio');
  });

  it('neutro / não sei / reformular permanecem no nó, com pergunta alternativa', () => {
    const ctx = { mode: 'mira' };
    const r = applyAnswer(miraMainTree, 'macro.inicio', { value: 'reformular' }, ctx, []);
    expect(r.stayed).toBe(true);
    expect(r.nextNodeKey).toBe('macro.inicio');
    const history: StepRecord[] = [{ seq: 1, nodeKey: 'macro.inicio', stage: 'macro', questionText: '', answerValue: 'reformular', answerLabel: '', contextAfter: ctx, undone: false }];
    const p = presentNode(miraMainTree, 'macro.inicio', ctx, history);
    expect(p.question).toBe(miraMainTree.nodes.find((n) => n.key === 'macro.inicio')!.alternatives[0]);
    expect(applyAnswer(miraMainTree, 'macro.inicio', { value: 'neutro' }, ctx, []).hint).toMatch(/controle/);
  });

  it('modo T.E.R.A. inicia com pergunta de controle e mede antes de aprofundar', () => {
    const r = walk('tera', [['sim'], ['sim'], ['campo_pessoal'], ['emocional'], ['sim']]);
    expect(r.visited[0]).toBe('tera.controle');
    expect(r.key).toBe('medir.intensidade');
    const r2 = walk('tera', [['sim'], ['sim'], ['campo_pessoal'], ['emocional'], ['sim'], ['medida', '6']]);
    expect(r2.ctx.intensity_before).toBe('6');
    expect(r2.key).toBe('campo.intensidade');
  });

  it('modo Radiestesia Terapêutica oferece varredura por camadas', () => {
    expect(walk('terapeutica', [['sim']]).key).toBe('terapeutica.camada');
  });

  it('renderiza variáveis no texto da pergunta', () => {
    const p = presentNode(miraMainTree, 'elemento.prioridade', { element: 'Aura', category: 'aura' }, []);
    expect(p.question).toContain('Aura');
  });

  it('exibe alerta espiritual quando a categoria é espiritual', () => {
    const p = presentNode(miraMainTree, 'elemento.prioridade', { element: 'Campo espiritual', category: 'espiritual' }, []);
    expect(p.alerts.some((a) => a.message.includes('sistemas de crença'))).toBe(true);
  });

  it('valida medidas e textos obrigatórios', () => {
    expect(() => applyAnswer(miraMainTree, 'medir.intensidade', { value: 'medida', text: '42' }, {}, [])).toThrow(TreeEngineError);
    expect(() => applyAnswer(miraMainTree, 'hipotese.registrar', { value: 'registrar', text: '  ' }, {}, [])).toThrow(TreeEngineError);
    expect(() => applyAnswer(miraMainTree, 'macro.inicio', { value: 'talvez' }, {}, [])).toThrow(TreeEngineError);
  });

  it('reavaliação sinaliza necessidade de nova intervenção', () => {
    const r = applyAnswer(miraReevaluationTree, 'reav.outra', { value: 'sim' }, {}, []);
    expect(r.finished).toBe(true);
    expect(r.contextAfter.need_more).toBe('sim');
  });
});

describe('máquina de estados', () => {
  it('segue o fluxo principal', () => {
    let p = transition('objetivo', { type: 'APROVAR_OBJETIVO', objective: 'Investigar…' });
    p = transition(p, { type: 'CONCLUIR_PREPARACAO' });
    p = transition(p, { type: 'CONCLUIR_TRIAGEM', level: 'atencao', acknowledged: true });
    expect(p).toBe('investigacao');
    p = transition(p, { type: 'CONCLUIR_INVESTIGACAO', hasIntervention: true });
    expect(p).toBe('reavaliacao');
    p = transition(p, { type: 'CONCLUIR_REAVALIACAO', needMore: false });
    p = transition(p, { type: 'ENCERRAR' });
    expect(p).toBe('encerrada');
  });
  it('bloqueia investigação em triagem crítica', () => {
    expect(transition('triagem', { type: 'CONCLUIR_TRIAGEM', level: 'critico', acknowledged: true })).toBe('registro');
  });
  it('exige confirmação do aviso de triagem', () => {
    expect(() => transition('triagem', { type: 'CONCLUIR_TRIAGEM', level: 'atencao', acknowledged: false })).toThrow(TransitionError);
  });
  it('rejeita eventos fora de ordem', () => {
    expect(() => transition('objetivo', { type: 'ENCERRAR' })).toThrow(TransitionError);
    expect(() => transition('encerrada', { type: 'CANCELAR' })).toThrow(TransitionError);
  });
});

describe('preparação e triagem', () => {
  it('calcula o índice de neutralidade', () => {
    expect(computeNeutrality({ neutral: true, expecting: false, tired: false, priorKnowledge: false }).index).toBe(100);
    const r = computeNeutrality({ neutral: true, expecting: true, tired: false, priorKnowledge: false });
    expect(r.index).toBe(75);
    expect(r.messages.join(' ')).toMatch(/expectativa prévia/);
  });
  it('classifica triagem', () => {
    expect(evaluateTriage([]).level).toBe('nenhum');
    expect(evaluateTriage(['medicamento']).level).toBe('atencao');
    expect(evaluateTriage(['ideacao_suicida']).level).toBe('critico');
    expect(suggestTriageFlags('Ela toma remédio para ansiedade e fala em suicídio')).toEqual(expect.arrayContaining(['medicamento', 'ideacao_suicida']));
  });
});

describe('auditor de perguntas (heurístico)', () => {
  it('detecta o exemplo do briefing', () => {
    const r = auditQuestionHeuristic('A inveja da irmã está bloqueando a prosperidade dela?');
    expect(r.labels).toEqual(expect.arrayContaining(['TENDENCIOSA', 'ACUSA TERCEIRO', 'PRESSUPÕE RESPOSTA']));
    expect(r.suggestion).toBe('Existe algum fator relacionado às relações interpessoais que seja prioritário investigar em relação à experiência financeira atual da consulente?');
  });
  it('aprova pergunta boa', () => {
    expect(auditQuestionHeuristic('Existe algum fator prioritário relacionado ao objetivo desta sessão?').labels).toEqual(['BOA']);
  });
  it('detecta pergunta dupla, fora do escopo e eticamente problemática', () => {
    expect(auditQuestionHeuristic('O chakra cardíaco está em desequilíbrio e o plexo solar está em excesso?').labels).toContain('DUPLA');
    expect(auditQuestionHeuristic('Ela deve parar de tomar o remédio da pressão?').labels).toContain('FORA DO ESCOPO');
    expect(auditQuestionHeuristic('O marido dela está traindo ela com outra pessoa?').labels).toContain('ETICAMENTE PROBLEMÁTICA');
  });
});

describe('outros', () => {
  it('alerta falsa precisão', () => {
    expect(hasExcessivePrecision('17 horas, 23 minutos e 14 segundos')).toBe(true);
    expect(hasExcessivePrecision('17:23:14')).toBe(true);
    expect(hasExcessivePrecision('20 minutos por 7 dias')).toBe(false);
  });
  it('suaviza linguagem para o cliente', () => {
    expect(softenForClient('Seu chakra cardíaco estava bloqueado em 73%')).toBe('Seu chakra cardíaco estava em atenção');
  });
  it('sugere objetivo sem IA', () => {
    expect(suggestObjectiveFallback('Ela quer trabalhar a questão financeira.')).toContain('experiência financeira');
  });
  it('auditoria detecta contradições e excesso de mudanças', () => {
    const base = { stage: 'macro' as const, answerLabel: '', contextAfter: {}, };
    const steps: StepRecord[] = [
      { ...base, seq: 1, nodeKey: 'a', questionText: 'Q1', answerValue: 'sim', undone: false },
      { ...base, seq: 2, nodeKey: 'a', questionText: 'Q1', answerValue: 'nao', undone: false },
      { ...base, seq: 3, nodeKey: 'b', questionText: 'Q2', answerValue: 'sim', undone: true },
      { ...base, seq: 4, nodeKey: 'b', questionText: 'Q2', answerValue: 'sim', undone: true },
      { ...base, seq: 5, nodeKey: 'b', questionText: 'Q2', answerValue: 'sim', undone: true },
    ];
    const r = auditSession({ steps, hypotheses: 0, interventions: 0, precisionWarnings: 0, flaggedQuestions: [], startedAt: new Date().toISOString(), neutralityIndex: 50, objective: 'x' });
    expect(r.contradictions.length).toBe(1);
    expect(r.attentionPoints.join(' ')).toMatch(/desfeitas/);
  });
});
