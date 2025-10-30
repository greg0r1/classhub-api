import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Attendance } from '../../database/entities/attendance.entity';
import { Course } from '../../database/entities/course.entity';
import { User } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import {
  RegisterIntentionDto,
  MarkAttendanceDto,
  UpdateAttendanceDto,
} from './dto';

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendancesRepository: Repository<Attendance>,
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
  ) {}

  /**
   * Déclarer une intention de présence
   * "Je serai là" ou "Je ne viendrai pas"
   */
  async registerIntention(
    dto: RegisterIntentionDto,
    currentUserId: string,
    currentUserRole: string,
  ): Promise<Attendance> {
    // Vérifier que le cours existe et n'est pas annulé
    const course = await this.coursesRepository.findOne({
      where: { id: dto.course_id, deleted_at: IsNull() },
      relations: ['organization'],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.course_id} not found`);
    }

    if (course.status === 'cancelled') {
      throw new BadRequestException('Cannot register for a cancelled course');
    }

    // Vérifier que l'utilisateur existe
    const user = await this.usersRepository.findOne({
      where: { id: dto.user_id, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.user_id} not found`);
    }

    // Vérifier les permissions : membre peut s'inscrire lui-même, coach/admin peuvent inscrire n'importe qui
    if (
      currentUserRole === 'member' &&
      currentUserId !== dto.user_id &&
      currentUserId !== user.id
    ) {
      throw new ForbiddenException(
        'Members can only register intention for themselves',
      );
    }

    // Vérifier si une attendance existe déjà
    let attendance = await this.attendancesRepository.findOne({
      where: {
        course_id: dto.course_id,
        user_id: dto.user_id,
        deleted_at: IsNull(),
      },
    });

    if (attendance) {
      // Mise à jour de l'intention existante
      attendance.intention = dto.intention;
      attendance.intention_at = new Date();
      if (dto.notes) {
        attendance.notes = dto.notes;
      }
    } else {
      // Création nouvelle attendance
      attendance = this.attendancesRepository.create({
        organization_id: course.organization_id,
        course_id: dto.course_id,
        user_id: dto.user_id,
        intention: dto.intention,
        intention_at: new Date(),
        notes: dto.notes,
      });
    }

    return this.attendancesRepository.save(attendance);
  }

  /**
   * Marquer la présence effective
   * Peut être fait par l'adhérent lui-même, le coach ou l'admin
   */
  async markAttendance(
    dto: MarkAttendanceDto,
    markedByUserId: string,
    markedByUserRole: 'admin' | 'coach' | 'member',
    organizationId: string,
  ): Promise<Attendance> {
    // Vérifier que le cours existe
    const course = await this.coursesRepository.findOne({
      where: { id: dto.course_id, deleted_at: IsNull() },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.course_id} not found`);
    }

    // Vérifier que l'utilisateur existe
    const user = await this.usersRepository.findOne({
      where: { id: dto.user_id, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.user_id} not found`);
    }

    // Vérifier les permissions : membre peut marquer uniquement sa propre présence
    if (markedByUserRole === 'member' && markedByUserId !== dto.user_id) {
      throw new ForbiddenException(
        'Members can only mark their own attendance',
      );
    }

    // Récupérer les paramètres de l'organisation pour le verrouillage
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
    });

    const lockAttendanceByCoach =
      organization?.settings?.['lock_attendance_by_coach'] ?? true;

    // Vérifier si une attendance existe déjà
    let attendance = await this.attendancesRepository.findOne({
      where: {
        course_id: dto.course_id,
        user_id: dto.user_id,
        deleted_at: IsNull(),
      },
    });

    if (attendance) {
      // Vérifier le verrouillage
      if (attendance.is_locked && markedByUserRole !== 'admin') {
        throw new ForbiddenException(
          'This attendance is locked. Only admins can modify it.',
        );
      }

      // Mise à jour
      attendance.actual_attendance = dto.actual_attendance;
      attendance.actual_attendance_at = new Date();
      attendance.marked_by_user_id = markedByUserId;
      attendance.marked_by_role = markedByUserRole;
      if (dto.notes) {
        attendance.notes = dto.notes;
      }

      // Verrouiller si marqué par coach (selon paramètre)
      if (markedByUserRole === 'coach' && lockAttendanceByCoach) {
        attendance.is_locked = true;
      }
    } else {
      // Création (cas d'un "walk-in" sans intention préalable)
      attendance = this.attendancesRepository.create({
        organization_id: course.organization_id,
        course_id: dto.course_id,
        user_id: dto.user_id,
        intention: null, // Pas d'intention préalable
        actual_attendance: dto.actual_attendance,
        actual_attendance_at: new Date(),
        marked_by_user_id: markedByUserId,
        marked_by_role: markedByUserRole,
        notes: dto.notes,
        is_locked: markedByUserRole === 'coach' && lockAttendanceByCoach,
      });
    }

    return this.attendancesRepository.save(attendance);
  }

  /**
   * Récupérer toutes les présences d'un cours
   */
  async findByCourse(courseId: string): Promise<Attendance[]> {
    return this.attendancesRepository.find({
      where: { course_id: courseId, deleted_at: IsNull() },
      relations: ['user', 'marked_by_user'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Récupérer toutes les présences d'un utilisateur
   */
  async findByUser(userId: string): Promise<Attendance[]> {
    return this.attendancesRepository.find({
      where: { user_id: userId, deleted_at: IsNull() },
      relations: ['course', 'course.coach'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Récupérer les inscrits d'un cours (intentions "will_attend")
   */
  async findRegisteredUsers(courseId: string): Promise<Attendance[]> {
    return this.attendancesRepository.find({
      where: {
        course_id: courseId,
        intention: 'will_attend',
        deleted_at: IsNull(),
      },
      relations: ['user'],
    });
  }

  /**
   * Récupérer les présents effectifs d'un cours
   */
  async findPresentUsers(courseId: string): Promise<Attendance[]> {
    return this.attendancesRepository.find({
      where: {
        course_id: courseId,
        actual_attendance: true,
        deleted_at: IsNull(),
      },
      relations: ['user'],
    });
  }

  /**
   * Calculer les statistiques d'un cours
   */
  async getCourseStats(courseId: string) {
    const course = await this.coursesRepository.findOne({
      where: { id: courseId, deleted_at: IsNull() },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const registered = await this.attendancesRepository.count({
      where: {
        course_id: courseId,
        intention: 'will_attend',
        deleted_at: IsNull(),
      },
    });

    const present = await this.attendancesRepository.count({
      where: {
        course_id: courseId,
        actual_attendance: true,
        deleted_at: IsNull(),
      },
    });

    const walkIns = await this.attendancesRepository.count({
      where: {
        course_id: courseId,
        intention: IsNull(),
        actual_attendance: true,
        deleted_at: IsNull(),
      },
    });

    const occupancyRate = course.max_capacity
      ? (present / course.max_capacity) * 100
      : null;

    const reliabilityRate = registered > 0 ? (present / registered) * 100 : 0;

    return {
      course_id: courseId,
      registered_count: registered,
      present_count: present,
      walk_ins_count: walkIns,
      max_capacity: course.max_capacity,
      occupancy_rate: occupancyRate,
      reliability_rate: reliabilityRate,
    };
  }

  /**
   * Calculer les statistiques d'un utilisateur
   */
  async getUserStats(userId: string, organizationId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId, deleted_at: IsNull() },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Compter les cours disponibles (non annulés) de l'organisation
    const availableCourses = await this.coursesRepository.count({
      where: {
        organization_id: organizationId,
        status: 'completed', // Seulement les cours terminés pour stats fiables
        deleted_at: IsNull(),
      },
    });

    // Compter les présences effectives
    const presentCount = await this.attendancesRepository.count({
      where: {
        user_id: userId,
        actual_attendance: true,
        deleted_at: IsNull(),
      },
    });

    // Compter les intentions
    const intentionsCount = await this.attendancesRepository.count({
      where: {
        user_id: userId,
        intention: 'will_attend',
        deleted_at: IsNull(),
      },
    });

    // Dernière présence
    const lastAttendance = await this.attendancesRepository.findOne({
      where: {
        user_id: userId,
        actual_attendance: true,
        deleted_at: IsNull(),
      },
      order: { actual_attendance_at: 'DESC' },
      relations: ['course'],
    });

    const attendanceRate =
      availableCourses > 0 ? (presentCount / availableCourses) * 100 : 0;

    const daysSinceLastAttendance = lastAttendance
      ? Math.floor(
          (Date.now() - lastAttendance.actual_attendance_at.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    // Détection risque d'abandon
    let riskLevel = 'low';
    if (daysSinceLastAttendance === null || daysSinceLastAttendance > 30) {
      riskLevel = 'critical';
    } else if (daysSinceLastAttendance > 21) {
      riskLevel = 'high';
    } else if (attendanceRate < 50) {
      riskLevel = 'medium';
    }

    return {
      user_id: userId,
      present_count: presentCount,
      intentions_count: intentionsCount,
      available_courses: availableCourses,
      attendance_rate: attendanceRate,
      last_attendance_date: lastAttendance?.actual_attendance_at,
      days_since_last_attendance: daysSinceLastAttendance,
      risk_level: riskLevel,
    };
  }

  /**
   * Mettre à jour une présence (admin override par exemple)
   */
  async update(
    id: string,
    dto: UpdateAttendanceDto,
    currentUserRole: string,
  ): Promise<Attendance> {
    const attendance = await this.attendancesRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    // Vérifier le verrouillage
    if (attendance.is_locked && currentUserRole !== 'admin') {
      throw new ForbiddenException(
        'This attendance is locked. Only admins can modify it.',
      );
    }

    // Mise à jour
    if (dto.intention !== undefined) {
      attendance.intention = dto.intention;
      attendance.intention_at = new Date();
    }

    if (dto.actual_attendance !== undefined) {
      attendance.actual_attendance = dto.actual_attendance;
      attendance.actual_attendance_at = new Date();
    }

    if (dto.notes !== undefined) {
      attendance.notes = dto.notes;
    }

    return this.attendancesRepository.save(attendance);
  }

  /**
   * Supprimer une présence (soft delete)
   */
  async remove(id: string, currentUserRole: string): Promise<void> {
    const attendance = await this.attendancesRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    // Vérifier le verrouillage
    if (attendance.is_locked && currentUserRole !== 'admin') {
      throw new ForbiddenException(
        'This attendance is locked. Only admins can delete it.',
      );
    }

    await this.attendancesRepository.softDelete(id);
  }
}
