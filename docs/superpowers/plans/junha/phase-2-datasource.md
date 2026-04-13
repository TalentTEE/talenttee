# Phase 2: Datasource Module — 데이터소스 연결 + Fixture 데이터

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** GitHub Mock 연결, Slack/Discord/정부24 fixture 데이터 로드, 연결 상태 관리 API를 구현한다.

**Architecture:** DatasourceModule (Controller + Service). GitHub OAuth는 해커톤에서 Mock으로 대체 (fixture JSON). 각 provider별 fixture 파일에서 데이터 로드. DataSourceConnection 엔티티로 연결 상태 관리.

**Tech Stack:** NestJS 11, TypeORM, fixture JSON

---

### Task 1: Fixture 데이터 파일 생성

**Files:**
- Create: `backend/src/datasource/fixtures/github.json`
- Create: `backend/src/datasource/fixtures/slack.json`
- Create: `backend/src/datasource/fixtures/discord.json`
- Create: `backend/src/datasource/fixtures/gov24.json`

- [x] **Step 1: GitHub fixture**

```json
{
  "profile": {
    "login": "demo-developer",
    "name": "김개발",
    "bio": "Full-stack developer passionate about Web3",
    "public_repos": 42,
    "followers": 128
  },
  "languages": {
    "TypeScript": 45000,
    "JavaScript": 32000,
    "Rust": 18000,
    "Python": 12000,
    "Solidity": 8000
  },
  "repositories": [
    {
      "name": "defi-swap-protocol",
      "description": "Decentralized token swap on NEAR Protocol",
      "language": "Rust",
      "stars": 34,
      "forks": 12,
      "topics": ["near", "defi", "blockchain"]
    },
    {
      "name": "ai-resume-builder",
      "description": "AI-powered resume generation tool",
      "language": "TypeScript",
      "stars": 89,
      "forks": 23,
      "topics": ["ai", "nestjs", "openai"]
    },
    {
      "name": "react-dashboard-kit",
      "description": "Enterprise dashboard component library",
      "language": "TypeScript",
      "stars": 156,
      "forks": 45,
      "topics": ["react", "nextjs", "tailwindcss"]
    }
  ],
  "contributions": {
    "total_commits_last_year": 847,
    "prs_merged": 123,
    "issues_closed": 67,
    "code_reviews": 89
  }
}
```

- [x] **Step 2: Slack fixture**

```json
{
  "messages": [
    {
      "id": "slack-001",
      "channel": "#backend-team",
      "text": "PR #234 머지했습니다. 인증 미들웨어 리팩토링 완료. JWT 검증 로직을 passport-jwt로 전환했고, 기존 테스트 전부 통과합니다.",
      "timestamp": "2026-03-15T09:30:00Z"
    },
    {
      "id": "slack-002",
      "channel": "#architecture",
      "text": "마이크로서비스 전환 관련해서 이벤트 소싱 패턴이 좋을 것 같습니다. CQRS와 함께 적용하면 읽기/쓰기 분리가 깔끔해질 거예요.",
      "timestamp": "2026-03-16T14:20:00Z"
    },
    {
      "id": "slack-003",
      "channel": "#code-review",
      "text": "이 부분은 N+1 쿼리 이슈가 있네요. TypeORM의 relations 대신 QueryBuilder로 JOIN 걸면 성능 개선됩니다.",
      "timestamp": "2026-03-17T11:00:00Z"
    },
    {
      "id": "slack-004",
      "channel": "#backend-team",
      "text": "배포 파이프라인 에러 수정했습니다. Docker 빌드 캐시 문제였는데 multi-stage build로 해결.",
      "timestamp": "2026-03-18T16:45:00Z"
    },
    {
      "id": "slack-005",
      "channel": "#general",
      "text": "이번 스프린트 회고 결과 공유합니다. API 응답시간 30% 개선, 에러율 0.5% → 0.1% 감소.",
      "timestamp": "2026-03-20T10:00:00Z"
    }
  ]
}
```

- [x] **Step 3: Discord fixture**

```json
{
  "activities": [
    {
      "id": "discord-001",
      "server": "NEAR Korea Developers",
      "role": "Core Contributor",
      "messages_count": 234,
      "helpful_answers": 45
    },
    {
      "id": "discord-002",
      "server": "TypeScript Korea",
      "role": "Moderator",
      "messages_count": 567,
      "helpful_answers": 89
    },
    {
      "id": "discord-003",
      "server": "Web3 Builders",
      "role": "Member",
      "messages_count": 123,
      "helpful_answers": 23
    }
  ]
}
```

- [x] **Step 4: 정부24 fixture**

```json
{
  "certificates": [
    {
      "name": "정보처리기사",
      "issuer": "한국산업인력공단",
      "issued_date": "2022-06-15",
      "status": "유효"
    },
    {
      "name": "SQLD (SQL Developer)",
      "issuer": "한국데이터산업진흥원",
      "issued_date": "2021-09-20",
      "status": "유효"
    }
  ],
  "education": [
    {
      "institution": "서울대학교",
      "degree": "컴퓨터공학 학사",
      "graduation_year": 2021,
      "status": "졸업"
    }
  ]
}
```

- [x] **Step 5: Commit**

```bash
git add backend/src/datasource/fixtures/
git commit -m "feat: add fixture data for GitHub, Slack, Discord, Gov24 datasources"
```

---

### Task 2: DatasourceService 구현

**Files:**
- Create: `backend/src/datasource/datasource.service.ts`

- [x] **Step 1: DatasourceService 작성**

```typescript
// backend/src/datasource/datasource.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSourceConnection } from '../entities/data-source-connection.entity.js';
import { DataSourceProvider, DataSourceStatus } from '../common/enums/index.js';

@Injectable()
export class DatasourceService {
  constructor(
    @InjectRepository(DataSourceConnection)
    private readonly dsRepo: Repository<DataSourceConnection>,
  ) {}

  async connectMock(
    userId: string,
    provider: DataSourceProvider,
  ): Promise<DataSourceConnection> {
    // 이미 연결된 경우 기존 반환
    const existing = await this.dsRepo.findOne({ where: { userId, provider } });
    if (existing) return existing;

    const conn = this.dsRepo.create({
      userId,
      provider,
      status: DataSourceStatus.MOCK,
      lastSyncedAt: new Date(),
    });
    return this.dsRepo.save(conn);
  }

  async connectGithub(
    userId: string,
    accessToken: string,
  ): Promise<DataSourceConnection> {
    const existing = await this.dsRepo.findOne({
      where: { userId, provider: DataSourceProvider.GITHUB },
    });
    if (existing) {
      existing.accessToken = accessToken;
      existing.status = DataSourceStatus.CONNECTED;
      existing.lastSyncedAt = new Date();
      return this.dsRepo.save(existing);
    }

    const conn = this.dsRepo.create({
      userId,
      provider: DataSourceProvider.GITHUB,
      status: DataSourceStatus.CONNECTED,
      accessToken,
      lastSyncedAt: new Date(),
    });
    return this.dsRepo.save(conn);
  }

  async getStatus(userId: string): Promise<DataSourceConnection[]> {
    return this.dsRepo.find({ where: { userId } });
  }

  async getConnectionByProvider(
    userId: string,
    provider: DataSourceProvider,
  ): Promise<DataSourceConnection | null> {
    return this.dsRepo.findOne({ where: { userId, provider } });
  }

  loadFixture(provider: DataSourceProvider): Record<string, any> {
    const fixtureMap: Record<string, string> = {
      [DataSourceProvider.GITHUB]: 'github.json',
      [DataSourceProvider.SLACK]: 'slack.json',
      [DataSourceProvider.DISCORD]: 'discord.json',
      [DataSourceProvider.GOV24]: 'gov24.json',
    };

    const filename = fixtureMap[provider];
    if (!filename) throw new NotFoundException(`No fixture for ${provider}`);

    const filePath = join(__dirname, 'fixtures', filename);
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  async collectAllData(userId: string): Promise<{
    github: Record<string, any> | null;
    slack: Record<string, any> | null;
    discord: Record<string, any> | null;
    gov24: Record<string, any> | null;
  }> {
    const connections = await this.getStatus(userId);
    const result: Record<string, any> = {
      github: null,
      slack: null,
      discord: null,
      gov24: null,
    };

    for (const conn of connections) {
      const key = conn.provider.toLowerCase();
      result[key] = this.loadFixture(conn.provider);
    }

    return result as any;
  }
}
```

- [x] **Step 2: 빌드 확인**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
```

- [x] **Step 3: Commit**

```bash
git add backend/src/datasource/datasource.service.ts
git commit -m "feat: implement DatasourceService with mock/fixture data loading"
```

---

### Task 3: DatasourceController + Module

**Files:**
- Create: `backend/src/datasource/datasource.controller.ts`
- Create: `backend/src/datasource/datasource.module.ts`

- [x] **Step 1: DatasourceController 작성**

```typescript
// backend/src/datasource/datasource.controller.ts
import {
  Controller, Post, Get, Body, UseGuards, Req,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { DatasourceService } from './datasource.service.js';
import { DataSourceProvider } from '../common/enums/index.js';

@Controller('datasource')
@UseGuards(JwtGuard)
export class DatasourceController {
  constructor(private readonly datasourceService: DatasourceService) {}

  @Post('connect/github')
  async connectGithub(@Req() req) {
    // 해커톤: Mock GitHub 연결 (실제 OAuth는 통합 시 추가)
    const userId = req.user.id ?? req.user.nearAccountId;
    return this.datasourceService.connectMock(userId, DataSourceProvider.GITHUB);
  }

  @Post('connect/mock')
  async connectMock(
    @Req() req,
    @Body() body: { provider: string },
  ) {
    const userId = req.user.id ?? req.user.nearAccountId;
    const provider = body.provider.toUpperCase() as DataSourceProvider;
    return this.datasourceService.connectMock(userId, provider);
  }

  @Get('status')
  async getStatus(@Req() req) {
    const userId = req.user.id ?? req.user.nearAccountId;
    return this.datasourceService.getStatus(userId);
  }

  @Post('sync')
  async sync(@Req() req) {
    const userId = req.user.id ?? req.user.nearAccountId;
    const data = await this.datasourceService.collectAllData(userId);
    return { message: '동기화 완료', connectedSources: Object.keys(data).filter((k) => data[k] !== null) };
  }
}
```

- [x] **Step 2: DatasourceModule 작성**

```typescript
// backend/src/datasource/datasource.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceConnection } from '../entities/data-source-connection.entity.js';
import { DatasourceController } from './datasource.controller.js';
import { DatasourceService } from './datasource.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([DataSourceConnection])],
  controllers: [DatasourceController],
  providers: [DatasourceService],
  exports: [DatasourceService],
})
export class DatasourceModule {}
```

- [x] **Step 3: AppModule에 DatasourceModule 등록**

`backend/src/app.module.ts`에 import 추가:

```typescript
import { DatasourceModule } from './datasource/datasource.module.js';

// @Module imports 배열에 추가:
DatasourceModule,
```

- [x] **Step 4: 빌드 확인 + Commit**

```bash
cd /Users/javis.hwang/talentee/backend && npx tsc --noEmit
git add backend/src/datasource/ backend/src/app.module.ts
git commit -m "feat: add DatasourceModule with controller, service, and fixture data"
```
