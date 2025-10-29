import {
  IsEnum,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsEnum(['will_attend', 'will_not_attend'])
  intention?: 'will_attend' | 'will_not_attend';

  @IsOptional()
  @IsBoolean()
  actual_attendance?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
