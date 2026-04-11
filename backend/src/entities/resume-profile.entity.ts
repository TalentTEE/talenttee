import {
  Entity, PrimaryGeneratedColumn, Column,
  UpdateDateColumn, OneToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity('resume_profile')
export class ResumeProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'raw_text', type: 'text', nullable: true })
  rawText: string;

  @Column({ name: 'parsed_data', type: 'jsonb', nullable: true })
  parsedData: Record<string, any>;

  @Column({ type: 'text', array: true, nullable: true })
  skills: string[];

  @Column({ type: 'jsonb', array: true, nullable: true })
  experience: Record<string, any>[];

  @Column({ type: 'jsonb', array: true, nullable: true })
  education: Record<string, any>[];

  @Column({ name: 'market_value_min', type: 'bigint', nullable: true })
  marketValueMin: number;

  @Column({ name: 'market_value_max', type: 'bigint', nullable: true })
  marketValueMax: number;

  @Column({ name: 'market_value_reasoning', type: 'text', nullable: true })
  marketValueReasoning: string;

  @Column({ type: 'varchar', nullable: true })
  embedding: string; // pgvector VECTOR(1536)

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
