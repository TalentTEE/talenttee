import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { JobPostingStatus } from '../common/enums/index.js';

@Entity('job_posting')
export class JobPosting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employer_id', type: 'uuid' })
  employerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'required_skills', type: 'text', array: true, nullable: true })
  requiredSkills: string[];

  @Column({ name: 'preferred_skills', type: 'text', array: true, nullable: true })
  preferredSkills: string[];

  @Column({ name: 'salary_min', type: 'bigint', nullable: true })
  salaryMin: number;

  @Column({ name: 'salary_max', type: 'bigint', nullable: true })
  salaryMax: number;

  @Column({ name: 'salary_negotiable', type: 'boolean', default: true })
  salaryNegotiable: boolean;

  @Column({ name: 'remote_policy', type: 'varchar', length: 100, nullable: true })
  remotePolicy: string;

  @Column({ name: 'working_hours', type: 'varchar', length: 100, nullable: true })
  workingHours: string;

  @Column({ type: 'text', nullable: true })
  benefits: string;

  @Column({ name: 'negotiation_boundary', type: 'jsonb', nullable: true })
  negotiationBoundary: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  embedding: string; // pgvector VECTOR(1536)

  @Column({ type: 'varchar', length: 10, default: JobPostingStatus.ACTIVE })
  status: JobPostingStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
