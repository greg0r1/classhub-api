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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AttendancesService } from './attendances.service';
import {
  RegisterIntentionDto,
  MarkAttendanceDto,
  UpdateAttendanceDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('attendances')
@Controller('attendances')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  /**
   * POST /attendances/intention
   * Déclarer une intention de présence ("Je serai là" / "Je ne viendrai pas")
   */
  @Post('intention')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Déclarer une intention de présence',
    description:
      'Permet à un utilisateur de déclarer son intention de présence pour un cours (will_attend ou will_not_attend). Cette déclaration est faite avant le cours.',
  })
  @ApiBody({ type: RegisterIntentionDto })
  @ApiResponse({
    status: 201,
    description: 'Intention enregistrée avec succès',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organization_id: '123e4567-e89b-12d3-a456-426614174001',
        course_id: '123e4567-e89b-12d3-a456-426614174002',
        user_id: '123e4567-e89b-12d3-a456-426614174003',
        intention: 'will_attend',
        intention_at: '2024-01-15T10:30:00.000Z',
        actual_attendance: null,
        actual_attendance_at: null,
        marked_by_user_id: null,
        marked_by_role: null,
        is_locked: false,
        notes: 'Je viendrai avec 10 minutes de retard',
        created_at: '2024-01-15T10:30:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou intention déjà enregistrée',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: "Accès refusé (permissions insuffisantes ou utilisateur inactif)",
  })
  @ApiResponse({
    status: 404,
    description: 'Cours ou utilisateur introuvable',
  })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  registerIntention(
    @Body() dto: RegisterIntentionDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.attendancesService.registerIntention(
      dto,
      user.id,
      user.role,
    );
  }

  /**
   * POST /attendances/mark
   * Marquer la présence effective (pendant/après le cours)
   */
  @Post('mark')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin', 'coach', 'member')
  @ApiOperation({
    summary: 'Marquer la présence effective',
    description:
      'Permet de marquer la présence effective d\'un utilisateur à un cours (présent ou absent). Peut être effectué pendant ou après le cours par un admin, coach ou le membre lui-même.',
  })
  @ApiBody({ type: MarkAttendanceDto })
  @ApiResponse({
    status: 201,
    description: 'Présence marquée avec succès',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organization_id: '123e4567-e89b-12d3-a456-426614174001',
        course_id: '123e4567-e89b-12d3-a456-426614174002',
        user_id: '123e4567-e89b-12d3-a456-426614174003',
        intention: 'will_attend',
        intention_at: '2024-01-15T10:30:00.000Z',
        actual_attendance: true,
        actual_attendance_at: '2024-01-15T14:05:00.000Z',
        marked_by_user_id: '123e4567-e89b-12d3-a456-426614174004',
        marked_by_role: 'coach',
        is_locked: false,
        notes: 'Arrivé en retard de 15 minutes',
        created_at: '2024-01-15T10:30:00.000Z',
        updated_at: '2024-01-15T14:05:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou présence déjà marquée',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (permissions insuffisantes, utilisateur inactif ou présence verrouillée)',
  })
  @ApiResponse({
    status: 404,
    description: 'Cours ou utilisateur introuvable',
  })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  markAttendance(
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.attendancesService.markAttendance(
      dto,
      user.id,
      user.role,
      user.organization_id,
    );
  }

  /**
   * GET /attendances/course/:courseId
   * Récupérer toutes les présences d'un cours
   */
  @Get('course/:courseId')
  @Roles('admin', 'coach')
  @ApiOperation({
    summary: 'Récupérer toutes les présences d\'un cours',
    description:
      'Retourne la liste complète des présences (intentions et présences effectives) pour un cours donné. Réservé aux administrateurs et coaches.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Identifiant UUID du cours',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des présences récupérée avec succès',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          course_id: '123e4567-e89b-12d3-a456-426614174002',
          user_id: '123e4567-e89b-12d3-a456-426614174003',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174003',
            email: 'john.doe@example.com',
            first_name: 'John',
            last_name: 'Doe',
            role: 'member',
          },
          intention: 'will_attend',
          intention_at: '2024-01-15T10:30:00.000Z',
          actual_attendance: true,
          actual_attendance_at: '2024-01-15T14:05:00.000Z',
          marked_by_user_id: '123e4567-e89b-12d3-a456-426614174004',
          marked_by_role: 'coach',
          is_locked: false,
          notes: null,
          created_at: '2024-01-15T10:30:00.000Z',
          updated_at: '2024-01-15T14:05:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174005',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          course_id: '123e4567-e89b-12d3-a456-426614174002',
          user_id: '123e4567-e89b-12d3-a456-426614174006',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174006',
            email: 'jane.smith@example.com',
            first_name: 'Jane',
            last_name: 'Smith',
            role: 'member',
          },
          intention: 'will_not_attend',
          intention_at: '2024-01-15T11:00:00.000Z',
          actual_attendance: false,
          actual_attendance_at: null,
          marked_by_user_id: null,
          marked_by_role: null,
          is_locked: false,
          notes: 'Blessure au genou',
          created_at: '2024-01-15T11:00:00.000Z',
          updated_at: '2024-01-15T11:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID du cours invalide (format UUID attendu)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (réservé aux administrateurs et coaches)',
  })
  @ApiResponse({
    status: 404,
    description: 'Cours introuvable',
  })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.attendancesService.findByCourse(courseId);
  }

  /**
   * GET /attendances/course/:courseId/registered
   * Récupérer les inscrits d'un cours (intentions "will_attend")
   */
  @Get('course/:courseId/registered')
  @Roles('admin', 'coach')
  @ApiOperation({
    summary: 'Récupérer les utilisateurs inscrits à un cours',
    description:
      'Retourne la liste des utilisateurs ayant déclaré leur intention de participer (will_attend) à un cours. Réservé aux administrateurs et coaches.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Identifiant UUID du cours',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs inscrits récupérée avec succès',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '123e4567-e89b-12d3-a456-426614174003',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174003',
            email: 'john.doe@example.com',
            first_name: 'John',
            last_name: 'Doe',
            role: 'member',
          },
          intention: 'will_attend',
          intention_at: '2024-01-15T10:30:00.000Z',
          notes: null,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174005',
          user_id: '123e4567-e89b-12d3-a456-426614174007',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174007',
            email: 'bob.martin@example.com',
            first_name: 'Bob',
            last_name: 'Martin',
            role: 'member',
          },
          intention: 'will_attend',
          intention_at: '2024-01-15T11:15:00.000Z',
          notes: 'Premier cours',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID du cours invalide (format UUID attendu)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (réservé aux administrateurs et coaches)',
  })
  @ApiResponse({
    status: 404,
    description: 'Cours introuvable',
  })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  findRegisteredUsers(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.attendancesService.findRegisteredUsers(courseId);
  }

  /**
   * GET /attendances/course/:courseId/present
   * Récupérer les présents effectifs d'un cours
   */
  @Get('course/:courseId/present')
  @Roles('admin', 'coach')
  @ApiOperation({
    summary: 'Récupérer les utilisateurs présents à un cours',
    description:
      'Retourne la liste des utilisateurs ayant été marqués comme présents (actual_attendance = true) à un cours. Réservé aux administrateurs et coaches.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Identifiant UUID du cours',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs présents récupérée avec succès',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '123e4567-e89b-12d3-a456-426614174003',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174003',
            email: 'john.doe@example.com',
            first_name: 'John',
            last_name: 'Doe',
            role: 'member',
          },
          intention: 'will_attend',
          actual_attendance: true,
          actual_attendance_at: '2024-01-15T14:05:00.000Z',
          marked_by_role: 'coach',
          notes: null,
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174008',
          user_id: '123e4567-e89b-12d3-a456-426614174009',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174009',
            email: 'alice.wonder@example.com',
            first_name: 'Alice',
            last_name: 'Wonder',
            role: 'member',
          },
          intention: null,
          actual_attendance: true,
          actual_attendance_at: '2024-01-15T14:10:00.000Z',
          marked_by_role: 'coach',
          notes: 'Walk-in sans inscription',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID du cours invalide (format UUID attendu)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (réservé aux administrateurs et coaches)',
  })
  @ApiResponse({
    status: 404,
    description: 'Cours introuvable',
  })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  findPresentUsers(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.attendancesService.findPresentUsers(courseId);
  }

  /**
   * GET /attendances/course/:courseId/stats
   * Statistiques d'un cours (inscrits, présents, taux d'occupation, etc.)
   */
  @Get('course/:courseId/stats')
  @Roles('admin', 'coach')
  @ApiOperation({
    summary: 'Récupérer les statistiques d\'un cours',
    description:
      'Retourne les statistiques complètes d\'un cours : nombre d\'inscrits, présents, absents, taux d\'occupation, etc. Réservé aux administrateurs et coaches.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Identifiant UUID du cours',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques du cours récupérées avec succès',
    schema: {
      example: {
        course_id: '123e4567-e89b-12d3-a456-426614174000',
        total_registered: 15,
        total_will_not_attend: 3,
        total_present: 12,
        total_absent: 2,
        total_walk_ins: 1,
        attendance_rate: 80.0,
        occupancy_rate: 60.0,
        course_capacity: 20,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID du cours invalide (format UUID attendu)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (réservé aux administrateurs et coaches)',
  })
  @ApiResponse({
    status: 404,
    description: 'Cours introuvable',
  })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  getCourseStats(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.attendancesService.getCourseStats(courseId);
  }

  /**
   * GET /attendances/user/:userId
   * Récupérer toutes les présences d'un utilisateur
   */
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Récupérer toutes les présences d\'un utilisateur',
    description:
      'Retourne l\'historique complet des présences et intentions d\'un utilisateur pour tous les cours.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Identifiant UUID de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Historique des présences récupéré avec succès',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          course_id: '123e4567-e89b-12d3-a456-426614174002',
          course: {
            id: '123e4567-e89b-12d3-a456-426614174002',
            title: 'CrossFit WOD',
            start_time: '2024-01-15T14:00:00.000Z',
            end_time: '2024-01-15T15:00:00.000Z',
          },
          user_id: '123e4567-e89b-12d3-a456-426614174003',
          intention: 'will_attend',
          intention_at: '2024-01-15T10:30:00.000Z',
          actual_attendance: true,
          actual_attendance_at: '2024-01-15T14:05:00.000Z',
          marked_by_role: 'coach',
          is_locked: false,
          notes: null,
          created_at: '2024-01-15T10:30:00.000Z',
          updated_at: '2024-01-15T14:05:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174005',
          organization_id: '123e4567-e89b-12d3-a456-426614174001',
          course_id: '123e4567-e89b-12d3-a456-426614174006',
          course: {
            id: '123e4567-e89b-12d3-a456-426614174006',
            title: 'Yoga Flow',
            start_time: '2024-01-16T18:00:00.000Z',
            end_time: '2024-01-16T19:00:00.000Z',
          },
          user_id: '123e4567-e89b-12d3-a456-426614174003',
          intention: 'will_attend',
          intention_at: '2024-01-16T12:00:00.000Z',
          actual_attendance: null,
          actual_attendance_at: null,
          marked_by_role: null,
          is_locked: false,
          notes: null,
          created_at: '2024-01-16T12:00:00.000Z',
          updated_at: '2024-01-16T12:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID de l\'utilisateur invalide (format UUID attendu)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (permissions insuffisantes)',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur introuvable',
  })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.attendancesService.findByUser(userId);
  }

  /**
   * GET /attendances/user/:userId/stats
   * Statistiques d'un utilisateur (taux de présence, dernière présence, risque)
   */
  @Get('user/:userId/stats')
  @Roles('admin', 'coach')
  @ApiOperation({
    summary: 'Récupérer les statistiques d\'un utilisateur',
    description:
      'Retourne les statistiques complètes d\'un utilisateur : taux de présence, nombre de cours suivis, dernière présence, niveau de risque d\'abandon, etc. Réservé aux administrateurs et coaches.',
  })
  @ApiParam({
    name: 'userId',
    description: 'Identifiant UUID de l\'utilisateur',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques de l\'utilisateur récupérées avec succès',
    schema: {
      example: {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        total_registered: 25,
        total_attended: 20,
        total_missed: 3,
        total_walk_ins: 2,
        attendance_rate: 80.0,
        last_attendance: '2024-01-15T14:05:00.000Z',
        days_since_last_attendance: 5,
        risk_level: 'low',
        consecutive_absences: 0,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'ID de l\'utilisateur invalide (format UUID attendu)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (réservé aux administrateurs et coaches)',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur introuvable',
  })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  getUserStats(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.attendancesService.getUserStats(userId, user.organization_id);
  }

  /**
   * PATCH /attendances/:id
   * Mettre à jour une présence (admin override)
   */
  @Patch(':id')
  @Roles('admin', 'coach')
  @ApiOperation({
    summary: 'Mettre à jour une présence',
    description:
      'Permet de modifier une présence existante (intention, présence effective, notes). Réservé aux administrateurs et coaches. Les modifications sont auditées.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de la présence',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateAttendanceDto })
  @ApiResponse({
    status: 200,
    description: 'Présence mise à jour avec succès',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organization_id: '123e4567-e89b-12d3-a456-426614174001',
        course_id: '123e4567-e89b-12d3-a456-426614174002',
        user_id: '123e4567-e89b-12d3-a456-426614174003',
        intention: 'will_not_attend',
        intention_at: '2024-01-15T10:30:00.000Z',
        actual_attendance: false,
        actual_attendance_at: '2024-01-15T14:00:00.000Z',
        marked_by_user_id: '123e4567-e89b-12d3-a456-426614174004',
        marked_by_role: 'admin',
        is_locked: false,
        notes: 'Modification administrative - blessure confirmée',
        created_at: '2024-01-15T10:30:00.000Z',
        updated_at: '2024-01-15T16:20:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou ID invalide (format UUID attendu)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (réservé aux administrateurs et coaches, ou présence verrouillée)',
  })
  @ApiResponse({
    status: 404,
    description: 'Présence introuvable',
  })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.attendancesService.update(id, dto, user.role);
  }

  /**
   * DELETE /attendances/:id
   * Supprimer une présence (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @ApiOperation({
    summary: 'Supprimer une présence',
    description:
      'Supprime une présence (soft delete). L\'enregistrement reste dans la base de données avec une date de suppression. Réservé aux administrateurs uniquement.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de la présence',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'Présence supprimée avec succès (pas de contenu retourné)',
  })
  @ApiResponse({
    status: 400,
    description: 'ID invalide (format UUID attendu)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié (token manquant ou invalide)',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (réservé aux administrateurs uniquement)',
  })
  @ApiResponse({
    status: 404,
    description: 'Présence introuvable',
  })
  @ApiResponse({ status: 500, description: 'Erreur serveur interne' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.attendancesService.remove(id, user.role);
  }
}
