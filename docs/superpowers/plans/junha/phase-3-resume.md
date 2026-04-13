# Phase 3: Resume Module — 이력서 생성 파이프라인 + 시장가치 산출

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 데이터소스에서 수집한 데이터를 AI로 분석하여 구조화된 이력서를 생성하고, 벡터 임베딩과 시장가치를 산출한다.

**Architecture:** ResumeService가 DatasourceService로 데이터 수집 → NearAiClient.chat()으로 분류/분석 → NearAiClient.embed()로 벡터화 → pgvector 저장. 시장가치는 이력서 완성 시 자동 트리거.

**Tech Stack:** NestJS 11, TypeORM, NEAR AI Cloud (Chat + Embedding), pgvector

---

### Task 1: Resume 프롬프트 파일 생성

**Files:**
- Create: `backend/src/resume/prompts/data-classify.prompt.ts`
- Create: `backend/src/resume/prompts/resume-generate.prompt.ts`
- Create: `backend/src/resume/prompts/market-value.prompt.ts`

- [x] **Step 1: 데이터 분류 프롬프트**

```typescript
// backend/src/resume/prompts/data-classify.prompt.ts
export const DATA_CLASSIFY_PROMPT = `당신은 업무 데이터 분류기입니다.
각 메시지를 다음 카테고리로 분류하세요:

- WORK: 코드 리뷰, 배포, 버그 수정, PR 머지 등 직접적인 작업 기여
- DISCUSSION: 아키텍처 토론, 기술 선택, 설계 논의 등
- FEEDBACK: 코드 리뷰 코멘트, 동료 피드백, 칭찬/개선 제안 등

JSON 배열로 응답:
[{ "message_id": "...", "category": "WORK|DISCUSSION|FEEDBACK", "relevance_to_career": "HIGH|MEDIUM|LOW" }]`;
```

- [x] **Step 2: 이력서 생성 프롬프트**

```typescript
// backend/src/resume/prompts/resume-generate.prompt.ts
export const RESUME_GENERATE_PROMPT = `당신은 커리어 분석 전문가입니다.
다음 데이터를 분석하여 구조화된 이력서를 생성하세요.

출력 형식 (JSON만, 다른 텍스트 없이):
{
  "skills": ["TypeScript", "React", ...],
  "experience": [
    { "role": "...", "company": "...", "period": "...", "highlights": ["..."] }
  ],
  "education": [
    { "degree": "...", "institution": "...", "year": "..." }
  ],
  "summary": "3줄 이내 요약",
  "strengths": ["...", "..."],
  "improvement_areas": ["...", "..."]
}`;
```

- [x] **Step 3: 시장가치 프롬프트**

```typescript
// backend/src/resume/prompts/market-value.prompt.ts
export const MARKET_VALUE_PROMPT = `당신은 채용 시장 분석 전문가입니다.

다음을 분석하세요:
1. 이 구직자의 적정 연봉 범위 (하한~상한, 원 단위)
2. 산출 근거
3. 협상 시 강점이 되는 포인트
4. 약점이 될 수 있는 포인트

JSON 형식으로만 응답 (다른 텍스트 없이):
{
  "marketValueMin": 60000000,
  "marketValueMax": 75000000,
  "reasoning": "...",
  "negotiationPoints": {
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."]
  }
}`;
```

- [x] **Step 4: Commit**

```bash
git add backend/src/resume/prompts/
git commit -m "feat: add AI prompts for data classification, resume generation, market value"
```

---

### Task 2: ResumeService 구현

**Files:**
- Create: `backend/src/resume/resume.service.ts`

- [x] **Step 1: ResumeService 작성**

```typescript
// backend/src/resume/resume.service.ts
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';
import { DatasourceService } from '../datasource/datasource.service.js';
import { ResumeStatus } from '../common/enums/index.js';
import { DATA_CLASSIFY_PROMPT } from './prompts/data-classify.prompt.js';
import { RESUME_GENERATE_PROMPT } from './prompts/resume-generate.prompt.js';
import { MARKET_VALUE_PROMPT } from './prompts/market-value.prompt.js';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(ResumeProfile)
    private readonly resumeRepo: Repository<ResumeProfile>,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
    private readonly datasourceService: DatasourceService,
  ) {}

  async generate(userId: string): Promise<ResumeProfile> {
    // 기존 이력서가 있으면 재사용
    let resume = await this.resumeRepo.findOne({ where: { userId } });
    if (!resume) {
      resume = this.resumeRepo.create({ userId, status: ResumeStatus.COLLECTING });
      resume = await this.resumeRepo.save(resume);
    } else {
      resume.status = ResumeStatus.COLLECTING;
      resume = await this.resumeRepo.save(resume);
    }

    // 비동기 처리 시작 (fire-and-forget)
    this.runPipeline(resume.id, userId).catch((err) => {
      console.error(`Resume pipeline failed for ${userId}:`, err);
    });

    return resume;
  }

  private async runPipeline(resumeId: string, userId: string): Promise<void> {
    const resume = await this.resumeRepo.findOne({ where: { id: resumeId } });
    if (!resume) return;

    try {
      // Step 1: 데이터 수집
      const allData = await this.datasourceService.collectAllData(userId);
      resume.rawText = JSON.stringify(allData);
      resume.status = ResumeStatus.ANALYZING;
      await this.resumeRepo.save(resume);

      // Step 2: Slack/Discord 데이터 분류
      let classifiedSlack = null;
      let classifiedDiscord = null;

      if (allData.slack) {
        const classifyResult = await this.aiClient.chat({
          agentId: 'data-classifier',
          systemPrompt: DATA_CLASSIFY_PROMPT,
          userMessage: JSON.stringify(allData.slack.messages),
        });
        classifiedSlack = this.safeJsonParse(classifyResult.content);
      }

      if (allData.discord) {
        classifiedDiscord = allData.discord; // Discord는 이미 구조화됨
      }

      // Step 3: 이력서 생성
      const inputData = `
입력 데이터:
- GitHub 활동: ${JSON.stringify(allData.github ?? {})}
- Slack 활동 (분류됨): ${JSON.stringify(classifiedSlack ?? {})}
- Discord 활동: ${JSON.stringify(classifiedDiscord ?? {})}
- 자격증/학력: ${JSON.stringify(allData.gov24 ?? {})}`;

      const generateResult = await this.aiClient.chat({
        agentId: 'resume-generator',
        systemPrompt: RESUME_GENERATE_PROMPT,
        userMessage: inputData,
      });

      const parsed = this.safeJsonParse(generateResult.content);
      if (parsed) {
        resume.parsedData = parsed;
        resume.skills = parsed.skills ?? [];
        resume.experience = parsed.experience ?? [];
        resume.education = parsed.education ?? [];
        resume.summary = parsed.summary ?? '';
        resume.negotiationPoints = {
          strengths: parsed.strengths ?? [],
          weaknesses: parsed.improvement_areas ?? [],
        };
      }

      // Step 4: 벡터 임베딩
      const resumeText = this.buildResumeText(resume);
      const embeddings = await this.aiClient.embed(resumeText);
      if (embeddings.length > 0) {
        resume.embedding = `[${embeddings[0].join(',')}]`;
      }

      // Step 5: 시장가치 산출
      await this.calculateMarketValue(resume);

      // 완성
      resume.status = ResumeStatus.COMPLETE;
      await this.resumeRepo.save(resume);
    } catch (err) {
      resume.status = ResumeStatus.ERROR;
      await this.resumeRepo.save(resume);
      throw err;
    }
  }

  private async calculateMarketValue(resume: ResumeProfile): Promise<void> {
    const userMessage = `
구직자 이력:
${JSON.stringify(resume.parsedData ?? {})}

유사 포지션 공고 데이터:
(해커톤 데모: 일반적인 시니어 개발자 채용 시장 기준으로 분석해주세요)`;

    const result = await this.aiClient.chat({
      agentId: 'market-value-analyst',
      systemPrompt: MARKET_VALUE_PROMPT,
      userMessage,
    });

    const parsed = this.safeJsonParse(result.content);
    if (parsed) {
      resume.marketValueMin = parsed.marketValueMin;
      resume.marketValueMax = parsed.marketValueMax;
      resume.marketValueReasoning = parsed.reasoning;
      if (parsed.negotiationPoints) {
        resume.negotiationPoints = {
          ...resume.negotiationPoints,
          ...parsed.negotiationPoints,
        };
      }
    }
  }

  async getResume(id: string): Promise<ResumeProfile> {
    const resume = await this.resumeRepo.findOne({ where: { id } });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async getResumeByUserId(userId: string): Promise<ResumeProfile | null> {
    return this.resumeRepo.findOne({ where: { userId } });
  }

  async getStatus(id: string): Promise<{ id: string; status: string }> {
    const resume = await this.getResume(id);
    return { id: resume.id, status: resume.status };
  }

  async getMarketValue(id: string): Promise<{
    marketValueMin: number;
    marketValueMax: number;
    reasoning: string;
    negotiationPoints: Record<string, any>;
  }> {
    const resume = await this.getResume(id);
    return {
      marketValueMin: resume.marketValueMin,
      marketValueMax: resume.marketValueMax,
      reasoning: resume.marketValueReasoning,
      negotiationPoints: resume.negotiationPoints,
    };
  }

  buildResumeText(resume: ResumeProfile): string {
    const parts: string[] = [];
    if (resume.summary) parts.push(resume.summary);
    if (resume.skills?.length) parts.push(`Skills: ${resume.skills.join(', ')}`);
    if (resume.experience?.length) {
      parts.push(
        `Experience: ${resume.experience.map((e: any) => `${e.role} at ${e.company}`).join('; ')}`,
      );
    }
    if (resume.education?.length) {
      parts.push(
        `Education: ${resume.education.map((e: any) => `${e.degree} from ${e.institution}`).join('; ')}`,
      );
    }
    return parts.join('\n');
  }

  private safeJsonParse(content: string): any {
    try {
      const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}
```

- [x] **Step 2: 빌드 확인**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
```

- [x] **Step 3: Commit**

```bash
git add backend/src/resume/resume.service.ts
git commit -m "feat: implement ResumeService with AI pipeline (classify → generate → embed → market value)"
```

---

### Task 3: ResumeController + Module

**Files:**
- Create: `backend/src/resume/resume.controller.ts`
- Create: `backend/src/resume/resume.module.ts`
- Modify: `backend/src/app.module.ts`

- [x] **Step 1: ResumeController 작성**

```typescript
// backend/src/resume/resume.controller.ts
import {
  Controller, Post, Get, Param, UseGuards, Req,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { ResumeService } from './resume.service.js';

@Controller('resume')
@UseGuards(JwtGuard)
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(@Req() req) {
    const userId = req.user.id ?? req.user.nearAccountId;
    const resume = await this.resumeService.generate(userId);
    return { id: resume.id, status: resume.status, message: '이력서 생성이 시작되었습니다.' };
  }

  @Get(':id')
  async getResume(@Param('id') id: string) {
    return this.resumeService.getResume(id);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.resumeService.getStatus(id);
  }

  @Get(':id/market-value')
  async getMarketValue(@Param('id') id: string) {
    return this.resumeService.getMarketValue(id);
  }
}
```

- [x] **Step 2: ResumeModule 작성**

```typescript
// backend/src/resume/resume.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { DatasourceModule } from '../datasource/datasource.module.js';
import { ResumeController } from './resume.controller.js';
import { ResumeService } from './resume.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeProfile]),
    DatasourceModule,
  ],
  controllers: [ResumeController],
  providers: [ResumeService],
  exports: [ResumeService],
})
export class ResumeModule {}
```

- [x] **Step 3: AppModule에 ResumeModule 등록**

`backend/src/app.module.ts`에 import 추가:

```typescript
import { ResumeModule } from './resume/resume.module.js';

// @Module imports 배열에 추가:
ResumeModule,
```

- [x] **Step 4: 빌드 확인 + Commit**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
git add backend/src/resume/ backend/src/app.module.ts
git commit -m "feat: add ResumeModule with controller and generation pipeline"
```
