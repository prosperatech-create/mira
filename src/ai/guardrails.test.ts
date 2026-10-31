import { describe, expect, it } from 'vitest';
import { checkInput, checkOutput } from './guardrails';

describe('guardrails', () => {
  it('bloqueia diagnóstico e orientação de medicamento', () => {
    expect(checkOutput('Pelo pêndulo, ela tem depressão.').blocked).toBe(true);
    expect(checkOutput('Ela deve parar de tomar o remédio.').blocked).toBe(true);
    expect(checkOutput('A consulente vai adoecer em breve.').blocked).toBe(true);
  });
  it('não bloqueia orientação segura sobre medicamentos', () => {
    expect(checkOutput('Nunca pare de tomar o remédio sem orientação médica.').blocked).toBe(false);
  });
  it('adiciona aviso para afirmações espirituais/terceiros', () => {
    const r = checkOutput('Existe uma obsessão sobre ela.');
    expect(r.blocked).toBe(false);
    expect(r.flags).toContain('saida:sobrenatural_fato');
    expect(r.text).toMatch(/sistemas de crença/);
  });
  it('detecta crise na entrada', () => {
    expect(checkInput('Ela disse que quer morrer').crisis).toBe(true);
    expect(checkInput('Questão financeira').crisis).toBe(false);
  });
});
