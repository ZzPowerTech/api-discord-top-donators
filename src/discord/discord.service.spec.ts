import { of } from 'rxjs';
import type { HttpService } from '@nestjs/axios';
import { DiscordService } from './discord.service';

describe('DiscordService.sendPostUpdate', () => {
  let service: DiscordService;
  let httpPost: jest.Mock;
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    httpPost = jest.fn().mockReturnValue(of({ data: {} }));
    const httpService = { post: httpPost } as unknown as HttpService;
    process.env = {
      ...ORIGINAL_ENV,
      DISCORD_UPDATES_WEBHOOK_URL: 'https://discord.test/webhook',
      CENTRAL_CART_STORE_ID: 'loja.austv.net',
      DISCORD_UPDATES_ROLE_ID: '12345',
    };
    service = new DiscordService(httpService);
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function payloadEnviado(): {
    content?: string;
    embeds: { description: string }[];
  } {
    return httpPost.mock.calls[0][1] as {
      content?: string;
      embeds: { description: string }[];
    };
  }

  it('envia o embed com o link do post e mention do cargo configurado', async () => {
    await service.sendPostUpdate({
      title: 't',
      content: 'c',
      path: '/post/01/03/2025/novidade',
    });

    const body = payloadEnviado();
    expect(body.content).toBe('<@&12345>');
    expect(body.embeds[0].description).toContain(
      'https://loja.austv.net/post/01/03/2025/novidade',
    );
  });

  it('omite o mention quando DISCORD_UPDATES_ROLE_ID nao esta definido', async () => {
    delete process.env.DISCORD_UPDATES_ROLE_ID;
    await service.sendPostUpdate({ title: 't', content: 'c' });
    expect(payloadEnviado().content).toBeUndefined();
  });
});
