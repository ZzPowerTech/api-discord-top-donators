import { Type } from 'class-transformer';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Subconjunto relevante de `data` (detalhes da ordem). whitelist remove o resto. */
export class CentralCartOrderDataDto {
  // O formato (snowflake) e validado no controller, que IGNORA valores invalidos
  // em vez de rejeitar o evento inteiro (resiliencia do webhook). Aqui so limita
  // o tamanho como defesa em profundidade.
  @IsOptional()
  @IsString()
  @MaxLength(32)
  client_discord?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  client_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  client_identifier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  internal_id?: string;

  @IsOptional()
  @IsNumber()
  net_received?: number;
}

/** Envelope padronizado dos webhooks da Central Cart. */
export class CentralCartOrderWebhookDto {
  @IsString()
  id!: string;

  @IsString()
  event!: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CentralCartOrderDataDto)
  data!: CentralCartOrderDataDto;
}
