import { Module } from '@nestjs/common';
import { CentralCartApiModule } from '../central-cart-api/central-cart-api.module';
import { DiscordModule } from '../discord/discord.module';
import { DonationTierService } from './donation-tier.service';
import { DonationRolesService } from './donation-roles.service';
import { DonationRolesController } from './donation-roles.controller';

@Module({
  imports: [CentralCartApiModule, DiscordModule],
  controllers: [DonationRolesController],
  providers: [DonationTierService, DonationRolesService],
  exports: [DonationRolesService],
})
export class DonationRolesModule {}
