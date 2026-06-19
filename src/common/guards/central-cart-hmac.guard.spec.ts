import { createHmac } from 'crypto';
import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CentralCartHmacGuard } from './central-cart-hmac.guard';

const SECRET = 'whsec_test';
const BODY = '{"event":"ORDER_APPROVED"}';

function sign(timestamp: string, body: string): string {
  return createHmac('sha256', SECRET)
    .update(`${timestamp}.${body}`)
    .digest('hex');
}

function context(
  headers: Record<string, string | undefined>,
  rawBody: string,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) => headers[name],
        rawBody: Buffer.from(rawBody),
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('CentralCartHmacGuard', () => {
  const guard = new CentralCartHmacGuard();
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('nega (503) quando o secret não está configurado', () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.CENTRALCART_ORDER_WEBHOOK_SECRET;
    expect(() => guard.canActivate(context({}, BODY))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('aceita assinatura válida dentro da janela de tempo', () => {
    process.env = { ...ORIGINAL_ENV, CENTRALCART_ORDER_WEBHOOK_SECRET: SECRET };
    const ts = String(Math.floor(Date.now() / 1000));
    const ctx = context(
      {
        'x-centralcart-timestamp': ts,
        'x-centralcart-signature': sign(ts, BODY),
      },
      BODY,
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('nega (401) quando a assinatura é inválida', () => {
    process.env = { ...ORIGINAL_ENV, CENTRALCART_ORDER_WEBHOOK_SECRET: SECRET };
    const ts = String(Math.floor(Date.now() / 1000));
    const ctx = context(
      { 'x-centralcart-timestamp': ts, 'x-centralcart-signature': 'deadbeef' },
      BODY,
    );
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('nega (401) quando o timestamp está expirado', () => {
    process.env = { ...ORIGINAL_ENV, CENTRALCART_ORDER_WEBHOOK_SECRET: SECRET };
    const ts = String(Math.floor(Date.now() / 1000) - 1000); // > 300s atrás
    const ctx = context(
      {
        'x-centralcart-timestamp': ts,
        'x-centralcart-signature': sign(ts, BODY),
      },
      BODY,
    );
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
