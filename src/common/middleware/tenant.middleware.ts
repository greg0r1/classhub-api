import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware multi-tenant
 *
 * Objectif : Ajouter le contexte d'organisation à chaque requête
 *
 * Fonctionnement :
 * 1. Extrait l'organization_id de l'utilisateur JWT (si authentifié)
 * 2. Ajoute cet ID au contexte de la requête
 * 3. Permet aux services d'y accéder facilement
 * 4. Log les accès pour audit
 *
 * Note : Ce middleware s'exécute APRÈS l'authentification JWT
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  use(req: Request & { user?: any }, res: Response, next: NextFunction) {
    // Si l'utilisateur est authentifié, extraire son organization_id
    if (req.user && req.user.organization_id) {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Ajouter au contexte de la requête
      req['organizationId'] = organizationId;
      req['tenantContext'] = {
        organizationId,
        userId,
        userRole,
      };

      // Log pour audit (mode debug uniquement)
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(
          `Tenant context: org=${organizationId}, user=${userId}, role=${userRole}, path=${req.path}`,
        );
      }
    }

    next();
  }
}

/**
 * Extension du type Request pour TypeScript
 */
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      tenantContext?: {
        organizationId: string;
        userId: string;
        userRole: string;
      };
    }
  }
}
