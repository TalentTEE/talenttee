import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { User } from '../../entities/user.entity.js';

@Entity('github_repository')
export class GithubRepository {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'github_repo_id', type: 'bigint' })
  githubRepoId: string;

  @Column({ name: 'full_name', type: 'varchar', length: 256 })
  fullName: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  language: string;

  @Column({ name: 'is_private', type: 'boolean', default: false })
  isPrivate: boolean;

  @Column({ name: 'stars_count', type: 'int', default: 0 })
  starsCount: number;

  @Column({ name: 'forks_count', type: 'int', default: 0 })
  forksCount: number;

  @Column({ type: 'text', array: true, nullable: true })
  topics: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
