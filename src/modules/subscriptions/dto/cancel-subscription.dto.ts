import { IsString, IsOptional } from 'class-validator';

export class CancelSubscriptionDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
