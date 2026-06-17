import axios from 'axios';
import { MinecraftSkinService } from './minecraft-skin.service';

jest.mock('axios');
const mockedGet = axios.get as jest.Mock;

/**
 * Caracteriza a cadeia de fallback de skin: Mojang (UUID) -> Crafatar -> Visage
 * -> Steve (default) -> buffer vazio. O ultimo caso documenta o comportamento
 * atual (buffer vazio) que sera substituido por um asset Steve local no PR6.
 */
describe('MinecraftSkinService.getPlayerSkin (caracterizacao do fallback)', () => {
  let service: MinecraftSkinService;
  const crafatarBuf = Buffer.from('crafatar-skin');
  const visageBuf = Buffer.from('visage-skin');

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MinecraftSkinService();
  });

  it('retorna a skin do Crafatar no caminho feliz', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url.includes('api.mojang.com')) {
        return Promise.resolve({ data: { id: 'uuid-123' } });
      }
      if (url.includes('crafatar.com')) {
        return Promise.resolve({ data: crafatarBuf });
      }
      return Promise.reject(new Error('inesperado'));
    });

    const result = await service.getPlayerSkin('Player');
    expect(Buffer.from(result)).toEqual(crafatarBuf);
  });

  it('cai para o Visage quando o Crafatar falha', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url.includes('api.mojang.com')) {
        return Promise.resolve({ data: { id: 'uuid-123' } });
      }
      if (url.includes('crafatar.com')) {
        return Promise.reject(new Error('crafatar 500'));
      }
      if (url.includes('visage')) {
        return Promise.resolve({ data: visageBuf });
      }
      return Promise.reject(new Error('inesperado'));
    });

    const result = await service.getPlayerSkin('Player');
    expect(Buffer.from(result)).toEqual(visageBuf);
  });

  it('usa Steve (default) quando Crafatar e Visage falham para o jogador', async () => {
    mockedGet.mockImplementation((url: string) => {
      if (url.includes('api.mojang.com')) {
        return Promise.resolve({ data: { id: 'player-uuid' } });
      }
      // Crafatar/Visage falham para o uuid do jogador, mas o Steve resolve no Crafatar
      if (url.includes('crafatar.com')) {
        return url.includes('player-uuid')
          ? Promise.reject(new Error('crafatar player fail'))
          : Promise.resolve({ data: crafatarBuf });
      }
      if (url.includes('visage')) {
        return Promise.reject(new Error('visage fail'));
      }
      return Promise.reject(new Error('inesperado'));
    });

    const result = await service.getPlayerSkin('Player');
    expect(Buffer.from(result)).toEqual(crafatarBuf);
  });

  it('retorna Buffer vazio quando TODAS as fontes falham (a corrigir no PR6)', async () => {
    mockedGet.mockRejectedValue(new Error('tudo offline'));
    const result = await service.getPlayerSkin('Player');
    expect(result.length).toBe(0);
  });
});
