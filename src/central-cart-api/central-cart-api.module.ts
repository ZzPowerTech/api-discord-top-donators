import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CentralCartApiService } from './central-cart-api.service';
import { CentralCartApiController } from './central-cart-api.controller';

@Module({
  imports: [HttpModule],
  controllers: [CentralCartApiController],
  providers: [CentralCartApiService],
  exports: [CentralCartApiService],
})
export class CentralCartApiModule {}
