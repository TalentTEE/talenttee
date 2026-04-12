# Phase 2: 채용 에이전트 — 대화형 공고 작성 + 바운더리 설정

> 스펙 참조: seungyeon-negotiation.md §3-1, §3-2
> PRD 참조: FR-005 (대화형 공고 작성), FR-006 (협상 바운더리 설정)
> 검증 결과: **PASS**

---

## 구현 파일

| 파일 | 경로 |
|------|------|
| JobController | `backend/src/job/job.controller.ts` |
| JobService | `backend/src/job/job.service.ts` |
| JobModule | `backend/src/job/job.module.ts` |
| CreateJobDto | `backend/src/job/dto/create-job.dto.ts` |
| ChatMessageDto | `backend/src/job/dto/chat-message.dto.ts` |
| 공고 작성 프롬프트 | `backend/src/job/prompts/job-creation.prompt.ts` |
| 바운더리 프롬프트 | `backend/src/job/prompts/boundary-setting.prompt.ts` |

---

## API 엔드포인트 검증

| 스펙 | 구현 | 보호 | 상태 |
|------|------|------|------|
| `POST /jobs/chat` | `@Post('jobs/chat')` L26 | JwtGuard + Employer 검증 | **PASS** |
| `POST /jobs` | `@Post('jobs')` L15 | JwtGuard + Employer 검증 | **PASS** |
| `GET /jobs/:id` | `@Get('jobs/:id')` L21 | JwtGuard | **PASS** |
| `POST /jobs/:id/boundary/chat` | `@Post('jobs/:id/boundary/chat')` L32 | JwtGuard + Employer 검증 | **PASS** |
| `GET /jobs/:id/boundary` | `@Get('jobs/:id/boundary')` L38 | JwtGuard | **PASS** |

---

## 대화형 공고 작성 (FR-005) 검증

### 프롬프트 비교

| 항목 | 스펙 | 구현 | 상태 |
|------|------|------|------|
| 역할 설정 | "당신은 채용 전문가입니다" | 동일 | **PASS** |
| 한 번에 하나의 질문 | Rule 1 | 동일 | **PASS** |
| 불충분 답변 시 재질문 | Rule 2 | 동일 | **PASS** |
| 필수 항목 | title, description, requiredSkills, salaryMin, salaryMax, remotePolicy | 동일 | **PASS** |
| 선택 항목 | preferredSkills, workingHours, benefits | 동일 | **PASS** |
| 완료 응답 | `{ complete: true, jobPosting: {...} }` | 동일 | **PASS** |
| 미완료 응답 | `{ complete: false, question: "..." }` | 동일 | **PASS** |

### 멀티턴 대화 관리

```
1. 요청 수신 → sessionId 확인 (없으면 생성: job-chat-{employerId}-{timestamp})
2. 사용자 메시지 → history에 추가
3. AI 호출 → systemPrompt + 전체 history 전달
4. 응답 파싱 → complete이면 JobPosting 생성 + 세션 삭제
5. incomplete이면 sessionId + question 반환 → 다음 턴 대기
```

- **세션 저장소**: `Map<string, ChatState>` (in-memory)
- **JSON 파싱 실패 시**: 원본 응답을 question으로 반환 (graceful fallback)

---

## 바운더리 설정 (FR-006) 검증

### 프롬프트 비교

| 항목 | 스펙 | 구현 | 상태 |
|------|------|------|------|
| 역할 설정 | 협상 전략 컨설턴트 | "당신은 협상 전략 컨설턴트입니다" | **PASS** |
| salaryHardMax 질문 | 연봉 상한 | 포함 | **PASS** |
| remotePolicyOptions | 원격근무 양보 가능 여부 | 포함 | **PASS** |
| nonNegotiableItems | 양보 불가 조건 | 포함 | **PASS** |
| flexibleItems | 양보 가능 조건 | 포함 | **PASS** |
| negotiationStyle | conservative/moderate/aggressive | 포함 | **PASS** |
| salaryMin/Max 재질문 안함 | 공고에서 가져옴 | 명시됨 | **PASS** |

### 바운더리 저장 로직

```
complete: true → boundary 데이터에 기존 job의 salaryMin/Max 병합
→ job.negotiationBoundary에 JSONB로 저장
→ 세션 삭제
```

---

## DTO 검증

### CreateJobDto

| 필드 | 타입 | 필수 | 검증 데코레이터 |
|------|------|------|----------------|
| title | string | Yes | `@IsString()` |
| description | string | Yes | `@IsString()` |
| requiredSkills | string[] | Yes | `@IsArray()`, `@IsString({ each: true })` |
| preferredSkills | string[] | No | `@IsOptional()` |
| salaryMin | number | No | `@IsOptional()`, `@IsNumber()` |
| salaryMax | number | No | `@IsOptional()`, `@IsNumber()` |
| salaryNegotiable | boolean | No | `@IsOptional()`, `@IsBoolean()` |
| remotePolicy | string | No | `@IsOptional()`, `@IsString()` |
| workingHours | string | No | `@IsOptional()`, `@IsString()` |
| benefits | string | No | `@IsOptional()`, `@IsString()` |

### ChatMessageDto

| 필드 | 타입 | 필수 |
|------|------|------|
| message | string | Yes |
| sessionId | string | No |

---

## 주의 사항

1. **AI 클라이언트가 Mock**: `MockNearAiClient`로 주입 — 실제 NEAR AI Cloud 연동 시 프롬프트 출력 품질 재검증 필요
2. **채팅 세션 in-memory**: 서버 재시작 시 진행 중인 대화 소실
3. **employer 권한 검증**: `ensureEmployer()` 메서드로 EMPLOYER 역할 확인 (L43-47)

---

## 결론

Phase 2는 스펙의 모든 API, 프롬프트, 대화 플로우를 충실히 구현했다. DTO 검증도 적절하다. Mock AI 전환 시 프롬프트 품질만 재확인하면 된다.
