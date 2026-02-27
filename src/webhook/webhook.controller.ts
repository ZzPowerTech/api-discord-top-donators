import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly discordService: DiscordService) {}

  @Post('centralcart/post-created')
  async handlePostCreated(
    @Body() postData: any,
    @Headers('x-centralcart-signature') signature?: string,
  ) {
    try {
      this.logger.log('Webhook recebido da CentralCart');
      this.logger.debug('Payload:', JSON.stringify(postData));

      // Extrair dados do post (adapte conforme o formato real da API)
      const post = postData.data || postData;

      // Validar dados mínimos
      if (!post.title) {
        this.logger.warn('Post sem título recebido');
        return { success: false, error: 'Post sem título' };
      }

      // Enviar para Discord
      await this.discordService.sendPostUpdate({
        title: post.title,
        content: post.content || post.description || '',
        image: post.image || post.thumbnail,
        author: post.author,
      });

      this.logger.log(`Post "${post.title}" enviado para Discord com sucesso`);

      return {
        success: true,
        message: 'Post enviado para Discord',
      };
    } catch (error) {
      this.logger.error('Erro ao processar webhook', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Endpoint para testar manualmente
  @Post('test')
  async testWebhook(@Body() testData: any) {
    this.logger.log('Teste de webhook');

    await this.discordService.sendPostUpdate({
      title: testData.title || 'Teste de Post',
      content: testData.content || 'Este é um post de teste via webhook',
      image: testData.image,
    });

    return {
      success: true,
      message: 'Webhook de teste enviado para Discord',
    };
  }
}
