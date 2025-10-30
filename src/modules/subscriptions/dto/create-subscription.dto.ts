import {
  IsUUID,
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsBoolean,
  IsEnum,
  ValidateNested,
  Min,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscriptionTypeDetailsDto {
  @ApiProperty({
    description: 'Nom du type d\'abonnement',
    example: 'Abonnement Mensuel Premium',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Durée de l\'abonnement en mois',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  duration_months: number;

  @ApiProperty({
    description: 'Prix de l\'abonnement',
    example: 79.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Devise du prix',
    example: 'EUR',
  })
  @IsString()
  currency: string;

  @ApiPropertyOptional({
    description: 'Description de l\'abonnement',
    example: 'Accès illimité à tous les cours CrossFit',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Liste des avantages inclus dans l\'abonnement',
    example: ['Accès illimité aux cours', 'Suivi personnalisé', '1 séance coaching gratuite'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];
}

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Identifiant UUID de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Détails du type d\'abonnement',
    type: SubscriptionTypeDetailsDto,
  })
  @ValidateNested()
  @Type(() => SubscriptionTypeDetailsDto)
  subscription_type: SubscriptionTypeDetailsDto;

  @ApiProperty({
    description: 'Date de début de l\'abonnement',
    example: '2025-11-01T00:00:00Z',
    type: Date,
  })
  @Type(() => Date)
  @IsDate()
  start_date: Date;

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
    description: 'Devise du paiement',
    example: 'EUR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Statut du paiement',
    example: 'paid',
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
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
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  auto_renew?: boolean;

  @ApiPropertyOptional({
    description: 'Notes ou commentaires sur l\'abonnement',
    example: 'Tarif promotionnel appliqué',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
