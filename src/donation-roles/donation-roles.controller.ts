import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { DonationRolesService } from './donation-roles.service';
import { SyncDonationDto } from './dto/sync-donation.dto';

/** Operações administrativas de cargos de doação. Protegido por API key. */
@Controller('donations')
@UseGuards(ApiKeyGuard)
export class DonationRolesController {
  constructor(private readonly donationRolesService: DonationRolesService) {}

  @Post('sync')
  async sync(@Body() dto: SyncDonationDto) {
    const result = await this.donationRolesService.applyForDiscordUser({
      discordId: dto.discordId,
      email: dto.email,
      identifier: dto.identifier,
    });
    return { success: true, result };
  }
}
