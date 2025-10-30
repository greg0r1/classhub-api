import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

@ApiTags('organizations')
@ApiBearerAuth('JWT-auth')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * POST /organizations
   * Créer une nouvelle organisation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une nouvelle organisation',
    description: 'Crée une nouvelle organisation avec les informations fournies. Le slug doit être unique et sera utilisé dans les URLs.',
  })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: 201,
    description: 'Organisation créée avec succès',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'CrossFit Lyon',
        slug: 'crossfit-lyon',
        email: 'contact@crossfit-lyon.fr',
        phone: '0612345678',
        address: '123 Rue de la République, 69001 Lyon',
        logo_url: 'https://example.com/logo.png',
        settings: {
          lock_attendance_by_coach: true,
          default_capacity: 15,
          season_start_month: 9,
          timezone: 'Europe/Paris',
        },
        subscription_status: 'trial',
        subscription_plan: 'free',
        trial_ends_at: '2025-11-30T23:59:59.000Z',
        metadata: {},
        created_at: '2025-10-30T10:00:00.000Z',
        updated_at: '2025-10-30T10:00:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou slug déjà utilisé',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'name must be longer than or equal to 2 characters',
          'slug must match ^[a-z0-9-]+$ regular expression',
          'email must be an email',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
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
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  /**
   * GET /organizations
   * Récupérer toutes les organisations
   */
  @Get()
  @ApiOperation({
    summary: 'Récupérer toutes les organisations',
    description: 'Retourne la liste complète de toutes les organisations non supprimées du système.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des organisations récupérée avec succès',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'CrossFit Lyon',
          slug: 'crossfit-lyon',
          email: 'contact@crossfit-lyon.fr',
          phone: '0612345678',
          address: '123 Rue de la République, 69001 Lyon',
          logo_url: 'https://example.com/logo.png',
          settings: {
            lock_attendance_by_coach: true,
            default_capacity: 15,
            season_start_month: 9,
            timezone: 'Europe/Paris',
          },
          subscription_status: 'active',
          subscription_plan: 'pro',
          trial_ends_at: null,
          metadata: {},
          created_at: '2025-10-30T10:00:00.000Z',
          updated_at: '2025-10-30T10:00:00.000Z',
          deleted_at: null,
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          name: 'Yoga Studio Paris',
          slug: 'yoga-studio-paris',
          email: 'hello@yogastudio.fr',
          phone: '0123456789',
          address: '45 Avenue des Champs-Élysées, 75008 Paris',
          logo_url: 'https://example.com/yoga-logo.png',
          settings: {
            lock_attendance_by_coach: false,
            default_capacity: 20,
            season_start_month: 9,
            timezone: 'Europe/Paris',
          },
          subscription_status: 'trial',
          subscription_plan: 'free',
          trial_ends_at: '2025-11-15T23:59:59.000Z',
          metadata: {},
          created_at: '2025-10-25T14:30:00.000Z',
          updated_at: '2025-10-25T14:30:00.000Z',
          deleted_at: null,
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
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
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  findAll() {
    return this.organizationsService.findAll();
  }

  /**
   * GET /organizations/:id
   * Récupérer une organisation par ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer une organisation par ID',
    description: 'Retourne les détails complets d\'une organisation spécifique identifiée par son UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de l\'organisation',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organisation trouvée avec succès',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'CrossFit Lyon',
        slug: 'crossfit-lyon',
        email: 'contact@crossfit-lyon.fr',
        phone: '0612345678',
        address: '123 Rue de la République, 69001 Lyon',
        logo_url: 'https://example.com/logo.png',
        settings: {
          lock_attendance_by_coach: true,
          default_capacity: 15,
          season_start_month: 9,
          timezone: 'Europe/Paris',
        },
        subscription_status: 'active',
        subscription_plan: 'pro',
        trial_ends_at: null,
        metadata: {},
        created_at: '2025-10-30T10:00:00.000Z',
        updated_at: '2025-10-30T10:00:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalide (format UUID requis)',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (uuid is expected)',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organisation non trouvée',
    schema: {
      example: {
        statusCode: 404,
        message: 'Organization not found',
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
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.findOne(id);
  }

  /**
   * GET /organizations/slug/:slug
   * Récupérer une organisation par slug
   */
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Récupérer une organisation par slug',
    description: 'Retourne les détails complets d\'une organisation identifiée par son slug unique (utilisé dans les URLs).',
  })
  @ApiParam({
    name: 'slug',
    description: 'Slug unique de l\'organisation (lettres minuscules, chiffres et tirets)',
    type: String,
    example: 'crossfit-lyon',
  })
  @ApiResponse({
    status: 200,
    description: 'Organisation trouvée avec succès',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'CrossFit Lyon',
        slug: 'crossfit-lyon',
        email: 'contact@crossfit-lyon.fr',
        phone: '0612345678',
        address: '123 Rue de la République, 69001 Lyon',
        logo_url: 'https://example.com/logo.png',
        settings: {
          lock_attendance_by_coach: true,
          default_capacity: 15,
          season_start_month: 9,
          timezone: 'Europe/Paris',
        },
        subscription_status: 'active',
        subscription_plan: 'pro',
        trial_ends_at: null,
        metadata: {},
        created_at: '2025-10-30T10:00:00.000Z',
        updated_at: '2025-10-30T10:00:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organisation non trouvée',
    schema: {
      example: {
        statusCode: 404,
        message: 'Organization not found',
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
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  findBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBySlug(slug);
  }

  /**
   * PATCH /organizations/:id
   * Mettre à jour une organisation
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour une organisation',
    description: 'Met à jour partiellement les informations d\'une organisation. Seuls les champs fournis seront modifiés.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de l\'organisation à mettre à jour',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({
    status: 200,
    description: 'Organisation mise à jour avec succès',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'CrossFit Lyon - Centre Ville',
        slug: 'crossfit-lyon',
        email: 'contact@crossfit-lyon.fr',
        phone: '0612345678',
        address: '123 Rue de la République, 69001 Lyon',
        logo_url: 'https://example.com/new-logo.png',
        settings: {
          lock_attendance_by_coach: true,
          default_capacity: 15,
          season_start_month: 9,
          timezone: 'Europe/Paris',
        },
        subscription_status: 'active',
        subscription_plan: 'pro',
        trial_ends_at: null,
        metadata: {},
        created_at: '2025-10-30T10:00:00.000Z',
        updated_at: '2025-10-30T15:30:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou ID invalide (format UUID requis)',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'slug must match ^[a-z0-9-]+$ regular expression',
          'email must be an email',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organisation non trouvée',
    schema: {
      example: {
        statusCode: 404,
        message: 'Organization not found',
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
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  /**
   * DELETE /organizations/:id
   * Supprimer une organisation (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer une organisation',
    description: 'Effectue une suppression logique (soft delete) d\'une organisation. L\'organisation sera marquée comme supprimée mais les données seront conservées et pourront être restaurées.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de l\'organisation à supprimer',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Organisation supprimée avec succès (aucun contenu retourné)',
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalide (format UUID requis)',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (uuid is expected)',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organisation non trouvée',
    schema: {
      example: {
        statusCode: 404,
        message: 'Organization not found',
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
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.organizationsService.remove(id);
  }

  /**
   * POST /organizations/:id/restore
   * Restaurer une organisation supprimée
   */
  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restaurer une organisation supprimée',
    description: 'Restaure une organisation précédemment supprimée (soft delete). L\'organisation redeviendra active et accessible.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de l\'organisation à restaurer',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organisation restaurée avec succès',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'CrossFit Lyon',
        slug: 'crossfit-lyon',
        email: 'contact@crossfit-lyon.fr',
        phone: '0612345678',
        address: '123 Rue de la République, 69001 Lyon',
        logo_url: 'https://example.com/logo.png',
        settings: {
          lock_attendance_by_coach: true,
          default_capacity: 15,
          season_start_month: 9,
          timezone: 'Europe/Paris',
        },
        subscription_status: 'active',
        subscription_plan: 'pro',
        trial_ends_at: null,
        metadata: {},
        created_at: '2025-10-30T10:00:00.000Z',
        updated_at: '2025-10-30T16:00:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalide (format UUID requis)',
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (uuid is expected)',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès interdit',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organisation non trouvée ou non supprimée',
    schema: {
      example: {
        statusCode: 404,
        message: 'Organization not found',
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
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.restore(id);
  }
}