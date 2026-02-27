import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { PostsMonitorService } from './posts-monitor.service';
import { CentralCartApiModule } from '../central-cart-api/central-cart-api.module';
import { DiscordModule } from '../discord/discord.module';
import { ImageGeneratorModule } from '../image-generator/image-generator.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CentralCartApiModule,
    DiscordModule,
    ImageGeneratorModule,
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService, PostsMonitorService],
  exports: [SchedulerService, PostsMonitorService],
})
export class SchedulerModule {}
