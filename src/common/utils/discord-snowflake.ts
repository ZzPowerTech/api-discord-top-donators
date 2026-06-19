/**
 * IDs do Discord (snowflakes) sao inteiros de 64 bits serializados como string;
 * na pratica tem de 17 a 20 digitos. Usado para validar IDs vindos de payloads
 * externos antes de enviá-los à API do Discord (evita parameter pollution).
 */
export const DISCORD_SNOWFLAKE_REGEX = /^\d{17,20}$/;

export function isDiscordSnowflake(value: unknown): boolean {
  return typeof value === 'string' && DISCORD_SNOWFLAKE_REGEX.test(value);
}
