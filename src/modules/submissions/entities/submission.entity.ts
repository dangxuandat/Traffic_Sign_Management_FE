import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TrafficSign } from '../../traffic-signs/entities/traffic-sign.entity';
import { SignStatus } from '../../../common/enums/sign-status.enum';
import { Vote } from '../../votes/entities/vote.entity';

export enum SubmissionAction {
  ADD = 'add',
  UPDATE = 'update',
  REMOVE = 'remove',
}

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'traffic_sign_id', type: 'uuid', nullable: true })
  trafficSignId: string;

  @ManyToOne(() => TrafficSign, (sign) => sign.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'traffic_sign_id' })
  trafficSign: TrafficSign;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: SubmissionAction,
  })
  action: SubmissionAction;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: SignStatus,
    default: SignStatus.PENDING,
  })
  @Index()
  status: SignStatus;

  @Column({
    name: 'approval_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  approvalPercentage: number;

  @Column({ name: 'vote_count', default: 0 })
  voteCount: number;

  @Column({ type: 'timestamptz' })
  @Index()
  deadline: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Vote, (vote) => vote.submission)
  votes: Vote[];
}
