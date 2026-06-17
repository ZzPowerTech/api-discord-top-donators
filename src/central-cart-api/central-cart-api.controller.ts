import { Controller, Get, Query } from '@nestjs/common';
import { CentralCartApiService } from './central-cart-api.service';
import { TopCustomerView } from './dto/top-customer.dto';
import { GetTopCustomersQueryDto } from './dto/get-top-customers-query.dto';

@Controller('central-cart-api')
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
