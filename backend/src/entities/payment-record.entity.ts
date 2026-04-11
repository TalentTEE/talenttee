import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { NegotiationSession } from './negotiation-session.entity.js';

@Entity('payment_record')
export class PaymentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => NegotiationSession)
  @JoinColumn({ name: 'session_id' })
  session: NegotiationSession;

  @Column({ name: 'employer_id', type: 'uuid' })
  employerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column({ name: 'seeker_id', type: 'uuid' })
  seekerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seeker_id' })
  seeker: User;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ name: 'near_tx_hash', type: 'varchar', length: 64 })
  nearTxHash: string;

  @Column({ name: 'agreement_hash', type: 'varchar', length: 64 })
  agreementHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
