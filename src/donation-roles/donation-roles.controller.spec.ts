import { DonationRolesController } from './donation-roles.controller';
import type { DonationRolesService } from './donation-roles.service';

describe('DonationRolesController', () => {
  it('encaminha o sync para o serviço e retorna o resultado', async () => {
    const apply = jest
      .fn()
      .mockResolvedValue({ action: 'upgraded', newTier: 2 });
    const controller = new DonationRolesController({
      applyForDiscordUser: apply,
    } as unknown as DonationRolesService);

    const result = await controller.sync({
      discordId: 'u1',
      email: 'a@b.com',
    });

    expect(apply).toHaveBeenCalledWith({
      discordId: 'u1',
      email: 'a@b.com',
      identifier: undefined,
    });
    expect(result).toMatchObject({ success: true, result: { newTier: 2 } });
  });
});
