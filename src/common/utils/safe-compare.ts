import { timingSafeEqual } from 'crypto';

/**
 * Compara duas strings em tempo constante, evitando timing attacks ao validar
 * segredos (API keys, assinaturas de webhook).
 */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}
