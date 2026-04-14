import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { GithubRepository } from './github-repository.entity.js';

@Entity('github_commit')
export class GithubCommit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @ManyToOne(() => GithubRepository)
  @JoinColumn({ name: 'repository_id' })
  repository: GithubRepository;

  @Column({ type: 'varchar', length: 40, unique: true })
  sha: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'author_name', type: 'varchar', length: 128, nullable: true })
  authorName: string;

  @Column({ name: 'author_email', type: 'varchar', length: 256, nullable: true })
  authorEmail: string;

  @Column({ name: 'authored_at', type: 'timestamptz', nullable: true })
  authoredAt: Date;

  @Column({ type: 'int', nullable: true })
  additions: number;

  @Column({ type: 'int', nullable: true })
  deletions: number;

  @Column({ name: 'files_changed', type: 'int', nullable: true })
  filesChanged: number;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, any>;
}
