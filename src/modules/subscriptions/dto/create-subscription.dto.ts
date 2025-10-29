import {
  IsUUID,
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsBoolean,
  IsEnum,
  ValidateNested,
  Min,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubscriptionTypeDetailsDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  duration_months: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];
}

export class CreateSubscriptionDto {
  @IsUUID()
  user_id: string;

  @ValidateNested()
  @Type(() => SubscriptionTypeDetailsDto)
  subscription_type: SubscriptionTypeDetailsDto;

  @Type(() => Date)
  @IsDate()
  start_date: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount_paid?: number;

  @IsOptional()
  @IsString()
  currency?: string;

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
