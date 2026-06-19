import { Injectable } from '@nestjs/common';
import { DonationTier, getDonationTiers } from './donation-tiers.config';

/**
 * Regras puras de tier (sem I/O). Trabalha sobre a lista de tiers ordenada por
 * threshold crescente. Testável isoladamente.
 */
@Injectable()
export class DonationTierService {
  readonly tiers: DonationTier[] = getDonationTiers()
    .slice()
    .sort((a, b) => a.threshold - b.threshold);

  /** Maior tier cujo threshold é alcançado pelo total. 0 = nenhum. */
  resolveTier(totalNet: number): number {
    let result = 0;
    for (const tier of this.tiers) {
      if (totalNet >= tier.threshold) {
        result = tier.tier;
      }
    }
    return result;
  }

  /** Maior tier cujo cargo o membro já possui. 0 = nenhum. */
  resolveCurrentTier(memberRoleIds: string[]): number {
    let result = 0;
    for (const tier of this.tiers) {
      if (memberRoleIds.includes(tier.roleId)) {
        result = Math.max(result, tier.tier);
      }
    }
    return result;
  }

  roleIdForTier(tier: number): string | null {
    return this.tiers.find((t) => t.tier === tier)?.roleId ?? null;
  }

  tierConfig(tier: number): DonationTier | null {
    return this.tiers.find((t) => t.tier === tier) ?? null;
  }
}
