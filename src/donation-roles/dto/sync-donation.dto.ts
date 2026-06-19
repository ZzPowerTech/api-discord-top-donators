import { IsOptional, IsString } from 'class-validator';

/** Body de POST /donations/sync. Ao menos um entre email e identifier. */
export class SyncDonationDto {
  @IsString()
  discordId!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  identifier?: string;
}
