import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelSubscriptionDto {
  @ApiProperty({
    description: 'Raison de l\'annulation de l\'abonnement',
    example: 'Déménagement dans une autre ville',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Notes ou commentaires supplémentaires sur l\'annulation',
    example: 'Client souhaite revenir dans 6 mois',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
