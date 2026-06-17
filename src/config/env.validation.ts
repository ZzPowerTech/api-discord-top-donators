import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

/**
 * Declara as variaveis de ambiente conhecidas. As obrigatorias garantem que a
 * aplicacao falhe no boot (fail-fast) quando faltarem, em vez de quebrar em
 * runtime dentro de um @Cron (que engole excecoes).
 */
class EnvironmentVariables {
  @IsNotEmpty()
  @IsString()
  CENTRAL_CART_API_TOKEN!: string;

  @IsNotEmpty()
  @IsString()
  DISCORD_WEBHOOK_URL!: string;

  @IsOptional()
  @IsString()
  CENTRAL_CART_API_URL?: string;

  @IsOptional()
  @IsString()
  CENTRAL_CART_STORE_ID?: string;

  @IsOptional()
  @IsString()
  DISCORD_UPDATES_WEBHOOK_URL?: string;

  @IsOptional()
  @IsString()
  DISCORD_UPDATES_ROLE_ID?: string;

  @IsOptional()
  @IsString()
  DISCORD_CHANNEL_ID?: string;

  @IsOptional()
  @IsString()
  DISCORD_BOT_TOKEN?: string;

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsOptional()
  @IsString()
  APP_VERSION?: string;
}

/**
 * Usada como `validate` do ConfigModule.forRoot. Lanca um erro descritivo (que
 * impede o boot) quando alguma variavel obrigatoria esta ausente ou invalida.
 */
export function validateEnv(
  rawConfig: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, rawConfig, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Configuracao de ambiente invalida: ${details}`);
  }

  return validated;
}
