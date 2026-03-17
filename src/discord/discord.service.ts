import { Injectable, Logger } from '@nestjs/common';
import { APIEmbed } from 'discord-api-types/v10';
import { config } from '../config/config';
import * as fs from 'fs';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  async sendImageWithEmbed(imagePath: string, embed: APIEmbed): Promise<void> {
    try {
      const webhookUrl = config.discord.webhookUrl;

      if (!webhookUrl) {
        throw new Error('Discord webhook URL não configurado');
      }

      const imageBuffer = fs.readFileSync(imagePath);

      const formData = new FormData();
      formData.append(
        'payload_json',
        JSON.stringify({
          embeds: [embed],
        }),
      );
      formData.append('file', imageBuffer, {
        filename: 'top-donators.png',
        contentType: 'image/png',
      });

      await axios.post(webhookUrl, formData, {
        headers: formData.getHeaders(),
      });

      this.logger.log('Mensagem enviada para o Discord com sucesso');
    } catch (error) {
      this.logger.error('Erro ao enviar mensagem para o Discord', error);
      throw error;
    }
  }

  async sendPostUpdate(post: {
    title: string;
    content: string;
    image?: string;
    author?: string;
    created_at?: string;
    id?: number;
    slug?: string;
    path?: string;
  }): Promise<void> {
    try {
      const webhookUrl =
        config.discord.updatesWebhookUrl || config.discord.webhookUrl;

      if (!webhookUrl) {
        throw new Error('Webhook do Discord não configurado');
      }

      // Constrói o link do post
      const storeUrl = `https://${config.centralCart.storeId}`;
      let postLink = storeUrl;

      // Prioriza o campo 'path' que vem da API Central Cart (formato: /post/DD/MM/YYYY/slug)
      if (post.path) {
        postLink = `${storeUrl}${post.path}`;
      } else if (post.slug && post.created_at) {
        // Fallback: Extrair data do created_at usando UTC
        const date = new Date(post.created_at);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();

        postLink = `${storeUrl}/post/${day}/${month}/${year}/${post.slug}`;
      } else if (post.slug) {
        // Último fallback: usa a data atual em UTC
        const date = new Date();
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();

        postLink = `${storeUrl}/post/${day}/${month}/${year}/${post.slug}`;
      }

      // Embed simples com aviso fixo
      const embed: APIEmbed = {
        title: '📢 Nova Postagem!',
        description: `Uma nova postagem foi feita no site!\n\n➡️ [**Clique aqui para ler o novo conteúdo**](${postLink})`,
        color: 0x00f0ff,
        timestamp: new Date().toISOString(),
      };

      await axios.post(webhookUrl, {
        content: '<@&939951821701644328>',
        embeds: [embed],
      });

      this.logger.log('Post de atualização enviado para o Discord com sucesso');
    } catch (error) {
      this.logger.error(
        'Erro ao enviar post de atualização para o Discord',
        error,
      );
      throw error;
    }
  }
}
