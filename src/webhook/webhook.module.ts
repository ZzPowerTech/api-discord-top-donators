import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { DiscordModule } from '../discord/discord.module';
import { DonationRolesModule } from '../donation-roles/donation-roles.module';

@Module({
  imports: [DiscordModule, DonationRolesModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
