import { Type } from 'class-transformer';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Subconjunto relevante de `data` (detalhes da ordem). whitelist remove o resto. */
export class CentralCartOrderDataDto {
  @IsOptional()
  @IsString()
  client_discord?: string | null;

  @IsOptional()
  @IsString()
  client_email?: string;

  @IsOptional()
  @IsString()
  client_identifier?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
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
