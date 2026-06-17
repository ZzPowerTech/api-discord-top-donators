import type { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import type { DiscordService } from '../discord/discord.service';
import type { PostDto } from '../central-cart-api/dto/post.dto';
import { PostsMonitorService } from './posts-monitor.service';

function makePost(id: number, overrides: Partial<PostDto> = {}): PostDto {
  return {
    id,
    title: `Post ${id}`,
    content: 'conteudo',
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2025-03-01T00:00:00Z',
    ...overrides,
  };
}

describe('PostsMonitorService (caracterizacao)', () => {
  let service: PostsMonitorService;
  let getPosts: jest.Mock;
  let sendPostUpdate: jest.Mock;

  beforeEach(() => {
    getPosts = jest.fn();
    sendPostUpdate = jest.fn().mockResolvedValue(undefined);
    const centralCart = { getPosts } as unknown as CentralCartApiService;
    const discord = { sendPostUpdate } as unknown as DiscordService;
    service = new PostsMonitorService(centralCart, discord);
  });

  it('onModuleInit inicializa o baseline com o maior id (nenhum envio depois)', async () => {
    getPosts.mockResolvedValue([makePost(3), makePost(7), makePost(5)]);
    await service.onModuleInit();

    getPosts.mockResolvedValue([makePost(7), makePost(5), makePost(3)]);
    await service.checkNewPosts();

    expect(sendPostUpdate).not.toHaveBeenCalled();
  });

  it('checkNewPosts envia apenas posts novos, do mais antigo ao mais novo', async () => {
    getPosts.mockResolvedValue([makePost(5)]);
    await service.onModuleInit(); // baseline = 5

    getPosts.mockResolvedValue([makePost(7), makePost(6), makePost(5)]);
    await service.checkNewPosts();

    expect(sendPostUpdate).toHaveBeenCalledTimes(2);
    const idsEnviados = sendPostUpdate.mock.calls.map(
      (call) => (call[0] as PostDto).id,
    );
    expect(idsEnviados).toEqual([6, 7]);
  });

  it('nao reenvia posts ja vistos', async () => {
    getPosts.mockResolvedValue([makePost(10)]);
    await service.onModuleInit();

    getPosts.mockResolvedValue([makePost(11), makePost(10)]);
    await service.checkNewPosts();
    sendPostUpdate.mockClear();

    getPosts.mockResolvedValue([makePost(11), makePost(10)]);
    await service.checkNewPosts();
    expect(sendPostUpdate).not.toHaveBeenCalled();
  });

  it('sem onModuleInit, o primeiro checkNewPosts apenas estabelece baseline', async () => {
    getPosts.mockResolvedValue([makePost(2), makePost(1)]);
    await service.checkNewPosts();
    expect(sendPostUpdate).not.toHaveBeenCalled();
  });
});
