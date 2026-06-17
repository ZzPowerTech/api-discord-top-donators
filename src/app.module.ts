import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CentralCartApiModule } from './central-cart-api/central-cart-api.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { WebhookModule } from './webhook/webhook.module';
import { HealthModule } from './health/health.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
      validate: validateEnv,
    }),
    CentralCartApiModule,
    SchedulerModule,
    WebhookModule,
    HealthModule,
  ],
})
export class AppModule {}
