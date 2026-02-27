import { Controller, Get, Query } from '@nestjs/common';
import { CentralCartApiService } from './central-cart-api.service';
import { TopCustomerDto } from './dto/top-customer.dto';

@Controller('central-cart-api')
export class CentralCartApiController {
  constructor(private readonly centralCartApiService: CentralCartApiService) {}

  @Get('top-customers')
  async getTopCustomers(
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<TopCustomerDto[]> {
    return this.centralCartApiService.getTopCustomers(from, to);
  }

  @Get('top-customers/previous-month')
  async getTopCustomersFromPreviousMonth(): Promise<TopCustomerDto[]> {
    return this.centralCartApiService.getTopCustomersFromPreviousMonth();
  }
}
