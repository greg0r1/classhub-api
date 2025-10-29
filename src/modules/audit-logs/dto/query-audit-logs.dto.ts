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

export class QueryAuditLogsDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

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

  @IsOptional()
  @IsString()
  entity_type?: string;

  @IsOptional()
  @IsUUID()
  entity_id?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_date?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_date?: Date;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
