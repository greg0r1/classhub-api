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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * POST /organizations
   * Créer une nouvelle organisation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  /**
   * GET /organizations
   * Récupérer toutes les organisations
   */
  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  /**
   * GET /organizations/:id
   * Récupérer une organisation par ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.findOne(id);
  }

  /**
   * GET /organizations/slug/:slug
   * Récupérer une organisation par slug
   */
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBySlug(slug);
  }

  /**
   * PATCH /organizations/:id
   * Mettre à jour une organisation
   */
  @Patch(':id')
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
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.organizationsService.remove(id);
  }

  /**
   * POST /organizations/:id/restore
   * Restaurer une organisation supprimée
   */
  @Post(':id/restore')
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.restore(id);
  }
}