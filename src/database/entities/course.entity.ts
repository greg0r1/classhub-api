import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week?: number; // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  interval?: number; // Tous les N jours/semaines/mois
  end_date?: Date; // Date de fin de récurrence
  count?: number; // Nombre d'occurrences
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid' })
  @Index()
  organization_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  course_type: string;

  @Column({ type: 'timestamp with time zone' })
  @Index()
  start_datetime: Date;

  @Column({ type: 'timestamp with time zone' })
  end_datetime: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'coach_id' })
  coach: User;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  coach_id: string;

  @Column({ type: 'integer', nullable: true })
  max_capacity: number;

  @Column({ type: 'boolean', default: false })
  is_recurring: boolean;

  @Column({ type: 'jsonb', nullable: true })
  recurrence_rule: RecurrenceRule;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'parent_recurrence_id' })
  parent_recurrence: Course;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parent_recurrence_id: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'scheduled',
  })
  @Index()
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;

  // Propriétés calculées
  get duration_minutes(): number {
    if (!this.start_datetime || !this.end_datetime) return 0;
    return Math.round(
      (new Date(this.end_datetime).getTime() - new Date(this.start_datetime).getTime()) / 1000 / 60,
    );
  }

  get is_past(): boolean {
    return new Date(this.end_datetime) < new Date();
  }

  get is_upcoming(): boolean {
    return new Date(this.start_datetime) > new Date();
  }

  get is_today(): boolean {
    const today = new Date();
    const courseDate = new Date(this.start_datetime);
    return (
      courseDate.getFullYear() === today.getFullYear() &&
      courseDate.getMonth() === today.getMonth() &&
      courseDate.getDate() === today.getDate()
    );
  }
}