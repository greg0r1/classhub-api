import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DisableAudit } from '../../common/decorators/audit.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'coach') // Seuls admin et coach peuvent voir les logs
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * GET /audit-logs
   * Récupérer tous les logs avec filtres
   */
  @Get()
  @DisableAudit() // Pas d'audit des consultations d'audit (récursif)
  findAll(
    @Query() query: QueryAuditLogsDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.auditLogsService.findAll(user.organization_id, query);
  }

  /**
   * GET /audit-logs/stats
   * Statistiques des logs
   */
  @Get('stats')
  @DisableAudit()
  @Roles('admin')
  getStats(
    @Query('days', ParseIntPipe) days: number = 30,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.auditLogsService.getStats(user.organization_id, days);
  }

  /**
   * GET /audit-logs/recent
   * Logs récents (dernières 24h par défaut)
   */
  @Get('recent')
  @DisableAudit()
  findRecent(
    @Query('hours', ParseIntPipe) hours: number = 24,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.auditLogsService.findRecent(user.organization_id, hours);
  }

  /**
   * GET /audit-logs/failed-logins
   * Tentatives de connexion échouées
   */
  @Get('failed-logins')
  @DisableAudit()
  @Roles('admin')
  findFailedLogins(
    @Query('hours', ParseIntPipe) hours: number = 24,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.auditLogsService.findFailedLogins(user.organization_id, hours);
  }

  /**
   * GET /audit-logs/export
   * Exporter les logs (RGPD)
   */
  @Get('export')
  @Roles('admin')
  exportLogs(
    @Query('start_date') startDate?: Date,
    @Query('end_date') endDate?: Date,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.auditLogsService.exportLogs(
      user.organization_id,
      startDate,
      endDate,
    );
  }

  /**
   * GET /audit-logs/entity/:entityType/:entityId
   * Historique d'une entité spécifique
   */
  @Get('entity/:entityType/:entityId')
  @DisableAudit()
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.auditLogsService.findByEntity(
      entityType,
      entityId,
      user.organization_id,
    );
  }

  /**
   * GET /audit-logs/user/:userId
   * Historique d'un utilisateur
   */
  @Get('user/:userId')
  @DisableAudit()
  findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit', ParseIntPipe) limit: number = 100,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.auditLogsService.findByUser(
      userId,
      user.organization_id,
      limit,
    );
  }

  /**
   * GET /audit-logs/:id
   * Détails d'un log
   */
  @Get(':id')
  @DisableAudit()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.auditLogsService.findOne(id, user.organization_id);
  }

  /**
   * POST /audit-logs/clean
   * Nettoyer les logs anciens (retention policy)
   */
  @Post('clean')
  @Roles('admin')
  cleanOldLogs(
    @Query('retention_days', ParseIntPipe) retentionDays: number = 365,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.auditLogsService.cleanOldLogs(
      user.organization_id,
      retentionDays,
    );
  }
}
