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
} from '@nestjs/common';
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

@Controller('attendances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  /**
   * POST /attendances/intention
   * Déclarer une intention de présence ("Je serai là" / "Je ne viendrai pas")
   */
  @Post('intention')
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
  @Roles('admin', 'coach', 'member')
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
  findByCourse(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.attendancesService.findByCourse(courseId);
  }

  /**
   * GET /attendances/course/:courseId/registered
   * Récupérer les inscrits d'un cours (intentions "will_attend")
   */
  @Get('course/:courseId/registered')
  @Roles('admin', 'coach')
  findRegisteredUsers(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.attendancesService.findRegisteredUsers(courseId);
  }

  /**
   * GET /attendances/course/:courseId/present
   * Récupérer les présents effectifs d'un cours
   */
  @Get('course/:courseId/present')
  @Roles('admin', 'coach')
  findPresentUsers(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.attendancesService.findPresentUsers(courseId);
  }

  /**
   * GET /attendances/course/:courseId/stats
   * Statistiques d'un cours (inscrits, présents, taux d'occupation, etc.)
   */
  @Get('course/:courseId/stats')
  @Roles('admin', 'coach')
  getCourseStats(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.attendancesService.getCourseStats(courseId);
  }

  /**
   * GET /attendances/user/:userId
   * Récupérer toutes les présences d'un utilisateur
   */
  @Get('user/:userId')
  findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.attendancesService.findByUser(userId);
  }

  /**
   * GET /attendances/user/:userId/stats
   * Statistiques d'un utilisateur (taux de présence, dernière présence, risque)
   */
  @Get('user/:userId/stats')
  @Roles('admin', 'coach')
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
  @Roles('admin')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.attendancesService.remove(id, user.role);
  }
}
