# Phase 1: Foundation — NearAiClient 실구현 + Interface 확장 + 엔티티 보강

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** NEAR AI Cloud 실제 연동 클라이언트와 AI Pipeline 전체에서 필요한 인터페이스/엔티티 기반을 마련한다.

**Architecture:** NearAiClient 인터페이스에 embed/rerank 추가. OpenAI SDK로 NEAR AI Cloud 실제 호출. 외부 의존(Escrow, Negotiation)은 인터페이스+Mock으로 분리. MatchResult/ResumeProfile 엔티티에 누락 컬럼 추가.

**Tech Stack:** NestJS 11, OpenAI SDK, TypeORM, pgvector

---

### Task 1: npm 패키지 설치

**Files:**
- Modify: `backend/package.json`

- [x] **Step 1: openai 패키지 설치**

```bash
cd /Users/javis.hwang/talentee/backend && npm install openai
```

- [x] **Step 2: 설치 확인**

```bash
cd /Users/javis.hwang/talentee/backend && node -e "require('openai')" && echo "OK"
```

Expected: `OK`

---

### Task 2: NearAiClient 인터페이스 확장 (embed + rerank)

**Files:**
- Modify: `backend/src/common/interfaces/near-ai-client.interface.ts`

- [x] **Step 1: 인터페이스에 embed, rerank 메서드 추가**

기존 `chat()` 은 유지하고 `embed()`, `rerank()` 추가:

```typescript
// backend/src/common/interfaces/near-ai-client.interface.ts
export const NEAR_AI_CLIENT = 'NEAR_AI_CLIENT';

export interface NearAiClient {
  chat(params: {
    agentId: string;
    systemPrompt: string;
    userMessage: string;
    conversationHistory?: { role: string; content: string }[];
  }): Promise<{ content: string }>;

  embed(input: string | string[]): Promise<number[][]>;

  rerank(query: string, documents: string[], topN?: number): Promise<{ index: number; score: number }[]>;
}
```

- [x] **Step 2: MockNearAiClient에 embed/rerank stub 추가**

승연의 MockNearAiClient가 깨지지 않도록 stub 구현 추가:

```typescript
// backend/src/common/mocks/mock-near-ai-client.ts — 기존 클래스에 메서드 추가

async embed(input: string | string[]): Promise<number[][]> {
  const inputs = Array.isArray(input) ? input : [input];
  return inputs.map(() => Array.from({ length: 1024 }, () => Math.random() * 2 - 1));
}

async rerank(query: string, documents: string[], topN?: number): Promise<{ index: number; score: number }[]> {
  const limit = topN ?? documents.length;
  return documents
    .map((_, index) => ({ index, score: Math.random() }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

- [x] **Step 3: 빌드 확인**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
```

Expected: 에러 없음

- [x] **Step 4: Commit**

```bash
git add backend/src/common/interfaces/near-ai-client.interface.ts backend/src/common/mocks/mock-near-ai-client.ts
git commit -m "feat: extend NearAiClient interface with embed() and rerank()"
```

---

### Task 3: NEAR AI Cloud 실제 클라이언트 구현

**Files:**
- Create: `backend/src/agent/near-ai.client.ts`
- Create: `backend/src/agent/agent.module.ts`

- [x] **Step 1: NearAiClient 실제 구현체 작성**

```typescript
// backend/src/agent/near-ai.client.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';

@Injectable()
export class NearAiCloudClient implements NearAiClient {
  private readonly client: OpenAI;
  private readonly chatModel: string;
  private readonly embedModel: string;

  constructor(config: ConfigService) {
    this.client = new OpenAI({
      baseURL: config.get('NEAR_AI_BASE_URL', 'https://api.near.ai/v1'),
      apiKey: config.get('NEAR_AI_API_KEY', ''),
    });
    this.chatModel = config.get('NEAR_AI_CHAT_MODEL', 'qwen3-235b-a22b');
    this.embedModel = config.get('NEAR_AI_EMBED_MODEL', 'qwen3-embedding');
  }

  async chat(params: {
    agentId: string;
    systemPrompt: string;
    userMessage: string;
    conversationHistory?: { role: string; content: string }[];
  }): Promise<{ content: string }> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: params.systemPrompt },
      ...(params.conversationHistory ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: params.userMessage },
    ];

    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      messages,
      temperature: 0.7,
    });

    return { content: response.choices[0]?.message?.content ?? '' };
  }

  async embed(input: string | string[]): Promise<number[][]> {
    const inputs = Array.isArray(input) ? input : [input];
    const response = await this.client.embeddings.create({
      model: this.embedModel,
      input: inputs,
    });

    return response.data.map((d) => d.embedding);
  }

  async rerank(
    query: string,
    documents: string[],
    topN?: number,
  ): Promise<{ index: number; score: number }[]> {
    // NEAR AI Cloud rerank은 chat 기반 fallback으로 구현
    // 실제 rerank endpoint가 있으면 교체
    const prompt = `You are a relevance scorer. Rate how relevant each document is to the query.
Query: ${query}

Documents:
${documents.map((d, i) => `[${i}] ${d.slice(0, 500)}`).join('\n\n')}

Return a JSON array of objects with "index" and "score" (0.0-1.0).
Only return the JSON array, no other text.`;

    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content ?? '[]';
    try {
      const parsed = JSON.parse(content.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      const results = (parsed as { index: number; score: number }[])
        .sort((a, b) => b.score - a.score);
      return topN ? results.slice(0, topN) : results;
    } catch {
      // fallback: 순서대로 균등 점수
      return documents.map((_, index) => ({ index, score: 1 - index * 0.1 }));
    }
  }
}
```

- [x] **Step 2: AgentModule 작성**

```typescript
// backend/src/agent/agent.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NearAiCloudClient } from './near-ai.client.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NEAR_AI_CLIENT,
      useClass: NearAiCloudClient,
    },
  ],
  exports: [NEAR_AI_CLIENT],
})
export class AgentModule {}
```

- [x] **Step 3: 빌드 확인**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
```

- [x] **Step 4: Commit**

```bash
git add backend/src/agent/
git commit -m "feat: implement NearAiCloudClient with OpenAI SDK for NEAR AI Cloud"
```

---

### Task 4: 외부 의존 인터페이스 정의 (Escrow + Negotiation Handoff)

**Files:**
- Create: `backend/src/common/interfaces/escrow-payment.interface.ts`
- Create: `backend/src/common/interfaces/negotiation-handoff.interface.ts`
- Create: `backend/src/common/mocks/mock-escrow-payment.ts`
- Create: `backend/src/common/mocks/mock-negotiation-handoff.ts`
- Modify: `backend/src/common/interfaces/index.ts`

- [x] **Step 1: EscrowPayment 인���페이스 + Mock**

```typescript
// backend/src/common/interfaces/escrow-payment.interface.ts
export const ESCROW_PAYMENT = 'ESCROW_PAYMENT';

export interface EscrowPayment {
  checkBalance(employerAccountId: string): Promise<string>;
  payForProfile(employerAccountId: string, amount: string): Promise<{ txHash: string }>;
}
```

```typescript
// backend/src/common/mocks/mock-escrow-payment.ts
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { EscrowPayment } from '../interfaces/escrow-payment.interface.js';

@Injectable()
export class MockEscrowPayment implements EscrowPayment {
  async checkBalance(_employerAccountId: string): Promise<string> {
    return '10000000000000000000000000'; // 10 NEAR
  }

  async payForProfile(_employerAccountId: string, _amount: string): Promise<{ txHash: string }> {
    return { txHash: randomBytes(32).toString('hex') };
  }
}
```

- [x] **Step 2: NegotiationHandoff 인터페이스 + Mock**

```typescript
// backend/src/common/interfaces/negotiation-handoff.interface.ts
export const NEGOTIATION_HANDOFF = 'NEGOTIATION_HANDOFF';

export interface NegotiationHandoff {
  createSession(params: {
    jobId: string;
    seekerId: string;
    employerId: string;
    matchId: string;
  }): Promise<{ sessionId: string }>;
}
```

```typescript
// backend/src/common/mocks/mock-negotiation-handoff.ts
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NegotiationHandoff } from '../interfaces/negotiation-handoff.interface.js';

@Injectable()
export class MockNegotiationHandoff implements NegotiationHandoff {
  async createSession(_params: {
    jobId: string;
    seekerId: string;
    employerId: string;
    matchId: string;
  }): Promise<{ sessionId: string }> {
    return { sessionId: randomUUID() };
  }
}
```

- [x] **Step 3: interfaces/index.ts에 re-export 추가**

```typescript
// backend/src/common/interfaces/index.ts
export { NEAR_AI_CLIENT } from './near-ai-client.interface.js';
export type { NearAiClient } from './near-ai-client.interface.js';
export { MATCH_RESULT_QUERY } from './match-result-query.interface.js';
export type { MatchResultQuery, SeekerProfile } from './match-result-query.interface.js';
export { ESCROW_PAYMENT } from './escrow-payment.interface.js';
export type { EscrowPayment } from './escrow-payment.interface.js';
export { NEGOTIATION_HANDOFF } from './negotiation-handoff.interface.js';
export type { NegotiationHandoff } from './negotiation-handoff.interface.js';
```

- [x] **Step 4: 빌드 확인 + Commit**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
git add backend/src/common/
git commit -m "feat: add EscrowPayment and NegotiationHandoff interfaces with mocks"
```

---

### Task 5: 엔티티 보강 (MatchResult + ResumeProfile)

**Files:**
- Modify: `backend/src/entities/match-result.entity.ts`
- Modify: `backend/src/entities/resume-profile.entity.ts`
- Modify: `backend/src/common/enums/index.ts`

- [x] **Step 1: ResumeStatus enum 추가**

`backend/src/common/enums/index.ts` 맨 아래에 추가:

```typescript
export enum ResumeStatus {
  COLLECTING = 'COLLECTING',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}
```

- [x] **Step 2: ResumeProfile에 status 컬럼 추가**

`backend/src/entities/resume-profile.entity.ts`에 추가:

```typescript
// import 줄에 추가:
import { ResumeStatus } from '../common/enums/index.js';

// embedding 컬럼 뒤에 추가:
@Column({ type: 'varchar', length: 20, default: ResumeStatus.COLLECTING })
status: ResumeStatus;

@Column({ type: 'text', nullable: true })
summary: string;

@Column({ name: 'negotiation_points', type: 'jsonb', nullable: true })
negotiationPoints: Record<string, any>;
```

- [x] **Step 3: MatchResult에 동의 컬럼 추가**

`backend/src/entities/match-result.entity.ts`에 추���:

```typescript
// finalRank 컬럼 뒤에 추가:
@Column({ name: 'seeker_agreed', type: 'boolean', default: false })
seekerAgreed: boolean;

@Column({ name: 'employer_agreed', type: 'boolean', default: false })
employerAgreed: boolean;

@Column({ name: 'negotiation_session_id', type: 'uuid', nullable: true })
negotiationSessionId: string;
```

- [x] **Step 4: 빌드 확인 + Commit**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
git add backend/src/entities/ backend/src/common/enums/
git commit -m "feat: add ResumeStatus enum, enhance MatchResult and ResumeProfile entities"
```

---

### Task 6: .env.example 업데이트 + AppModule에 AgentModule 등록

**Files:**
- Modify: `.env.example`
- Modify: `backend/src/app.module.ts`

- [x] **Step 1: .env.example에 NEAR AI 설정 추가**

```
NEAR_AI_API_KEY=your-near-ai-api-key
NEAR_AI_BASE_URL=https://api.near.ai/v1
NEAR_AI_CHAT_MODEL=qwen3-235b-a22b
NEAR_AI_EMBED_MODEL=qwen3-embedding
```

- [x] **Step 2: AppModule에 AgentModule import**

주의: AgentModule이 @Global()이므로 한 번만 import하면 전체에서 NEAR_AI_CLIENT 사용 가능.
기존 JobModule, NegotiationModule의 로컬 MockNearAiClient provider는 **그대로 유지** (승연 코드 깨뜨리지 않기 위해).

```typescript
// backend/src/app.module.ts — imports 배열에 AgentModule 추가
import { AgentModule } from './agent/agent.module.js';

// @Module imports에 추가:
AgentModule,
```

- [x] **Step 3: 빌드 확인 + Commit**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
git add .env.example backend/src/app.module.ts
git commit -m "feat: register AgentModule globally, update .env.example with NEAR AI config"
```
