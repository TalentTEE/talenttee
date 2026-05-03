import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { DataSourceProvider, DataSourceStatus } from '../common/enums/index.js';

@Entity('data_source_connection')
export class DataSourceConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  provider: DataSourceProvider;

  @Column({ type: 'varchar', length: 10 })
  status: DataSourceStatus;

  @Column({ name: 'access_token', type: 'varchar', length: 512, nullable: true })
  accessToken: string;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date;

  @Column({ name: 'analysis_cache', type: 'jsonb', nullable: true })
  analysisCache: Record<string, any>;

  @Column({ name: 'analysis_cached_at', type: 'timestamptz', nullable: true })
  analysisCachedAt: Date;

  @Column({ name: 'selected_repos', type: 'jsonb', nullable: true })
  selectedRepos: string[] | null;
}
