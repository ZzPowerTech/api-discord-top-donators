import { Injectable, Logger } from '@nestjs/common';
import type { APIEmbed } from 'discord-api-types/v10';
import { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import { DiscordBotService } from '../discord/discord-bot.service';
import { DonationTierService } from './donation-tier.service';
import { DonationTier } from './donation-tiers.config';
import { getErrorMessage } from '../common/utils/get-error-message';

const DM_EMBED_COLOR = 0xffd700;

export type DonationSyncAction = 'upgraded' | 'none' | 'not_in_guild';

export interface DonationSyncResult {
  discordId: string;
  total: number;
  previousTier: number;
  newTier: number;
  action: DonationSyncAction;
}

export interface ApplyDonationInput {
  discordId: string;
  email?: string;
  identifier?: string;
}

/**
 * Decide e aplica o cargo de tier do membro a partir do total gasto. Stateless:
 * a fonte do total é a API Central Cart; o tier atual é inferido dos cargos do
 * membro no Discord. RELANÇA erros de consulta/cargo (o webhook controller é
 * quem garante resiliência); a DM é best-effort (falha não interrompe).
 */
@Injectable()
export class DonationRolesService {
  private readonly logger = new Logger(DonationRolesService.name);

  constructor(
    private readonly centralCart: CentralCartApiService,
    private readonly discordBot: DiscordBotService,
    private readonly tierService: DonationTierService,
  ) {}

  async applyForDiscordUser(
    input: ApplyDonationInput,
  ): Promise<DonationSyncResult> {
    const { discordId, email, identifier } = input;

    const spent = await this.centralCart.getUserSpent({ email, identifier });
    const total = spent.totalNetReceived;
    const targetTier = this.tierService.resolveTier(total);

    if (targetTier === 0) {
      return { discordId, total, previousTier: 0, newTier: 0, action: 'none' };
    }

    const roleIds = await this.discordBot.getMemberRoleIds(discordId);
    if (roleIds === null) {
      this.logger.warn(
        `Membro ${discordId} não está no servidor; cargo não aplicado.`,
      );
      return {
        discordId,
        total,
        previousTier: 0,
        newTier: 0,
        action: 'not_in_guild',
      };
    }

    const currentTier = this.tierService.resolveCurrentTier(roleIds);
    if (targetTier <= currentTier) {
      return {
        discordId,
        total,
        previousTier: currentTier,
        newTier: currentTier,
        action: 'none',
      };
    }

    if (currentTier > 0) {
      const oldRoleId = this.tierService.roleIdForTier(currentTier);
      if (oldRoleId) {
        await this.discordBot.removeRole(discordId, oldRoleId);
      }
    }

    const targetConfig = this.tierService.tierConfig(targetTier);
    // targetTier > 0 garante config presente.
    const newRoleId = targetConfig!.roleId;
    await this.discordBot.addRole(discordId, newRoleId);

    try {
      await this.discordBot.sendDirectMessage(
        discordId,
        this.buildDmEmbed(targetConfig!),
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar DM para ${discordId} (cargo já atribuído): ${getErrorMessage(error)}`,
      );
    }

    this.logger.log(
      `Membro ${discordId}: tier ${currentTier} → ${targetTier} (total ${total}).`,
    );

    return {
      discordId,
      total,
      previousTier: currentTier,
      newTier: targetTier,
      action: 'upgraded',
    };
  }

  private buildDmEmbed(tier: DonationTier): APIEmbed {
    return {
      title: '🎉 Meta de doação atingida!',
      description:
        `Você atingiu **${tier.label}** em doações no AusTV e desbloqueou um novo cargo! 💜\n\n` +
        'Muito obrigado pelo seu apoio — é graças a você que mantemos o servidor no ar! 🚀',
      color: DM_EMBED_COLOR,
      timestamp: new Date().toISOString(),
    };
  }
}
