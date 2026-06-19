import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CentralCartApiService } from './central-cart-api.service';
import { TopCustomerView } from './dto/top-customer.dto';
import { GetTopCustomersQueryDto } from './dto/get-top-customers-query.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

// Protege as rotas de top-customers (expoem recebimentos por cliente) com a
// mesma API key dos demais endpoints sensiveis. Fail-secure (ver ApiKeyGuard).
@Controller('central-cart-api')
@UseGuards(ApiKeyGuard)
export class CentralCartApiController {
  constructor(private readonly centralCartApiService: CentralCartApiService) {}

  @Get('top-customers')
  async getTopCustomers(
    @Query() query: GetTopCustomersQueryDto,
  ): Promise<TopCustomerView[]> {
    return this.centralCartApiService.getTopCustomers(query.from, query.to);
  }

  @Get('top-customers/previous-month')
  async getTopCustomersFromPreviousMonth(): Promise<TopCustomerView[]> {
    return this.centralCartApiService.getTopCustomersFromPreviousMonth();
  }
}
