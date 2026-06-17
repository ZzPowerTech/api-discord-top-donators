import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { WebhookSignatureGuard } from './webhook-signature.guard';

function context(
  headers: Record<string, string | undefined>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ header: (name: string) => headers[name] }),
    }),
  } as unknown as ExecutionContext;
}

describe('WebhookSignatureGuard', () => {
  const guard = new WebhookSignatureGuard();
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('permite (opt-in) quando CENTRALCART_WEBHOOK_SECRET nao esta configurado', () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.CENTRALCART_WEBHOOK_SECRET;
    expect(guard.canActivate(context({}))).toBe(true);
  });

  it('exige assinatura correta quando o secret esta configurado', () => {
    process.env = { ...ORIGINAL_ENV, CENTRALCART_WEBHOOK_SECRET: 'sig' };
    expect(() => guard.canActivate(context({}))).toThrow(UnauthorizedException);
    expect(
      guard.canActivate(context({ 'x-centralcart-signature': 'sig' })),
    ).toBe(true);
  });
});
