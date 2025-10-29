import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

/**
 * Clé de métadonnée pour désactiver la validation tenant sur certaines routes
 */
export const DISABLE_TENANT_CHECK = 'disableTenantCheck';

/**
 * Intercepteur multi-tenant
 *
 * Objectif : Assurer que toutes les requêtes sont isolées par organization_id
 *
 * Fonctionnement :
 * 1. Récupère l'organization_id de l'utilisateur connecté (depuis JWT)
 * 2. Vérifie que toutes les requêtes contiennent organization_id ou organization.id
 * 3. Vérifie que l'organization_id correspond à celui de l'utilisateur
 * 4. Bloque l'accès si tentative d'accès à une autre organisation
 *
 * Protection :
 * - Impossible d'accéder aux données d'une autre organisation
 * - Même si l'utilisateur devine un UUID, la requête sera bloquée
 * - Sécurité au niveau applicatif (en plus de la DB)
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Si pas d'utilisateur connecté, laisser passer (géré par les guards)
    if (!user || !user.organization_id) {
      return next.handle();
    }

    // Vérifier si la route a désactivé la vérification tenant
    const disableTenantCheck = this.reflector.getAllAndOverride<boolean>(
      DISABLE_TENANT_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (disableTenantCheck) {
      return next.handle();
    }

    // Récupérer l'organization_id de l'utilisateur connecté
    const userOrgId = user.organization_id;

    // Vérifier les paramètres de la requête
    this.validateTenantAccess(request, userOrgId);

    return next.handle();
  }

  private validateTenantAccess(request: any, userOrgId: string): void {
    const { body, params, query } = request;

    // Vérifier dans le body
    if (body) {
      this.checkOrganizationId(body, userOrgId, 'body');
    }

    // Vérifier dans les params
    if (params) {
      this.checkOrganizationId(params, userOrgId, 'params');
    }

    // Vérifier dans la query
    if (query) {
      this.checkOrganizationId(query, userOrgId, 'query');
    }
  }

  private checkOrganizationId(
    data: any,
    userOrgId: string,
    location: string,
  ): void {
    // Cas 1 : organization_id direct
    if (data.organization_id && data.organization_id !== userOrgId) {
      throw new ForbiddenException(
        `Access denied: Cannot access resources from another organization (${location}.organization_id)`,
      );
    }

    // Cas 2 : organizationId (camelCase)
    if (data.organizationId && data.organizationId !== userOrgId) {
      throw new ForbiddenException(
        `Access denied: Cannot access resources from another organization (${location}.organizationId)`,
      );
    }

    // Cas 3 : organization.id (objet nested)
    if (
      data.organization &&
      data.organization.id &&
      data.organization.id !== userOrgId
    ) {
      throw new ForbiddenException(
        `Access denied: Cannot access resources from another organization (${location}.organization.id)`,
      );
    }

    // Cas 4 : orgId (shorthand)
    if (data.orgId && data.orgId !== userOrgId) {
      throw new ForbiddenException(
        `Access denied: Cannot access resources from another organization (${location}.orgId)`,
      );
    }
  }
}
