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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
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

@ApiTags('subscriptions')
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Créer un nouvel abonnement',
    description:
      'Crée un nouvel abonnement pour un utilisateur avec les détails du type d\'abonnement, les informations de paiement et la période de validité. Accessible aux administrateurs et coachs.',
  })
  @ApiBody({
    type: CreateSubscriptionDto,
    description: 'Données de création de l\'abonnement',
    examples: {
      monthlySubscription: {
        summary: 'Abonnement mensuel',
        value: {
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          subscription_type: {
            name: 'Abonnement Mensuel Premium',
            duration_months: 1,
            price: 79.99,
            currency: 'EUR',
            description: 'Accès illimité à tous les cours CrossFit',
            benefits: [
              'Accès illimité aux cours',
              'Suivi personnalisé',
              '1 séance coaching gratuite',
            ],
          },
          start_date: '2025-11-01T00:00:00Z',
          amount_paid: 79.99,
          currency: 'EUR',
          payment_status: 'paid',
          payment_method: 'Carte bancaire',
          payment_reference: 'PAY-123456789',
          auto_renew: true,
          notes: 'Tarif promotionnel appliqué',
        },
      },
      quarterlySubscription: {
        summary: 'Abonnement trimestriel',
        value: {
          user_id: '223e4567-e89b-12d3-a456-426614174002',
          subscription_type: {
            name: 'Abonnement Trimestriel Standard',
            duration_months: 3,
            price: 219.99,
            currency: 'EUR',
            description: 'Engagement 3 mois - Économisez 10%',
            benefits: [
              'Accès illimité aux cours',
              '2 séances coaching gratuites',
              'Suivi nutritionnel',
            ],
          },
          start_date: '2025-11-01T00:00:00Z',
          amount_paid: 219.99,
          currency: 'EUR',
          payment_status: 'paid',
          payment_method: 'Virement bancaire',
          payment_reference: 'TRANSFER-987654321',
          auto_renew: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Abonnement créé avec succès',
    schema: {
      example: {
        id: '323e4567-e89b-12d3-a456-426614174003',
        organization_id: '423e4567-e89b-12d3-a456-426614174004',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        subscription_type: {
          name: 'Abonnement Mensuel Premium',
          duration_months: 1,
          price: 79.99,
          currency: 'EUR',
          description: 'Accès illimité à tous les cours CrossFit',
          benefits: [
            'Accès illimité aux cours',
            'Suivi personnalisé',
            '1 séance coaching gratuite',
          ],
        },
        status: 'active',
        start_date: '2025-11-01',
        end_date: '2025-12-01',
        last_renewed_at: null,
        amount_paid: 79.99,
        currency: 'EUR',
        payment_status: 'paid',
        payment_date: '2025-10-30T10:30:00Z',
        payment_method: 'Carte bancaire',
        payment_reference: 'PAY-123456789',
        auto_renew: true,
        cancelled_at: null,
        cancellation_reason: null,
        cancelled_by_user_id: null,
        notes: 'Tarif promotionnel appliqué',
        metadata: {},
        created_at: '2025-10-30T10:30:00Z',
        updated_at: '2025-10-30T10:30:00Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou utilisateur déjà abonné',
    schema: {
      example: {
        statusCode: 400,
        message:
          'L\'utilisateur possède déjà un abonnement actif ou les données fournies sont invalides',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin, coach',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Utilisateur non trouvé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la création de l\'abonnement',
        error: 'Internal Server Error',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer tous les abonnements',
    description:
      'Retourne la liste complète des abonnements de l\'organisation, incluant tous les statuts (actifs, expirés, annulés, suspendus). Accessible aux administrateurs et coachs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des abonnements récupérée avec succès',
    schema: {
      example: [
        {
          id: '323e4567-e89b-12d3-a456-426614174003',
          organization_id: '423e4567-e89b-12d3-a456-426614174004',
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          subscription_type: {
            name: 'Abonnement Mensuel Premium',
            duration_months: 1,
            price: 79.99,
            currency: 'EUR',
            description: 'Accès illimité à tous les cours CrossFit',
            benefits: [
              'Accès illimité aux cours',
              'Suivi personnalisé',
              '1 séance coaching gratuite',
            ],
          },
          status: 'active',
          start_date: '2025-11-01',
          end_date: '2025-12-01',
          last_renewed_at: null,
          amount_paid: 79.99,
          currency: 'EUR',
          payment_status: 'paid',
          payment_date: '2025-10-30T10:30:00Z',
          payment_method: 'Carte bancaire',
          payment_reference: 'PAY-123456789',
          auto_renew: true,
          cancelled_at: null,
          cancellation_reason: null,
          cancelled_by_user_id: null,
          notes: 'Tarif promotionnel appliqué',
          metadata: {},
          created_at: '2025-10-30T10:30:00Z',
          updated_at: '2025-10-30T10:30:00Z',
          deleted_at: null,
        },
        {
          id: '523e4567-e89b-12d3-a456-426614174005',
          organization_id: '423e4567-e89b-12d3-a456-426614174004',
          user_id: '223e4567-e89b-12d3-a456-426614174002',
          subscription_type: {
            name: 'Abonnement Annuel Gold',
            duration_months: 12,
            price: 799.99,
            currency: 'EUR',
            description: 'Engagement 1 an - Meilleur prix',
            benefits: [
              'Accès illimité aux cours',
              '10 séances coaching gratuites',
              'Suivi nutritionnel premium',
              'Événements exclusifs',
            ],
          },
          status: 'active',
          start_date: '2025-01-01',
          end_date: '2026-01-01',
          last_renewed_at: null,
          amount_paid: 799.99,
          currency: 'EUR',
          payment_status: 'paid',
          payment_date: '2024-12-28T14:20:00Z',
          payment_method: 'Carte bancaire',
          payment_reference: 'PAY-ANNUAL-2025',
          auto_renew: true,
          cancelled_at: null,
          cancellation_reason: null,
          cancelled_by_user_id: null,
          notes: null,
          metadata: {},
          created_at: '2024-12-28T14:20:00Z',
          updated_at: '2024-12-28T14:20:00Z',
          deleted_at: null,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin, coach',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la récupération des abonnements',
        error: 'Internal Server Error',
      },
    },
  })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.findAll(user.organization_id);
  }

  /**
   * GET /subscriptions/stats
   * Statistiques des abonnements de l'organisation
   */
  @Get('stats')
  @Roles('admin', 'coach')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtenir les statistiques des abonnements',
    description:
      'Retourne des statistiques agrégées sur les abonnements de l\'organisation: nombre total, actifs, expirés, annulés, suspendus, revenus totaux, moyens, taux de renouvellement, etc. Accessible aux administrateurs et coachs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
    schema: {
      example: {
        total: 150,
        active: 120,
        expired: 15,
        cancelled: 10,
        suspended: 5,
        total_revenue: 11999.85,
        average_subscription_value: 79.99,
        renewal_rate: 0.85,
        expiring_soon: 12,
        payment_methods: {
          'Carte bancaire': 100,
          'Virement bancaire': 30,
          'Espèces': 20,
        },
        subscription_types: {
          'Abonnement Mensuel Premium': 80,
          'Abonnement Trimestriel Standard': 45,
          'Abonnement Annuel Gold': 25,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin, coach',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors du calcul des statistiques',
        error: 'Internal Server Error',
      },
    },
  })
  getStats(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.getStats(user.organization_id);
  }

  /**
   * GET /subscriptions/expiring-soon
   * Récupérer les abonnements qui expirent bientôt (7 jours)
   */
  @Get('expiring-soon')
  @Roles('admin', 'coach')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer les abonnements expirant bientôt',
    description:
      'Retourne la liste des abonnements qui expirent dans les 7 prochains jours. Utile pour relancer les utilisateurs et proposer un renouvellement. Accessible aux administrateurs et coachs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des abonnements expirant bientôt récupérée avec succès',
    schema: {
      example: [
        {
          id: '623e4567-e89b-12d3-a456-426614174006',
          organization_id: '423e4567-e89b-12d3-a456-426614174004',
          user_id: '323e4567-e89b-12d3-a456-426614174003',
          subscription_type: {
            name: 'Abonnement Mensuel Premium',
            duration_months: 1,
            price: 79.99,
            currency: 'EUR',
            description: 'Accès illimité à tous les cours CrossFit',
            benefits: [
              'Accès illimité aux cours',
              'Suivi personnalisé',
              '1 séance coaching gratuite',
            ],
          },
          status: 'active',
          start_date: '2025-10-05',
          end_date: '2025-11-05',
          last_renewed_at: null,
          amount_paid: 79.99,
          currency: 'EUR',
          payment_status: 'paid',
          payment_date: '2025-10-05T09:15:00Z',
          payment_method: 'Carte bancaire',
          payment_reference: 'PAY-EXPIRING-001',
          auto_renew: false,
          cancelled_at: null,
          cancellation_reason: null,
          cancelled_by_user_id: null,
          notes: null,
          metadata: {},
          created_at: '2025-10-05T09:15:00Z',
          updated_at: '2025-10-05T09:15:00Z',
          deleted_at: null,
          days_remaining: 6,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin, coach',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la récupération des abonnements expirant',
        error: 'Internal Server Error',
      },
    },
  })
  findExpiringSoon(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.findExpiringSoon(user.organization_id);
  }

  /**
   * GET /subscriptions/expired
   * Récupérer les abonnements expirés
   */
  @Get('expired')
  @Roles('admin', 'coach')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer les abonnements expirés',
    description:
      'Retourne la liste de tous les abonnements dont la date de fin est dépassée. Accessible aux administrateurs et coachs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des abonnements expirés récupérée avec succès',
    schema: {
      example: [
        {
          id: '723e4567-e89b-12d3-a456-426614174007',
          organization_id: '423e4567-e89b-12d3-a456-426614174004',
          user_id: '423e4567-e89b-12d3-a456-426614174004',
          subscription_type: {
            name: 'Abonnement Mensuel Premium',
            duration_months: 1,
            price: 79.99,
            currency: 'EUR',
            description: 'Accès illimité à tous les cours CrossFit',
            benefits: [
              'Accès illimité aux cours',
              'Suivi personnalisé',
              '1 séance coaching gratuite',
            ],
          },
          status: 'expired',
          start_date: '2025-09-15',
          end_date: '2025-10-15',
          last_renewed_at: null,
          amount_paid: 79.99,
          currency: 'EUR',
          payment_status: 'paid',
          payment_date: '2025-09-15T11:00:00Z',
          payment_method: 'Espèces',
          payment_reference: null,
          auto_renew: false,
          cancelled_at: null,
          cancellation_reason: null,
          cancelled_by_user_id: null,
          notes: null,
          metadata: {},
          created_at: '2025-09-15T11:00:00Z',
          updated_at: '2025-10-16T03:00:00Z',
          deleted_at: null,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin, coach',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la récupération des abonnements expirés',
        error: 'Internal Server Error',
      },
    },
  })
  findExpired(@CurrentUser() user: CurrentUserData) {
    return this.subscriptionsService.findExpired(user.organization_id);
  }

  /**
   * POST /subscriptions/mark-expired
   * Marquer automatiquement les abonnements expirés
   */
  @Post('mark-expired')
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Marquer les abonnements expirés',
    description:
      'Processus automatique qui parcourt tous les abonnements actifs et marque comme "expired" ceux dont la date de fin est dépassée. Accessible uniquement aux administrateurs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnements expirés marqués avec succès',
    schema: {
      example: {
        marked_expired: 5,
        subscription_ids: [
          '823e4567-e89b-12d3-a456-426614174008',
          '923e4567-e89b-12d3-a456-426614174009',
          'a23e4567-e89b-12d3-a456-42661417400a',
          'b23e4567-e89b-12d3-a456-42661417400b',
          'c23e4567-e89b-12d3-a456-42661417400c',
        ],
        message: '5 abonnements ont été marqués comme expirés',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors du marquage des abonnements expirés',
        error: 'Internal Server Error',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer l\'historique des abonnements d\'un utilisateur',
    description:
      'Retourne tous les abonnements (actifs, expirés, annulés) d\'un utilisateur spécifique. Permet de consulter l\'historique complet des abonnements. Accessible à tous les utilisateurs authentifiés.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Identifiant UUID de l\'utilisateur',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Historique des abonnements récupéré avec succès',
    schema: {
      example: [
        {
          id: '323e4567-e89b-12d3-a456-426614174003',
          organization_id: '423e4567-e89b-12d3-a456-426614174004',
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          subscription_type: {
            name: 'Abonnement Mensuel Premium',
            duration_months: 1,
            price: 79.99,
            currency: 'EUR',
            description: 'Accès illimité à tous les cours CrossFit',
            benefits: [
              'Accès illimité aux cours',
              'Suivi personnalisé',
              '1 séance coaching gratuite',
            ],
          },
          status: 'active',
          start_date: '2025-11-01',
          end_date: '2025-12-01',
          last_renewed_at: '2025-11-01T00:00:00Z',
          amount_paid: 79.99,
          currency: 'EUR',
          payment_status: 'paid',
          payment_date: '2025-10-30T10:30:00Z',
          payment_method: 'Carte bancaire',
          payment_reference: 'PAY-123456789',
          auto_renew: true,
          cancelled_at: null,
          cancellation_reason: null,
          cancelled_by_user_id: null,
          notes: 'Tarif promotionnel appliqué',
          metadata: {},
          created_at: '2025-10-30T10:30:00Z',
          updated_at: '2025-11-01T00:00:00Z',
          deleted_at: null,
        },
        {
          id: 'd23e4567-e89b-12d3-a456-42661417400d',
          organization_id: '423e4567-e89b-12d3-a456-426614174004',
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          subscription_type: {
            name: 'Abonnement Mensuel Premium',
            duration_months: 1,
            price: 79.99,
            currency: 'EUR',
            description: 'Accès illimité à tous les cours CrossFit',
            benefits: [
              'Accès illimité aux cours',
              'Suivi personnalisé',
              '1 séance coaching gratuite',
            ],
          },
          status: 'expired',
          start_date: '2025-10-01',
          end_date: '2025-11-01',
          last_renewed_at: null,
          amount_paid: 79.99,
          currency: 'EUR',
          payment_status: 'paid',
          payment_date: '2025-09-30T14:20:00Z',
          payment_method: 'Carte bancaire',
          payment_reference: 'PAY-987654321',
          auto_renew: false,
          cancelled_at: null,
          cancellation_reason: null,
          cancelled_by_user_id: null,
          notes: null,
          metadata: {},
          created_at: '2025-09-30T14:20:00Z',
          updated_at: '2025-11-02T03:00:00Z',
          deleted_at: null,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Utilisateur non trouvé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la récupération de l\'historique',
        error: 'Internal Server Error',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer l\'abonnement actif d\'un utilisateur',
    description:
      'Retourne l\'abonnement actuellement actif d\'un utilisateur spécifique (statut "active" et date de fin non dépassée). Retourne null si aucun abonnement actif. Accessible à tous les utilisateurs authentifiés.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Identifiant UUID de l\'utilisateur',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement actif récupéré avec succès',
    schema: {
      example: {
        id: '323e4567-e89b-12d3-a456-426614174003',
        organization_id: '423e4567-e89b-12d3-a456-426614174004',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        subscription_type: {
          name: 'Abonnement Mensuel Premium',
          duration_months: 1,
          price: 79.99,
          currency: 'EUR',
          description: 'Accès illimité à tous les cours CrossFit',
          benefits: [
            'Accès illimité aux cours',
            'Suivi personnalisé',
            '1 séance coaching gratuite',
          ],
        },
        status: 'active',
        start_date: '2025-11-01',
        end_date: '2025-12-01',
        last_renewed_at: null,
        amount_paid: 79.99,
        currency: 'EUR',
        payment_status: 'paid',
        payment_date: '2025-10-30T10:30:00Z',
        payment_method: 'Carte bancaire',
        payment_reference: 'PAY-123456789',
        auto_renew: true,
        cancelled_at: null,
        cancellation_reason: null,
        cancelled_by_user_id: null,
        notes: 'Tarif promotionnel appliqué',
        metadata: {},
        created_at: '2025-10-30T10:30:00Z',
        updated_at: '2025-10-30T10:30:00Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Aucun abonnement actif trouvé pour cet utilisateur',
    schema: {
      example: {
        statusCode: 404,
        message: 'Aucun abonnement actif trouvé pour cet utilisateur',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la récupération de l\'abonnement actif',
        error: 'Internal Server Error',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer un abonnement par ID',
    description:
      'Retourne les détails complets d\'un abonnement spécifique identifié par son UUID. Accessible aux administrateurs et coachs.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'abonnement',
    type: 'string',
    format: 'uuid',
    example: '323e4567-e89b-12d3-a456-426614174003',
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement récupéré avec succès',
    schema: {
      example: {
        id: '323e4567-e89b-12d3-a456-426614174003',
        organization_id: '423e4567-e89b-12d3-a456-426614174004',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        subscription_type: {
          name: 'Abonnement Mensuel Premium',
          duration_months: 1,
          price: 79.99,
          currency: 'EUR',
          description: 'Accès illimité à tous les cours CrossFit',
          benefits: [
            'Accès illimité aux cours',
            'Suivi personnalisé',
            '1 séance coaching gratuite',
          ],
        },
        status: 'active',
        start_date: '2025-11-01',
        end_date: '2025-12-01',
        last_renewed_at: null,
        amount_paid: 79.99,
        currency: 'EUR',
        payment_status: 'paid',
        payment_date: '2025-10-30T10:30:00Z',
        payment_method: 'Carte bancaire',
        payment_reference: 'PAY-123456789',
        auto_renew: true,
        cancelled_at: null,
        cancellation_reason: null,
        cancelled_by_user_id: null,
        notes: 'Tarif promotionnel appliqué',
        metadata: {},
        created_at: '2025-10-30T10:30:00Z',
        updated_at: '2025-10-30T10:30:00Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin, coach',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Abonnement non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Abonnement non trouvé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la récupération de l\'abonnement',
        error: 'Internal Server Error',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Renouveler un abonnement',
    description:
      'Renouvelle un abonnement existant en prolongeant sa date de fin selon la durée du type d\'abonnement. Enregistre les nouvelles informations de paiement et met à jour le statut. Accessible aux administrateurs et coachs.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'abonnement à renouveler',
    type: 'string',
    format: 'uuid',
    example: '323e4567-e89b-12d3-a456-426614174003',
  })
  @ApiBody({
    type: RenewSubscriptionDto,
    description: 'Données de renouvellement de l\'abonnement',
    examples: {
      renewWithPayment: {
        summary: 'Renouvellement avec paiement',
        value: {
          amount_paid: 79.99,
          payment_status: 'paid',
          payment_method: 'Carte bancaire',
          payment_reference: 'PAY-RENEW-123456',
          notes: 'Renouvellement automatique',
        },
      },
      renewPending: {
        summary: 'Renouvellement en attente de paiement',
        value: {
          amount_paid: 79.99,
          payment_status: 'pending',
          payment_method: 'Virement bancaire',
          notes: 'En attente de confirmation bancaire',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement renouvelé avec succès',
    schema: {
      example: {
        id: '323e4567-e89b-12d3-a456-426614174003',
        organization_id: '423e4567-e89b-12d3-a456-426614174004',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        subscription_type: {
          name: 'Abonnement Mensuel Premium',
          duration_months: 1,
          price: 79.99,
          currency: 'EUR',
          description: 'Accès illimité à tous les cours CrossFit',
          benefits: [
            'Accès illimité aux cours',
            'Suivi personnalisé',
            '1 séance coaching gratuite',
          ],
        },
        status: 'active',
        start_date: '2025-11-01',
        end_date: '2026-01-01',
        last_renewed_at: '2025-12-01T10:30:00Z',
        amount_paid: 79.99,
        currency: 'EUR',
        payment_status: 'paid',
        payment_date: '2025-12-01T10:30:00Z',
        payment_method: 'Carte bancaire',
        payment_reference: 'PAY-RENEW-123456',
        auto_renew: true,
        cancelled_at: null,
        cancellation_reason: null,
        cancelled_by_user_id: null,
        notes: 'Renouvellement automatique',
        metadata: {},
        created_at: '2025-10-30T10:30:00Z',
        updated_at: '2025-12-01T10:30:00Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Impossible de renouveler l\'abonnement',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Impossible de renouveler un abonnement annulé ou suspendu, ou données invalides',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin, coach',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Abonnement non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Abonnement non trouvé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors du renouvellement de l\'abonnement',
        error: 'Internal Server Error',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Annuler un abonnement',
    description:
      'Annule définitivement un abonnement en enregistrant la raison et l\'utilisateur ayant effectué l\'annulation. Change le statut à "cancelled". Accessible aux administrateurs et coachs.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'abonnement à annuler',
    type: 'string',
    format: 'uuid',
    example: '323e4567-e89b-12d3-a456-426614174003',
  })
  @ApiBody({
    type: CancelSubscriptionDto,
    description: 'Raison et notes d\'annulation',
    examples: {
      cancelMoving: {
        summary: 'Annulation pour déménagement',
        value: {
          reason: 'Déménagement dans une autre ville',
          notes: 'Client souhaite revenir dans 6 mois',
        },
      },
      cancelHealth: {
        summary: 'Annulation pour raisons médicales',
        value: {
          reason: 'Problème de santé temporaire',
          notes: 'Certificat médical fourni',
        },
      },
      cancelFinancial: {
        summary: 'Annulation pour raisons financières',
        value: {
          reason: 'Difficultés financières',
          notes: 'Demande de remboursement partiel',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement annulé avec succès',
    schema: {
      example: {
        id: '323e4567-e89b-12d3-a456-426614174003',
        organization_id: '423e4567-e89b-12d3-a456-426614174004',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        subscription_type: {
          name: 'Abonnement Mensuel Premium',
          duration_months: 1,
          price: 79.99,
          currency: 'EUR',
          description: 'Accès illimité à tous les cours CrossFit',
          benefits: [
            'Accès illimité aux cours',
            'Suivi personnalisé',
            '1 séance coaching gratuite',
          ],
        },
        status: 'cancelled',
        start_date: '2025-11-01',
        end_date: '2025-12-01',
        last_renewed_at: null,
        amount_paid: 79.99,
        currency: 'EUR',
        payment_status: 'paid',
        payment_date: '2025-10-30T10:30:00Z',
        payment_method: 'Carte bancaire',
        payment_reference: 'PAY-123456789',
        auto_renew: false,
        cancelled_at: '2025-11-15T14:25:00Z',
        cancellation_reason: 'Déménagement dans une autre ville',
        cancelled_by_user_id: '223e4567-e89b-12d3-a456-426614174002',
        notes: 'Client souhaite revenir dans 6 mois',
        metadata: {},
        created_at: '2025-10-30T10:30:00Z',
        updated_at: '2025-11-15T14:25:00Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Abonnement déjà annulé ou données invalides',
    schema: {
      example: {
        statusCode: 400,
        message: 'Cet abonnement est déjà annulé',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin, coach',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Abonnement non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Abonnement non trouvé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de l\'annulation de l\'abonnement',
        error: 'Internal Server Error',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Suspendre un abonnement',
    description:
      'Suspend temporairement un abonnement (par exemple, pour impayé ou demande de pause). Change le statut à "suspended". Accessible uniquement aux administrateurs.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'abonnement à suspendre',
    type: 'string',
    format: 'uuid',
    example: '323e4567-e89b-12d3-a456-426614174003',
  })
  @ApiBody({
    description: 'Raison de la suspension',
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Raison de la suspension de l\'abonnement',
          example: 'Impayé - 2 mensualités en retard',
        },
      },
      required: ['reason'],
    },
    examples: {
      suspendUnpaid: {
        summary: 'Suspension pour impayé',
        value: {
          reason: 'Impayé - 2 mensualités en retard',
        },
      },
      suspendRequest: {
        summary: 'Suspension à la demande',
        value: {
          reason: 'Demande de pause temporaire pour raisons personnelles',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement suspendu avec succès',
    schema: {
      example: {
        id: '323e4567-e89b-12d3-a456-426614174003',
        organization_id: '423e4567-e89b-12d3-a456-426614174004',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        subscription_type: {
          name: 'Abonnement Mensuel Premium',
          duration_months: 1,
          price: 79.99,
          currency: 'EUR',
          description: 'Accès illimité à tous les cours CrossFit',
          benefits: [
            'Accès illimité aux cours',
            'Suivi personnalisé',
            '1 séance coaching gratuite',
          ],
        },
        status: 'suspended',
        start_date: '2025-11-01',
        end_date: '2025-12-01',
        last_renewed_at: null,
        amount_paid: 79.99,
        currency: 'EUR',
        payment_status: 'paid',
        payment_date: '2025-10-30T10:30:00Z',
        payment_method: 'Carte bancaire',
        payment_reference: 'PAY-123456789',
        auto_renew: false,
        cancelled_at: null,
        cancellation_reason: null,
        cancelled_by_user_id: null,
        notes: 'Impayé - 2 mensualités en retard',
        metadata: {},
        created_at: '2025-10-30T10:30:00Z',
        updated_at: '2025-11-18T09:15:00Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Impossible de suspendre l\'abonnement',
    schema: {
      example: {
        statusCode: 400,
        message: 'Impossible de suspendre un abonnement déjà annulé ou expiré',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Abonnement non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Abonnement non trouvé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la suspension de l\'abonnement',
        error: 'Internal Server Error',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Réactiver un abonnement suspendu',
    description:
      'Réactive un abonnement précédemment suspendu en changeant son statut à "active". Accessible uniquement aux administrateurs.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'abonnement à réactiver',
    type: 'string',
    format: 'uuid',
    example: '323e4567-e89b-12d3-a456-426614174003',
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement réactivé avec succès',
    schema: {
      example: {
        id: '323e4567-e89b-12d3-a456-426614174003',
        organization_id: '423e4567-e89b-12d3-a456-426614174004',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        subscription_type: {
          name: 'Abonnement Mensuel Premium',
          duration_months: 1,
          price: 79.99,
          currency: 'EUR',
          description: 'Accès illimité à tous les cours CrossFit',
          benefits: [
            'Accès illimité aux cours',
            'Suivi personnalisé',
            '1 séance coaching gratuite',
          ],
        },
        status: 'active',
        start_date: '2025-11-01',
        end_date: '2025-12-01',
        last_renewed_at: null,
        amount_paid: 79.99,
        currency: 'EUR',
        payment_status: 'paid',
        payment_date: '2025-10-30T10:30:00Z',
        payment_method: 'Carte bancaire',
        payment_reference: 'PAY-123456789',
        auto_renew: true,
        cancelled_at: null,
        cancellation_reason: null,
        cancelled_by_user_id: null,
        notes: 'Réactivé après régularisation du paiement',
        metadata: {},
        created_at: '2025-10-30T10:30:00Z',
        updated_at: '2025-11-20T16:45:00Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Abonnement non suspendu',
    schema: {
      example: {
        statusCode: 400,
        message: 'Seuls les abonnements suspendus peuvent être réactivés',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Abonnement non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Abonnement non trouvé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la réactivation de l\'abonnement',
        error: 'Internal Server Error',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Mettre à jour un abonnement',
    description:
      'Met à jour partiellement les informations d\'un abonnement (statut, dates, paiement, notes, etc.). Accessible aux administrateurs et coachs.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'abonnement à modifier',
    type: 'string',
    format: 'uuid',
    example: '323e4567-e89b-12d3-a456-426614174003',
  })
  @ApiBody({
    type: UpdateSubscriptionDto,
    description: 'Données de mise à jour (partielles)',
    examples: {
      updatePaymentStatus: {
        summary: 'Mettre à jour le statut de paiement',
        value: {
          payment_status: 'paid',
          payment_method: 'Carte bancaire',
          payment_reference: 'PAY-UPDATE-789',
        },
      },
      extendSubscription: {
        summary: 'Prolonger la date de fin',
        value: {
          end_date: '2026-02-01T00:00:00Z',
          notes: 'Prolongation exceptionnelle accordée',
        },
      },
      updateNotes: {
        summary: 'Modifier les notes',
        value: {
          notes: 'Abonnement mis en pause temporairement pour blessure',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement mis à jour avec succès',
    schema: {
      example: {
        id: '323e4567-e89b-12d3-a456-426614174003',
        organization_id: '423e4567-e89b-12d3-a456-426614174004',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        subscription_type: {
          name: 'Abonnement Mensuel Premium',
          duration_months: 1,
          price: 79.99,
          currency: 'EUR',
          description: 'Accès illimité à tous les cours CrossFit',
          benefits: [
            'Accès illimité aux cours',
            'Suivi personnalisé',
            '1 séance coaching gratuite',
          ],
        },
        status: 'active',
        start_date: '2025-11-01',
        end_date: '2026-02-01',
        last_renewed_at: null,
        amount_paid: 79.99,
        currency: 'EUR',
        payment_status: 'paid',
        payment_date: '2025-10-30T10:30:00Z',
        payment_method: 'Carte bancaire',
        payment_reference: 'PAY-123456789',
        auto_renew: true,
        cancelled_at: null,
        cancellation_reason: null,
        cancelled_by_user_id: null,
        notes: 'Prolongation exceptionnelle accordée',
        metadata: {},
        created_at: '2025-10-30T10:30:00Z',
        updated_at: '2025-11-25T11:20:00Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
    schema: {
      example: {
        statusCode: 400,
        message: 'Les données fournies sont invalides',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin, coach',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Abonnement non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Abonnement non trouvé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la mise à jour de l\'abonnement',
        error: 'Internal Server Error',
      },
    },
  })
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Supprimer un abonnement',
    description:
      'Effectue une suppression logique (soft delete) d\'un abonnement en définissant sa date de suppression. L\'abonnement reste en base de données mais n\'est plus visible. Accessible uniquement aux administrateurs.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'abonnement à supprimer',
    type: 'string',
    format: 'uuid',
    example: '323e4567-e89b-12d3-a456-426614174003',
  })
  @ApiResponse({
    status: 200,
    description: 'Abonnement supprimé avec succès',
    schema: {
      example: {
        id: '323e4567-e89b-12d3-a456-426614174003',
        organization_id: '423e4567-e89b-12d3-a456-426614174004',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        subscription_type: {
          name: 'Abonnement Mensuel Premium',
          duration_months: 1,
          price: 79.99,
          currency: 'EUR',
          description: 'Accès illimité à tous les cours CrossFit',
          benefits: [
            'Accès illimité aux cours',
            'Suivi personnalisé',
            '1 séance coaching gratuite',
          ],
        },
        status: 'cancelled',
        start_date: '2025-11-01',
        end_date: '2025-12-01',
        last_renewed_at: null,
        amount_paid: 79.99,
        currency: 'EUR',
        payment_status: 'paid',
        payment_date: '2025-10-30T10:30:00Z',
        payment_method: 'Carte bancaire',
        payment_reference: 'PAY-123456789',
        auto_renew: false,
        cancelled_at: null,
        cancellation_reason: null,
        cancelled_by_user_id: null,
        notes: null,
        metadata: {},
        created_at: '2025-10-30T10:30:00Z',
        updated_at: '2025-11-28T15:30:00Z',
        deleted_at: '2025-11-28T15:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié - Token JWT manquant ou invalide',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Rôle insuffisant',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé. Rôles requis: admin',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Abonnement non trouvé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Abonnement non trouvé',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erreur serveur interne',
    schema: {
      example: {
        statusCode: 500,
        message: 'Erreur lors de la suppression de l\'abonnement',
        error: 'Internal Server Error',
      },
    },
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.subscriptionsService.remove(id, user.organization_id);
  }
}
