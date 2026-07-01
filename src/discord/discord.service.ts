import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { APIEmbed } from 'discord-api-types/v10';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import { config } from '../config/config';
import { buildPostLink } from './post-link.builder';
import { DiscordPostPayload } from './discord.types';

const POST_EMBED_COLOR = 0x00f0ff;
const TOP_DONATORS_IMAGE_NAME = 'top-donators.png';
const HTTP_TIMEOUT_MS = 15000;

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  constructor(private readonly httpService: HttpService) {}

  async sendImageWithEmbed(
    imageBuffer: Buffer,
    embed: APIEmbed,
  ): Promise<void> {
    const webhookUrl = config.discord.webhookUrl;
    if (!webhookUrl) {
      throw new Error('Discord webhook URL não configurado');
    }

    const formData = new FormData();
    formData.append('payload_json', JSON.stringify({ embeds: [embed] }));
    formData.append('file', imageBuffer, {
      filename: TOP_DONATORS_IMAGE_NAME,
      contentType: 'image/png',
    });

    await firstValueFrom(
      this.httpService.post(webhookUrl, formData, {
        headers: formData.getHeaders(),
        timeout: HTTP_TIMEOUT_MS,
      }),
    );

    this.logger.log('Mensagem enviada para o Discord com sucesso');
  }

  async sendPostUpdate(post: DiscordPostPayload): Promise<void> {
    const webhookUrl =
      config.discord.updatesWebhookUrl ?? config.discord.webhookUrl;
    if (!webhookUrl) {
      throw new Error('Webhook do Discord não configurado');
    }

    const storeUrl = `https://${config.centralCart.storeId}`;
    const postLink = buildPostLink(post, storeUrl);

    const embed: APIEmbed = {
      title: '📢 Nova Postagem!',
      description: `Uma nova postagem foi feita no site!\n\n➡️ [**Clique aqui para ler o novo conteúdo**](${postLink})`,
      color: POST_EMBED_COLOR,
      timestamp: new Date().toISOString(),
    };

    const roleId = config.discord.updatesRoleId;
    const payload: { content?: string; embeds: APIEmbed[] } = {
      embeds: [embed],
    };
    if (roleId) {
      // O cargo @everyone não é mencionado via <@&id> (isso renderiza como
      // "@@everyone", pois o nome do cargo já contém o @). Usa-se o texto literal.
      const isEveryone = ['everyone', '@everyone'].includes(
        roleId.trim().toLowerCase(),
      );
      payload.content = isEveryone ? '@everyone' : `<@&${roleId}>`;
    }

    await firstValueFrom(
      this.httpService.post(webhookUrl, payload, { timeout: HTTP_TIMEOUT_MS }),
    );

    this.logger.log('Post de atualização enviado para o Discord com sucesso');
  }
}
