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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un nouvel utilisateur',
    description: 'Crée un nouvel utilisateur dans une organisation avec un rôle spécifique (admin, coach ou member). Le mot de passe sera hashé automatiquement.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'L\'utilisateur a été créé avec succès',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'jean.dupont@example.com',
        first_name: 'Jean',
        last_name: 'Dupont',
        phone: '0612345678',
        date_of_birth: '1990-05-15',
        role: 'member',
        status: 'active',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        join_date: '2025-10-30',
        email_verified: false,
        metadata: {},
        created_at: '2025-10-30T10:30:00.000Z',
        updated_at: '2025-10-30T10:30:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides (email déjà utilisé, mot de passe trop court, format incorrect)',
    schema: {
      example: {
        statusCode: 400,
        message: ['L\'email jean.dupont@example.com est déjà utilisé', 'Le mot de passe doit contenir au moins 8 caractères'],
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
        message: 'Non authentifié',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Permissions insuffisantes pour créer un utilisateur',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé',
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
        message: 'Organisation non trouvée',
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
        message: 'Erreur interne du serveur',
        error: 'Internal Server Error',
      },
    },
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Récupérer tous les utilisateurs',
    description: 'Récupère la liste de tous les utilisateurs. Peut être filtré par organization_id via query parameter. Retourne uniquement les utilisateurs non supprimés.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs récupérée avec succès',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'jean.dupont@example.com',
          first_name: 'Jean',
          last_name: 'Dupont',
          phone: '0612345678',
          date_of_birth: '1990-05-15',
          role: 'member',
          status: 'active',
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          join_date: '2025-10-30',
          email_verified: true,
          last_login_at: '2025-10-30T09:15:00.000Z',
          metadata: {
            belt_level: 'ceinture bleue',
            medical_cert: {
              valid: true,
              expiry: '2026-09-15',
            },
          },
          created_at: '2025-01-15T10:30:00.000Z',
          updated_at: '2025-10-30T09:15:00.000Z',
          deleted_at: null,
        },
        {
          id: '660e9511-f39c-52e5-b827-557766551111',
          email: 'marie.martin@example.com',
          first_name: 'Marie',
          last_name: 'Martin',
          phone: '0698765432',
          date_of_birth: '1985-08-22',
          role: 'coach',
          status: 'active',
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          join_date: '2024-09-01',
          email_verified: true,
          last_login_at: '2025-10-30T08:45:00.000Z',
          metadata: {
            belt_level: 'ceinture noire 2ème dan',
          },
          created_at: '2024-09-01T14:20:00.000Z',
          updated_at: '2025-10-30T08:45:00.000Z',
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
        message: 'Non authentifié',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Permissions insuffisantes pour lister les utilisateurs',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé',
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
        message: 'Erreur interne du serveur',
        error: 'Internal Server Error',
      },
    },
  })
  findAll(@Query('organizationId') organizationId?: string) {
    return this.usersService.findAll(organizationId);
  }

  @Get('organization/:organizationId')
  @ApiOperation({
    summary: 'Récupérer les utilisateurs d\'une organisation',
    description: 'Récupère tous les utilisateurs appartenant à une organisation spécifique. Peut être filtré par rôle (admin, coach, member) via query parameter.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Identifiant UUID de l\'organisation',
    type: 'string',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs de l\'organisation récupérée avec succès',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'jean.dupont@example.com',
          first_name: 'Jean',
          last_name: 'Dupont',
          phone: '0612345678',
          date_of_birth: '1990-05-15',
          role: 'member',
          status: 'active',
          organization_id: '123e4567-e89b-12d3-a456-426614174000',
          join_date: '2025-10-30',
          email_verified: true,
          metadata: {
            belt_level: 'ceinture bleue',
          },
          created_at: '2025-01-15T10:30:00.000Z',
          updated_at: '2025-10-30T09:15:00.000Z',
          deleted_at: null,
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'UUID invalide fourni',
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
        message: 'Non authentifié',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Permissions insuffisantes pour accéder à cette organisation',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé',
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
        message: 'Organisation non trouvée',
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
        message: 'Erreur interne du serveur',
        error: 'Internal Server Error',
      },
    },
  })
  findByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('role') role?: 'admin' | 'coach' | 'member',
  ) {
    return this.usersService.findByOrganization(organizationId, role);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer un utilisateur par son ID',
    description: 'Récupère les détails complets d\'un utilisateur spécifique par son identifiant UUID. Ne retourne pas le hash du mot de passe.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'utilisateur',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Utilisateur trouvé et retourné avec succès',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'jean.dupont@example.com',
        first_name: 'Jean',
        last_name: 'Dupont',
        phone: '0612345678',
        date_of_birth: '1990-05-15',
        role: 'member',
        status: 'active',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        join_date: '2025-10-30',
        email_verified: true,
        last_login_at: '2025-10-30T09:15:00.000Z',
        metadata: {
          belt_level: 'ceinture bleue',
          medical_cert: {
            valid: true,
            expiry: '2026-09-15',
          },
        },
        created_at: '2025-01-15T10:30:00.000Z',
        updated_at: '2025-10-30T09:15:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'UUID invalide fourni',
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
        message: 'Non authentifié',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Permissions insuffisantes pour accéder à cet utilisateur',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé',
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
        message: 'Erreur interne du serveur',
        error: 'Internal Server Error',
      },
    },
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Mettre à jour un utilisateur',
    description: 'Met à jour les informations d\'un utilisateur existant. Tous les champs sont optionnels. Les champs organization_id et password ne peuvent pas être modifiés via cette route.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'utilisateur à mettre à jour',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Utilisateur mis à jour avec succès',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'jean.dupont@example.com',
        first_name: 'Jean',
        last_name: 'Dupont-Moreau',
        phone: '0612345678',
        date_of_birth: '1990-05-15',
        role: 'coach',
        status: 'active',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        join_date: '2025-10-30',
        email_verified: true,
        last_login_at: '2025-10-30T09:15:00.000Z',
        metadata: {
          belt_level: 'ceinture marron',
          medical_cert: {
            valid: true,
            expiry: '2026-09-15',
          },
        },
        created_at: '2025-01-15T10:30:00.000Z',
        updated_at: '2025-10-30T11:22:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides (UUID invalide, format incorrect, email déjà utilisé)',
    schema: {
      example: {
        statusCode: 400,
        message: ['L\'email est déjà utilisé par un autre utilisateur', 'Le rôle doit être admin, coach ou member'],
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
        message: 'Non authentifié',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Permissions insuffisantes pour modifier cet utilisateur',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé',
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
        message: 'Erreur interne du serveur',
        error: 'Internal Server Error',
      },
    },
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Modifier le mot de passe d\'un utilisateur',
    description: 'Met à jour le mot de passe d\'un utilisateur. Le nouveau mot de passe doit contenir au minimum 8 caractères et sera automatiquement hashé.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'utilisateur',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newPassword: {
          type: 'string',
          minLength: 8,
          maxLength: 100,
          description: 'Nouveau mot de passe (minimum 8 caractères)',
          example: 'NouveauMotDePasse123!',
        },
      },
      required: ['newPassword'],
    },
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 204,
    description: 'Mot de passe mis à jour avec succès - Aucun contenu retourné',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides (UUID invalide, mot de passe trop court)',
    schema: {
      example: {
        statusCode: 400,
        message: ['Le mot de passe doit contenir au moins 8 caractères'],
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
        message: 'Non authentifié',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Permissions insuffisantes pour modifier le mot de passe',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé',
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
        message: 'Erreur interne du serveur',
        error: 'Internal Server Error',
      },
    },
  })
  async updatePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newPassword') newPassword: string,
  ) {
    await this.usersService.updatePassword(id, newPassword);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer un utilisateur (soft delete)',
    description: 'Supprime logiquement un utilisateur en définissant la date deleted_at. L\'utilisateur n\'apparaîtra plus dans les listes mais ses données sont conservées pour l\'historique.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'utilisateur à supprimer',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 204,
    description: 'Utilisateur supprimé avec succès - Aucun contenu retourné',
  })
  @ApiResponse({
    status: 400,
    description: 'UUID invalide fourni',
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
        message: 'Non authentifié',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Permissions insuffisantes pour supprimer cet utilisateur',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé',
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
        message: 'Erreur interne du serveur',
        error: 'Internal Server Error',
      },
    },
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Restaurer un utilisateur supprimé',
    description: 'Restaure un utilisateur précédemment supprimé en réinitialisant le champ deleted_at. L\'utilisateur redeviendra visible et actif dans le système.',
  })
  @ApiParam({
    name: 'id',
    description: 'Identifiant UUID de l\'utilisateur à restaurer',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Utilisateur restauré avec succès',
    schema: {
      example: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'jean.dupont@example.com',
        first_name: 'Jean',
        last_name: 'Dupont',
        phone: '0612345678',
        date_of_birth: '1990-05-15',
        role: 'member',
        status: 'active',
        organization_id: '123e4567-e89b-12d3-a456-426614174000',
        join_date: '2025-10-30',
        email_verified: true,
        last_login_at: '2025-10-30T09:15:00.000Z',
        metadata: {
          belt_level: 'ceinture bleue',
        },
        created_at: '2025-01-15T10:30:00.000Z',
        updated_at: '2025-10-30T11:45:00.000Z',
        deleted_at: null,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'UUID invalide fourni',
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
        message: 'Non authentifié',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé - Permissions insuffisantes pour restaurer cet utilisateur',
    schema: {
      example: {
        statusCode: 403,
        message: 'Accès refusé',
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
        message: 'Erreur interne du serveur',
        error: 'Internal Server Error',
      },
    },
  })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.restore(id);
  }
}