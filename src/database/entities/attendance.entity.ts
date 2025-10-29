import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Unique,
} from 'typeorm';
import { Course } from './course.entity';
import { User } from './user.entity';
import { Organization } from './organization.entity';

@Entity('attendances')
@Unique(['course', 'user']) // Pas de doublon : une seule présence par user par cours
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relations
  @ManyToOne(() => Organization, { nullable: false })
  organization: Organization;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Course, { nullable: false, onDelete: 'CASCADE' })
  course: Course;

  @Column({ type: 'uuid' })
  course_id: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column({ type: 'uuid' })
  user_id: string;

  // INTENTION : Déclaration préalable
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Intention de présence : will_attend, will_not_attend',
  })
  intention: 'will_attend' | 'will_not_attend' | null;

  @Column({ type: 'timestamp', nullable: true })
  intention_at: Date;

  // PRÉSENCE EFFECTIVE : Présence réelle
  @Column({
    type: 'boolean',
    nullable: true,
    comment: 'Présence effective : true (présent), false (absent), null (non marqué)',
  })
  actual_attendance: boolean | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_attendance_at: Date;

  // Traçabilité du marquage de présence
  @ManyToOne(() => User, { nullable: true })
  marked_by_user: User;

  @Column({ type: 'uuid', nullable: true })
  marked_by_user_id: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Rôle de celui qui a marqué la présence',
  })
  marked_by_role: 'admin' | 'coach' | 'member' | null;

  // Verrouillage (optionnel selon paramètre organisation)
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Si true, seul admin peut modifier',
  })
  is_locked: boolean;

  // Notes optionnelles
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  // Propriétés calculées
  get is_present_as_expected(): boolean | null {
    // Compare intention et présence effective
    if (this.intention === 'will_attend' && this.actual_attendance === true) {
      return true; // Présent comme prévu ✓
    }
    if (
      this.intention === 'will_not_attend' &&
      this.actual_attendance === false
    ) {
      return true; // Absent comme prévu ✓
    }
    if (this.intention && this.actual_attendance !== null) {
      return false; // Différent de l'intention ✗
    }
    return null; // Pas assez d'info
  }

  get is_walk_in(): boolean {
    // Présent sans inscription préalable
    return this.intention === null && this.actual_attendance === true;
  }
}
