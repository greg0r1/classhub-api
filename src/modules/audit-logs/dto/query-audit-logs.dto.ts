import {
  IsOptional,
  IsUUID,
  IsString,
  IsEnum,
  IsDate,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuditLog } from '../../../database/entities/audit-log.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAuditLogsDto {
  @ApiPropertyOptional({
    description: 'Filtrer par identifiant UUID de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par type d\'action effectuée',
    example: 'LOGIN',
    enum: [
      'CREATE',
      'UPDATE',
      'DELETE',
      'SOFT_DELETE',
      'RESTORE',
      'LOGIN',
      'LOGOUT',
      'FAILED_LOGIN',
      'PASSWORD_CHANGE',
      'CANCEL',
      'RENEW',
      'SUSPEND',
      'REACTIVATE',
      'OTHER',
    ],
  })
  @IsOptional()
  @IsEnum([
    'CREATE',
    'UPDATE',
    'DELETE',
    'SOFT_DELETE',
    'RESTORE',
    'LOGIN',
    'LOGOUT',
    'FAILED_LOGIN',
    'PASSWORD_CHANGE',
    'CANCEL',
    'RENEW',
    'SUSPEND',
    'REACTIVATE',
    'OTHER',
  ])
  action?: AuditLog['action'];

  @ApiPropertyOptional({
    description: 'Filtrer par type d\'entité concernée',
    example: 'User',
  })
  @IsOptional()
  @IsString()
  entity_type?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par identifiant UUID de l\'entité concernée',
    example: '123e4567-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  entity_id?: string;

  @ApiPropertyOptional({
    description: 'Date de début de la période de recherche',
    example: '2025-10-01T00:00:00Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_date?: Date;

  @ApiPropertyOptional({
    description: 'Date de fin de la période de recherche',
    example: '2025-10-31T23:59:59Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date;

  @ApiPropertyOptional({
    description: 'Filtrer par adresse IP',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiPropertyOptional({
    description: 'Nombre maximum de résultats à retourner',
    example: 50,
    minimum: 1,
    maximum: 100,
    default: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Nombre de résultats à ignorer (pagination)',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
