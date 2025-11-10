import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

export interface SubscriptionTypeDetails {
  name: string; // ex: "Mensuel", "Trimestriel", "Annuel"
  duration_months: number; // 1, 3, 12
  price: number;
  currency: string; // EUR, USD, etc.
  description?: string;
  benefits?: string[]; // Avantages inclus
}

@Entity('member_subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relations
  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  user_id: string;

  // Type d'abonnement (stocké en JSONB pour flexibilité)
  @Column({
    type: 'jsonb',
    comment: 'Détails du type d\'abonnement',
  })
  subscription_type: SubscriptionTypeDetails;

  // Statut
  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
    comment: 'Statut: active, expired, cancelled, suspended',
  })
  status: 'active' | 'expired' | 'cancelled' | 'suspended';

  // Dates importantes
  @Column({ type: 'date', comment: 'Date de début d\'abonnement' })
  start_date: Date;

  @Column({ type: 'date', comment: 'Date de fin d\'abonnement' })
  end_date: Date;

  @Column({
    type: 'date',
    nullable: true,
    comment: 'Date de dernier renouvellement',
  })
  last_renewed_at: Date;

  // Paiement
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'Montant payé',
  })
  amount_paid: number;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    comment: 'Statut du paiement: pending, paid, failed, refunded',
  })
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';

  @Column({ type: 'timestamp', nullable: true })
  payment_date: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Méthode de paiement: card, cash, transfer, etc.',
  })
  payment_method: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Référence de transaction externe',
  })
  payment_reference: string;

  // Renouvellement automatique
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Si true, renouvellement automatique activé',
  })
  auto_renew: boolean;

  // Annulation
  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'cancelled_by_user_id' })
  cancelled_by_user: User;

  @Column({ type: 'uuid', nullable: true })
  cancelled_by_user_id: string;

  // Notes et métadonnées
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  // Propriétés calculées
  get is_active(): boolean {
    return this.status === 'active' && new Date() <= new Date(this.end_date);
  }

  get is_expired(): boolean {
    return new Date() > new Date(this.end_date);
  }

  get days_remaining(): number {
    const now = new Date();
    const end = new Date(this.end_date);
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get is_expiring_soon(): boolean {
    // Expire dans moins de 7 jours
    return this.days_remaining > 0 && this.days_remaining <= 7;
  }

  get duration_months(): number {
    return this.subscription_type.duration_months;
  }
}
