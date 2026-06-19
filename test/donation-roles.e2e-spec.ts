import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CentralCartApiService } from '../src/central-cart-api/central-cart-api.service';
import { DiscordBotService } from '../src/discord/discord-bot.service';

const SECRET = 'whsec_e2e';
const API_KEY = 'apikey_e2e';
const DISCORD_ID = '123456789012345678';

describe('Cargos por meta de doação (e2e)', () => {
  let app: INestApplication;
  const getUserSpent = jest
    .fn()
    .mockResolvedValue({ totalNetReceived: 200, totalGrossReceived: 200 });
  const getMemberRoleIds = jest.fn().mockResolvedValue([]);
  const addRole = jest.fn().mockResolvedValue(undefined);
  const removeRole = jest.fn().mockResolvedValue(undefined);
  const sendDirectMessage = jest.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    process.env.CENTRALCART_ORDER_WEBHOOK_SECRET = SECRET;
    process.env.DISCORD_GUILD_ID = 'guild-e2e';
    process.env.SCHEDULER_API_KEY = API_KEY;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CentralCartApiService)
      .useValue({ getUserSpent })
      .overrideProvider(DiscordBotService)
      .useValue({ getMemberRoleIds, addRole, removeRole, sendDirectMessage })
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /webhook/centralcart/order', () => {
    it('assinatura válida → aplica tier e responde 201', async () => {
      const body = JSON.stringify({
        id: 'evt-e2e',
        event: 'ORDER_APPROVED',
        date: new Date().toISOString(),
        data: {
          client_discord: DISCORD_ID,
          client_email: 'a@b.com',
          status: 'APPROVED',
        },
      });
      const ts = String(Math.floor(Date.now() / 1000));
      const signature = createHmac('sha256', SECRET)
        .update(`${ts}.${body}`)
        .digest('hex');

      await request(app.getHttpServer())
        .post('/webhook/centralcart/order')
        .set('Content-Type', 'application/json')
        .set('x-centralcart-timestamp', ts)
        .set('x-centralcart-signature', signature)
        .send(body)
        .expect(201);

      expect(addRole).toHaveBeenCalledWith(DISCORD_ID, expect.any(String));
    });

    it('assinatura inválida → 401', async () => {
      const body = JSON.stringify({
        id: 'x',
        event: 'ORDER_APPROVED',
        data: {},
      });
      const ts = String(Math.floor(Date.now() / 1000));

      await request(app.getHttpServer())
        .post('/webhook/centralcart/order')
        .set('Content-Type', 'application/json')
        .set('x-centralcart-timestamp', ts)
        .set('x-centralcart-signature', 'invalida')
        .send(body)
        .expect(401);
    });
  });

  describe('POST /donations/sync', () => {
    it('sem x-api-key → 401', async () => {
      await request(app.getHttpServer())
        .post('/donations/sync')
        .send({ discordId: DISCORD_ID, email: 'a@b.com' })
        .expect(401);
    });

    it('discordId inválido (com api key) → 400', async () => {
      await request(app.getHttpServer())
        .post('/donations/sync')
        .set('x-api-key', API_KEY)
        .send({ discordId: 'nao-snowflake', email: 'a@b.com' })
        .expect(400);
    });

    it('api key válida + body válido → 201 e consulta o total', async () => {
      const res = await request(app.getHttpServer())
        .post('/donations/sync')
        .set('x-api-key', API_KEY)
        .send({ discordId: DISCORD_ID, email: 'sync@b.com' })
        .expect(201);

      expect(res.body).toMatchObject({ success: true });
      expect(getUserSpent).toHaveBeenCalledWith({
        email: 'sync@b.com',
        identifier: undefined,
      });
    });
  });
});
