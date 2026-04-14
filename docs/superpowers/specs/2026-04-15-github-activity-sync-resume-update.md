# GitHub 활동 데이터 동기화 & 이력서 자동 업데이트 설계

## 개요

GitHub OAuth 연결 후, 사용자의 GitHub 활동 내역(커밋, PR, 이슈)을 수집하여 DB에 Raw 저장하고,
AI Agent에 입력하여 이력서를 자동 생성/증분 업데이트하는 파이프라인.

## 요구사항 요약

| 항목 | 결정 |
|------|------|
| 시간 범위 | 전체 기간 (해커톤: `GITHUB_SYNC_DAYS_LIMIT=10`으로 제한) |
| 저장 수준 | Raw 저장 — 커밋/PR/이슈 별도 테이블, API 원본 JSONB 포함 |
| 트리거 | 수동 + 주기적 cron 자동 동기화 (매일 03:00) |
| 이력서 갱신 시점 | 임계치 기반 자동 (커밋 20개 / PR 3개 / 이슈 5개 중 하나 초과) |
| 갱신 방식 | 증분 업데이트 (기존 이력서 + 새 데이터 → AI) |
| 수동 이력서 재생성 | `POST /resume/generate` 기존 유지 + 증분/전체 모드 옵션 |
| 데이터 구조 | AI 최적화된 새 구조 (`GitHubActivityForAI`) + 프롬프트 수정 |
| 레포 선택 | 사용자가 레포별 on/off 토글 가능 |

## 아키텍처: BullMQ 잡 큐 기반

### 선택 이유

- PRD에 BullMQ 명시, 현재 fire-and-forget이 gap으로 지적됨
- 레포별 Job 분리 → rate limit 대응, 재시도, 진행률 추적
- cron 동기화가 BullMQ repeatable job으로 처리
- 서버 재시작 시 Redis에 Job 보존

---

## 1. DB 스키마

### 1.1 `github_repository`

사용자별 레포 목록 + on/off 토글.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → User | |
| github_repo_id | BIGINT | GitHub 내부 ID |
| full_name | VARCHAR(256) | `owner/repo` |
| name | VARCHAR(128) | repo명 |
| description | TEXT | |
| language | VARCHAR(64) | 주요 언어 |
| is_private | BOOLEAN | |
| stars_count | INT | |
| forks_count | INT | |
| topics | TEXT[] | |
| is_active | BOOLEAN DEFAULT true | on/off 토글 |
| synced_at | TIMESTAMPTZ | 마지막 동기화 시각 |
| created_at | TIMESTAMPTZ | |

### 1.2 `github_commit`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| repository_id | UUID FK → github_repository | |
| sha | VARCHAR(40) UNIQUE | |
| message | TEXT | |
| author_name | VARCHAR(128) | |
| author_email | VARCHAR(256) | |
| authored_at | TIMESTAMPTZ | |
| additions | INT | |
| deletions | INT | |
| files_changed | INT | |
| raw_data | JSONB | API 원본 응답 |

### 1.3 `github_pull_request`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| repository_id | UUID FK → github_repository | |
| github_pr_number | INT | |
| title | VARCHAR(512) | |
| body | TEXT | |
| state | VARCHAR(16) | open/closed/merged |
| is_merged | BOOLEAN | |
| additions | INT | |
| deletions | INT | |
| changed_files | INT | |
| created_at | TIMESTAMPTZ | |
| merged_at | TIMESTAMPTZ | |
| closed_at | TIMESTAMPTZ | |
| raw_data | JSONB | |

UNIQUE constraint: `(repository_id, github_pr_number)`

### 1.4 `github_issue`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| repository_id | UUID FK → github_repository | |
| github_issue_number | INT | |
| title | VARCHAR(512) | |
| body | TEXT | |
| state | VARCHAR(16) | open/closed |
| labels | TEXT[] | |
| created_at | TIMESTAMPTZ | |
| closed_at | TIMESTAMPTZ | |
| raw_data | JSONB | |

UNIQUE constraint: `(repository_id, github_issue_number)`

### 1.5 `github_sync_cursor`

증분 동기화 추적 — 레포/리소스별로 어디까지 가져왔는지.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| repository_id | UUID FK → github_repository | |
| resource_type | VARCHAR(16) | `COMMIT` / `PULL_REQUEST` / `ISSUE` |
| last_synced_at | TIMESTAMPTZ | 마지막으로 가져온 데이터의 시각 |
| last_page | INT | 중단된 페이지 (청크 재개용) |
| etag | VARCHAR(128) | GitHub API ETag (304 Not Modified 활용) |
| updated_at | TIMESTAMPTZ | |

UNIQUE constraint: `(repository_id, resource_type)`

### 1.6 `resume_sync_checkpoint`

이력서에 어떤 데이터까지 반영되었는지.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID PK | |
| user_id | UUID FK → User, UNIQUE | |
| last_commit_synced_at | TIMESTAMPTZ | 이력서에 반영된 마지막 커밋 시각 |
| last_pr_synced_at | TIMESTAMPTZ | 이력서에 반영된 마지막 PR 시각 |
| last_issue_synced_at | TIMESTAMPTZ | 이력서에 반영된 마지막 이슈 시각 |
| pending_commits | INT DEFAULT 0 | 미반영 커밋 수 |
| pending_prs | INT DEFAULT 0 | 미반영 PR 수 |
| pending_issues | INT DEFAULT 0 | 미반영 이슈 수 |
| resume_updated_at | TIMESTAMPTZ | 마지막 이력서 갱신 시각 |

---

## 2. BullMQ 잡 구조 & 동기화 흐름

### 2.1 큐 설계

| 큐 이름 | 역할 | Concurrency |
|---------|------|-------------|
| `github-sync` | GitHub API 데이터 수집 (레포별) | 3 |
| `github-sync-orchestrator` | 동기화 오케스트레이션 | 1 |
| `resume-update` | 이력서 증분 갱신 | 1 |

### 2.2 Job 흐름

```
[트리거: 수동 POST /datasource/github/sync or cron]
    │
    ▼
OrchestratorJob (github-sync-orchestrator 큐)
    1. GitHub API: GET /user → username 확인
    2. GitHub API: GET /user/repos → 레포 목록
    3. DB에 레포 목록 upsert (신규 레포는 is_active=true)
    4. is_active=true인 레포마다 RepoSyncJob 생성
    5. 모든 RepoSyncJob 완료 대기
    6. ThresholdCheckJob 생성
    │
    ▼ (레포별 병렬, 최대 3개)
RepoSyncJob (github-sync 큐)
    1. github_sync_cursor 조회
    2. since = max(cursor.last_synced_at, now - GITHUB_SYNC_DAYS_LIMIT)
    3. GitHub API 호출 — commits → pulls → issues **순차 처리**
       (rate limit 부담 분산, Job 내부에서 3종을 직렬로 수집)
       - per_page=100, 페이지네이션 순회
       - rate limit 시 X-RateLimit-Reset까지 대기
    4. DB에 upsert (sha/number 기준 중복 방지)
    5. cursor 업데이트
    │
    ▼ (모든 레포 완료 후)
ThresholdCheckJob (resume-update 큐)
    1. resume_sync_checkpoint 조회
    2. 미반영 데이터 카운트
    3. 임계치 초과 OR forceResume=true → ResumeIncrementalUpdateJob 생성
    │
    ▼ (조건 충족 시)
ResumeIncrementalUpdateJob (resume-update 큐)
    1. checkpoint 이후 새 데이터 조회
    2. 기존 이력서 parsedData 로드
    3. AI Agent: 기존 이력서 + 새 활동 → 업데이트된 이력서
    4. ResumeProfile 업데이트
    5. Embedding 재생성
    6. Market Value 재분석
    7. checkpoint 갱신 (pending_* = 0)
```

### 2.3 Rate Limit 대응

- 기본 호출 간격: 1초
- `X-RateLimit-Remaining` < 100 → `X-RateLimit-Reset`까지 대기
- 403 응답 시 BullMQ exponential backoff (60초 시작, 최대 3회 재시도)

### 2.4 Cron 설정

```typescript
orchestratorQueue.add('daily-sync', { userId }, {
  repeat: { cron: '0 3 * * *' },
  jobId: `daily-sync-${userId}`,
});
```

### 2.5 임계치 (환경변수로 조정 가능)

| 리소스 | 환경변수 | 기본값 |
|--------|---------|--------|
| 커밋 | `RESUME_THRESHOLD_COMMITS` | 20 |
| PR | `RESUME_THRESHOLD_PRS` | 3 |
| 이슈 | `RESUME_THRESHOLD_ISSUES` | 5 |

하나라도 초과하면 이력서 갱신 트리거.

### 2.6 기간 제한 (해커톤 설정)

| 환경변수 | 기본값 | 설명 |
|---------|--------|------|
| `GITHUB_SYNC_DAYS_LIMIT` | 10 | 0이면 전체 기간 수집 |

---

## 3. API 엔드포인트

### 3.1 신규 엔드포인트

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| `POST` | `/datasource/github/sync` | JWT | 수동 동기화 트리거. Body: `{ forceResume?: boolean }` |
| `GET` | `/datasource/github/sync/status` | JWT | 동기화 Job 상태 (진행률, 에러) |
| `GET` | `/datasource/github/repos` | JWT | 레포 목록 + is_active 상태 |
| `PATCH` | `/datasource/github/repos/:repoId` | JWT | 레포 토글. Body: `{ isActive: boolean }` |

### 3.2 기존 엔드포인트 수정

| Method | Path | 변경 |
|--------|------|------|
| `POST` | `/resume/generate` | `{ mode?: 'incremental' \| 'full' }` 옵션 추가. 수동 이력서 재생성 유지 |

---

## 4. 서비스/모듈 구조

```
backend/src/
├── datasource/
│   ├── datasource.module.ts              # BullMQ 큐 등록 추가
│   ├── datasource.controller.ts          # 기존 + GitHub 동기화 엔드포인트
│   ├── datasource.service.ts             # collectAllData: CONNECTED → DB 조회 분기
│   ├── github/
│   │   ├── github-api.client.ts          # GitHub REST API 래퍼
│   │   ├── github-sync.service.ts        # 동기화 비즈니스 로직 + buildActivityForAI
│   │   ├── github-sync.processor.ts      # BullMQ Worker
│   │   └── github-sync.types.ts          # Job payload, GitHubActivityForAI 타입
│   ├── entities/
│   │   ├── github-repository.entity.ts
│   │   ├── github-commit.entity.ts
│   │   ├── github-pull-request.entity.ts
│   │   ├── github-issue.entity.ts
│   │   ├── github-sync-cursor.entity.ts
│   │   └── resume-sync-checkpoint.entity.ts
│   └── fixtures/                         # 기존 유지 (mock 모드)
├── resume/
│   ├── resume.service.ts                 # 기존 파이프라인 + 증분 모드
│   └── prompts/
│       ├── resume-generate.prompt.ts     # GitHubActivityForAI 구조 대응
│       └── resume-incremental.prompt.ts  # 증분 업데이트 프롬프트 (신규)
```

### 핵심 서비스 역할

**`GitHubApiClient`** — GitHub REST API 호출 전담
- 인증 헤더, 페이지네이션, rate limit 대기 내장
- `getUser(token)`, `getRepos(token)`, `getCommits(token, fullName, since?)`,
  `getPullRequests(token, fullName, since?)`, `getIssues(token, fullName, since?)`

**`GitHubSyncService`** — 동기화 비즈니스 로직
- `startSync(userId, forceResume?)` → OrchestratorJob 큐잉
- `getSyncStatus(userId)` → 진행 상태 조회
- `getRepos(userId)` → 레포 목록
- `toggleRepo(userId, repoId, isActive)` → 토글
- `buildActivityForAI(userId)` → DB 데이터 → GitHubActivityForAI 변환

**`GitHubSyncProcessor`** — BullMQ Worker
- `processOrchestrator(job)` → 레포 조회 → RepoSyncJob 생성
- `processRepoSync(job)` → 커밋/PR/이슈 수집 → DB 저장 → cursor 갱신

---

## 5. AI 데이터 구조 & 프롬프트

### 5.1 `GitHubActivityForAI` (AI 입력 구조)

```typescript
interface GitHubActivityForAI {
  profile: {
    username: string;
    totalRepos: number;
    activeRepos: string[];
  };
  languageStats: Record<string, {
    repoCount: number;
    commitCount: number;
  }>;
  commits: {
    total: number;
    recentMessages: string[];     // 최근 50개 (토큰 절약)
    statsByRepo: Record<string, {
      count: number;
      additions: number;
      deletions: number;
    }>;
  };
  pullRequests: {
    total: number;
    merged: number;
    items: Array<{               // 최근 100개
      repo: string;
      title: string;
      state: string;
      createdAt: string;
      mergedAt: string | null;
    }>;
  };
  issues: {
    total: number;
    closed: number;
    items: Array<{               // 최근 100개
      repo: string;
      title: string;
      state: string;
      labels: string[];
    }>;
  };
}
```

### 5.2 증분 업데이트 프롬프트 (`resume-incremental.prompt.ts`)

AI에 기존 이력서 + 새 활동 데이터를 넘겨 업데이트 요청.

규칙:
- 기존 이력서의 구조와 톤 유지
- 새 기술 스택 발견 시 skills에 추가
- 의미 있는 PR/이슈는 experience highlights에 추가
- 기존 내용 삭제 금지, 보완/확장만
- 변경 없는 섹션은 그대로 유지
- `changelog` 필드로 변경 내용 요약

출력 형식: 기존 이력서와 동일한 JSON 구조 + `changelog` 필드 추가.

### 5.3 기존 프롬프트 수정

`RESUME_GENERATE_PROMPT`의 입력 형식을 변경:
- `github` 필드: fixture 구조 → `GitHubActivityForAI` 구조
- `slack`, `discord`, `gov24`: 기존 fixture 구조 유지

### 5.4 토큰 절약 제한

| 데이터 | 제한 | 이유 |
|--------|------|------|
| 커밋 메시지 | 최근 50개 | 전체 전송 시 토큰 폭발 |
| PR items | 최근 100개 | 제목+상태만, body 제외 |
| Issue items | 최근 100개 | 제목+라벨만, body 제외 |
| 통계 데이터 | 전체 집계 | 숫자는 토큰 적음 |

---

## 6. collectAllData 변경

`DatasourceService.collectAllData()` 수정:

- `GITHUB` + `CONNECTED` → `githubSyncService.buildActivityForAI(userId)` 호출
- `GITHUB` + `MOCK` → 기존 `loadFixture()` 유지
- `SLACK`, `DISCORD`, `GOV24` → 기존 `loadFixture()` 유지

---

## 7. 프론트엔드 변경

### 7.1 레포 관리 UI

`/datasource` 페이지, GitHub 연결 후 표시:
- 레포 목록 + 체크박스(on/off 토글)
- 레포명, 주요 언어 표시
- "동기화 시작" 버튼
- 마지막 동기화 시각
- 동기화 진행률 바 (3초 폴링)

### 7.2 API 함수 추가 (`lib/api.ts`)

- `getGithubRepos()` → 레포 목록 조회
- `toggleGithubRepo(repoId, isActive)` → 토글
- `startGithubSync(forceResume?)` → 동기화 트리거
- `getGithubSyncStatus()` → 상태 폴링

---

## 8. 환경변수 총정리

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `GITHUB_CLIENT_ID` | - | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | - | GitHub OAuth App Client Secret |
| `GITHUB_CALLBACK_URL` | `http://localhost:3001/datasource/callback/github` | OAuth 콜백 |
| `GITHUB_SYNC_DAYS_LIMIT` | `10` | 수집 기간 제한 (일). 0=전체 |
| `RESUME_THRESHOLD_COMMITS` | `20` | 이력서 갱신 커밋 임계치 |
| `RESUME_THRESHOLD_PRS` | `3` | 이력서 갱신 PR 임계치 |
| `RESUME_THRESHOLD_ISSUES` | `5` | 이력서 갱신 이슈 임계치 |
| `REDIS_HOST` | `localhost` | BullMQ Redis 호스트 |
| `REDIS_PORT` | `6379` | BullMQ Redis 포트 |
