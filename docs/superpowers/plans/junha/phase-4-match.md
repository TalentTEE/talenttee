# Phase 4: Match Module — ANN(pgvector) + Reranker + 동의 API

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 이력서/공고 벡터 기반 ANN 검색 → Reranker로 재정렬 → Top-5 매칭 결과 생성. 양측 동의 시 협상 엔진으로 핸드오프.

**Architecture:** MatchService가 pgvector 코사인 유사도 쿼리(raw SQL)로 ANN Top-20 → NearAiClient.rerank()로 재정렬 → Top-5 저장. 동의 API로 양측 합의 후 NegotiationHandoff 인터페이스를 통해 협상 세션 생성.

**Tech Stack:** NestJS 11, TypeORM (raw SQL for pgvector), NEAR AI Cloud Reranker

---

### Task 1: MatchService 구현

**Files:**
- Create: `backend/src/match/match.service.ts`

- [x] **Step 1: MatchService 작성**

```typescript
// backend/src/match/match.service.ts
import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MatchResult } from '../entities/match-result.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { JobPosting } from '../entities/job-posting.entity.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';
import { NEGOTIATION_HANDOFF } from '../common/interfaces/negotiation-handoff.interface.js';
import type { NegotiationHandoff } from '../common/interfaces/negotiation-handoff.interface.js';
import { ResumeService } from '../resume/resume.service.js';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(MatchResult)
    private readonly matchRepo: Repository<MatchResult>,
    @InjectRepository(JobPosting)
    private readonly jobRepo: Repository<JobPosting>,
    @InjectRepository(ResumeProfile)
    private readonly resumeRepo: Repository<ResumeProfile>,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
    @Inject(NEGOTIATION_HANDOFF)
    private readonly negotiationHandoff: NegotiationHandoff,
    private readonly resumeService: ResumeService,
    private readonly dataSource: DataSource,
  ) {}

  async matchForSeeker(seekerId: string, limit = 5): Promise<MatchResult[]> {
    const resume = await this.resumeRepo.findOne({ where: { userId: seekerId } });
    if (!resume || !resume.embedding) {
      throw new NotFoundException('이력서 또는 임베딩이 없습니다. 먼저 이력서를 생성하세요.');
    }

    // Step 1: ANN — pgvector 코사인 유사도 Top-20
    const annResults = await this.dataSource.query(
      `SELECT jp.id, jp.title, jp.description, jp.required_skills,
              jp.salary_min, jp.salary_max, jp.employer_id,
              1 - (jp.embedding::vector <=> $1::vector) as ann_score
       FROM job_posting jp
       WHERE jp.embedding IS NOT NULL AND jp.status = 'ACTIVE'
       ORDER BY jp.embedding::vector <=> $1::vector
       LIMIT 20`,
      [resume.embedding],
    );

    if (annResults.length === 0) return [];

    // Step 2: Reranker
    const resumeText = this.resumeService.buildResumeText(resume);
    const jobTexts = annResults.map(
      (j: any) => `${j.title} | ${j.description} | Skills: ${(j.required_skills ?? []).join(', ')}`,
    );

    const rerankResults = await this.aiClient.rerank(resumeText, jobTexts, limit);

    // Step 3: MatchResult 저장
    const matches: MatchResult[] = [];
    for (let rank = 0; rank < rerankResults.length; rank++) {
      const rr = rerankResults[rank];
      const job = annResults[rr.index];

      const existing = await this.matchRepo.findOne({
        where: { seekerId, jobId: job.id },
      });

      if (existing) {
        existing.annScore = job.ann_score;
        existing.rerankScore = rr.score;
        existing.finalRank = rank + 1;
        matches.push(await this.matchRepo.save(existing));
      } else {
        const match = this.matchRepo.create({
          seekerId,
          jobId: job.id,
          annScore: job.ann_score,
          rerankScore: rr.score,
          finalRank: rank + 1,
        });
        matches.push(await this.matchRepo.save(match));
      }
    }

    return matches;
  }

  async matchForJob(jobId: string, limit = 5): Promise<MatchResult[]> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || !job.embedding) {
      throw new NotFoundException('공고 또는 임베딩이 없습니다.');
    }

    // Step 1: ANN
    const annResults = await this.dataSource.query(
      `SELECT rp.id, rp.user_id, rp.skills, rp.summary, rp.parsed_data,
              1 - (rp.embedding::vector <=> $1::vector) as ann_score
       FROM resume_profile rp
       WHERE rp.embedding IS NOT NULL AND rp.status = 'COMPLETE'
       ORDER BY rp.embedding::vector <=> $1::vector
       LIMIT 20`,
      [job.embedding],
    );

    if (annResults.length === 0) return [];

    // Step 2: Reranker
    const jobText = `${job.title} | ${job.description} | Skills: ${(job.requiredSkills ?? []).join(', ')}`;
    const resumeTexts = annResults.map(
      (r: any) => `${r.summary ?? ''} | Skills: ${(r.skills ?? []).join(', ')}`,
    );

    const rerankResults = await this.aiClient.rerank(jobText, resumeTexts, limit);

    // Step 3: MatchResult 저장
    const matches: MatchResult[] = [];
    for (let rank = 0; rank < rerankResults.length; rank++) {
      const rr = rerankResults[rank];
      const resume = annResults[rr.index];

      const existing = await this.matchRepo.findOne({
        where: { seekerId: resume.user_id, jobId },
      });

      if (existing) {
        existing.annScore = resume.ann_score;
        existing.rerankScore = rr.score;
        existing.finalRank = rank + 1;
        matches.push(await this.matchRepo.save(existing));
      } else {
        const match = this.matchRepo.create({
          seekerId: resume.user_id,
          jobId,
          annScore: resume.ann_score,
          rerankScore: rr.score,
          finalRank: rank + 1,
        });
        matches.push(await this.matchRepo.save(match));
      }
    }

    return matches;
  }

  async agree(matchId: string, userId: string, role: string): Promise<MatchResult> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('매칭 결과를 찾을 수 없습니다.');

    if (role === 'SEEKER' && match.seekerId !== userId) {
      throw new ForbiddenException('본인의 매칭만 동의할 수 있습니다.');
    }

    // Employer 확인: jobPosting의 employerId와 비교
    if (role === 'EMPLOYER') {
      const job = await this.jobRepo.findOne({ where: { id: match.jobId } });
      if (!job || job.employerId !== userId) {
        throw new ForbiddenException('본인의 공고에 대한 매칭만 동의할 수 있습니다.');
      }
    }

    if (role === 'SEEKER') match.seekerAgreed = true;
    if (role === 'EMPLOYER') match.employerAgreed = true;

    const updated = await this.matchRepo.save(match);

    // 양측 동의 완료 시 협상 세션 생성
    if (updated.seekerAgreed && updated.employerAgreed && !updated.negotiationSessionId) {
      const job = await this.jobRepo.findOne({ where: { id: match.jobId } });
      const result = await this.negotiationHandoff.createSession({
        jobId: match.jobId,
        seekerId: match.seekerId,
        employerId: job!.employerId,
        matchId: match.id,
      });
      updated.negotiationSessionId = result.sessionId;
      await this.matchRepo.save(updated);
    }

    return updated;
  }

  async getMatchStatus(matchId: string): Promise<{
    id: string;
    seekerAgreed: boolean;
    employerAgreed: boolean;
    negotiationSessionId: string | null;
  }> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('매칭 결과를 찾을 수 없습니다.');
    return {
      id: match.id,
      seekerAgreed: match.seekerAgreed,
      employerAgreed: match.employerAgreed,
      negotiationSessionId: match.negotiationSessionId,
    };
  }
}
```

- [x] **Step 2: 빌드 확인**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
```

- [x] **Step 3: Commit**

```bash
git add backend/src/match/match.service.ts
git commit -m "feat: implement MatchService with ANN(pgvector) + Reranker + agree handoff"
```

---

### Task 2: MatchController + Module

**Files:**
- Create: `backend/src/match/match.controller.ts`
- Create: `backend/src/match/match.module.ts`
- Modify: `backend/src/app.module.ts`

- [x] **Step 1: MatchController 작성**

```typescript
// backend/src/match/match.controller.ts
import {
  Controller, Post, Get, Param, UseGuards, Req,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { MatchService } from './match.service.js';

@Controller('match')
@UseGuards(JwtGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('seeker/:seekerId')
  async matchForSeeker(@Param('seekerId') seekerId: string) {
    return this.matchService.matchForSeeker(seekerId);
  }

  @Get('job/:jobId')
  async matchForJob(@Param('jobId') jobId: string) {
    return this.matchService.matchForJob(jobId);
  }

  @Post(':matchId/agree')
  async agree(@Req() req, @Param('matchId') matchId: string) {
    const userId = req.user.id ?? req.user.nearAccountId;
    return this.matchService.agree(matchId, userId, req.user.role);
  }

  @Get(':matchId/status')
  async getMatchStatus(@Param('matchId') matchId: string) {
    return this.matchService.getMatchStatus(matchId);
  }
}
```

- [x] **Step 2: MatchModule 작성**

```typescript
// backend/src/match/match.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchResult } from '../entities/match-result.entity.js';
import { JobPosting } from '../entities/job-posting.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { ResumeModule } from '../resume/resume.module.js';
import { MatchController } from './match.controller.js';
import { MatchService } from './match.service.js';
import { NEGOTIATION_HANDOFF } from '../common/interfaces/negotiation-handoff.interface.js';
import { MockNegotiationHandoff } from '../common/mocks/mock-negotiation-handoff.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchResult, JobPosting, ResumeProfile]),
    ResumeModule,
  ],
  controllers: [MatchController],
  providers: [
    MatchService,
    { provide: NEGOTIATION_HANDOFF, useClass: MockNegotiationHandoff },
  ],
  exports: [MatchService],
})
export class MatchModule {}
```

- [x] **Step 3: AppModule에 MatchModule 등록**

`backend/src/app.module.ts`에 import 추가:

```typescript
import { MatchModule } from './match/match.module.js';

// @Module imports 배열에 추가:
MatchModule,
```

- [x] **Step 4: 빌드 확인 + Commit**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
git add backend/src/match/ backend/src/app.module.ts
git commit -m "feat: add MatchModule with ANN + Reranker matching and agree API"
```
