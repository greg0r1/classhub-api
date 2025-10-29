import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  organization_id: string;
  role: 'admin' | 'coach' | 'member';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Créer l'utilisateur via le UsersService
    const user = await this.usersService.create(registerDto);

    // Générer le token JWT
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organization_id: user.organization_id,
      role: user.role,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
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

  async login(loginDto: LoginDto) {
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

    // Générer le token JWT
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organization_id: user.organization_id,
      role: user.role,
    };

    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
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

  async validateUser(userId: string) {
    return await this.usersService.findOne(userId);
  }
}
