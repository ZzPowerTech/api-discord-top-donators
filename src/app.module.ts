import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CentralCartApiModule } from './central-cart-api/central-cart-api.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { WebhookModule } from './webhook/webhook.module';
import { DonationRolesModule } from './donation-roles/donation-roles.module';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
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
    DonationRolesModule,
    HealthModule,
  ],
  providers: [
    // Registrados como providers globais para valerem tambem nos testes e2e
    // (createNestApplication nao executa o main.ts).
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
