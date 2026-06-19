import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { Request } from 'express';
import { config } from '../../config/config';
import { safeCompare } from '../utils/safe-compare';

const SIGNATURE_HEADER = 'x-centralcart-signature';
const TIMESTAMP_HEADER = 'x-centralcart-timestamp';
const MAX_SKEW_SECONDS = 300;

/**
 * Valida o webhook de ordem da Central Cart por HMAC-SHA256 sobre
 * `${timestamp}.${rawBody}`, com o secret CENTRALCART_ORDER_WEBHOOK_SECRET.
 * Fail-secure: sem secret, o acesso é negado (concede cargos — não pode ficar
 * aberto). Usa o raw body exato (NestFactory com { rawBody: true }) para que a
 * assinatura case byte a byte com o que a Central Cart assinou.
 */
@Injectable()
export class CentralCartHmacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = config.centralCart.orderWebhookSecret;
    if (!secret) {
      throw new ServiceUnavailableException(
        'Webhook protegido: configure CENTRALCART_ORDER_WEBHOOK_SECRET no servidor.',
      );
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { rawBody?: Buffer }>();
    const signature = request.header(SIGNATURE_HEADER);
    const timestamp = request.header(TIMESTAMP_HEADER);

    if (!signature || !timestamp) {
      throw new UnauthorizedException('Assinatura ou timestamp ausente.');
    }

    let ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
      throw new UnauthorizedException('Timestamp inválido.');
    }
    // Aceita timestamp em segundos ou milissegundos.
    if (ts > 1e12) {
      ts = ts / 1000;
    }
    if (Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) {
      throw new UnauthorizedException('Timestamp expirado.');
    }

    const rawBody = request.rawBody?.toString('utf8') ?? '';
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    if (!safeCompare(signature, expected)) {
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    return true;
  }
}
