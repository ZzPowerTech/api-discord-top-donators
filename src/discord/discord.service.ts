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

  private cleanHtml(html: string): string {
    return (
      html
        // Converte entidades HTML primeiro
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Remove parágrafos que só contêm <br> (substitui por linha vazia simples)
        .replace(/<p[^>]*>\s*<br[^>]*>\s*<\/p>/gi, '\n')
        // Remove parágrafos vazios (só espaços)
        .replace(/<p[^>]*>\s*<\/p>/gi, '')
        // Processa h2 e h3 com strong dentro (caso comum)
        .replace(/<h2><strong>(.*?)<\/strong><\/h2>/g, '\n**$1**\n')
        .replace(/<h3><strong>(.*?)<\/strong><\/h3>/g, '\n**$1**\n')
        // Processa h2 e h3 normais
        .replace(/<h2>(.*?)<\/h2>/g, '\n**$1**\n')
        .replace(/<h3>(.*?)<\/h3>/g, '\n**$1**\n')
        // Processa strong
        .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
        // Remove aberturas de parágrafos
        .replace(/<p[^>]*>/g, '')
        // Converte fechamento de parágrafos em quebra de linha
        .replace(/<\/p>/g, '\n')
        // Processa listas
        .replace(/<ul>/g, '')
        .replace(/<\/ul>/g, '')
        .replace(/<li>/g, '• ')
        .replace(/<\/li>/g, '\n')
        // Quebras de linha
        .replace(/<br\s*\/?>/g, '\n')
        // Remove outras tags HTML restantes
        .replace(/<[^>]+>/g, '')
        // Limpa múltiplos asteriscos consecutivos
        .replace(/\*{3,}/g, '**')
        // Remove espaços no início e fim de cada linha
        .replace(/^[ \t]+|[ \t]+$/gm, '')
        // Limpa múltiplas quebras de linha (máximo 2 = 1 linha vazia)
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\n+|\n+$/g, '')
        .trim()
    );
  }

  async sendPostUpdate(post: {
    title: string;
    content: string;
    image?: string;
    author?: string;
    created_at?: string;
  }): Promise<void> {
    try {
      const webhookUrl = config.discord.updatesWebhookUrl;

      if (!webhookUrl) {
        throw new Error('Discord updates webhook URL não configurado');
      }

      // Limpa o HTML do conteúdo
      const cleanContent = this.cleanHtml(post.content);

      const embed: APIEmbed = {
        title: post.title,
        description: cleanContent,
        color: 0x00f0ff,
        timestamp: post.created_at || new Date().toISOString(),
      };

      // Adiciona autor no footer se disponível
      if (post.author) {
        embed.footer = {
          text: `${post.author}`,
        };
      }

      // Se houver imagem, adiciona ao embed
      if (post.image) {
        embed.image = {
          url: post.image,
        };
      }

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
