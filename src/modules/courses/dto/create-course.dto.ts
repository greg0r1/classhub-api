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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecurrenceRuleDto {
  @ApiProperty({
    description: 'Fréquence de récurrence du cours',
    example: 'weekly',
    enum: ['daily', 'weekly', 'monthly'],
  })
  @IsEnum(['daily', 'weekly', 'monthly'], {
    message: 'La fréquence doit être daily, weekly ou monthly',
  })
  frequency: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({
    description: 'Jour de la semaine pour la récurrence (0 = dimanche, 1 = lundi, ..., 6 = samedi)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Min(6)
  day_of_week?: number;

  @ApiPropertyOptional({
    description: 'Intervalle entre chaque occurrence',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({
    description: 'Date de fin de la récurrence au format ISO 8601',
    example: '2025-12-31',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Nombre d\'occurrences totales',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;
}

export class CreateCourseDto {
  @ApiProperty({
    description: 'Identifiant UUID de l\'organisation',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  organization_id: string;

  @ApiProperty({
    description: 'Titre du cours',
    example: 'CrossFit WOD - Débutants',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Description détaillée du cours',
    example: 'Séance CrossFit adaptée aux débutants avec focus sur la technique',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Type de cours',
    example: 'CrossFit',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  course_type?: string;

  @ApiProperty({
    description: 'Date et heure de début du cours au format ISO 8601',
    example: '2025-11-01T10:00:00Z',
    format: 'date-time',
  })
  @IsDateString()
  start_datetime: string;

  @ApiProperty({
    description: 'Date et heure de fin du cours au format ISO 8601',
    example: '2025-11-01T11:00:00Z',
    format: 'date-time',
  })
  @IsDateString()
  end_datetime: string;

  @ApiPropertyOptional({
    description: 'Lieu du cours',
    example: 'Salle principale, CrossFit Lyon',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    description: 'Identifiant UUID du coach responsable du cours',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  coach_id?: string;

  @ApiPropertyOptional({
    description: 'Capacité maximale de participants',
    example: 15,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_capacity?: number;

  @ApiPropertyOptional({
    description: 'Indique si le cours est récurrent',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @ApiPropertyOptional({
    description: 'Règles de récurrence du cours (requis si is_recurring est true)',
    type: RecurrenceRuleDto,
  })
  @IsOptional()
  @ValidateIf((o) => o.is_recurring === true)
  @IsObject()
  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  recurrence_rule?: RecurrenceRuleDto;

  @ApiPropertyOptional({
    description: 'Statut du cours',
    example: 'scheduled',
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled',
  })
  @IsOptional()
  @IsEnum(['scheduled', 'ongoing', 'completed', 'cancelled'])
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}