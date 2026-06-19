import { WebhookController } from './webhook.controller';
import type { DiscordService } from '../discord/discord.service';
import type { DonationRolesService } from '../donation-roles/donation-roles.service';
import { CentralCartOrderWebhookDto } from './dto/central-cart-order-webhook.dto';

describe('WebhookController.handleOrder', () => {
  let controller: WebhookController;
  let donationRoles: { applyForDiscordUser: jest.Mock };

  beforeEach(() => {
    donationRoles = { applyForDiscordUser: jest.fn().mockResolvedValue({ action: 'upgraded' }) };
    controller = new WebhookController(
      {} as unknown as DiscordService,
      donationRoles as unknown as DonationRolesService,
    );
  });

  function order(partial: Partial<CentralCartOrderWebhookDto>): CentralCartOrderWebhookDto {
    return {
      id: 'evt1',
      event: 'ORDER_APPROVED',
      data: { client_discord: '123', client_email: 'a@b.com' },
      ...partial,
    } as CentralCartOrderWebhookDto;
  }

  it('processa ORDER_APPROVED com client_discord', async () => {
    await controller.handleOrder(order({}));
    expect(donationRoles.applyForDiscordUser).toHaveBeenCalledWith({
      discordId: '123',
      email: 'a@b.com',
      identifier: undefined,
    });
  });

  it('ignora eventos que não são ORDER_APPROVED', async () => {
    await controller.handleOrder(order({ event: 'ORDER_CREATED' }));
    expect(donationRoles.applyForDiscordUser).not.toHaveBeenCalled();
  });

  it('ignora ordem aprovada sem client_discord', async () => {
    await controller.handleOrder(order({ data: { client_discord: null } }));
    expect(donationRoles.applyForDiscordUser).not.toHaveBeenCalled();
  });

  it('não propaga erro do processamento (resiliência do webhook)', async () => {
    donationRoles.applyForDiscordUser.mockRejectedValue(new Error('boom'));
    await expect(controller.handleOrder(order({}))).resolves.toMatchObject({
      success: false,
    });
  });
});
