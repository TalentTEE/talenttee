# 준하 — AI Pipeline (이력서 + 매칭)

> **역할**: NEAR AI Cloud 연동, 이력서 생성/분석, 시장가치 산출, 매칭
> **마감**: 2026-04-17
> **의존**: 성훈 Day 1 산출물 (DB 스키마, TypeORM 엔티티, JwtGuard)
> **피의존**: 승연의 협상 엔진이 매칭 결과를 입력으로 사용

---

## 1. 담당 범위

| # | 기능 | PRD 참조 | 우선순위 |
|---|------|---------|---------|
| 1 | NEAR AI Cloud 클라이언트 (OpenAI 호환) | Section 7 AI/모델 | Day 1 오전 (4/12, 성훈 대기 중 선행) |
| 2 | 데이터소스 연결 (GitHub OAuth + Mock) | FR-002 | Day 1 오후 (4/12) |
| 3 | 이력서 생성/최신화 + 데이터 분류 | FR-003 | Day 1 오후 ~ Day 2 오전 (4/12-13) |
| 4 | 벡터 임베딩 (Qwen3-Embedding) | FR-003 동작 8 | Day 2 오전 (4/13) |
| 5 | 시장가치 산출 | FR-004 | Day 2 오전 (4/13) |
| 6 | 2단계 시맨틱 매칭 (ANN + Reranker) | FR-007 | Day 2 오후 (4/13) |
| 7 | 매칭 통보 + 양쪽 동의 | FR-008 | Day 2 오후 (4/13) |
| 8 | 프론트 연결 + 프롬프트 튜닝 | - | Day 3-4 (4/14-15) |
| 9 | 매칭 정확도 검증 + 고도화 | - | Day 4-5 (4/15-16) |
| 10 | 최종 리허설 + 제출 | - | Day 6 (4/17) |

## 2. Day 1 선행 작업 (성훈 DB 완성 전)

성훈이 DB 스키마를 잡는 동안, NEAR AI Cloud 클라이언트를 먼저 구현:

### NEAR AI Cloud 클라이언트

```typescript
// modules/agent/clients/near-ai.client.ts
import OpenAI from 'openai';

@Injectable()
export class NearAiClient {
  private readonly client: OpenAI;

  constructor(config: ConfigService) {
    this.client = new OpenAI({
      baseURL: 'https://cloud-api.near.ai/v1',
      apiKey: config.get('NEAR_AI_API_KEY'),
    });
  }

  // Chat completion (이력서 분석, 시장가치, 공고 작성 등)
  async chat(model: string, messages: ChatCompletionMessageParam[]): Promise<string>

  // Embedding (이력서/공고 벡터화)
  async embed(input: string | string[]): Promise<number[][]>

  // Reranking (매칭 정밀 평가)
  async rerank(query: string, documents: string[]): Promise<RerankResult[]>
}
```

이 클라이언트는 **준하 + 승연 모두 사용**하므로, 공유 모듈(`modules/agent/`)에 위치.

## 3. 기능별 상세

### 3-1. 데이터소스 연결 (FR-002)

**API:**
```
GET  /datasource/connect/github   → GitHub OAuth redirect
GET  /datasource/callback/github  → OAuth callback → 토큰 저장
POST /datasource/connect/mock     → { provider: "slack" } → mock 연결
GET  /datasource/status           → 연결 상태 목록
POST /datasource/sync             → 수동 동기화 트리거
```

**GitHub OAuth 연동:**
- `passport-github2` NestJS Strategy
- 스코프: `read:user`, `repo` (커밋/PR/이슈 읽기)
- callback에서 accessToken을 DataSourceConnection에 저장

**Mock 연동:**
- Slack, Discord, 정부24 → `POST /datasource/connect/mock`
- provider별 fixture JSON 파일 준비 (`fixtures/slack.json`, `fixtures/discord.json`, `fixtures/gov24.json`)
- fixture 내용:
  - Slack: 채널 메시지 (작업/논의/피드백 분류용)
  - Discord: 커뮤니티 활동, 역할
  - 정부24: 자격증, 학력

### 3-2. 이력서 생성 (FR-003)

**흐름:**
```
POST /resume/upload → 202 Accepted
  ↓
BullMQ Job:
  1. 상태: "수집 중"
     - GitHub: Octokit으로 실제 데이터 수집 (커밋, 언어, 기여 프로젝트)
     - Mock: fixture 로드
  2. 데이터 분류 (Slack/Discord)
     - LLM 프롬프트로 작업/논의/피드백 분류
  3. 상태: "분석 중"
     - NEAR AI Cloud TEE → Qwen3 Chat
     - 시스템 프롬프트: 이력서 구조화 지시
     - 입력: 수집된 전체 데이터
     - 출력: { skills[], experience[], education[], summary }
  4. 상태: "완성"
     - Qwen3-Embedding → 이력서 벡터 생성
     - pgvector INSERT
     - ResumeProfile 저장
```

**데이터 분류 프롬프트 (하네스):**

```
당신은 업무 데이터 분류기입니다.
각 메시지를 다음 카테고리로 분류하세요:

- WORK: 코드 리뷰, 배포, 버그 수정, PR 머지 등 직접적인 작업 기여
- DISCUSSION: 아키텍처 토론, 기술 선택, 설계 논의 등
- FEEDBACK: 코드 리뷰 코멘트, 동료 피드백, 칭찬/개선 제안 등

JSON 배열로 응답:
[{ "message_id": "...", "category": "WORK|DISCUSSION|FEEDBACK", "relevance_to_career": "HIGH|MEDIUM|LOW" }]
```

**이력서 생성 프롬프트:**

```
당신은 커리어 분석 전문가입니다.
다음 데이터를 분석하여 구조화된 이력서를 생성하세요.

입력 데이터:
- GitHub 활동: {github_data}
- Slack 활동 (분류됨): {slack_classified}
- Discord 활동 (분류됨): {discord_classified}
- 자격증/학력: {gov24_data}

출력 형식 (JSON):
{
  "skills": ["TypeScript", "React", ...],
  "experience": [
    { "role": "...", "company": "...", "period": "...", "highlights": [...] }
  ],
  "education": [
    { "degree": "...", "institution": "...", "year": "..." }
  ],
  "summary": "3줄 요약",
  "strengths": ["...", "..."],
  "improvement_areas": ["...", "..."]
}
```

### 3-3. 시장가치 산출 (FR-004)

```
이력서 완성 시 자동 트리거:
  1. DB에서 유사 공고 조회 (pgvector 유사도 기반)
  2. 유사 공고들의 연봉 범위 수집
  3. NEAR AI Cloud TEE에 전송:
     - 입력: 이력 분석 결과 + 유사 공고 연봉 데이터
     - 출력: { marketValueMin, marketValueMax, reasoning, negotiationPoints[] }
  4. ResumeProfile 업데이트
```

**시장가치 프롬프트:**

```
당신은 채용 시장 분석 전문가입니다.

구직자 이력:
{resume_parsed_data}

유사 포지션 공고 데이터:
{similar_jobs_with_salary}

다음을 분석하세요:
1. 이 구직자의 적정 연봉 범위 (하한~상한, 원 단위)
2. 산출 근거 (어떤 데이터를 기반으로 했는지)
3. 협상 시 강점이 되는 포인트 (스킬 희소성, 경력 등)
4. 약점이 될 수 있는 포인트

JSON 형식:
{
  "marketValueMin": 60000000,
  "marketValueMax": 75000000,
  "reasoning": "...",
  "negotiationPoints": {
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."]
  }
}
```

### 3-4. 벡터 임베딩 + 매칭 (FR-007)

**임베딩 (쓰기 시점):**
- 이력서 완성 시 → `NearAiClient.embed(resumeText)` → pgvector INSERT
- 공고 완성 시 → `NearAiClient.embed(jobDescription)` → pgvector INSERT

**매칭 (조회 시점):**

```
GET /match/seeker/:seekerId → 구직자 기준 매칭 공고 Top-5
GET /match/job/:jobId       → 공고 기준 매칭 후보 Top-5

Step 1: ANN (Approximate Nearest Neighbor)
  SELECT * FROM job_posting
  ORDER BY embedding <=> :seeker_embedding
  LIMIT 20;

Step 2: Reranker
  NearAiClient.rerank(resumeText, top20JobTexts)
  → 점수 기반 재정렬 → Top-5

Step 3: MatchResult 저장
  { seekerId, jobId, annScore, rerankScore, finalRank }
```

### 3-5. 매칭 통보 + 양쪽 동의 (FR-008)

```
매칭 결과 생성 후:
  → 양측 대시보드에 매칭 결과 표시 (API로 조회)
  → 구직자 동의 + 채용측 동의 시 → 승연의 협상 엔진으로 핸드오프

POST /match/:matchId/agree   → { userId } → 동의 기록
GET  /match/:matchId/status  → 양측 동의 상태
```

양측 동의 완료 시, `NegotiationSession` 생성은 **승연의 협상 엔진**이 담당.
준하는 매칭 결과와 동의 상태까지만 관리.

## 4. API 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /datasource/connect/github | GitHub OAuth redirect |
| GET | /datasource/callback/github | OAuth callback |
| POST | /datasource/connect/mock | Mock 연결 |
| GET | /datasource/status | 연결 상태 |
| POST | /datasource/sync | 수동 동기화 |
| POST | /resume/generate | 이력서 생성 트리거 (202 Accepted) |
| GET | /resume/:id | 이력서 조회 |
| GET | /resume/:id/status | 처리 상태 |
| GET | /resume/:id/market-value | 시장가치 결과 |
| GET | /match/seeker/:seekerId | 구직자 기준 매칭 |
| GET | /match/job/:jobId | 공고 기준 매칭 |
| POST | /match/:matchId/agree | 매칭 동의 |
| GET | /match/:matchId/status | 동의 상태 |

## 5. 의존성

| 의존 대상 | 항목 | 블로킹? |
|----------|------|---------|
| 성훈 | DB 스키마, TypeORM 엔티티 | Day 1까지 대기 (그 전에 NearAiClient 선행 가능) |
| 성훈 | JwtGuard | Day 1까지 대기 |
| 승연 | 매칭 동의 → 협상 세션 생성 연동 | Day 3-4 인터페이스 합의 |

## 6. 수락 기준

- [ ] GitHub OAuth 연결 → 커밋/언어/프로젝트 데이터 수집 성공
- [ ] Mock 연결 → Slack/Discord/정부24 fixture 데이터 로드
- [ ] `POST /resume/generate` → 상태가 수집 중 → 분석 중 → 완성으로 전이
- [ ] 완성된 이력서에 skills[], experience[], education[] 포함
- [ ] 시장가치 산출 → marketValueMin/Max + reasoning 반환
- [ ] 이력서 + 공고 벡터 임베딩 → pgvector 저장
- [ ] 매칭 쿼리 → Top-5 결과 반환 (ANN + Rerank)
- [ ] 양측 동의 → 승연 협상 엔진으로 핸드오프 성공
