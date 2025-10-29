import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(['active', 'expired', 'cancelled', 'suspended'])
  status?: 'active' | 'expired' | 'cancelled' | 'suspended';

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date;

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
  @IsBoolean()
  auto_renew?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
