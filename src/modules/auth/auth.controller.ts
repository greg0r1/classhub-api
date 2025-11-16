import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, AuthResponseDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/decorators/current-user.decorator';
import { DisableTenantCheck } from '../../common/decorators/disable-tenant-check.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @DisableTenantCheck()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un compte utilisateur',
    description: 'Inscription d\'un nouvel utilisateur dans une organisation. Retourne un access token (15min) et un refresh token (30 jours).'
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Utilisateur créé avec succès. Tokens JWT retournés.',
    type: AuthResponseDto
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.register(registerDto, userAgent, ip);
  }

  @Post('login')
  @DisableTenantCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Se connecter',
    description: 'Authentification avec email et mot de passe. Retourne un access token (15min) et un refresh token (30 jours).'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie. Tokens JWT retournés.',
    type: AuthResponseDto
  })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, userAgent, ip);
  }

  @Post('refresh')
  @DisableTenantCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rafraîchir le token d\'accès',
    description: 'Génère un nouveau access token (15min) et un nouveau refresh token (30 jours) en utilisant un refresh token valide. L\'ancien refresh token est automatiquement révoqué (rotation des tokens).'
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens rafraîchis avec succès',
    type: AuthResponseDto
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalide, révoqué ou expiré' })
  refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.refresh(refreshTokenDto, userAgent, ip);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Se déconnecter',
    description: 'Révoque tous les refresh tokens de l\'utilisateur actuel. Les access tokens restent valides jusqu\'à expiration (15min).'
  })
  @ApiResponse({
    status: 200,
    description: 'Déconnexion réussie',
    schema: {
      example: {
        message: 'Déconnexion réussie'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async logout(@CurrentUser() user: CurrentUserData) {
    await this.authService.revokeAllUserTokens(user.id);
    return { message: 'Déconnexion réussie' };
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
