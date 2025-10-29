import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateCourseDto extends PartialType(
  OmitType(CreateCourseDto, ['organization_id'] as const),
) {
  @IsOptional()
  @IsString()
  cancellation_reason?: string;

  @IsOptional()
  @IsDateString()
  cancelled_at?: string;
}