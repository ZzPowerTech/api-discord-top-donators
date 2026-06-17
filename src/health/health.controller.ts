import { Controller, Get } from '@nestjs/common';
import { config } from '../config/config';

interface HealthStatus {
  status: 'ok';
  version: string;
  timestamp: string;
}

/**
 * Endpoint leve de liveness, consumido pelo HEALTHCHECK do container e pela
 * verificacao pos-deploy do pipeline. Expoe a versao em execucao (APP_VERSION).
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return {
      status: 'ok',
      version: config.app.version,
      timestamp: new Date().toISOString(),
    };
  }
}
