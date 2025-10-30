import { IsBoolean, IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarkAttendanceDto {
  @ApiProperty({
    description: 'Identifiant UUID du cours',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  course_id: string;

  @ApiProperty({
    description: 'Identifiant UUID de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Présence effective de l\'utilisateur au cours',
    example: true,
  })
  @IsBoolean()
  actual_attendance: boolean;

  @ApiPropertyOptional({
    description: 'Notes ou commentaires sur la présence',
    example: 'Arrivé en retard de 15 minutes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
