import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Reflector } from '@nestjs/core';

/**
 * Clé de métadonnée pour désactiver l'audit sur certaines routes
 */
export const DISABLE_AUDIT = 'disableAudit';

/**
 * Clé de métadonnée pour spécifier le type d'entité
 */
export const AUDIT_ENTITY_TYPE = 'auditEntityType';

/**
 * Clé de métadonnée pour spécifier l'action
 */
export const AUDIT_ACTION = 'auditAction';

/**
 * Intercepteur d'audit
 *
 * Objectif : Logger automatiquement toutes les actions effectuées dans l'application
 *
 * Fonctionnement :
 * 1. Capture la requête (method, url, body, user, ip)
 * 2. Exécute l'action
 * 3. Log dans audit_logs avec succès/échec
 * 4. Capture les valeurs avant/après pour les UPDATE
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si pas d'utilisateur, pas d'audit (routes publiques)
    if (!user) {
      return next.handle();
    }

    // Vérifier si l'audit est désactivé pour cette route
    const disableAudit = this.reflector.getAllAndOverride<boolean>(
      DISABLE_AUDIT,
      [context.getHandler(), context.getClass()],
    );

    if (disableAudit) {
      return next.handle();
    }

    // Extraire les informations de la requête
    const httpMethod = request.method;
    const requestUrl = request.url;
    const ipAddress = request.ip || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'];

    // Déterminer l'action basée sur la méthode HTTP
    let action: AuditLog['action'] = 'OTHER';
    if (httpMethod === 'POST') action = 'CREATE';
    else if (httpMethod === 'PUT' || httpMethod === 'PATCH') action = 'UPDATE';
    else if (httpMethod === 'DELETE') action = 'DELETE';

    // Permettre de surcharger l'action via décorateur
    const customAction = this.reflector.get<AuditLog['action']>(
      AUDIT_ACTION,
      context.getHandler(),
    );
    if (customAction) action = customAction;

    // Déterminer le type d'entité
    const entityType =
      this.reflector.get<string>(AUDIT_ENTITY_TYPE, context.getHandler()) ||
      this.extractEntityTypeFromUrl(requestUrl);

    // Exécuter la requête et capturer le résultat
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: async (response) => {
          // Succès
          await this.createAuditLog({
            organization_id: user.organization_id,
            user_id: user.id,
            user_email: user.email,
            user_role: user.role,
            action,
            entity_type: entityType,
            entity_id: this.extractEntityId(request, response),
            old_values: null, // TODO: Capturer avant modification
            new_values: this.sanitizeValues(request.body || response),
            http_method: httpMethod,
            request_url: requestUrl,
            ip_address: ipAddress,
            user_agent: userAgent,
            success: true,
            description: this.generateDescription(
              action,
              entityType,
              user.email,
            ),
          });
        },
        error: async (error) => {
          // Échec
          await this.createAuditLog({
            organization_id: user.organization_id,
            user_id: user.id,
            user_email: user.email,
            user_role: user.role,
            action,
            entity_type: entityType,
            entity_id: null,
            old_values: null,
            new_values: this.sanitizeValues(request.body),
            http_method: httpMethod,
            request_url: requestUrl,
            ip_address: ipAddress,
            user_agent: userAgent,
            success: false,
            error_message: error.message,
            description: `Failed: ${this.generateDescription(action, entityType, user.email)}`,
          });
        },
      }),
    );
  }

  private async createAuditLog(data: Partial<AuditLog>): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create(data);
      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      // Ne pas faire échouer la requête si l'audit échoue
      console.error('Failed to create audit log:', error);
    }
  }

  private extractEntityTypeFromUrl(url: string): string {
    // Extraire le type d'entité depuis l'URL
    // Ex: /api/users/123 → User
    // Ex: /api/courses/456 → Course
    const parts = url.split('/').filter((p) => p && p !== 'api');
    if (parts.length > 0) {
      const type = parts[0];
      // Capitaliser et singulariser
      return type.charAt(0).toUpperCase() + type.slice(1, -1);
    }
    return 'Unknown';
  }

  private extractEntityId(request: any, response: any): string | null {
    // Essayer d'extraire l'ID depuis les params
    if (request.params?.id) return request.params.id;

    // Essayer depuis la réponse (création)
    if (response?.id) return response.id;

    return null;
  }

  private sanitizeValues(data: any): Record<string, any> | null {
    if (!data) return null;

    // Cloner pour éviter les modifications
    const sanitized = { ...data };

    // Supprimer les champs sensibles
    const sensitiveFields = [
      'password',
      'password_hash',
      'token',
      'secret',
      'api_key',
      'credit_card',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private generateDescription(
    action: AuditLog['action'],
    entityType: string,
    userEmail: string,
  ): string {
    const actionMap = {
      CREATE: 'created',
      UPDATE: 'updated',
      DELETE: 'deleted',
      SOFT_DELETE: 'soft deleted',
      RESTORE: 'restored',
      LOGIN: 'logged in',
      LOGOUT: 'logged out',
      FAILED_LOGIN: 'failed to login',
      PASSWORD_CHANGE: 'changed password',
      CANCEL: 'cancelled',
      RENEW: 'renewed',
      SUSPEND: 'suspended',
      REACTIVATE: 'reactivated',
      OTHER: 'performed action on',
    };

    const actionText = actionMap[action] || 'performed action on';
    return `${userEmail} ${actionText} ${entityType}`;
  }
}
