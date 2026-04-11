import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { JobPosting } from './job-posting.entity.js';
import { NegotiationState } from '../common/enums/index.js';

@Entity('negotiation_session')
export class NegotiationSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @ManyToOne(() => JobPosting)
  @JoinColumn({ name: 'job_id' })
  job: JobPosting;

  @Column({ name: 'seeker_id', type: 'uuid' })
  seekerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seeker_id' })
  seeker: User;

  @Column({ name: 'employer_id', type: 'uuid' })
  employerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column({ type: 'varchar', length: 20 })
  state: NegotiationState;

  @Column({ name: 'current_round', type: 'integer', default: 0 })
  currentRound: number;

  @Column({ name: 'max_rounds', type: 'integer' })
  maxRounds: number;

  @Column({ name: 'session_key_nonce', type: 'varchar', length: 64, nullable: true })
  sessionKeyNonce: string;

  @Column({ name: 'agreement_hash', type: 'varchar', length: 64, nullable: true })
  agreementHash: string;

  @Column({ name: 'on_chain_tx_hash', type: 'varchar', length: 64, nullable: true })
  onChainTxHash: string;

  @Column({ name: 'seeker_approved', type: 'boolean', default: false })
  seekerApproved: boolean;

  @Column({ name: 'employer_approved', type: 'boolean', default: false })
  employerApproved: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
