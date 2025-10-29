import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un compte utilisateur',
    description: 'Inscription d\'un nouvel utilisateur dans une organisation. Retourne un token JWT pour une connexion immédiate.'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Utilisateur créé avec succès. Token JWT retourné.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'member',
          organization_id: '123e4567-e89b-12d3-a456-426614174001'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Se connecter',
    description: 'Authentification avec email et mot de passe. Retourne un token JWT valide 7 jours.'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie. Token JWT retourné.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'admin',
          organization_id: '123e4567-e89b-12d3-a456-426614174001'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Récupérer mon profil',
    description: 'Retourne les informations de l\'utilisateur connecté (depuis le token JWT)'
  })
  @ApiResponse({
    status: 200,
    description: 'Profil utilisateur',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'admin',
        organization_id: '123e4567-e89b-12d3-a456-426614174001'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Non authentifié (token manquant ou invalide)' })
  getProfile(@CurrentUser() user: CurrentUserData) {
    return user;
  }
}
