import { DonationTierService } from './donation-tier.service';

const ROLE_1 = '1517021451406938122';
const ROLE_2 = '1517021366367293571';
const ROLE_3 = '1517021393873534996';

describe('DonationTierService', () => {
  const service = new DonationTierService();

  describe('resolveTier', () => {
    it.each([
      [0, 0],
      [59.99, 0],
      [60, 1],
      [179.99, 1],
      [180, 2],
      [499.99, 2],
      [500, 3],
      [9999, 3],
    ])('total %p => tier %p', (total, expected) => {
      expect(service.resolveTier(total)).toBe(expected);
    });
  });

  describe('resolveCurrentTier', () => {
    it('retorna 0 quando o membro não tem nenhum cargo de tier', () => {
      expect(service.resolveCurrentTier(['999', '888'])).toBe(0);
    });

    it('retorna o maior tier dentre os cargos do membro', () => {
      expect(service.resolveCurrentTier([ROLE_1, ROLE_2])).toBe(2);
      expect(service.resolveCurrentTier([ROLE_3])).toBe(3);
    });
  });

  describe('roleIdForTier / tierConfig', () => {
    it('mapeia tier para roleId e config', () => {
      expect(service.roleIdForTier(1)).toBe(ROLE_1);
      expect(service.roleIdForTier(3)).toBe(ROLE_3);
      expect(service.roleIdForTier(0)).toBeNull();
      expect(service.tierConfig(2)?.label).toBe('R$ 180');
      expect(service.tierConfig(0)).toBeNull();
    });
  });
});
