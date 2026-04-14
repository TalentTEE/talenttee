import {
  Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../entities/user.entity.js';

@Entity('resume_sync_checkpoint')
export class ResumeSyncCheckpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'last_commit_synced_at', type: 'timestamptz', nullable: true })
  lastCommitSyncedAt: Date;

  @Column({ name: 'last_pr_synced_at', type: 'timestamptz', nullable: true })
  lastPrSyncedAt: Date;

  @Column({ name: 'last_issue_synced_at', type: 'timestamptz', nullable: true })
  lastIssueSyncedAt: Date;

  @Column({ name: 'pending_commits', type: 'int', default: 0 })
  pendingCommits: number;

  @Column({ name: 'pending_prs', type: 'int', default: 0 })
  pendingPrs: number;

  @Column({ name: 'pending_issues', type: 'int', default: 0 })
  pendingIssues: number;

  @Column({ name: 'resume_updated_at', type: 'timestamptz', nullable: true })
  resumeUpdatedAt: Date;
}
