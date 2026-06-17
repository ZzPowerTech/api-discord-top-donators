import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * Payload do webhook POST /webhook/centralcart/post-created.
 *
 * Modelado a partir dos exemplos reais (test/test-posts.http): o post chega no
 * formato direto, com `title` obrigatorio. Os campos alternativos (description,
 * thumbnail) sao aceitos porque o envio ao Discord faz fallback entre eles.
 */
export class CentralCartPostWebhookDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  created_at?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  path?: string;
}
