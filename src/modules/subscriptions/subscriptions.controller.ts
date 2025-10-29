import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  RenewSubscriptionDto,
  CancelSubscriptionDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * POST /subscriptions
   * Créer un nouvel abonnement
   */
  @Post()
  @Roles('admin', 'coach')
  create(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.create(dto, user.organization_id);
  }

  /**
   * GET /subscriptions
   * Récupérer tous les abonnements de l'organisation
   */
  @Get()
  @Roles('admin', 'coach')
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.findAll(user.organization_id);
  }

  /**
   * GET /subscriptions/stats
   * Statistiques des abonnements de l'organisation
   */
  @Get('stats')
  @Roles('admin', 'coach')
  getStats(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.getStats(user.organization_id);
  }

  /**
   * GET /subscriptions/expiring-soon
   * Récupérer les abonnements qui expirent bientôt (7 jours)
   */
  @Get('expiring-soon')
  @Roles('admin', 'coach')
  findExpiringSoon(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.findExpiringSoon(user.organization_id);
  }

  /**
   * GET /subscriptions/expired
   * Récupérer les abonnements expirés
   */
  @Get('expired')
  @Roles('admin', 'coach')
  findExpired(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.findExpired(user.organization_id);
  }

  /**
   * POST /subscriptions/mark-expired
   * Marquer automatiquement les abonnements expirés
   */
  @Post('mark-expired')
  @Roles('admin')
  markExpired(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.markExpiredSubscriptions(
      user.organization_id,
    );
  }

  /**
   * GET /subscriptions/user/:userId
   * Récupérer tous les abonnements d'un utilisateur (historique)
   */
  @Get('user/:userId')
  findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.findByUser(userId, user.organization_id);
  }

  /**
   * GET /subscriptions/user/:userId/active
   * Récupérer l'abonnement actif d'un utilisateur
   */
  @Get('user/:userId/active')
  findActiveByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.findActiveByUser(
      userId,
      user.organization_id,
    );
  }

  /**
   * GET /subscriptions/:id
   * Récupérer un abonnement par ID
   */
  @Get(':id')
  @Roles('admin', 'coach')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.findOne(id, user.organization_id);
  }

  /**
   * POST /subscriptions/:id/renew
   * Renouveler un abonnement
   */
  @Post(':id/renew')
  @Roles('admin', 'coach')
  renew(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenewSubscriptionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.renew(id, dto, user.organization_id);
  }

  /**
   * POST /subscriptions/:id/cancel
   * Annuler un abonnement
   */
  @Post(':id/cancel')
  @Roles('admin', 'coach')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelSubscriptionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.cancel(
      id,
      dto,
      user.id,
      user.organization_id,
    );
  }

  /**
   * POST /subscriptions/:id/suspend
   * Suspendre un abonnement (temporaire)
   */
  @Post(':id/suspend')
  @Roles('admin')
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.suspend(id, reason, user.organization_id);
  }

  /**
   * POST /subscriptions/:id/reactivate
   * Réactiver un abonnement suspendu
   */
  @Post(':id/reactivate')
  @Roles('admin')
  reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.reactivate(id, user.organization_id);
  }

  /**
   * PATCH /subscriptions/:id
   * Mettre à jour un abonnement
   */
  @Patch(':id')
  @Roles('admin', 'coach')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.update(id, dto, user.organization_id);
  }

  /**
   * DELETE /subscriptions/:id
   * Supprimer un abonnement (soft delete)
   */
  @Delete(':id')
  @Roles('admin')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.remove(id, user.organization_id);
  }
}
