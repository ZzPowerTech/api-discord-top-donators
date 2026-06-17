import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { config } from '../../config/config';
import { safeCompare } from '../utils/safe-compare';

const SIGNATURE_HEADER = 'x-centralcart-signature';

/**
 * Valida o webhook da Central Cart pelo header `x-centralcart-signature` contra
 * CENTRALCART_WEBHOOK_SECRET. Opt-in: sem segredo configurado a verificacao e
 * pulada (preserva o webhook em funcionamento), apenas logando um aviso — assim
 * a protecao pode ser ativada quando o segredo compartilhado estiver definido.
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const secret = config.centralCart.webhookSecret;

    if (!secret) {
      this.logger.warn(
        'CENTRALCART_WEBHOOK_SECRET nao configurado: webhook sem verificacao de assinatura.',
      );
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header(SIGNATURE_HEADER);

    if (!provided || !safeCompare(provided, secret)) {
      throw new UnauthorizedException('Assinatura do webhook invalida.');
    }

    return true;
  }
}
