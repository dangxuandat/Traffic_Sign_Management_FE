import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TrafficSign } from '../../traffic-signs/entities/traffic-sign.entity';
import { Submission } from '../../submissions/entities/submission.entity';
import { Vote } from '../../votes/entities/vote.entity';
import { CoinTransaction } from '../../coins/entities/coin-transaction.entity';
import { Notification } from '../../notifications/entities/notification.entity';

export enum UserRole {
  USER = 'user',
  STAFF = 'staff',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'display_name', length: 100 })
  displayName: string;

  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl: string;

  @Column({ name: 'coin_balance', default: 20 })
  coinBalance: number;

  @Column({
    name: 'reputation_score',
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0.5,
  })
  reputationScore: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => TrafficSign, (sign) => sign.submittedBy)
  submittedSigns: TrafficSign[];

  @OneToMany(() => Submission, (submission) => submission.user)
  submissions: Submission[];

  @OneToMany(() => Vote, (vote) => vote.user)
  votes: Vote[];

  @OneToMany(() => CoinTransaction, (transaction) => transaction.user)
  coinTransactions: CoinTransaction[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}
