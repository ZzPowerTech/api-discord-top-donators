import type { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import type { DiscordService } from '../discord/discord.service';
import type { ImageGeneratorService } from '../image-generator/image-generator.service';
import type { TopCustomerView } from '../central-cart-api/dto/top-customer.dto';
import { SchedulerService } from './scheduler.service';

function makeCustomer(position: number): TopCustomerView {
  return {
    username: `User${position}`,
    spent: 'R$ 10,00',
    purchases: 1,
    identifier: `id${position}`,
    position,
    totalNumeric: 10,
  };
}

describe('SchedulerService (orquestracao)', () => {
  let service: SchedulerService;
  let getTopCustomersFromPreviousMonth: jest.Mock;
  let getTopCustomers: jest.Mock;
  let generateTopDonatorsImage: jest.Mock;
  let sendImageWithEmbed: jest.Mock;

  beforeEach(() => {
    getTopCustomersFromPreviousMonth = jest.fn();
    getTopCustomers = jest.fn();
    generateTopDonatorsImage = jest.fn().mockResolvedValue(Buffer.from('png'));
    sendImageWithEmbed = jest.fn().mockResolvedValue(undefined);

    const centralCart = {
      getTopCustomersFromPreviousMonth,
      getTopCustomers,
    } as unknown as CentralCartApiService;
    const discord = { sendImageWithEmbed } as unknown as DiscordService;
    const image = {
      generateTopDonatorsImage,
    } as unknown as ImageGeneratorService;

    service = new SchedulerService(centralCart, discord, image);
  });

  it('sendMonthlyTopDonators limita ao top 3 e envia a imagem', async () => {
    getTopCustomersFromPreviousMonth.mockResolvedValue([
      makeCustomer(1),
      makeCustomer(2),
      makeCustomer(3),
      makeCustomer(4),
    ]);

    await service.sendMonthlyTopDonators();

    expect(generateTopDonatorsImage).toHaveBeenCalledTimes(1);
    const [customersArg] = generateTopDonatorsImage.mock.calls[0] as [
      TopCustomerView[],
      string,
    ];
    expect(customersArg).toHaveLength(3);
    expect(sendImageWithEmbed).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.any(Object),
    );
  });

  it('sendMonthlyTopDonators nao gera nem envia quando nao ha doadores', async () => {
    getTopCustomersFromPreviousMonth.mockResolvedValue([]);
    await service.sendMonthlyTopDonators();
    expect(generateTopDonatorsImage).not.toHaveBeenCalled();
    expect(sendImageWithEmbed).not.toHaveBeenCalled();
  });

  it('sendMonthlyTopDonators engole o erro (nao propaga) para nao derrubar o cron', async () => {
    getTopCustomersFromPreviousMonth.mockRejectedValue(new Error('api down'));
    await expect(service.sendMonthlyTopDonators()).resolves.toBeUndefined();
  });

  it('sendTopDonatorsCustomDate propaga o erro para o chamador', async () => {
    getTopCustomers.mockRejectedValue(new Error('api down'));
    await expect(
      service.sendTopDonatorsCustomDate('2025-01-01', '2025-01-31'),
    ).rejects.toThrow('api down');
  });

  it('sendTopDonatorsCustomDate usa monthName quando fornecido', async () => {
    getTopCustomers.mockResolvedValue([makeCustomer(1)]);
    await service.sendTopDonatorsCustomDate(
      '2025-01-01',
      '2025-01-31',
      'Janeiro 2025',
    );
    const [, displayMonth] = generateTopDonatorsImage.mock.calls[0] as [
      TopCustomerView[],
      string,
    ];
    expect(displayMonth).toBe('Janeiro 2025');
  });
});
