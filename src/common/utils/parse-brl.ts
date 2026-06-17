/**
 * Converte um valor monetario em formato BRL (ex.: "R$ 1.139,99") para numero
 * (1139.99). Tolerante a entradas ausentes ou malformadas: retorna 0 em vez de
 * lançar TypeError (value nulo) ou propagar NaN silenciosamente.
 */
export function parseBRL(value: string | null | undefined): number {
  if (value == null) {
    return 0;
  }

  const normalized = value
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}
