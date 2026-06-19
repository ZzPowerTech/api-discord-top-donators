import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './config/config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // ValidationPipe e AllExceptionsFilter sao registrados como APP_PIPE/APP_FILTER
  // no AppModule (valem em runtime e nos testes e2e).
  app.enableShutdownHooks();

  await app.listen(config.app.port);
  Logger.log(`Aplicacao iniciada na porta ${config.app.port}`, 'Bootstrap');
}

void bootstrap();
