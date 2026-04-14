import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { GithubRepository } from './github-repository.entity.js';

@Entity('github_issue')
@Unique(['repositoryId', 'githubIssueNumber'])
export class GithubIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @ManyToOne(() => GithubRepository)
  @JoinColumn({ name: 'repository_id' })
  repository: GithubRepository;

  @Column({ name: 'github_issue_number', type: 'int' })
  githubIssueNumber: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'varchar', length: 16 })
  state: string;

  @Column({ type: 'text', array: true, nullable: true })
  labels: string[];

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, any>;
}
