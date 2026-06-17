import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';
import { getErrorMessage } from '../common/utils/get-error-message';
import { CentralCartPostWebhookDto } from './dto/central-cart-post-webhook.dto';
import { TestWebhookDto } from './dto/test-webhook.dto';
import { WebhookSignatureGuard } from '../common/guards/webhook-signature.guard';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly discordService: DiscordService) {}

  @Post('centralcart/post-created')
  @UseGuards(WebhookSignatureGuard)
  async handlePostCreated(@Body() dto: CentralCartPostWebhookDto) {
    try {
      this.logger.log('Webhook recebido da CentralCart');

      await this.discordService.sendPostUpdate({
        title: dto.title,
        content: dto.content ?? dto.description ?? '',
        image: dto.image ?? dto.thumbnail,
        author: dto.author,
        created_at: dto.created_at,
        slug: dto.slug,
        path: dto.path,
      });

      this.logger.log(`Post "${dto.title}" enviado para Discord com sucesso`);

      return {
        success: true,
        message: 'Post enviado para Discord',
      };
    } catch (error) {
      this.logger.error('Erro ao processar webhook', error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }

  @Post('test')
  @UseGuards(ApiKeyGuard)
  async testWebhook(@Body() dto: TestWebhookDto) {
    this.logger.log('Teste de webhook');

    await this.discordService.sendPostUpdate({
      title: dto.title ?? 'Teste de Post',
      content: dto.content ?? 'Este é um post de teste via webhook',
      image: dto.image,
      author: dto.author,
      created_at: dto.created_at,
      slug: dto.slug,
      path: dto.path,
    });

    return {
      success: true,
      message: 'Webhook de teste enviado para Discord',
    };
  }
}
