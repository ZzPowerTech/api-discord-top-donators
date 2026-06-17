import { createCanvas } from '@napi-rs/canvas';
import type { MinecraftSkinService } from './services/minecraft-skin.service';
import { FontRegistrationService } from './services/font-registration.service';
import { CanvasRendererService } from './services/canvas-renderer.service';
import { ImageGeneratorService } from './image-generator.service';
import type { TopCustomerView } from '../central-cart-api/dto/top-customer.dto';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function customer(position: number): TopCustomerView {
  return {
    username: `User${position}`,
    spent: 'R$ 10,00',
    purchases: 1,
    identifier: `id${position}`,
    position,
    totalNumeric: 10,
  };
}

function fakeSkinPng(): Buffer {
  return createCanvas(8, 8).toBuffer('image/png');
}

/**
 * Smoke test: exercita o pipeline real de canvas (@napi-rs/canvas), fontes e
 * render. Util para detectar quebra de libs nativas/ICU no ambiente alvo.
 */
describe('ImageGeneratorService (smoke)', () => {
  let service: ImageGeneratorService;

  beforeEach(() => {
    const skin = {
      getPlayerSkin: jest.fn().mockResolvedValue(fakeSkinPng()),
    } as unknown as MinecraftSkinService;

    service = new ImageGeneratorService(
      skin,
      new FontRegistrationService(),
      new CanvasRendererService(),
    );
  });

  it('gera um PNG nao-vazio com 3 doadores', async () => {
    const buffer = await service.generateTopDonatorsImage(
      [customer(1), customer(2), customer(3)],
      'Fevereiro de 2025',
    );
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4)).toEqual(PNG_MAGIC);
  });

  it('gera um PNG mesmo com lista vazia (preenche placeholders)', async () => {
    const buffer = await service.generateTopDonatorsImage([], 'Marco de 2025');
    expect(buffer.subarray(0, 4)).toEqual(PNG_MAGIC);
  });
});
