import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../common/enums/index.js';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'near_account_id', type: 'varchar', length: 64, unique: true })
  nearAccountId: string;

  @Column({ type: 'varchar', length: 10 })
  role: UserRole;

  @Column({ name: 'public_key', type: 'varchar', length: 128 })
  publicKey: string;

  @Column({ name: 'job_seeking', type: 'boolean', default: false })
  jobSeeking: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
