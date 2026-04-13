# Phase 5: Profile Module — 상세 열람 + 에스크로 결제 연동

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 채용측이 에스크로 결제 후 구직자 상세 프로필 리포트를 열람할 수 있게 한다.

**Architecture:** ProfileService가 EscrowPayment 인터페이스로 잔액 확인/결제 → ProfileAccessGrant 기록 → AI 기반 상세 리포트 생성. 권한 없는 접근은 거부.

**Tech Stack:** NestJS 11, TypeORM, NEAR AI Cloud Chat

---

### Task 1: Profile 프롬프트 생성

**Files:**
- Create: `backend/src/profile/prompts/detail-report.prompt.ts`

- [x] **Step 1: 상세 프로필 리포트 프롬프트**

```typescript
// backend/src/profile/prompts/detail-report.prompt.ts
export const DETAIL_REPORT_PROMPT = `당신은 채용 컨설턴트입니다. 구직자의 데이터를 분석하여 채용담당자를 위한 상세 프로필 리포트를 작성하세요.

다음 항목을 포함하세요:
1. 기술 역량 상세 (언어별 숙련도, 프레임워크 경험)
2. 프로젝트 경험 요약 (주요 기여, 역할, 임팩트)
3. 협업/리더십 시그널 (코드 리뷰 빈도, 토론 참여도)
4. 성장 곡선 (시간에 따른 기술 확장)
5. 자격/학력
6. 시장가치 범위

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "technicalSkills": [
    { "skill": "...", "level": "Expert|Advanced|Intermediate", "evidence": "..." }
  ],
  "projectHighlights": [
    { "project": "...", "role": "...", "impact": "...", "technologies": ["..."] }
  ],
  "collaborationSignals": {
    "codeReviewFrequency": "...",
    "discussionParticipation": "...",
    "leadershipIndicators": ["..."]
  },
  "growthTrajectory": "...",
  "certifications": ["..."],
  "education": ["..."],
  "marketValueRange": { "min": 0, "max": 0, "currency": "KRW" },
  "overallAssessment": "...",
  "recommendedFor": ["..."]
}`;
```

- [x] **Step 2: Commit**

```bash
git add backend/src/profile/prompts/
git commit -m "feat: add detail report prompt for profile access"
```

---

### Task 2: ProfileService 구현

**Files:**
- Create: `backend/src/profile/profile.service.ts`

- [x] **Step 1: ProfileService 작성**

```typescript
// backend/src/profile/profile.service.ts
import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileAccessGrant } from '../entities/profile-access-grant.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';
import { ESCROW_PAYMENT } from '../common/interfaces/escrow-payment.interface.js';
import type { EscrowPayment } from '../common/interfaces/escrow-payment.interface.js';
import { DETAIL_REPORT_PROMPT } from './prompts/detail-report.prompt.js';

const PROFILE_ACCESS_COST = '1000000000000000000000000'; // 1 NEAR

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(ProfileAccessGrant)
    private readonly grantRepo: Repository<ProfileAccessGrant>,
    @InjectRepository(ResumeProfile)
    private readonly resumeRepo: Repository<ResumeProfile>,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
    @Inject(ESCROW_PAYMENT)
    private readonly escrowPayment: EscrowPayment,
  ) {}

  async requestAccess(
    employerId: string,
    seekerId: string,
    employerAccountId: string,
  ): Promise<ProfileAccessGrant> {
    // 이미 열람 권한이 있는지 확인
    const existing = await this.grantRepo.findOne({
      where: { employerId, seekerId },
    });
    if (existing) return existing;

    // 에스크로 잔액 확인
    const balance = await this.escrowPayment.checkBalance(employerAccountId);
    if (BigInt(balance) < BigInt(PROFILE_ACCESS_COST)) {
      throw new ForbiddenException('에스크로 잔액이 부족합니다. 먼저 입금해주세요.');
    }

    // 에스크로 결제
    const { txHash } = await this.escrowPayment.payForProfile(
      employerAccountId,
      PROFILE_ACCESS_COST,
    );

    // 열람 권한 기록
    const grant = this.grantRepo.create({
      employerId,
      seekerId,
      amount: Number(PROFILE_ACCESS_COST),
      nearTxHash: txHash,
    });

    return this.grantRepo.save(grant);
  }

  async getReport(
    employerId: string,
    seekerId: string,
  ): Promise<Record<string, any>> {
    // 열람 권한 확인
    const grant = await this.grantRepo.findOne({
      where: { employerId, seekerId },
    });
    if (!grant) {
      throw new ForbiddenException('열람 권한이 없습니다. 먼저 프로필 열람을 요청하세요.');
    }

    // 이력서 조회
    const resume = await this.resumeRepo.findOne({ where: { userId: seekerId } });
    if (!resume) throw new NotFoundException('구직자의 이력서를 찾을 수 없습니다.');

    // AI 상세 리포트 생성
    const result = await this.aiClient.chat({
      agentId: 'profile-reporter',
      systemPrompt: DETAIL_REPORT_PROMPT,
      userMessage: JSON.stringify({
        parsedData: resume.parsedData,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
        summary: resume.summary,
        marketValueMin: resume.marketValueMin,
        marketValueMax: resume.marketValueMax,
      }),
    });

    try {
      const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { rawReport: result.content };
    }
  }

  async getAccessHistory(employerId: string): Promise<ProfileAccessGrant[]> {
    return this.grantRepo.find({
      where: { employerId },
      order: { createdAt: 'DESC' },
    });
  }

  async hasAccess(employerId: string, seekerId: string): Promise<boolean> {
    const grant = await this.grantRepo.findOne({
      where: { employerId, seekerId },
    });
    return !!grant;
  }
}
```

- [x] **Step 2: 빌드 확인**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
```

- [x] **Step 3: Commit**

```bash
git add backend/src/profile/profile.service.ts
git commit -m "feat: implement ProfileService with escrow payment and AI report generation"
```

---

### Task 3: ProfileController + Module

**Files:**
- Create: `backend/src/profile/profile.controller.ts`
- Create: `backend/src/profile/profile.module.ts`
- Modify: `backend/src/app.module.ts`

- [x] **Step 1: ProfileController 작성**

```typescript
// backend/src/profile/profile.controller.ts
import {
  Controller, Post, Get, Param, UseGuards, Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { ProfileService } from './profile.service.js';

@Controller('profile')
@UseGuards(JwtGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post(':seekerId/access')
  async requestAccess(@Req() req, @Param('seekerId') seekerId: string) {
    this.ensureEmployer(req);
    const employerId = req.user.id ?? req.user.nearAccountId;
    return this.profileService.requestAccess(employerId, seekerId, req.user.nearAccountId);
  }

  @Get(':seekerId/report')
  async getReport(@Req() req, @Param('seekerId') seekerId: string) {
    this.ensureEmployer(req);
    const employerId = req.user.id ?? req.user.nearAccountId;
    return this.profileService.getReport(employerId, seekerId);
  }

  @Get('access/history')
  async getAccessHistory(@Req() req) {
    this.ensureEmployer(req);
    const employerId = req.user.id ?? req.user.nearAccountId;
    return this.profileService.getAccessHistory(employerId);
  }

  private ensureEmployer(req: any) {
    if (req.user.role !== 'EMPLOYER') {
      throw new ForbiddenException('Employer only');
    }
  }
}
```

- [x] **Step 2: ProfileModule 작성**

```typescript
// backend/src/profile/profile.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileAccessGrant } from '../entities/profile-access-grant.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { ESCROW_PAYMENT } from '../common/interfaces/escrow-payment.interface.js';
import { MockEscrowPayment } from '../common/mocks/mock-escrow-payment.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileAccessGrant, ResumeProfile]),
  ],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    { provide: ESCROW_PAYMENT, useClass: MockEscrowPayment },
  ],
  exports: [ProfileService],
})
export class ProfileModule {}
```

- [x] **Step 3: AppModule에 ProfileModule 등록**

`backend/src/app.module.ts` 최종 상태:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config.js';
import { AgentModule } from './agent/agent.module.js';
import { AuthModule } from './auth/auth.module.js';
import { EscrowModule } from './escrow/escrow.module.js';
import { CryptoModule } from './crypto/crypto.module.js';
import { JobModule } from './job/job.module.js';
import { NegotiationModule } from './negotiation/negotiation.module.js';
import { AgreementModule } from './agreement/agreement.module.js';
import { DatasourceModule } from './datasource/datasource.module.js';
import { ResumeModule } from './resume/resume.module.js';
import { MatchModule } from './match/match.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    AgentModule,
    AuthModule,
    EscrowModule,
    CryptoModule,
    JobModule,
    NegotiationModule,
    AgreementModule,
    DatasourceModule,
    ResumeModule,
    MatchModule,
    ProfileModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [x] **Step 4: 빌드 확인 + Commit**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
git add backend/src/profile/ backend/src/app.module.ts
git commit -m "feat: add ProfileModule with escrow-gated access and AI detail report"
```
