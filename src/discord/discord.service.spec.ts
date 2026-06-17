import axios from 'axios';
import { DiscordService } from './discord.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * Caracteriza a construcao do link do post (hoje embutida em sendPostUpdate).
 * No PR de refactor o link sera extraido para uma funcao pura; estes testes
 * garantem que o link publicado nao muda sem intencao.
 */
describe('DiscordService.sendPostUpdate (caracterizacao do link)', () => {
  let service: DiscordService;
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      DISCORD_UPDATES_WEBHOOK_URL: 'https://discord.test/webhook',
      CENTRAL_CART_STORE_ID: 'loja.austv.net',
    };
    (mockedAxios.post as jest.Mock).mockResolvedValue({ data: {} });
    service = new DiscordService();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function linkEnviado(): string {
    const body = (mockedAxios.post as jest.Mock).mock.calls[0][1] as {
      embeds: { description: string }[];
    };
    const match = body.embeds[0].description.match(/\((https?:\/\/[^)]+)\)/);
    return match ? match[1] : '';
  }

  it('usa post.path quando presente', async () => {
    await service.sendPostUpdate({
      title: 't',
      content: 'c',
      path: '/post/01/03/2025/novidade',
    });
    expect(linkEnviado()).toBe(
      'https://loja.austv.net/post/01/03/2025/novidade',
    );
  });

  it('deriva de slug + created_at (UTC) quando nao ha path', async () => {
    await service.sendPostUpdate({
      title: 't',
      content: 'c',
      slug: 'novidade',
      created_at: '2025-03-01T10:00:00Z',
    });
    expect(linkEnviado()).toBe(
      'https://loja.austv.net/post/01/03/2025/novidade',
    );
  });

  it('cai na URL base da loja quando nao ha path nem slug', async () => {
    await service.sendPostUpdate({ title: 't', content: 'c' });
    expect(linkEnviado()).toBe('https://loja.austv.net');
  });
});
