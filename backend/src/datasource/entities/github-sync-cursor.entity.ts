import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { GithubRepository } from './github-repository.entity.js';
import { GithubSyncResourceType } from '../../common/enums/index.js';

@Entity('github_sync_cursor')
@Unique(['repositoryId', 'resourceType'])
export class GithubSyncCursor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @ManyToOne(() => GithubRepository)
  @JoinColumn({ name: 'repository_id' })
  repository: GithubRepository;

  @Column({ name: 'resource_type', type: 'varchar', length: 16 })
  resourceType: GithubSyncResourceType;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date;

  @Column({ name: 'last_page', type: 'int', nullable: true })
  lastPage: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  etag: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
