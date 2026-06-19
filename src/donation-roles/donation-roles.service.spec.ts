import { DonationRolesService } from './donation-roles.service';
import { DonationTierService } from './donation-tier.service';
import type { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import type { DiscordBotService } from '../discord/discord-bot.service';

const ROLE_1 = '1517021451406938122';
const ROLE_2 = '1517021366367293571';

describe('DonationRolesService', () => {
  let service: DonationRolesService;
  let centralCart: { getUserSpent: jest.Mock };
  let bot: {
    getMemberRoleIds: jest.Mock;
    addRole: jest.Mock;
    removeRole: jest.Mock;
    sendDirectMessage: jest.Mock;
  };

  beforeEach(() => {
    centralCart = { getUserSpent: jest.fn() };
    bot = {
      getMemberRoleIds: jest.fn(),
      addRole: jest.fn().mockResolvedValue(undefined),
      removeRole: jest.fn().mockResolvedValue(undefined),
      sendDirectMessage: jest.fn().mockResolvedValue(undefined),
    };
    service = new DonationRolesService(
      centralCart as unknown as CentralCartApiService,
      bot as unknown as DiscordBotService,
      new DonationTierService(),
    );
  });

  it('sobe de tier: remove o cargo antigo, adiciona o novo e envia DM', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 180 });
    bot.getMemberRoleIds.mockResolvedValue([ROLE_1]); // tier atual = 1

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.removeRole).toHaveBeenCalledWith('u1', ROLE_1);
    expect(bot.addRole).toHaveBeenCalledWith('u1', ROLE_2);
    expect(bot.sendDirectMessage).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ previousTier: 1, newTier: 2, action: 'upgraded' });
  });

  it('pulo 0→3: não remove nada, adiciona o tier 3 e envia uma única DM', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 600 });
    bot.getMemberRoleIds.mockResolvedValue([]); // sem cargo

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.removeRole).not.toHaveBeenCalled();
    expect(bot.addRole).toHaveBeenCalledTimes(1);
    expect(bot.sendDirectMessage).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ newTier: 3, action: 'upgraded' });
  });

  it('tier alvo igual ao atual: não faz nada (sem DM)', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 200 });
    bot.getMemberRoleIds.mockResolvedValue([ROLE_2]); // já tier 2

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.addRole).not.toHaveBeenCalled();
    expect(bot.removeRole).not.toHaveBeenCalled();
    expect(bot.sendDirectMessage).not.toHaveBeenCalled();
    expect(result).toMatchObject({ action: 'none' });
  });

  it('total abaixo de qualquer meta: não consulta o Discord', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 30 });

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.getMemberRoleIds).not.toHaveBeenCalled();
    expect(result).toMatchObject({ newTier: 0, action: 'none' });
  });

  it('membro fora do servidor: não aplica cargo', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 100 });
    bot.getMemberRoleIds.mockResolvedValue(null);

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.addRole).not.toHaveBeenCalled();
    expect(result).toMatchObject({ action: 'not_in_guild' });
  });

  it('falha de DM não impede a atribuição do cargo', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 60 });
    bot.getMemberRoleIds.mockResolvedValue([]);
    bot.sendDirectMessage.mockRejectedValue({ status: 403 });

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.addRole).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ newTier: 1, action: 'upgraded' });
  });
});
