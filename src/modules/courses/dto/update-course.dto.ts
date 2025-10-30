import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';
import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCourseDto extends PartialType(
  OmitType(CreateCourseDto, ['organization_id'] as const),
) {
  @ApiPropertyOptional({
    description: 'Raison de l\'annulation du cours',
    example: 'Coach indisponible pour raisons médicales',
  })
  @IsOptional()
  @IsString()
  cancellation_reason?: string;

  @ApiPropertyOptional({
    description: 'Date et heure d\'annulation du cours au format ISO 8601',
    example: '2025-10-30T14:30:00Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  cancelled_at?: string;
}