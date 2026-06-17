import { parseBRL } from './parse-brl';

describe('parseBRL', () => {
  it.each([
    ['R$ 1.139,99', 1139.99],
    ['R$ 0,00', 0],
    ['R$ 1.000', 1000],
    ['R$ 1.234.567,89', 1234567.89],
    ['R$ 50,00', 50],
  ])('converte %s em %p', (input, expected) => {
    expect(parseBRL(input)).toBe(expected);
  });

  it('retorna 0 para null/undefined sem lançar', () => {
    expect(parseBRL(null)).toBe(0);
    expect(parseBRL(undefined)).toBe(0);
  });

  it('retorna 0 para string vazia ou nao numerica', () => {
    expect(parseBRL('')).toBe(0);
    expect(parseBRL('abc')).toBe(0);
  });
});
