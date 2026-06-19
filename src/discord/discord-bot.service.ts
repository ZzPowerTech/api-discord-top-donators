import { Inject, Injectable, Logger } from '@nestjs/common';
import type { REST } from '@discordjs/rest';
import {
  Routes,
  type APIEmbed,
  type RESTGetAPIGuildMemberResult,
} from 'discord-api-types/v10';
import { config } from '../config/config';

export const DISCORD_REST = 'DISCORD_REST';

/** Erro com status HTTP (DiscordAPIError expõe `.status`). */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: number }).status === 404
  );
}

/**
 * Operações de bot no Discord (cargos + DM) via REST. Usa o token de bot
 * (config.discord.botToken) injetado na instância DISCORD_REST.
 */
@Injectable()
export class DiscordBotService {
  private readonly logger = new Logger(DiscordBotService.name);

  constructor(@Inject(DISCORD_REST) private readonly rest: REST) {}

  private get guildId(): string {
    const guildId = config.discord.guildId;
    if (!guildId) {
      throw new Error('DISCORD_GUILD_ID não configurado');
    }
    return guildId;
  }

  /** IDs dos cargos do membro, ou null se ele não está no servidor (404). */
  async getMemberRoleIds(userId: string): Promise<string[] | null> {
    try {
      const member = (await this.rest.get(
        Routes.guildMember(this.guildId, userId),
      )) as RESTGetAPIGuildMemberResult;
      return member.roles;
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async addRole(userId: string, roleId: string): Promise<void> {
    await this.rest.put(Routes.guildMemberRole(this.guildId, userId, roleId));
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.rest.delete(Routes.guildMemberRole(this.guildId, userId, roleId));
  }

  /** Abre (ou reabre) o canal de DM e envia o embed. Pode lançar 403 se a DM estiver bloqueada. */
  async sendDirectMessage(userId: string, embed: APIEmbed): Promise<void> {
    const channel = (await this.rest.post(Routes.userChannels(), {
      body: { recipient_id: userId },
    })) as { id: string };

    await this.rest.post(Routes.channelMessages(channel.id), {
      body: { embeds: [embed] },
    });
  }
}
