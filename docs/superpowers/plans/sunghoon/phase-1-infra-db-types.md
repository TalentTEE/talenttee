# Phase 1: 인프라 + DB 스키마 + 공유 타입 (Day 1 오전)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `docker-compose up` 한 번으로 개발 환경 기동, 10개 TypeORM 엔티티 확정, 팀 공유 타입 배포
**선행:** 없음 (최우선)
**완료 기준:** PostgreSQL + pgvector 기동, 모든 엔티티 테스트 통과, 팀원이 import 가능
**예상 소요:** ~1시간

---

## Task 1.1: Docker Compose 구성

**Files:**
- Create: `docker-compose.yml`
- Create: `init-db.sql`
- Create: `.env.example`

- [ ] **Step 1: docker-compose.yml 작성**

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: near-agent-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: near_agent
      POSTGRES_USER: near_agent
      POSTGRES_PASSWORD: near_agent_dev
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/01-init.sql

volumes:
  pgdata:
```

- [ ] **Step 2: pgvector 확장 초기화 SQL 작성**

```sql
-- init-db.sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

- [ ] **Step 3: .env.example 작성**

```bash
# .env.example
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=near_agent
DATABASE_USER=near_agent
DATABASE_PASSWORD=near_agent_dev

JWT_SECRET=your-jwt-secret-change-in-production
JWT_EXPIRES_IN=24h

NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org
AGREEMENT_CONTRACT_ID=agreement.testnet
ESCROW_CONTRACT_ID=escrow.testnet
```

- [ ] **Step 4: docker-compose 기동 테스트**

Run: `docker-compose up -d`
Expected: postgres 컨테이너 running 상태

- [ ] **Step 5: pgvector 확장 확인**

Run: `docker exec near-agent-db psql -U near_agent -d near_agent -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"`
Expected: `vector` 출력

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml init-db.sql .env.example
git commit -m "feat: add Docker Compose with PostgreSQL 16 + pgvector"
```

---

## Task 1.2: 백엔드 의존성 설치

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: TypeORM + PostgreSQL + pgvector 의존성 설치**

Run:
```bash
cd backend && npm install @nestjs/typeorm typeorm pg pgvector @nestjs/config
```

- [ ] **Step 2: Auth 관련 의존성 설치**

Run:
```bash
cd backend && npm install @nestjs/passport @nestjs/jwt passport passport-jwt jsonwebtoken near-sign-verify near-api-js
npm install -D @types/passport-jwt @types/jsonwebtoken
```

- [ ] **Step 3: class-validator 의존성 설치**

Run:
```bash
cd backend && npm install class-validator class-transformer
```

- [ ] **Step 4: 빌드 확인**

Run: `cd backend && npx nest build`
Expected: 에러 없이 빌드 완료

- [ ] **Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "feat: add TypeORM, Auth, validator dependencies"
```

---

## Task 1.3: 공유 Enum + 타입 + DB 설정

**Files:**
- Create: `backend/src/common/enums/index.ts`
- Create: `backend/src/common/types/index.ts`
- Create: `backend/src/config/database.config.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Enum 파일 작성**

```typescript
// backend/src/common/enums/index.ts

export enum UserRole {
  SEEKER = 'SEEKER',
  EMPLOYER = 'EMPLOYER',
}

export enum DataSourceProvider {
  GITHUB = 'GITHUB',
  SLACK = 'SLACK',
  DISCORD = 'DISCORD',
  GOV24 = 'GOV24',
}

export enum DataSourceStatus {
  CONNECTED = 'CONNECTED',
  MOCK = 'MOCK',
}

export enum JobPostingStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum NegotiationState {
  INITIATED = 'INITIATED',
  EMPLOYER_OFFER = 'EMPLOYER_OFFER',
  SEEKER_COUNTER = 'SEEKER_COUNTER',
  EMPLOYER_COUNTER = 'EMPLOYER_COUNTER',
  AGREED = 'AGREED',
  FAILED = 'FAILED',
  MAX_ROUNDS = 'MAX_ROUNDS',
}

export enum NegotiationActor {
  SEEKER_AGENT = 'SEEKER_AGENT',
  EMPLOYER_AGENT = 'EMPLOYER_AGENT',
}

export enum NegotiationDecision {
  COUNTER = 'COUNTER',
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
}
```

- [ ] **Step 2: 공유 타입/인터페이스 파일 작성**

```typescript
// backend/src/common/types/index.ts

export interface NegotiationProposal {
  salary: number;
  remotePolicy: string;
  workingHours: string;
  title: string;
  startDate: string;
  probationMonths: number;
  signingBonus?: number;
  stockOptions?: string;
}

export interface NegotiationBoundary {
  salaryMin: number;
  salaryMax: number;
  salaryHardMax: number;
  remotePolicyOptions: string[];
  nonNegotiableItems: string[];
}

export interface AgentResponse {
  round: number;
  actor: 'SEEKER_AGENT' | 'EMPLOYER_AGENT';
  proposal: NegotiationProposal;
  reasoning: string;
  decision: 'COUNTER' | 'ACCEPT' | 'REJECT';
}

export interface JwtPayload {
  sub: string; // nearAccountId
  role: 'SEEKER' | 'EMPLOYER';
  publicKey: string;
}
```

- [ ] **Step 3: database.config.ts 작성**

```typescript
// backend/src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER || 'near_agent',
  password: process.env.DATABASE_PASSWORD || 'near_agent_dev',
  database: process.env.DATABASE_NAME || 'near_agent',
  entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
  synchronize: true, // PoC only — disable in production
  logging: process.env.NODE_ENV === 'development',
});
```

- [ ] **Step 4: AppModule에 TypeORM + ConfigModule 등록**

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/common/ backend/src/config/ backend/src/app.module.ts
git commit -m "feat: add shared enums, types, and database config"
```

---

## Task 1.4: 10개 TypeORM 엔티티 (TDD)

**Files:**
- Create: `backend/src/entities/user.entity.ts`
- Create: `backend/src/entities/resume-profile.entity.ts`
- Create: `backend/src/entities/data-source-connection.entity.ts`
- Create: `backend/src/entities/job-posting.entity.ts`
- Create: `backend/src/entities/negotiation-session.entity.ts`
- Create: `backend/src/entities/negotiation-round.entity.ts`
- Create: `backend/src/entities/escrow-deposit.entity.ts`
- Create: `backend/src/entities/profile-access-grant.entity.ts`
- Create: `backend/src/entities/payment-record.entity.ts`
- Create: `backend/src/entities/match-result.entity.ts`
- Create: `backend/src/entities/index.ts`
- Test: `backend/src/entities/__tests__/all-entities.spec.ts`

- [ ] **Step 1: 전체 엔티티 테스트 작성 (실패 먼저)**

```typescript
// backend/src/entities/__tests__/all-entities.spec.ts
import { User } from '../user.entity.js';
import { ResumeProfile } from '../resume-profile.entity.js';
import { DataSourceConnection } from '../data-source-connection.entity.js';
import { JobPosting } from '../job-posting.entity.js';
import { NegotiationSession } from '../negotiation-session.entity.js';
import { NegotiationRound } from '../negotiation-round.entity.js';
import { EscrowDeposit } from '../escrow-deposit.entity.js';
import { ProfileAccessGrant } from '../profile-access-grant.entity.js';
import { PaymentRecord } from '../payment-record.entity.js';
import { MatchResult } from '../match-result.entity.js';
import { UserRole, NegotiationState, NegotiationDecision } from '../../common/enums/index.js';

describe('All Entities', () => {
  it('should instantiate all 10 entities', () => {
    expect(new User()).toBeDefined();
    expect(new ResumeProfile()).toBeDefined();
    expect(new DataSourceConnection()).toBeDefined();
    expect(new JobPosting()).toBeDefined();
    expect(new NegotiationSession()).toBeDefined();
    expect(new NegotiationRound()).toBeDefined();
    expect(new EscrowDeposit()).toBeDefined();
    expect(new ProfileAccessGrant()).toBeDefined();
    expect(new PaymentRecord()).toBeDefined();
    expect(new MatchResult()).toBeDefined();
  });

  it('should set User fields correctly', () => {
    const user = new User();
    user.nearAccountId = 'alice.testnet';
    user.role = UserRole.SEEKER;
    user.publicKey = 'ed25519:abc123';
    expect(user.nearAccountId).toBe('alice.testnet');
    expect(user.role).toBe(UserRole.SEEKER);
  });

  it('should set ResumeProfile fields correctly', () => {
    const profile = new ResumeProfile();
    profile.skills = ['TypeScript', 'React', 'NestJS'];
    profile.marketValueMin = 60000000;
    profile.marketValueMax = 80000000;
    expect(profile.skills).toHaveLength(3);
    expect(profile.marketValueMin).toBe(60000000);
  });

  it('should set NegotiationSession fields correctly', () => {
    const session = new NegotiationSession();
    session.state = NegotiationState.INITIATED;
    session.maxRounds = 7;
    session.currentRound = 0;
    expect(session.state).toBe('INITIATED');
    expect(session.maxRounds).toBe(7);
  });

  it('should set NegotiationRound decision correctly', () => {
    const round = new NegotiationRound();
    round.decision = NegotiationDecision.ACCEPT;
    round.round = 3;
    expect(round.decision).toBe('ACCEPT');
    expect(round.round).toBe(3);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd backend && npx jest src/entities/__tests__/all-entities.spec.ts --no-cache`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: User 엔티티 구현**

```typescript
// backend/src/entities/user.entity.ts
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

- [ ] **Step 4: ResumeProfile 엔티티 구현**

```typescript
// backend/src/entities/resume-profile.entity.ts
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
```

- [ ] **Step 5: DataSourceConnection 엔티티 구현**

```typescript
// backend/src/entities/data-source-connection.entity.ts
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
}
```

- [ ] **Step 6: JobPosting 엔티티 구현**

```typescript
// backend/src/entities/job-posting.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { JobPostingStatus } from '../common/enums/index.js';

@Entity('job_posting')
export class JobPosting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'employer_id', type: 'uuid' })
  employerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'required_skills', type: 'text', array: true, nullable: true })
  requiredSkills: string[];

  @Column({ name: 'preferred_skills', type: 'text', array: true, nullable: true })
  preferredSkills: string[];

  @Column({ name: 'salary_min', type: 'bigint', nullable: true })
  salaryMin: number;

  @Column({ name: 'salary_max', type: 'bigint', nullable: true })
  salaryMax: number;

  @Column({ name: 'salary_negotiable', type: 'boolean', default: true })
  salaryNegotiable: boolean;

  @Column({ name: 'remote_policy', type: 'varchar', length: 100, nullable: true })
  remotePolicy: string;

  @Column({ name: 'working_hours', type: 'varchar', length: 100, nullable: true })
  workingHours: string;

  @Column({ type: 'text', nullable: true })
  benefits: string;

  @Column({ name: 'negotiation_boundary', type: 'jsonb', nullable: true })
  negotiationBoundary: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  embedding: string; // pgvector VECTOR(1536)

  @Column({ type: 'varchar', length: 10, default: JobPostingStatus.ACTIVE })
  status: JobPostingStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

- [ ] **Step 7: NegotiationSession 엔티티 구현**

```typescript
// backend/src/entities/negotiation-session.entity.ts
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

- [ ] **Step 8: NegotiationRound 엔티티 구현**

```typescript
// backend/src/entities/negotiation-round.entity.ts
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
```

- [ ] **Step 9: EscrowDeposit 엔티티 구현**

```typescript
// backend/src/entities/escrow-deposit.entity.ts
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
```

- [ ] **Step 10: ProfileAccessGrant 엔티티 구현**

```typescript
// backend/src/entities/profile-access-grant.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity('profile_access_grant')
export class ProfileAccessGrant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

- [ ] **Step 11: PaymentRecord 엔티티 구현**

```typescript
// backend/src/entities/payment-record.entity.ts
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
```

- [ ] **Step 12: MatchResult 엔티티 구현**

```typescript
// backend/src/entities/match-result.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity.js';
import { JobPosting } from './job-posting.entity.js';

@Entity('match_result')
export class MatchResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seeker_id', type: 'uuid' })
  seekerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seeker_id' })
  seeker: User;

  @Column({ name: 'job_id', type: 'uuid' })
  jobId: string;

  @ManyToOne(() => JobPosting)
  @JoinColumn({ name: 'job_id' })
  job: JobPosting;

  @Column({ name: 'ann_score', type: 'float', nullable: true })
  annScore: number;

  @Column({ name: 'rerank_score', type: 'float', nullable: true })
  rerankScore: number;

  @Column({ name: 'final_rank', type: 'integer', nullable: true })
  finalRank: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

- [ ] **Step 13: Barrel export 작성**

```typescript
// backend/src/entities/index.ts
export { User } from './user.entity.js';
export { ResumeProfile } from './resume-profile.entity.js';
export { DataSourceConnection } from './data-source-connection.entity.js';
export { JobPosting } from './job-posting.entity.js';
export { NegotiationSession } from './negotiation-session.entity.js';
export { NegotiationRound } from './negotiation-round.entity.js';
export { EscrowDeposit } from './escrow-deposit.entity.js';
export { ProfileAccessGrant } from './profile-access-grant.entity.js';
export { PaymentRecord } from './payment-record.entity.js';
export { MatchResult } from './match-result.entity.js';
```

- [ ] **Step 14: 테스트 실행 — 통과 확인**

Run: `cd backend && npx jest src/entities/__tests__/all-entities.spec.ts --no-cache`
Expected: PASS — 5 tests

- [ ] **Step 15: Commit**

```bash
git add backend/src/entities/
git commit -m "feat: add all 10 TypeORM entities matching PRD Section 4.7"
```

---

## Phase 1 완료 기준

- [ ] `docker-compose up -d` → PostgreSQL + pgvector 정상 기동
- [ ] pgvector 확장 활성화 확인
- [ ] 10개 엔티티 테스트 전부 통과
- [ ] `backend/src/common/enums/index.ts` — 팀원 import 가능
- [ ] `backend/src/common/types/index.ts` — 팀원 import 가능
- [ ] 팀에 "Phase 1 완료 — 엔티티/타입 사용 가능" 공유
