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
  Query,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto } from './dto';

@ApiTags('courses')
@ApiBearerAuth('JWT-auth')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un nouveau cours',
    description:
      'Crée un nouveau cours (ponctuel ou récurrent). Si is_recurring est true, génère automatiquement les occurrences selon recurrence_rule. Les occurrences héritent du parent via parent_recurrence_id.',
  })
  @ApiBody({
    type: CreateCourseDto,
    description: 'Données du cours à créer',
    examples: {
      'cours-ponctuel': {
        summary: 'Cours ponctuel simple',
        value: {
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'CrossFit WOD - Débutants',
          description: 'Séance CrossFit adaptée aux débutants avec focus sur la technique',
          course_type: 'CrossFit',
          start_datetime: '2025-11-01T10:00:00Z',
          end_datetime: '2025-11-01T11:00:00Z',
          location: 'Salle principale, CrossFit Lyon',
          coach_id: '123e4567-e89b-12d3-a456-426614174001',
          max_capacity: 15,
          is_recurring: false,
          status: 'scheduled',
        },
      },
      'cours-recurrent-hebdomadaire': {
        summary: 'Cours récurrent hebdomadaire',
        value: {
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Yoga Vinyasa - Tous niveaux',
          description: 'Cours de yoga dynamique tous les lundis',
          course_type: 'Yoga',
          start_datetime: '2025-11-04T18:00:00Z',
          end_datetime: '2025-11-04T19:30:00Z',
          location: 'Studio Zen',
          coach_id: '123e4567-e89b-12d3-a456-426614174002',
          max_capacity: 20,
          is_recurring: true,
          recurrence_rule: {
            frequency: 'weekly',
            day_of_week: 1,
            interval: 1,
            end_date: '2025-12-31',
          },
          status: 'scheduled',
        },
      },
      'cours-recurrent-mensuel': {
        summary: 'Cours récurrent mensuel avec count',
        value: {
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Atelier Mobilité Avancé',
          description: 'Atelier mensuel spécial mobilité articulaire',
          course_type: 'Workshop',
          start_datetime: '2025-11-15T14:00:00Z',
          end_datetime: '2025-11-15T16:00:00Z',
          location: 'Grande salle',
          coach_id: '123e4567-e89b-12d3-a456-426614174003',
          max_capacity: 12,
          is_recurring: true,
          recurrence_rule: {
            frequency: 'monthly',
            interval: 1,
            count: 10,
          },
          status: 'scheduled',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Cours créé avec succès. Si récurrent, toutes les occurrences sont générées.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174100',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'CrossFit WOD - Débutants',
        description: 'Séance CrossFit adaptée aux débutants avec focus sur la technique',
        course_type: 'CrossFit',
        start_datetime: '2025-11-01T10:00:00.000Z',
        end_datetime: '2025-11-01T11:00:00.000Z',
        location: 'Salle principale, CrossFit Lyon',
        coach_id: '123e4567-e89b-12d3-a456-426614174001',
        max_capacity: 15,
        is_recurring: false,
        recurrence_rule: null,
        parent_recurrence_id: null,
        status: 'scheduled',
        cancellation_reason: null,
        cancelled_at: null,
        metadata: {},
        created_at: '2025-10-30T12:00:00.000Z',
        updated_at: '2025-10-30T12:00:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides (validation échouée, dates incohérentes, etc.)',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'start_datetime doit être une date ISO 8601 valide',
          'end_datetime doit être postérieure à start_datetime',
        ],
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
    description: 'Accès refusé - Permissions insuffisantes pour créer un cours',
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
    description: 'Organisation ou coach introuvable',
    schema: {
      example: {
        statusCode: 404,
        message: 'Organization with ID 123e4567-e89b-12d3-a456-426614174000 not found',
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
      },
    },
  })
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer tous les cours',
    description:
      'Retourne la liste de tous les cours (ponctuels et récurrents, incluant les occurrences générées). Filtrage optionnel par organization. Inclut les cours actifs uniquement (non supprimés).',
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    type: String,
    format: 'uuid',
    description: 'Filtrer par UUID d\'organisation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des cours récupérée avec succès',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174100',
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'CrossFit WOD - Débutants',
          description: 'Séance CrossFit adaptée aux débutants',
          course_type: 'CrossFit',
          start_datetime: '2025-11-01T10:00:00.000Z',
          end_datetime: '2025-11-01T11:00:00.000Z',
          location: 'Salle principale',
          coach_id: '123e4567-e89b-12d3-a456-426614174001',
          max_capacity: 15,
          is_recurring: false,
          recurrence_rule: null,
          parent_recurrence_id: null,
          status: 'scheduled',
          cancellation_reason: null,
          cancelled_at: null,
          metadata: {},
          created_at: '2025-10-30T12:00:00.000Z',
          updated_at: '2025-10-30T12:00:00.000Z',
          deleted_at: null,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174101',
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Yoga Vinyasa - Tous niveaux',
          description: 'Cours de yoga dynamique tous les lundis',
          course_type: 'Yoga',
          start_datetime: '2025-11-04T18:00:00.000Z',
          end_datetime: '2025-11-04T19:30:00.000Z',
          location: 'Studio Zen',
          coach_id: '123e4567-e89b-12d3-a456-426614174002',
          max_capacity: 20,
          is_recurring: true,
          recurrence_rule: {
            frequency: 'weekly',
            day_of_week: 1,
            interval: 1,
            end_date: '2025-12-31',
          },
          parent_recurrence_id: null,
          status: 'scheduled',
          cancellation_reason: null,
          cancelled_at: null,
          metadata: {},
          created_at: '2025-10-30T12:00:00.000Z',
          updated_at: '2025-10-30T12:00:00.000Z',
          deleted_at: null,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174102',
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Yoga Vinyasa - Tous niveaux',
          description: 'Cours de yoga dynamique tous les lundis',
          course_type: 'Yoga',
          start_datetime: '2025-11-11T18:00:00.000Z',
          end_datetime: '2025-11-11T19:30:00.000Z',
          location: 'Studio Zen',
          coach_id: '123e4567-e89b-12d3-a456-426614174002',
          max_capacity: 20,
          is_recurring: false,
          recurrence_rule: null,
          parent_recurrence_id: '123e4567-e89b-12d3-a456-426614174101',
          status: 'scheduled',
          cancellation_reason: null,
          cancelled_at: null,
          metadata: {},
          created_at: '2025-10-30T12:00:00.000Z',
          updated_at: '2025-10-30T12:00:00.000Z',
          deleted_at: null,
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres de requête invalides',
    schema: {
      example: {
        statusCode: 400,
        message: 'organizationId doit être un UUID valide',
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
    description: 'Accès refusé - Permissions insuffisantes',
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
    description: 'Organisation introuvable',
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
      },
    },
  })
  findAll(@Query('organizationId') organizationId?: string) {
    return this.coursesService.findAll(organizationId);
  }

  @Get('upcoming/:organizationId')
  @ApiOperation({
    summary: 'Récupérer les cours à venir',
    description:
      'Retourne les cours à venir (start_datetime > maintenant) pour une organisation, triés par date croissante. Limite optionnelle du nombre de résultats.',
  })
  @ApiParam({
    name: 'organizationId',
    type: String,
    format: 'uuid',
    description: 'UUID de l\'organisation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre maximum de cours à retourner',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des cours à venir récupérée avec succès',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174100',
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'CrossFit WOD - Débutants',
          description: 'Séance CrossFit adaptée aux débutants',
          course_type: 'CrossFit',
          start_datetime: '2025-11-01T10:00:00.000Z',
          end_datetime: '2025-11-01T11:00:00.000Z',
          location: 'Salle principale',
          coach_id: '123e4567-e89b-12d3-a456-426614174001',
          max_capacity: 15,
          is_recurring: false,
          recurrence_rule: null,
          parent_recurrence_id: null,
          status: 'scheduled',
          cancellation_reason: null,
          cancelled_at: null,
          metadata: {},
          created_at: '2025-10-30T12:00:00.000Z',
          updated_at: '2025-10-30T12:00:00.000Z',
          deleted_at: null,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174102',
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Yoga Vinyasa - Tous niveaux',
          description: 'Cours de yoga dynamique tous les lundis',
          course_type: 'Yoga',
          start_datetime: '2025-11-04T18:00:00.000Z',
          end_datetime: '2025-11-04T19:30:00.000Z',
          location: 'Studio Zen',
          coach_id: '123e4567-e89b-12d3-a456-426614174002',
          max_capacity: 20,
          is_recurring: false,
          recurrence_rule: null,
          parent_recurrence_id: '123e4567-e89b-12d3-a456-426614174101',
          status: 'scheduled',
          cancellation_reason: null,
          cancelled_at: null,
          metadata: {},
          created_at: '2025-10-30T12:00:00.000Z',
          updated_at: '2025-10-30T12:00:00.000Z',
          deleted_at: null,
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres invalides (UUID ou limit incorrect)',
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
    description: 'Accès refusé - Permissions insuffisantes',
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
    description: 'Organisation introuvable',
    schema: {
      example: {
        statusCode: 404,
        message: 'Organization with ID 123e4567-e89b-12d3-a456-426614174000 not found',
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
      },
    },
  })
  findUpcoming(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.coursesService.findUpcoming(organizationId, limit);
  }

  @Get('date-range/:organizationId')
  @ApiOperation({
    summary: 'Récupérer les cours dans une plage de dates',
    description:
      'Retourne tous les cours d\'une organisation dont start_datetime est compris entre startDate et endDate (inclus). Utile pour afficher un calendrier ou planning.',
  })
  @ApiParam({
    name: 'organizationId',
    type: String,
    format: 'uuid',
    description: 'UUID de l\'organisation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    format: 'date-time',
    description: 'Date de début de la plage (ISO 8601)',
    example: '2025-11-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    format: 'date-time',
    description: 'Date de fin de la plage (ISO 8601)',
    example: '2025-11-30T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des cours dans la plage de dates récupérée avec succès',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174100',
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'CrossFit WOD - Débutants',
          description: 'Séance CrossFit adaptée aux débutants',
          course_type: 'CrossFit',
          start_datetime: '2025-11-05T10:00:00.000Z',
          end_datetime: '2025-11-05T11:00:00.000Z',
          location: 'Salle principale',
          coach_id: '123e4567-e89b-12d3-a456-426614174001',
          max_capacity: 15,
          is_recurring: false,
          recurrence_rule: null,
          parent_recurrence_id: null,
          status: 'scheduled',
          cancellation_reason: null,
          cancelled_at: null,
          metadata: {},
          created_at: '2025-10-30T12:00:00.000Z',
          updated_at: '2025-10-30T12:00:00.000Z',
          deleted_at: null,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174102',
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Yoga Vinyasa - Tous niveaux',
          description: 'Cours de yoga dynamique tous les lundis',
          course_type: 'Yoga',
          start_datetime: '2025-11-11T18:00:00.000Z',
          end_datetime: '2025-11-11T19:30:00.000Z',
          location: 'Studio Zen',
          coach_id: '123e4567-e89b-12d3-a456-426614174002',
          max_capacity: 20,
          is_recurring: false,
          recurrence_rule: null,
          parent_recurrence_id: '123e4567-e89b-12d3-a456-426614174101',
          status: 'scheduled',
          cancellation_reason: null,
          cancelled_at: null,
          metadata: {},
          created_at: '2025-10-30T12:00:00.000Z',
          updated_at: '2025-10-30T12:00:00.000Z',
          deleted_at: null,
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres invalides (UUID incorrect, dates invalides, startDate > endDate)',
    schema: {
      example: {
        statusCode: 400,
        message: 'startDate doit être antérieure à endDate',
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
    description: 'Accès refusé - Permissions insuffisantes',
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
    description: 'Organisation introuvable',
    schema: {
      example: {
        statusCode: 404,
        message: 'Organization with ID 123e4567-e89b-12d3-a456-426614174000 not found',
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
      },
    },
  })
  findByDateRange(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.coursesService.findByDateRange(
      organizationId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer un cours par son ID',
    description:
      'Retourne les détails complets d\'un cours spécifique. Si le cours est une occurrence (parent_recurrence_id non null), la relation avec le cours parent est incluse.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID du cours',
    example: '123e4567-e89b-12d3-a456-426614174100',
  })
  @ApiResponse({
    status: 200,
    description: 'Cours récupéré avec succès',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174100',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'CrossFit WOD - Débutants',
        description: 'Séance CrossFit adaptée aux débutants avec focus sur la technique',
        course_type: 'CrossFit',
        start_datetime: '2025-11-01T10:00:00.000Z',
        end_datetime: '2025-11-01T11:00:00.000Z',
        location: 'Salle principale, CrossFit Lyon',
        coach_id: '123e4567-e89b-12d3-a456-426614174001',
        max_capacity: 15,
        is_recurring: false,
        recurrence_rule: null,
        parent_recurrence_id: null,
        status: 'scheduled',
        cancellation_reason: null,
        cancelled_at: null,
        metadata: {},
        created_at: '2025-10-30T12:00:00.000Z',
        updated_at: '2025-10-30T12:00:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'UUID invalide',
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
    description: 'Accès refusé - Permissions insuffisantes pour voir ce cours',
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
    description: 'Cours introuvable',
    schema: {
      example: {
        statusCode: 404,
        message: 'Course with ID 123e4567-e89b-12d3-a456-426614174100 not found',
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
      },
    },
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un cours',
    description:
      'Modifie partiellement un cours existant. Si le cours est un parent récurrent, les modifications ne s\'appliquent qu\'au parent (pas aux occurrences déjà générées). Pour modifier une occurrence, utilisez son ID spécifique.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID du cours à modifier',
    example: '123e4567-e89b-12d3-a456-426614174100',
  })
  @ApiBody({
    type: UpdateCourseDto,
    description: 'Champs à mettre à jour (tous optionnels)',
    examples: {
      'modification-simple': {
        summary: 'Modification simple (titre et capacité)',
        value: {
          title: 'CrossFit WOD - Tous niveaux',
          max_capacity: 20,
        },
      },
      'changement-horaire': {
        summary: 'Changement d\'horaire',
        value: {
          start_datetime: '2025-11-01T14:00:00Z',
          end_datetime: '2025-11-01T15:00:00Z',
        },
      },
      'changement-coach': {
        summary: 'Changement de coach et location',
        value: {
          coach_id: '123e4567-e89b-12d3-a456-426614174999',
          location: 'Nouvelle salle annexe',
        },
      },
      'changement-statut': {
        summary: 'Changement de statut',
        value: {
          status: 'completed',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cours mis à jour avec succès',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174100',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'CrossFit WOD - Tous niveaux',
        description: 'Séance CrossFit adaptée aux débutants avec focus sur la technique',
        course_type: 'CrossFit',
        start_datetime: '2025-11-01T10:00:00.000Z',
        end_datetime: '2025-11-01T11:00:00.000Z',
        location: 'Salle principale, CrossFit Lyon',
        coach_id: '123e4567-e89b-12d3-a456-426614174001',
        max_capacity: 20,
        is_recurring: false,
        recurrence_rule: null,
        parent_recurrence_id: null,
        status: 'scheduled',
        cancellation_reason: null,
        cancelled_at: null,
        metadata: {},
        created_at: '2025-10-30T12:00:00.000Z',
        updated_at: '2025-10-30T14:30:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou UUID incorrect',
    schema: {
      example: {
        statusCode: 400,
        message: ['start_datetime doit être antérieure à end_datetime'],
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
    description: 'Accès refusé - Permissions insuffisantes pour modifier ce cours',
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
    description: 'Cours ou coach introuvable',
    schema: {
      example: {
        statusCode: 404,
        message: 'Course with ID 123e4567-e89b-12d3-a456-426614174100 not found',
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
      },
    },
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Annuler un cours',
    description:
      'Annule un cours en définissant son statut à "cancelled". Si cancelFutureOccurrences est true et que le cours est un parent récurrent, toutes les occurrences futures sont également annulées. Enregistre la raison et la date d\'annulation.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID du cours à annuler',
    example: '123e4567-e89b-12d3-a456-426614174100',
  })
  @ApiBody({
    description: 'Données d\'annulation',
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: {
          type: 'string',
          description: 'Raison de l\'annulation du cours',
          example: 'Coach indisponible pour raisons médicales',
        },
        cancelFutureOccurrences: {
          type: 'boolean',
          description:
            'Si true, annule aussi toutes les occurrences futures du cours récurrent (applicable uniquement aux cours parents)',
          example: false,
          default: false,
        },
      },
    },
    examples: {
      'annulation-simple': {
        summary: 'Annulation d\'un cours ponctuel',
        value: {
          reason: 'Problème technique dans la salle',
        },
      },
      'annulation-occurrence': {
        summary: 'Annulation d\'une seule occurrence',
        value: {
          reason: 'Coach indisponible ce jour uniquement',
          cancelFutureOccurrences: false,
        },
      },
      'annulation-serie': {
        summary: 'Annulation d\'une série récurrente',
        value: {
          reason: 'Réorganisation des cours - nouveau planning',
          cancelFutureOccurrences: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cours annulé avec succès (et occurrences futures si demandé)',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174100',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'CrossFit WOD - Débutants',
        description: 'Séance CrossFit adaptée aux débutants',
        course_type: 'CrossFit',
        start_datetime: '2025-11-01T10:00:00.000Z',
        end_datetime: '2025-11-01T11:00:00.000Z',
        location: 'Salle principale',
        coach_id: '123e4567-e89b-12d3-a456-426614174001',
        max_capacity: 15,
        is_recurring: false,
        recurrence_rule: null,
        parent_recurrence_id: null,
        status: 'cancelled',
        cancellation_reason: 'Coach indisponible pour raisons médicales',
        cancelled_at: '2025-10-30T14:30:00.000Z',
        metadata: {},
        created_at: '2025-10-30T12:00:00.000Z',
        updated_at: '2025-10-30T14:30:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides (reason manquante, UUID incorrect, cours déjà annulé)',
    schema: {
      example: {
        statusCode: 400,
        message: 'Course is already cancelled',
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
    description: 'Accès refusé - Permissions insuffisantes pour annuler ce cours',
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
    description: 'Cours introuvable',
    schema: {
      example: {
        statusCode: 404,
        message: 'Course with ID 123e4567-e89b-12d3-a456-426614174100 not found',
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
      },
    },
  })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Body('cancelFutureOccurrences', new ParseBoolPipe({ optional: true }))
    cancelFutureOccurrences?: boolean,
  ) {
    return this.coursesService.cancel(id, reason, cancelFutureOccurrences);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer un cours (soft delete)',
    description:
      'Supprime logiquement un cours (soft delete via deleted_at). Le cours reste en base de données mais n\'apparaît plus dans les requêtes normales. Peut être restauré via l\'endpoint /restore.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID du cours à supprimer',
    example: '123e4567-e89b-12d3-a456-426614174100',
  })
  @ApiResponse({
    status: 204,
    description: 'Cours supprimé avec succès (pas de contenu retourné)',
  })
  @ApiResponse({
    status: 400,
    description: 'UUID invalide',
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
    description: 'Accès refusé - Permissions insuffisantes pour supprimer ce cours',
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
    description: 'Cours introuvable ou déjà supprimé',
    schema: {
      example: {
        statusCode: 404,
        message: 'Course with ID 123e4567-e89b-12d3-a456-426614174100 not found',
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
      },
    },
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.coursesService.remove(id);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restaurer un cours supprimé',
    description:
      'Restaure un cours précédemment supprimé (soft delete) en réinitialisant deleted_at à null. Le cours redevient visible dans les requêtes normales.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID du cours à restaurer',
    example: '123e4567-e89b-12d3-a456-426614174100',
  })
  @ApiResponse({
    status: 200,
    description: 'Cours restauré avec succès',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174100',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'CrossFit WOD - Débutants',
        description: 'Séance CrossFit adaptée aux débutants',
        course_type: 'CrossFit',
        start_datetime: '2025-11-01T10:00:00.000Z',
        end_datetime: '2025-11-01T11:00:00.000Z',
        location: 'Salle principale',
        coach_id: '123e4567-e89b-12d3-a456-426614174001',
        max_capacity: 15,
        is_recurring: false,
        recurrence_rule: null,
        parent_recurrence_id: null,
        status: 'scheduled',
        cancellation_reason: null,
        cancelled_at: null,
        metadata: {},
        created_at: '2025-10-30T12:00:00.000Z',
        updated_at: '2025-10-30T15:00:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'UUID invalide ou cours non supprimé',
    schema: {
      example: {
        statusCode: 400,
        message: 'Course is not deleted',
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
    description: 'Accès refusé - Permissions insuffisantes pour restaurer ce cours',
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
    description: 'Cours introuvable',
    schema: {
      example: {
        statusCode: 404,
        message: 'Course with ID 123e4567-e89b-12d3-a456-426614174100 not found',
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
      },
    },
  })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.restore(id);
  }
}
