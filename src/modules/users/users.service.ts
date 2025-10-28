import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Vérifier si l'email existe déjà
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `Un utilisateur avec l'email "${createUserDto.email}" existe déjà`,
      );
    }

    // Hasher le mot de passe
    const password_hash = await bcrypt.hash(createUserDto.password, 10);

    // Créer l'utilisateur (sans le mot de passe en clair)
    const { password, ...userData } = createUserDto;
    const user = this.userRepository.create({
      ...userData,
      password_hash,
    });

    return await this.userRepository.save(user);
  }

  async findAll(organizationId?: string): Promise<User[]> {
    const where: any = { deleted_at: IsNull() };
    if (organizationId) {
      where.organization_id = organizationId;
    }

    return await this.userRepository.find({
      where,
      relations: ['organization'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['organization'],
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID "${id}" introuvable`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email, deleted_at: IsNull() },
      relations: ['organization'],
      select: [
        'id',
        'organization_id',
        'email',
        'password_hash',
        'first_name',
        'last_name',
        'phone',
        'date_of_birth',
        'role',
        'status',
        'join_date',
        'metadata',
        'email_verified',
        'last_login_at',
        'created_at',
        'updated_at',
      ],
    });
  }

  async findByOrganization(
    organizationId: string,
    role?: 'admin' | 'coach' | 'member',
  ): Promise<User[]> {
    const where: any = {
      organization_id: organizationId,
      deleted_at: IsNull(),
    };

    if (role) {
      where.role = role;
    }

    return await this.userRepository.find({
      where,
      relations: ['organization'],
      order: { created_at: 'DESC' },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Vérifier si l'email est modifié et s'il existe déjà
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException(
          `Un utilisateur avec l'email "${updateUserDto.email}" existe déjà`,
        );
      }
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findOne(id);

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères',
      );
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    user.password_hash = password_hash;

    await this.userRepository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      last_login_at: new Date(),
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.softDelete(id);
  }

  async restore(id: string): Promise<User> {
    await this.userRepository.restore(id);
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!user) {
      throw new NotFoundException(
        `Utilisateur avec l'ID "${id}" introuvable après restauration`,
      );
    }

    return user;
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}