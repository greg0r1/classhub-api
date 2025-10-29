import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Course } from '../../database/entities/course.entity';
import { CreateCourseDto, UpdateCourseDto } from './dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<Course> {
    // Validation des dates
    const startDate = new Date(createCourseDto.start_datetime);
    const endDate = new Date(createCourseDto.end_datetime);

    if (endDate <= startDate) {
      throw new BadRequestException(
        'La date de fin doit être postérieure à la date de début',
      );
    }

    // Si récurrent, créer le cours parent et générer les occurrences
    if (createCourseDto.is_recurring && createCourseDto.recurrence_rule) {
      return await this.createRecurringCourse(createCourseDto);
    }

    // Sinon, créer un cours simple
    const course = this.courseRepository.create(createCourseDto);
    return await this.courseRepository.save(course);
  }

  private async createRecurringCourse(
    createCourseDto: CreateCourseDto,
  ): Promise<Course> {
    // Créer le cours parent (template de récurrence)
    const parentCourse = this.courseRepository.create({
      ...createCourseDto,
      is_recurring: true,
    });

    const savedParent = await this.courseRepository.save(parentCourse);

    // Générer les occurrences (par exemple pour les 3 prochains mois)
    await this.generateOccurrences(savedParent, 90); // 90 jours

    return savedParent;
  }

  private async generateOccurrences(
    parentCourse: Course,
    daysAhead: number,
  ): Promise<void> {
    const { recurrence_rule, start_datetime, end_datetime } = parentCourse;

    if (!recurrence_rule) return;

    const startDate = new Date(start_datetime);
    const endDate = new Date(end_datetime);
    const duration = endDate.getTime() - startDate.getTime();

    const occurrences: Partial<Course>[] = [];
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + daysAhead);

    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 7); // Commence à la semaine suivante

    let count = 0;
    const maxOccurrences = recurrence_rule.count || 52; // Max 1 an si non spécifié

    while (currentDate <= maxDate && count < maxOccurrences) {
      // Vérifier la limite de fin de récurrence
      if (
        recurrence_rule.end_date &&
        currentDate > new Date(recurrence_rule.end_date)
      ) {
        break;
      }

      const occurrenceStart = new Date(currentDate);
      const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);

      occurrences.push({
        organization_id: parentCourse.organization_id,
        title: parentCourse.title,
        description: parentCourse.description,
        course_type: parentCourse.course_type,
        start_datetime: occurrenceStart,
        end_datetime: occurrenceEnd,
        location: parentCourse.location,
        coach_id: parentCourse.coach_id,
        max_capacity: parentCourse.max_capacity,
        is_recurring: false,
        parent_recurrence_id: parentCourse.id,
        status: 'scheduled',
        metadata: parentCourse.metadata,
      });

      // Avancer selon la fréquence
      switch (recurrence_rule.frequency) {
        case 'daily':
          currentDate.setDate(
            currentDate.getDate() + (recurrence_rule.interval || 1),
          );
          break;
        case 'weekly':
          currentDate.setDate(
            currentDate.getDate() + 7 * (recurrence_rule.interval || 1),
          );
          break;
        case 'monthly':
          currentDate.setMonth(
            currentDate.getMonth() + (recurrence_rule.interval || 1),
          );
          break;
      }

      count++;
    }

    // Sauvegarder toutes les occurrences en batch
    if (occurrences.length > 0) {
      await this.courseRepository.save(occurrences);
    }
  }

  async findAll(organizationId?: string): Promise<Course[]> {
    const where: any = { deleted_at: IsNull() };
    if (organizationId) {
      where.organization_id = organizationId;
    }

    return await this.courseRepository.find({
      where,
      relations: ['organization', 'coach'],
      order: { start_datetime: 'ASC' },
    });
  }

  async findUpcoming(
    organizationId: string,
    limit: number = 10,
  ): Promise<Course[]> {
    const now = new Date();

    return await this.courseRepository.find({
      where: {
        organization_id: organizationId,
        deleted_at: IsNull(),
        status: 'scheduled',
        start_datetime: MoreThanOrEqual(now),
      },
      relations: ['organization', 'coach'],
      order: { start_datetime: 'ASC' },
      take: limit,
    });
  }

  async findByDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Course[]> {
    return await this.courseRepository.find({
      where: {
        organization_id: organizationId,
        deleted_at: IsNull(),
        start_datetime: Between(startDate, endDate),
      },
      relations: ['organization', 'coach'],
      order: { start_datetime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['organization', 'coach', 'parent_recurrence'],
    });

    if (!course) {
      throw new NotFoundException(`Cours avec l'ID "${id}" introuvable`);
    }

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<Course> {
    const course = await this.findOne(id);

    // Si c'est une occurrence d'un cours récurrent
    if (course.parent_recurrence_id) {
      // Mise à jour uniquement de cette occurrence
      Object.assign(course, updateCourseDto);
      return await this.courseRepository.save(course);
    }

    // Si c'est un cours récurrent parent
    if (course.is_recurring) {
      // L'utilisateur peut choisir de mettre à jour toutes les occurrences futures
      // Pour l'instant, on met à jour seulement le parent
      Object.assign(course, updateCourseDto);
      return await this.courseRepository.save(course);
    }

    // Cours simple
    Object.assign(course, updateCourseDto);
    return await this.courseRepository.save(course);
  }

  async cancel(
    id: string,
    reason: string,
    cancelFutureOccurrences: boolean = false,
  ): Promise<Course> {
    const course = await this.findOne(id);

    course.status = 'cancelled';
    course.cancellation_reason = reason;
    course.cancelled_at = new Date();

    await this.courseRepository.save(course);

    // Si demandé, annuler toutes les occurrences futures
    if (cancelFutureOccurrences && course.parent_recurrence_id) {
      await this.courseRepository.update(
        {
          parent_recurrence_id: course.parent_recurrence_id,
          start_datetime: MoreThanOrEqual(course.start_datetime),
          status: 'scheduled',
        },
        {
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date(),
        },
      );
    }

    return course;
  }

  async remove(id: string): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.softDelete(id);
  }

  async restore(id: string): Promise<Course> {
    await this.courseRepository.restore(id);
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['organization', 'coach'],
    });

    if (!course) {
      throw new NotFoundException(
        `Cours avec l'ID "${id}" introuvable après restauration`,
      );
    }

    return course;
  }
}