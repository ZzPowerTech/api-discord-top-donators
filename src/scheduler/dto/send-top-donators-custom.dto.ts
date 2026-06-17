import { IsDateString, IsOptional, IsString } from 'class-validator';

/**
 * Body do POST /scheduler/send-top-donators-custom.
 */
export class SendTopDonatorsCustomDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  monthName?: string;
}
