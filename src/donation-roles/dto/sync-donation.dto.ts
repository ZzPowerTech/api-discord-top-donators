import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { DISCORD_SNOWFLAKE_REGEX } from '../../common/utils/discord-snowflake';

/** Body de POST /donations/sync. Exige ao menos um entre email e identifier. */
export class SyncDonationDto {
  @Matches(DISCORD_SNOWFLAKE_REGEX, {
    message: 'discordId deve ser um ID do Discord valido.',
  })
  discordId!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  // Sem email, o identifier passa a ser obrigatorio (garante ao menos um).
  @ValidateIf((o: SyncDonationDto) => !o.email)
  @IsString()
  @MaxLength(100)
  identifier?: string;
}
