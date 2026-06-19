import { config } from '../config/config';

/** Um tier de doacao: meta acumulada (liquida) → cargo do Discord. */
export interface DonationTier {
  tier: number; // 1, 2, 3 (ordem crescente)
  threshold: number; // valor liquido acumulado em reais
  roleId: string; // ID do cargo no Discord
  label: string; // texto exibido na DM (ex.: "R$ 60")
}

// Defaults fornecidos pelo Murilo; podem ser sobrescritos por env.
const DEFAULT_ROLE_IDS: Record<number, string> = {
  1: '1517021451406938122',
  2: '1517021366367293571',
  3: '1517021393873534996',
};

/**
 * Lista de tiers ordenada por threshold crescente. Le os role IDs do config
 * (envs DONATION_TIER_<n>_ROLE_ID), caindo para os defaults quando ausentes.
 */
export function getDonationTiers(): DonationTier[] {
  return [
    {
      tier: 1,
      threshold: 60,
      roleId: config.donationRoles.tier1RoleId || DEFAULT_ROLE_IDS[1],
      label: 'R$ 60',
    },
    {
      tier: 2,
      threshold: 180,
      roleId: config.donationRoles.tier2RoleId || DEFAULT_ROLE_IDS[2],
      label: 'R$ 180',
    },
    {
      tier: 3,
      threshold: 500,
      roleId: config.donationRoles.tier3RoleId || DEFAULT_ROLE_IDS[3],
      label: 'R$ 500',
    },
  ];
}
