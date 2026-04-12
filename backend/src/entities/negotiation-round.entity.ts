import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { NegotiationSession } from './negotiation-session.entity.js';
import { NegotiationActor, NegotiationDecision } from '../common/enums/index.js';

@Entity('negotiation_round')
export class NegotiationRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @ManyToOne(() => NegotiationSession)
  @JoinColumn({ name: 'session_id' })
  session: NegotiationSession;

  @Column({ type: 'integer' })
  round: number;

  @Column({ type: 'varchar', length: 20 })
  actor: NegotiationActor;

  @Column({ name: 'encrypted_data', type: 'bytea' })
  encryptedData: Buffer;

  @Column({ type: 'varchar', length: 10 })
  decision: NegotiationDecision;

  @CreateDateColumn({ name: 'timestamp', type: 'timestamptz' })
  timestamp: Date;
}
