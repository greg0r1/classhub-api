import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  MinLength,
  IsBoolean,
  IsEnum,
  IsObject,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecurrenceRuleDto {
  @IsEnum(['daily', 'weekly', 'monthly'], {
    message: 'La fréquence doit être daily, weekly ou monthly',
  })
  frequency: 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Min(6)
  day_of_week?: number; // 0 = dimanche, 1 = lundi, ..., 6 = samedi

  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;
}

export class CreateCourseDto {
  @IsUUID()
  organization_id: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  course_type?: string;

  @IsDateString()
  start_datetime: string;

  @IsDateString()
  end_datetime: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsUUID()
  coach_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_capacity?: number;

  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.is_recurring === true)
  @IsObject()
  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  recurrence_rule?: RecurrenceRuleDto;

  @IsOptional()
  @IsEnum(['scheduled', 'ongoing', 'completed', 'cancelled'])
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}