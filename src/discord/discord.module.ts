import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { REST } from '@discordjs/rest';
import { DiscordService } from './discord.service';
import { DiscordBotService, DISCORD_REST } from './discord-bot.service';
import { config } from '../config/config';

@Module({
  imports: [HttpModule],
  providers: [
    DiscordService,
    {
      provide: DISCORD_REST,
      useFactory: () =>
        new REST({ version: '10' }).setToken(config.discord.botToken ?? ''),
    },
    DiscordBotService,
  ],
  exports: [DiscordService, DiscordBotService],
})
export class DiscordModule {}
