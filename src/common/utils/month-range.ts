/**
 * Fuso padrao da aplicacao. O cron mensal dispara neste fuso, entao o calculo
 * de "mes anterior" precisa ser feito nele (e nao no fuso do processo/container,
 * que normalmente e UTC e causaria divergencia nas viradas de mes).
 */
export const APP_TIMEZONE = 'America/Sao_Paulo';

interface YearMonth {
  year: number;
  month: number; // 1-12
}

function getYearMonthInTimeZone(reference: Date, timeZone: string): YearMonth {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(reference);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  return { year, month };
}

function previousMonth({ year, month }: YearMonth): YearMonth {
  return month === 1
    ? { year: year - 1, month: 12 }
    : { year, month: month - 1 };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Intervalo [from, to] (YYYY-MM-DD) do mes anterior a `reference`, calculado no
 * fuso informado. Determinístico: depende apenas de `reference` e `timeZone`.
 */
export function getPreviousMonthRange(
  reference: Date,
  timeZone: string = APP_TIMEZONE,
): { from: string; to: string } {
  const { year, month } = previousMonth(
    getYearMonthInTimeZone(reference, timeZone),
  );
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

/**
 * Rotulo do mes anterior em pt-BR, ex.: "Fevereiro de 2025" (primeira letra
 * maiuscula), usado no titulo da imagem mensal.
 */
export function getPreviousMonthLabel(
  reference: Date,
  timeZone: string = APP_TIMEZONE,
): string {
  const { year, month } = previousMonth(
    getYearMonthInTimeZone(reference, timeZone),
  );
  // Dia 15 em UTC evita qualquer ambiguidade de borda de fuso na formatacao.
  const midMonth = new Date(Date.UTC(year, month - 1, 15));
  const label = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(midMonth);

  return label.charAt(0).toUpperCase() + label.slice(1);
}
