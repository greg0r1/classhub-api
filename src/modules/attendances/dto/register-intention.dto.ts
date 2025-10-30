import { IsEnum, IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterIntentionDto {
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
    description: 'Intention de présence de l\'utilisateur pour le cours',
    example: 'will_attend',
    enum: ['will_attend', 'will_not_attend'],
  })
  @IsEnum(['will_attend', 'will_not_attend'])
  intention: 'will_attend' | 'will_not_attend';

  @ApiPropertyOptional({
    description: 'Notes ou commentaires sur l\'intention',
    example: 'Je viendrai avec 10 minutes de retard',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
