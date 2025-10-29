import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';

export class RenewSubscriptionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount_paid?: number;

  @IsOptional()
  @IsEnum(['pending', 'paid', 'failed', 'refunded'])
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';

  @IsOptional()
  @IsString()
  payment_method?: string;

  @IsOptional()
  @IsString()
  payment_reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
