import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  const API_KEY = 'test-key';

  beforeAll(() => {
    // Variaveis minimas para o boot (validacao de env) e para a ApiKeyGuard.
    process.env.CENTRAL_CART_API_TOKEN ??= 'test-token';
    process.env.DISCORD_WEBHOOK_URL ??= 'https://discord.test/webhook';
    process.env.SCHEDULER_API_KEY ??= API_KEY;
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health retorna status ok e versao', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res: request.Response) => {
        const body = res.body as { status?: string; version?: string };
        if (body.status !== 'ok') {
          throw new Error(`status inesperado: ${String(body.status)}`);
        }
        if (typeof body.version !== 'string') {
          throw new Error('version ausente');
        }
      });
  });

  it('POST /scheduler/* sem x-api-key retorna 401', () => {
    return request(app.getHttpServer())
      .post('/scheduler/send-top-donators-custom')
      .send({ from: '2025-01-01', to: '2025-01-31' })
      .expect(401);
  });

  it('POST /scheduler/send-top-donators-custom com api key valida rejeita datas invalidas (400)', () => {
    return request(app.getHttpServer())
      .post('/scheduler/send-top-donators-custom')
      .set('x-api-key', API_KEY)
      .send({ from: 'nao-e-data', to: 'tambem-nao' })
      .expect(400);
  });

  it('POST /webhook/centralcart/post-created rejeita payload sem title (400)', () => {
    return request(app.getHttpServer())
      .post('/webhook/centralcart/post-created')
      .send({ content: 'sem titulo' })
      .expect(400);
  });
});
