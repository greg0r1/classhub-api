import { SetMetadata } from '@nestjs/common';
import {
  DISABLE_AUDIT,
  AUDIT_ENTITY_TYPE,
  AUDIT_ACTION,
} from '../interceptors/audit.interceptor';
import { AuditLog } from '../../database/entities/audit-log.entity';

/**
 * Désactiver l'audit sur une route
 *
 * Usage :
 * @DisableAudit()
 * @Get('health')
 * healthCheck() { ... }
 */
export const DisableAudit = () => SetMetadata(DISABLE_AUDIT, true);

/**
 * Spécifier le type d'entité pour l'audit
 *
 * Usage :
 * @AuditEntityType('User')
 * @Post()
 * create() { ... }
 */
export const AuditEntityType = (entityType: string) =>
  SetMetadata(AUDIT_ENTITY_TYPE, entityType);

/**
 * Spécifier l'action pour l'audit
 *
 * Usage :
 * @AuditAction('LOGIN')
 * @Post('login')
 * login() { ... }
 */
export const AuditAction = (action: AuditLog['action']) =>
  SetMetadata(AUDIT_ACTION, action);
