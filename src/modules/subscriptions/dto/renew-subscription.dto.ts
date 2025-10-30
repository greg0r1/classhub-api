import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RenewSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Montant payé pour le renouvellement',
    example: 79.99,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount_paid?: number;

  @ApiPropertyOptional({
    description: 'Statut du paiement du renouvellement',
    example: 'paid',
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  })
  @IsOptional()
  @IsEnum(['pending', 'paid', 'failed', 'refunded'])
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';

  @ApiPropertyOptional({
    description: 'Méthode de paiement utilisée pour le renouvellement',
    example: 'Carte bancaire',
  })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional({
    description: 'Référence de transaction du paiement de renouvellement',
    example: 'PAY-987654321',
  })
  @IsOptional()
  @IsString()
  payment_reference?: string;

  @ApiPropertyOptional({
    description: 'Notes ou commentaires sur le renouvellement',
    example: 'Renouvellement automatique',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
