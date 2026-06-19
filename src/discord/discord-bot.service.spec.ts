import { Routes } from 'discord-api-types/v10';
import { DiscordBotService } from './discord-bot.service';
import type { REST } from '@discordjs/rest';

describe('DiscordBotService', () => {
  let service: DiscordBotService;
  let rest: {
    get: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
    post: jest.Mock;
  };
  const ORIGINAL_ENV = process.env;
  const GUILD = 'guild-1';
  const USER = 'user-1';
  const ROLE = 'role-1';

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, DISCORD_GUILD_ID: GUILD };
    rest = {
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn(),
    };
    service = new DiscordBotService(rest as unknown as REST);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('getMemberRoleIds', () => {
    it('retorna os roles do membro', async () => {
      rest.get.mockResolvedValue({ roles: ['a', 'b'] });
      await expect(service.getMemberRoleIds(USER)).resolves.toEqual(['a', 'b']);
      expect(rest.get).toHaveBeenCalledWith(Routes.guildMember(GUILD, USER));
    });

    it('retorna null quando o membro não está no servidor (404)', async () => {
      rest.get.mockRejectedValue({ status: 404 });
      await expect(service.getMemberRoleIds(USER)).resolves.toBeNull();
    });

    it('relança erros que não são 404', async () => {
      rest.get.mockRejectedValue({ status: 500 });
      await expect(service.getMemberRoleIds(USER)).rejects.toEqual({
        status: 500,
      });
    });
  });

  it('addRole faz PUT na rota correta', async () => {
    rest.put.mockResolvedValue(undefined);
    await service.addRole(USER, ROLE);
    expect(rest.put).toHaveBeenCalledWith(
      Routes.guildMemberRole(GUILD, USER, ROLE),
    );
  });

  it('removeRole faz DELETE na rota correta', async () => {
    rest.delete.mockResolvedValue(undefined);
    await service.removeRole(USER, ROLE);
    expect(rest.delete).toHaveBeenCalledWith(
      Routes.guildMemberRole(GUILD, USER, ROLE),
    );
  });

  it('sendDirectMessage abre o canal de DM e envia o embed', async () => {
    rest.post
      .mockResolvedValueOnce({ id: 'dm-1' })
      .mockResolvedValueOnce(undefined);
    const embed = { title: 'oi' };
    await service.sendDirectMessage(USER, embed);
    expect(rest.post).toHaveBeenNthCalledWith(1, Routes.userChannels(), {
      body: { recipient_id: USER },
    });
    expect(rest.post).toHaveBeenNthCalledWith(
      2,
      Routes.channelMessages('dm-1'),
      {
        body: { embeds: [embed] },
      },
    );
  });
});
