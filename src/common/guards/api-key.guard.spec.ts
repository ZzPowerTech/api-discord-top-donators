import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function context(
  headers: Record<string, string | undefined>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ header: (name: string) => headers[name] }),
    }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  const guard = new ApiKeyGuard();
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('nega (503) quando SCHEDULER_API_KEY nao esta configurada', () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.SCHEDULER_API_KEY;
    expect(() => guard.canActivate(context({}))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('nega (401) quando o header esta ausente ou incorreto', () => {
    process.env = { ...ORIGINAL_ENV, SCHEDULER_API_KEY: 'secret' };
    expect(() => guard.canActivate(context({}))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context({ 'x-api-key': 'errada' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('permite quando o header bate com a chave', () => {
    process.env = { ...ORIGINAL_ENV, SCHEDULER_API_KEY: 'secret' };
    expect(guard.canActivate(context({ 'x-api-key': 'secret' }))).toBe(true);
  });
});
