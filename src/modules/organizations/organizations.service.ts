import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Organization } from '../../database/entities/organization.entity';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  /**
   * Créer une nouvelle organisation
   */
  async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    // Vérifier si le slug existe déjà
    const existingOrg = await this.organizationRepository.findOne({
      where: { slug: createOrganizationDto.slug },
    });

    if (existingOrg) {
      throw new ConflictException(`Une organisation avec le slug "${createOrganizationDto.slug}" existe déjà`);
    }

    // Créer et sauvegarder l'organisation
    const organization = this.organizationRepository.create(createOrganizationDto);
    return await this.organizationRepository.save(organization);
  }

  /**
   * Récupérer toutes les organisations (non supprimées)
   */
  async findAll(): Promise<Organization[]> {
    return await this.organizationRepository.find({
      where: { deleted_at: IsNull() },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Récupérer une organisation par ID
   */
  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!organization) {
      throw new NotFoundException(`Organisation avec l'ID "${id}" introuvable`);
    }

    return organization;
  }

  /**
   * Récupérer une organisation par slug
   */
  async findBySlug(slug: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { slug, deleted_at: IsNull() },
    });

    if (!organization) {
      throw new NotFoundException(`Organisation avec le slug "${slug}" introuvable`);
    }

    return organization;
  }

  /**
   * Mettre à jour une organisation
   */
  async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);

    // Si le slug est modifié, vérifier qu'il n'existe pas déjà
    if (updateOrganizationDto.slug && updateOrganizationDto.slug !== organization.slug) {
      const existingOrg = await this.organizationRepository.findOne({
        where: { slug: updateOrganizationDto.slug },
      });

      if (existingOrg) {
        throw new ConflictException(`Une organisation avec le slug "${updateOrganizationDto.slug}" existe déjà`);
      }
    }

    // Mettre à jour les champs
    Object.assign(organization, updateOrganizationDto);

    return await this.organizationRepository.save(organization);
  }

  /**
   * Supprimer une organisation (soft delete)
   */
  async remove(id: string): Promise<void> {
    const organization = await this.findOne(id);
    await this.organizationRepository.softDelete(id);
  }

  /**
   * Restaurer une organisation supprimée
   */
  async restore(id: string): Promise<Organization> {
    await this.organizationRepository.restore(id);
    const organization = await this.organizationRepository.findOne({ where: { id } });

    if (!organization) {
      throw new NotFoundException(`Organisation avec l'ID "${id}" introuvable après restauration`);
    }

    return organization;
  }
}