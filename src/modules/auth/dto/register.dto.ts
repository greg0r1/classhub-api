import {
  IsEmail,
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class RegisterDto {
  @IsUUID()
  organization_id: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(100)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  last_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsEnum(['admin', 'coach', 'member'], {
    message: 'Le rôle doit être admin, coach ou member',
  })
  role: 'admin' | 'coach' | 'member';
}
