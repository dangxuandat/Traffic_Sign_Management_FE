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
import { Submission } from '../../submissions/entities/submission.entity';
import { SignStatus } from '../../../common/enums/sign-status.enum';

export enum SignType {
  REGULATORY = 'regulatory',
  WARNING = 'warning',
  INFORMATIONAL = 'informational',
}

// SignStatus is imported from common/enums/sign-status.enum.ts
export { SignStatus };

@Entity('traffic_signs')
export class TrafficSign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SignType,
  })
  @Index()
  type: SignType;

  @Column({ length: 200 })
  label: string;

  // PostGIS geometry stored as GeoJSON
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  @Index({ spatial: true })
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: SignStatus,
    default: SignStatus.PENDING,
  })
  @Index()
  status: SignStatus;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedById: string;

  @ManyToOne(() => User, (user) => user.submittedSigns, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'submitted_by' })
  submittedBy: User;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Submission, (submission) => submission.trafficSign)
  submissions: Submission[];
}
