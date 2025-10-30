import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

/**
 * AuditLog Entity
 *
 * Traçabilité complète de toutes les actions effectuées dans l'application
 * Conformité RGPD : historique des modifications, qui a fait quoi et quand
 */
@Entity('audit_logs')
@Index(['organization_id', 'created_at']) // Recherche rapide par org + date
@Index(['user_id', 'created_at']) // Recherche rapide par user + date
@Index(['entity_type', 'entity_id']) // Recherche rapide par entité
@Index(['action', 'created_at']) // Recherche rapide par action
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relations
  @ManyToOne(() => Organization, { nullable: false })
  organization: Organization;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => User, { nullable: true })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Email de l\'utilisateur au moment de l\'action',
  })
  user_email: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Rôle de l\'utilisateur au moment de l\'action',
  })
  user_role: 'admin' | 'coach' | 'member' | null;

  // Action effectuée
  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Type d\'action: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.',
  })
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'SOFT_DELETE'
    | 'RESTORE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'FAILED_LOGIN'
    | 'PASSWORD_CHANGE'
    | 'CANCEL'
    | 'RENEW'
    | 'SUSPEND'
    | 'REACTIVATE'
    | 'OTHER';

  // Entité concernée
  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Type d\'entité: User, Course, Attendance, Subscription, etc.',
  })
  entity_type: string;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID de l\'entité concernée',
  })
  entity_id: string | null;

  // Valeurs avant/après (pour UPDATE)
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Valeurs avant modification',
  })
  old_values: Record<string, any> | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Nouvelles valeurs après modification',
  })
  new_values: Record<string, any> | null;

  // Contexte de la requête
  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Méthode HTTP: GET, POST, PUT, PATCH, DELETE',
  })
  http_method: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'URL de la requête',
  })
  request_url: string;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'Adresse IP de l\'utilisateur',
  })
  ip_address: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'User-Agent du navigateur',
  })
  user_agent: string;

  // Métadonnées supplémentaires
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Description lisible de l\'action',
  })
  description: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: {},
    comment: 'Métadonnées supplémentaires',
  })
  metadata: Record<string, any>;

  // Statut
  @Column({
    type: 'boolean',
    default: true,
    comment: 'true si l\'action a réussi, false si elle a échoué',
  })
  success: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Message d\'erreur si l\'action a échoué',
  })
  error_message: string;

  // Timestamp
  @CreateDateColumn()
  created_at: Date;

  // Propriétés calculées
  get changes(): string[] {
    if (!this.old_values || !this.new_values) return [];

    const changedFields: string[] = [];
    const allKeys = new Set([
      ...Object.keys(this.old_values),
      ...Object.keys(this.new_values),
    ]);

    for (const key of allKeys) {
      if (
        JSON.stringify(this.old_values[key]) !==
        JSON.stringify(this.new_values[key])
      ) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  get duration_ms(): number | null {
    // Future: si on ajoute un end_timestamp
    return null;
  }
}
