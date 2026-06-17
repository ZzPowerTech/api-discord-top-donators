import { getPreviousMonthLabel, getPreviousMonthRange } from './month-range';

describe('getPreviousMonthRange (America/Sao_Paulo)', () => {
  it('retorna o mes anterior no meio do mes', () => {
    expect(getPreviousMonthRange(new Date('2025-03-15T12:00:00Z'))).toEqual({
      from: '2025-02-01',
      to: '2025-02-28',
    });
  });

  it('lida com a virada de ano (janeiro -> dezembro)', () => {
    expect(getPreviousMonthRange(new Date('2025-01-10T12:00:00Z'))).toEqual({
      from: '2024-12-01',
      to: '2024-12-31',
    });
  });

  it('calcula o ultimo dia em ano bissexto (marco -> fevereiro de 2024)', () => {
    expect(getPreviousMonthRange(new Date('2024-03-10T12:00:00Z'))).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    });
  });

  it('respeita o fuso na virada de mes (1 de marco 00:00 em SP = 03:00 UTC)', () => {
    // 2025-03-01T02:00:00Z ainda e 28/02 23:00 em America/Sao_Paulo (UTC-3),
    // entao o "mes anterior" deve ser janeiro, nao fevereiro.
    expect(getPreviousMonthRange(new Date('2025-03-01T02:00:00Z'))).toEqual({
      from: '2025-01-01',
      to: '2025-01-31',
    });
  });
});

describe('getPreviousMonthLabel', () => {
  it('rotula o mes anterior em pt-BR com inicial maiuscula', () => {
    expect(getPreviousMonthLabel(new Date('2025-03-15T12:00:00Z'))).toBe(
      'Fevereiro de 2025',
    );
  });

  it('lida com a virada de ano', () => {
    expect(getPreviousMonthLabel(new Date('2025-01-10T12:00:00Z'))).toBe(
      'Dezembro de 2024',
    );
  });
});
