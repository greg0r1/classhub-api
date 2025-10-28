import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Identité
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  // Contact
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  // Branding
  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string;

  // Configuration (JSONB pour flexibilité)
  @Column({
    type: 'jsonb',
    default: {
      lock_attendance_by_coach: true,
      default_capacity: 15,
      season_start_month: 9,
      timezone: 'Europe/Paris',
    },
  })
  settings: {
    lock_attendance_by_coach: boolean;
    default_capacity: number;
    season_start_month: number;
    timezone: string;
  };

  // Abonnement
  @Column({
    type: 'varchar',
    length: 20,
    default: 'trial',
  })
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'free',
  })
  subscription_plan: 'free' | 'pro' | 'premium';

  @Column({ type: 'timestamp with time zone', nullable: true })
  trial_ends_at: Date;

  // Métadonnées
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Audit (gérés automatiquement par TypeORM)
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;
}
