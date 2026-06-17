/**
 * Extrai uma mensagem legível de um valor capturado em `catch`.
 *
 * Sob `strict`/`useUnknownInCatchVariables`, a variável de `catch` é `unknown`.
 * Este helper centraliza o narrowing seguro usado em todo o projeto, evitando
 * acessar `error.message` diretamente (que falha quando o lançado não é um Error).
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
