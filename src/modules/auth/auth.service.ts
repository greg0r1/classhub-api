import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  organization_id: string;
  role: 'admin' | 'coach' | 'member';
}

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 jours

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(registerDto: RegisterDto, userAgent?: string, ipAddress?: string) {
    // Créer l'utilisateur via le UsersService
    const user = await this.usersService.create(registerDto);

    // Générer les tokens (access + refresh)
    return await this.generateTokens(user, userAgent, ipAddress);
  }

  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string) {
    // Trouver l'utilisateur par email
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Mettre à jour la date de dernière connexion
    await this.usersService.updateLastLogin(user.id);

    // Générer les tokens (access + refresh)
    return await this.generateTokens(user, userAgent, ipAddress);
  }

  async validateUser(userId: string) {
    return await this.usersService.findOne(userId);
  }

  /**
   * Génère un access token JWT avec expiration courte (15 minutes)
   */
  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    return await this.jwtService.signAsync(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Génère un refresh token unique et le stocke en base de données
   */
  private async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    // Générer un token aléatoire sécurisé
    const token = crypto.randomBytes(64).toString('hex');

    // Calculer la date d'expiration (30 jours)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // Stocker le refresh token en DB
    const refreshToken = this.refreshTokenRepository.create({
      user_id: userId,
      token,
      expires_at: expiresAt,
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return token;
  }

  /**
   * Génère une paire de tokens (access + refresh)
   */
  private async generateTokens(
    user: any,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organization_id: user.organization_id,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(user.id, userAgent, ipAddress),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes en secondes
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        organization_id: user.organization_id,
      },
    };
  }

  /**
   * Rafraîchir l'access token avec un refresh token valide
   */
  async refresh(refreshTokenDto: RefreshTokenDto, userAgent?: string, ipAddress?: string) {
    const { refresh_token } = refreshTokenDto;

    // Chercher le refresh token en DB
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refresh_token },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    // Vérifier si le token est révoqué
    if (storedToken.revoked) {
      throw new UnauthorizedException('Refresh token révoqué');
    }

    // Vérifier si le token est expiré
    if (storedToken.is_expired) {
      throw new UnauthorizedException('Refresh token expiré');
    }

    // Révoquer l'ancien refresh token (rotation des tokens)
    await this.revokeRefreshToken(refresh_token);

    // Générer une nouvelle paire de tokens
    return await this.generateTokens(storedToken.user, userAgent, ipAddress);
  }

  /**
   * Révoquer un refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
    });

    if (refreshToken) {
      refreshToken.revoked = true;
      refreshToken.revoked_at = new Date();
      await this.refreshTokenRepository.save(refreshToken);
    }
  }

  /**
   * Révoquer tous les refresh tokens d'un utilisateur (logout global)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { user_id: userId, revoked: false },
      { revoked: true, revoked_at: new Date() },
    );
  }

  /**
   * Nettoyer les refresh tokens expirés (à exécuter périodiquement via cron)
   */
  async cleanExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }
}
