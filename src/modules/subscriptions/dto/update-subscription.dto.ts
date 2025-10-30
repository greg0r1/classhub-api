import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Statut de l\'abonnement',
    example: 'active',
    enum: ['active', 'expired', 'cancelled', 'suspended'],
  })
  @IsOptional()
  @IsEnum(['active', 'expired', 'cancelled', 'suspended'])
  status?: 'active' | 'expired' | 'cancelled' | 'suspended';

  @ApiPropertyOptional({
    description: 'Date de fin de l\'abonnement',
    example: '2025-12-01T00:00:00Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date;

  @ApiPropertyOptional({
    description: 'Montant payé par l\'utilisateur',
    example: 79.99,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount_paid?: number;

  @ApiPropertyOptional({
    description: 'Statut du paiement',
    example: 'paid',
    enum: ['pending', 'paid', 'failed', 'refunded'],
  })
  @IsOptional()
  @IsEnum(['pending', 'paid', 'failed', 'refunded'])
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';

  @ApiPropertyOptional({
    description: 'Méthode de paiement utilisée',
    example: 'Carte bancaire',
  })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional({
    description: 'Référence de transaction du paiement',
    example: 'PAY-123456789',
  })
  @IsOptional()
  @IsString()
  payment_reference?: string;

  @ApiPropertyOptional({
    description: 'Indique si l\'abonnement se renouvelle automatiquement',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;

  @ApiPropertyOptional({
    description: 'Notes ou commentaires sur l\'abonnement',
    example: 'Abonnement suspendu temporairement pour raisons médicales',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
