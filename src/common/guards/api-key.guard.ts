import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { config } from '../../config/config';
import { safeCompare } from '../utils/safe-compare';

const API_KEY_HEADER = 'x-api-key';

/**
 * Protege endpoints de disparo manual exigindo o header `x-api-key` igual a
 * SCHEDULER_API_KEY. Fail-secure: se a chave nao estiver configurada no
 * servidor, o acesso e negado (forca a configuracao em vez de abrir o endpoint).
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = config.app.apiKey;
    if (!expected) {
      throw new ServiceUnavailableException(
        'Endpoint protegido: configure SCHEDULER_API_KEY no servidor.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header(API_KEY_HEADER);

    if (!provided || !safeCompare(provided, expected)) {
      throw new UnauthorizedException('API key invalida ou ausente.');
    }

    return true;
  }
}
