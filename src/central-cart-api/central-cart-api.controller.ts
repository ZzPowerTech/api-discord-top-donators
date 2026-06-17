import { Controller, Get, Query } from '@nestjs/common';
import { CentralCartApiService } from './central-cart-api.service';
import { TopCustomerDto } from './dto/top-customer.dto';
import { GetTopCustomersQueryDto } from './dto/get-top-customers-query.dto';

@Controller('central-cart-api')
export class CentralCartApiController {
  constructor(private readonly centralCartApiService: CentralCartApiService) {}

  @Get('top-customers')
  async getTopCustomers(
    @Query() query: GetTopCustomersQueryDto,
  ): Promise<TopCustomerDto[]> {
    return this.centralCartApiService.getTopCustomers(query.from, query.to);
  }

  @Get('top-customers/previous-month')
  async getTopCustomersFromPreviousMonth(): Promise<TopCustomerDto[]> {
    return this.centralCartApiService.getTopCustomersFromPreviousMonth();
  }
}
