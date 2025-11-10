import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
@Index(['user_id', 'revoked'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 500 })
  token: string;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_agent: string;

  @Column({ type: 'inet', nullable: true })
  ip_address: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at: Date;

  // Computed properties
  get is_expired(): boolean {
    return new Date() > this.expires_at;
  }

  get is_valid(): boolean {
    return !this.revoked && !this.is_expired;
  }
}
