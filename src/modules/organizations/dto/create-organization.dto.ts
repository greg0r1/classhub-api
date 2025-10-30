import { IsString, IsEmail, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Nom de l\'organisation',
    example: 'CrossFit Lyon',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Slug unique pour l\'URL (lettres minuscules, chiffres et tirets)',
    example: 'crossfit-lyon',
    minLength: 3,
    maxLength: 100,
    pattern: '^[a-z0-9-]+$',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Email de contact de l\'organisation',
    example: 'contact@crossfit-lyon.fr',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone',
    example: '0612345678',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Adresse postale complète',
    example: '123 Rue de la République, 69001 Lyon',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'URL du logo de l\'organisation',
    example: 'https://example.com/logo.png',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo_url?: string;
}