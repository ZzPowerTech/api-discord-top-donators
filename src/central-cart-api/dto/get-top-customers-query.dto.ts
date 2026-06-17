import { IsDateString } from 'class-validator';

/**
 * Query do GET /central-cart-api/top-customers. Garante que from/to cheguem
 * como datas validas (ISO 8601 / YYYY-MM-DD) antes de irem para a API externa.
 */
export class GetTopCustomersQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
