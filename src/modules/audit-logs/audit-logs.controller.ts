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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DisableAudit } from '../../common/decorators/audit.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('audit-logs')
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer tous les logs d\'audit avec filtres',
    description:
      'Permet de consulter l\'historique complet des actions effectuées dans l\'organisation avec possibilité de filtrer par utilisateur, action, entité, période, etc. Accessible aux administrateurs et coaches.',
  })
  @ApiQuery({
    name: 'user_id',
    required: false,
    type: String,
    description: 'Filtrer par identifiant UUID de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiQuery({
    name: 'action',
    required: false,
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
    description: 'Filtrer par type d\'action effectuée',
    example: 'LOGIN',
  })
  @ApiQuery({
    name: 'entity_type',
    required: false,
    type: String,
    description: 'Filtrer par type d\'entité concernée',
    example: 'User',
  })
  @ApiQuery({
    name: 'entity_id',
    required: false,
    type: String,
    description: 'Filtrer par identifiant UUID de l\'entité concernée',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: Date,
    description: 'Date de début de la période de recherche',
    example: '2025-10-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: Date,
    description: 'Date de fin de la période de recherche',
    example: '2025-10-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'ip_address',
    required: false,
    type: String,
    description: 'Filtrer par adresse IP',
    example: '192.168.1.1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre maximum de résultats à retourner',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Nombre de résultats à ignorer (pagination)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des logs d\'audit avec pagination',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174100',
            organization_id: '123e4567-e89b-12d3-a456-426614174001',
            user_id: '123e4567-e89b-12d3-a456-426614174010',
            user_email: 'admin@example.com',
            user_role: 'admin',
            action: 'UPDATE',
            entity_type: 'User',
            entity_id: '123e4567-e89b-12d3-a456-426614174020',
            old_values: {
              first_name: 'John',
              role: 'member',
            },
            new_values: {
              first_name: 'Johnny',
              role: 'coach',
            },
            http_method: 'PATCH',
            request_url: '/users/123e4567-e89b-12d3-a456-426614174020',
            ip_address: '192.168.1.100',
            user_agent:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            description:
              'Mise à jour de l\'utilisateur Johnny Doe (role: member -> coach)',
            metadata: {},
            success: true,
            error_message: null,
            created_at: '2025-10-30T10:15:30.000Z',
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174101',
            organization_id: '123e4567-e89b-12d3-a456-426614174001',
            user_id: '123e4567-e89b-12d3-a456-426614174010',
            user_email: 'admin@example.com',
            user_role: 'admin',
            action: 'LOGIN',
            entity_type: 'Auth',
            entity_id: null,
            old_values: null,
            new_values: null,
            http_method: 'POST',
            request_url: '/auth/login',
            ip_address: '192.168.1.100',
            user_agent:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            description: 'Connexion réussie de admin@example.com',
            metadata: {},
            success: true,
            error_message: null,
            created_at: '2025-10-30T09:30:00.000Z',
          },
        ],
        total: 2,
        limit: 100,
        offset: 0,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres de requête invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description:
      'Accès interdit (rôle insuffisant - réservé aux admins et coaches)',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur lors de la récupération des logs',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtenir les statistiques des logs d\'audit',
    description:
      'Retourne des statistiques agrégées sur les actions effectuées dans l\'organisation sur une période donnée (nombre d\'actions par type, utilisateurs les plus actifs, etc.). Réservé aux administrateurs.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Nombre de jours à analyser (par défaut: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques des logs d\'audit',
    schema: {
      example: {
        period: {
          start_date: '2025-09-30T00:00:00.000Z',
          end_date: '2025-10-30T23:59:59.999Z',
          days: 30,
        },
        total_actions: 1250,
        actions_by_type: {
          LOGIN: 450,
          UPDATE: 320,
          CREATE: 180,
          DELETE: 50,
          FAILED_LOGIN: 25,
          LOGOUT: 225,
        },
        top_users: [
          {
            user_id: '123e4567-e89b-12d3-a456-426614174010',
            user_email: 'admin@example.com',
            actions_count: 380,
          },
          {
            user_id: '123e4567-e89b-12d3-a456-426614174011',
            user_email: 'coach@example.com',
            actions_count: 245,
          },
        ],
        entities_by_type: {
          User: 120,
          Course: 85,
          Attendance: 340,
          Subscription: 60,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètre days invalide',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit (réservé aux administrateurs)',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur lors du calcul des statistiques',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer les logs d\'audit récents',
    description:
      'Retourne les logs d\'audit les plus récents sur une période donnée (par défaut les dernières 24 heures). Utile pour le monitoring en temps réel.',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    description: 'Nombre d\'heures à analyser (par défaut: 24)',
    example: 24,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des logs récents',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174105',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          user_id: '123e4567-e89b-12d3-a456-426614174010',
          user_email: 'admin@example.com',
          user_role: 'admin',
          action: 'DELETE',
          entity_type: 'Course',
          entity_id: '123e4567-e89b-12d3-a456-426614174030',
          old_values: {
            title: 'Yoga débutant',
            is_active: true,
          },
          new_values: {
            is_active: false,
          },
          http_method: 'DELETE',
          request_url: '/courses/123e4567-e89b-12d3-a456-426614174030',
          ip_address: '192.168.1.100',
          user_agent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          description: 'Suppression du cours Yoga débutant',
          metadata: {},
          success: true,
          error_message: null,
          created_at: '2025-10-30T14:30:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174104',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          user_id: '123e4567-e89b-12d3-a456-426614174011',
          user_email: 'coach@example.com',
          user_role: 'coach',
          action: 'CREATE',
          entity_type: 'Attendance',
          entity_id: '123e4567-e89b-12d3-a456-426614174040',
          old_values: null,
          new_values: {
            user_id: '123e4567-e89b-12d3-a456-426614174012',
            course_id: '123e4567-e89b-12d3-a456-426614174031',
            status: 'present',
          },
          http_method: 'POST',
          request_url: '/attendances',
          ip_address: '192.168.1.105',
          user_agent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          description: 'Nouvelle présence enregistrée',
          metadata: {},
          success: true,
          error_message: null,
          created_at: '2025-10-30T13:45:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètre hours invalide',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description:
      'Accès interdit (rôle insuffisant - réservé aux admins et coaches)',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur lors de la récupération des logs récents',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer les tentatives de connexion échouées',
    description:
      'Retourne la liste des tentatives de connexion échouées pour détecter des activités suspectes ou des attaques potentielles. Réservé aux administrateurs.',
  })
  @ApiQuery({
    name: 'hours',
    required: false,
    type: Number,
    description: 'Nombre d\'heures à analyser (par défaut: 24)',
    example: 24,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des tentatives de connexion échouées',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174106',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          user_id: null,
          user_email: 'hacker@example.com',
          user_role: null,
          action: 'FAILED_LOGIN',
          entity_type: 'Auth',
          entity_id: null,
          old_values: null,
          new_values: {
            email: 'hacker@example.com',
            reason: 'Invalid credentials',
          },
          http_method: 'POST',
          request_url: '/auth/login',
          ip_address: '203.0.113.42',
          user_agent: 'curl/7.68.0',
          description: 'Tentative de connexion échouée pour hacker@example.com',
          metadata: {
            attempt_count: 5,
          },
          success: false,
          error_message: 'Invalid credentials',
          created_at: '2025-10-30T15:20:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174107',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          user_id: null,
          user_email: 'admin@example.com',
          user_role: null,
          action: 'FAILED_LOGIN',
          entity_type: 'Auth',
          entity_id: null,
          old_values: null,
          new_values: {
            email: 'admin@example.com',
            reason: 'Invalid credentials',
          },
          http_method: 'POST',
          request_url: '/auth/login',
          ip_address: '198.51.100.123',
          user_agent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          description:
            'Tentative de connexion échouée pour admin@example.com',
          metadata: {
            attempt_count: 2,
          },
          success: false,
          error_message: 'Invalid credentials',
          created_at: '2025-10-30T12:15:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètre hours invalide',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit (réservé aux administrateurs)',
  })
  @ApiResponse({
    status: 500,
    description:
      'Erreur serveur lors de la récupération des tentatives échouées',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Exporter les logs d\'audit (conformité RGPD)',
    description:
      'Exporte tous les logs d\'audit de l\'organisation sur une période donnée au format JSON. Utile pour la conformité RGPD et l\'archivage. Réservé aux administrateurs.',
  })
  @ApiQuery({
    name: 'start_date',
    required: false,
    type: Date,
    description: 'Date de début de la période d\'export',
    example: '2025-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'end_date',
    required: false,
    type: Date,
    description: 'Date de fin de la période d\'export',
    example: '2025-12-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description:
      'Export des logs au format JSON (peut être volumineux selon la période)',
    schema: {
      example: {
        export_date: '2025-10-30T16:00:00.000Z',
        organization_id: '123e4567-e89b-12d3-a456-426614174001',
        period: {
          start_date: '2025-01-01T00:00:00.000Z',
          end_date: '2025-12-31T23:59:59.999Z',
        },
        total_logs: 15420,
        logs: [
          {
            id: '123e4567-e89b-12d3-a456-426614174100',
            user_id: '123e4567-e89b-12d3-a456-426614174010',
            user_email: 'admin@example.com',
            user_role: 'admin',
            action: 'UPDATE',
            entity_type: 'User',
            entity_id: '123e4567-e89b-12d3-a456-426614174020',
            old_values: { role: 'member' },
            new_values: { role: 'coach' },
            http_method: 'PATCH',
            request_url: '/users/123e4567-e89b-12d3-a456-426614174020',
            ip_address: '192.168.1.100',
            user_agent:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            description: 'Mise à jour du rôle utilisateur',
            metadata: {},
            success: true,
            error_message: null,
            created_at: '2025-10-30T10:15:30.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres de date invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit (réservé aux administrateurs)',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur lors de l\'export des logs',
  })
  exportLogs(
    @CurrentUser() user: CurrentUserData,
    @Query('start_date') startDate?: Date,
    @Query('end_date') endDate?: Date,
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer l\'historique d\'une entité spécifique',
    description:
      'Retourne tous les logs d\'audit concernant une entité particulière (par exemple, tous les changements effectués sur un utilisateur, un cours, etc.). Utile pour tracer l\'historique complet d\'une entité.',
  })
  @ApiParam({
    name: 'entityType',
    type: String,
    description: 'Type de l\'entité (User, Course, Attendance, Subscription...)',
    example: 'User',
  })
  @ApiParam({
    name: 'entityId',
    type: String,
    description: 'Identifiant UUID de l\'entité',
    example: '123e4567-e89b-12d3-a456-426614174020',
  })
  @ApiResponse({
    status: 200,
    description: 'Historique complet de l\'entité',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174110',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          user_id: '123e4567-e89b-12d3-a456-426614174010',
          user_email: 'admin@example.com',
          user_role: 'admin',
          action: 'CREATE',
          entity_type: 'User',
          entity_id: '123e4567-e89b-12d3-a456-426614174020',
          old_values: null,
          new_values: {
            email: 'john.doe@example.com',
            first_name: 'John',
            last_name: 'Doe',
            role: 'member',
          },
          http_method: 'POST',
          request_url: '/users',
          ip_address: '192.168.1.100',
          user_agent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          description: 'Création de l\'utilisateur John Doe',
          metadata: {},
          success: true,
          error_message: null,
          created_at: '2025-10-01T09:00:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174111',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          user_id: '123e4567-e89b-12d3-a456-426614174010',
          user_email: 'admin@example.com',
          user_role: 'admin',
          action: 'UPDATE',
          entity_type: 'User',
          entity_id: '123e4567-e89b-12d3-a456-426614174020',
          old_values: {
            role: 'member',
          },
          new_values: {
            role: 'coach',
          },
          http_method: 'PATCH',
          request_url: '/users/123e4567-e89b-12d3-a456-426614174020',
          ip_address: '192.168.1.100',
          user_agent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          description:
            'Mise à jour de l\'utilisateur John Doe (role: member -> coach)',
          metadata: {},
          success: true,
          error_message: null,
          created_at: '2025-10-15T14:30:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres invalides (entityId doit être un UUID valide)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description:
      'Accès interdit (rôle insuffisant - réservé aux admins et coaches)',
  })
  @ApiResponse({
    status: 404,
    description: 'Aucun log trouvé pour cette entité',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur lors de la récupération de l\'historique',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer l\'historique des actions d\'un utilisateur',
    description:
      'Retourne toutes les actions effectuées par un utilisateur spécifique. Utile pour auditer l\'activité d\'un utilisateur ou répondre aux demandes RGPD.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'Identifiant UUID de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174010',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre maximum de résultats à retourner (par défaut: 100)',
    example: 100,
  })
  @ApiResponse({
    status: 200,
    description: 'Historique des actions de l\'utilisateur',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174112',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          user_id: '123e4567-e89b-12d3-a456-426614174010',
          user_email: 'admin@example.com',
          user_role: 'admin',
          action: 'LOGIN',
          entity_type: 'Auth',
          entity_id: null,
          old_values: null,
          new_values: null,
          http_method: 'POST',
          request_url: '/auth/login',
          ip_address: '192.168.1.100',
          user_agent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          description: 'Connexion réussie de admin@example.com',
          metadata: {},
          success: true,
          error_message: null,
          created_at: '2025-10-30T09:00:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174113',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          user_id: '123e4567-e89b-12d3-a456-426614174010',
          user_email: 'admin@example.com',
          user_role: 'admin',
          action: 'CREATE',
          entity_type: 'Course',
          entity_id: '123e4567-e89b-12d3-a456-426614174035',
          old_values: null,
          new_values: {
            title: 'Pilates avancé',
            description: 'Cours de Pilates niveau avancé',
            capacity: 15,
          },
          http_method: 'POST',
          request_url: '/courses',
          ip_address: '192.168.1.100',
          user_agent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          description: 'Création du cours Pilates avancé',
          metadata: {},
          success: true,
          error_message: null,
          created_at: '2025-10-30T10:30:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174114',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          user_id: '123e4567-e89b-12d3-a456-426614174010',
          user_email: 'admin@example.com',
          user_role: 'admin',
          action: 'UPDATE',
          entity_type: 'Subscription',
          entity_id: '123e4567-e89b-12d3-a456-426614174050',
          old_values: {
            status: 'active',
          },
          new_values: {
            status: 'suspended',
          },
          http_method: 'PATCH',
          request_url: '/subscriptions/123e4567-e89b-12d3-a456-426614174050',
          ip_address: '192.168.1.100',
          user_agent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          description: 'Suspension de l\'abonnement',
          metadata: {
            reason: 'Non-paiement',
          },
          success: true,
          error_message: null,
          created_at: '2025-10-30T15:45:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres invalides (userId doit être un UUID valide)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description:
      'Accès interdit (rôle insuffisant - réservé aux admins et coaches)',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé ou aucune action enregistrée',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur lors de la récupération de l\'historique',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer les détails d\'un log d\'audit spécifique',
    description:
      'Retourne les informations complètes d\'un log d\'audit par son identifiant.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identifiant UUID du log d\'audit',
    example: '123e4567-e89b-12d3-a456-426614174100',
  })
  @ApiResponse({
    status: 200,
    description: 'Détails du log d\'audit',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174100',
        organization_id: '123e4567-e89b-12d3-a456-426614174001',
        user_id: '123e4567-e89b-12d3-a456-426614174010',
        user_email: 'admin@example.com',
        user_role: 'admin',
        action: 'UPDATE',
        entity_type: 'User',
        entity_id: '123e4567-e89b-12d3-a456-426614174020',
        old_values: {
          first_name: 'John',
          last_name: 'Doe',
          role: 'member',
          email: 'john.doe@example.com',
        },
        new_values: {
          first_name: 'Johnny',
          last_name: 'Doe',
          role: 'coach',
          email: 'johnny.doe@example.com',
        },
        http_method: 'PATCH',
        request_url: '/users/123e4567-e89b-12d3-a456-426614174020',
        ip_address: '192.168.1.100',
        user_agent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
        description:
          'Mise à jour de l\'utilisateur Johnny Doe (first_name, email, role modifiés)',
        metadata: {
          changes_count: 3,
          changed_fields: ['first_name', 'email', 'role'],
        },
        success: true,
        error_message: null,
        created_at: '2025-10-30T10:15:30.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètre invalide (id doit être un UUID valide)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description:
      'Accès interdit (rôle insuffisant - réservé aux admins et coaches)',
  })
  @ApiResponse({
    status: 404,
    description: 'Log d\'audit non trouvé',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur lors de la récupération du log',
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Nettoyer les logs d\'audit anciens (politique de rétention)',
    description:
      'Supprime les logs d\'audit plus anciens que la période de rétention spécifiée. Par défaut, conserve les logs des 365 derniers jours. Cette opération est irréversible. Réservé aux administrateurs.',
  })
  @ApiQuery({
    name: 'retention_days',
    required: false,
    type: Number,
    description:
      'Nombre de jours de rétention (les logs plus anciens seront supprimés, par défaut: 365)',
    example: 365,
  })
  @ApiResponse({
    status: 201,
    description: 'Nettoyage effectué avec succès',
    schema: {
      example: {
        success: true,
        message: 'Nettoyage des logs anciens effectué avec succès',
        retention_days: 365,
        deleted_count: 1245,
        cutoff_date: '2024-10-30T00:00:00.000Z',
        remaining_logs: 14175,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètre retention_days invalide (doit être un nombre positif)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit (réservé aux administrateurs)',
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur lors du nettoyage des logs',
  })
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
