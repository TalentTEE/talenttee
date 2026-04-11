import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { JobPosting } from './job-posting.entity.js';

@Entity('match_result')
export class MatchResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seeker_id', type: 'uuid' })
  seekerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seeker_id' })
  seeker: User;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @ManyToOne(() => JobPosting)
  @JoinColumn({ name: 'job_id' })
  job: JobPosting;

  @Column({ name: 'ann_score', type: 'float', nullable: true })
  annScore: number;

  @Column({ name: 'rerank_score', type: 'float', nullable: true })
  rerankScore: number;

  @Column({ name: 'final_rank', type: 'integer', nullable: true })
  finalRank: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
