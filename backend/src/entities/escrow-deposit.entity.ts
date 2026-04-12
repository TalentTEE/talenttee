import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity('escrow_deposit')
export class EscrowDeposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employer_id', type: 'uuid' })
  employerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column({ name: 'near_tx_hash', type: 'varchar', length: 64 })
  nearTxHash: string;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ name: 'remaining_balance', type: 'bigint' })
  remainingBalance: number;

  @Column({ name: 'agent_key_public_key', type: 'varchar', length: 128, nullable: true })
  agentKeyPublicKey: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
