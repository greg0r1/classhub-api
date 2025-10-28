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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relation avec l'organisation (multi-tenant)
  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid' })
  @Index()
  organization_id: string;

  // Authentification
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false }) // Jamais retourné par défaut
  password_hash: string;

  // Identité
  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  // Rôle et statut
  @Column({
    type: 'varchar',
    length: 20,
  })
  @Index()
  role: 'admin' | 'coach' | 'member';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  @Index()
  status: 'active' | 'inactive' | 'suspended';

  // Dates importantes
  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  join_date: Date;

  // Métadonnées flexibles (ceintures, certificat médical, etc.)
  @Column({
    type: 'jsonb',
    default: {},
  })
  metadata: {
    belt_level?: string;
    medical_cert?: {
      valid: boolean;
      expiry: Date;
    };
    [key: string]: any;
  };

  // Sécurité
  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_login_at: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password_reset_token: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  password_reset_expires: Date;

  // Audit
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;

  // Computed property pour le nom complet
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }
}