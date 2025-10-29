import { SetMetadata } from '@nestjs/common';
import { DISABLE_TENANT_CHECK } from '../interceptors/tenant.interceptor';

/**
 * Décorateur pour désactiver la vérification tenant sur une route
 *
 * Usage :
 * @DisableTenantCheck()
 * @Get('public-data')
 * getPublicData() { ... }
 *
 * Cas d'usage :
 * - Routes publiques (sans authentification)
 * - Routes d'administration système
 * - Routes de création d'organisation (signup)
 */
export const DisableTenantCheck = () => SetMetadata(DISABLE_TENANT_CHECK, true);
