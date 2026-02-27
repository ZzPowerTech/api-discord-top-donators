import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [DiscordModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
