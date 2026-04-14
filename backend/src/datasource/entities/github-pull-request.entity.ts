import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { GithubRepository } from './github-repository.entity.js';

@Entity('github_pull_request')
@Unique(['repositoryId', 'githubPrNumber'])
export class GithubPullRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @ManyToOne(() => GithubRepository)
  @JoinColumn({ name: 'repository_id' })
  repository: GithubRepository;

  @Column({ name: 'github_pr_number', type: 'int' })
  githubPrNumber: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'varchar', length: 16 })
  state: string;

  @Column({ name: 'is_merged', type: 'boolean', default: false })
  isMerged: boolean;

  @Column({ type: 'int', nullable: true })
  additions: number;

  @Column({ type: 'int', nullable: true })
  deletions: number;

  @Column({ name: 'changed_files', type: 'int', nullable: true })
  changedFiles: number;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date;

  @Column({ name: 'merged_at', type: 'timestamptz', nullable: true })
  mergedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, any>;
}
