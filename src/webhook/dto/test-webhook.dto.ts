import { IsOptional, IsString } from 'class-validator';

/**
 * Body do POST /webhook/test. Todos os campos sao opcionais: o controller
 * aplica valores padrao para um post de teste.
 */
export class TestWebhookDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  image?: string;

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
