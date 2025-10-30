import {
  IsEnum,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAttendanceDto {
  @ApiPropertyOptional({
    description: 'Intention de présence de l\'utilisateur pour le cours',
    example: 'will_attend',
    enum: ['will_attend', 'will_not_attend'],
  })
  @IsOptional()
  @IsEnum(['will_attend', 'will_not_attend'])
  intention?: 'will_attend' | 'will_not_attend';

  @ApiPropertyOptional({
    description: 'Présence effective de l\'utilisateur au cours',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  actual_attendance?: boolean;

  @ApiPropertyOptional({
    description: 'Notes ou commentaires sur la présence ou l\'intention',
    example: 'Modification de dernière minute',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
