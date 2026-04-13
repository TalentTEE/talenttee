# Phase 10: 프론트엔드 ↔ 백엔드 인터페이스 정렬

> **Goal:** 준하/승연 백엔드 API와 프론트엔드 타입/API 레이어를 정확히 맞춰서, `USE_DUMMY=false` 전환 시 바로 동작하도록 만들기
> **선행:** Phase 9 (Wallet Selector 완료)
> **참고:** 준하 — `docs/superpowers/plans/junha/ROADMAP.md`, 승연 — `docs/superpowers/plans/seungyeon/00-overview.md`
> **예상 소요:** ~2시간

---

## 배경

준하는 백엔드에서 **인터페이스를 분리하여 독립 구현**하는 방식을 사용:
- `common/interfaces/escrow-payment.interface.ts` — 에스크로 인터페이스
- `common/interfaces/negotiation-handoff.interface.ts` — 협상 핸드오프 인터페이스
- `common/mocks/mock-*.ts` — Mock 구현체로 독립 동작
- 통합 시 `useClass: MockXxx` → `useClass: 실제Service`로 교체

프론트엔드는 이와 달리 `api.ts`에서 `if (USE_DUMMY) return HARDCODED` 방식으로 분기.
**문제:** 프론트엔드 타입과 백엔드 엔티티/DTO가 정확히 일치하지 않아 통합 시 깨질 수 있음.

---

## Task 10.1: 프론트엔드 타입 ↔ 백엔드 엔티티 불일치 수정

**Files:**
- Modify: `frontend/src/lib/types.ts`

- [ ] **Step 1: 타입 불일치 목록 작성 및 수정**

| 프론트엔드 (`types.ts`) | 백엔드 엔티티 | 불일치 |
|---|---|---|
| `ResumeProfile.status: 'COMPLETED'` | `ResumeStatus.COMPLETE` | 값 다름 |
| `NegotiationRound.proposal` (평문 객체) | `encryptedData: Buffer` (암호화) | 구조 다름 |
| `MatchResult.seekerSkills`, `seekerExperienceYears`, `jobTitle`, `companyName` | 백엔드에 없음 (join 필요) | 프론트 전용 필드 |
| `JobPosting.benefits: string[]` | `benefits: string` (단일 텍스트) | 타입 다름 |
| `DataSourceConnection.lastSyncAt` | `lastSyncedAt` | 필드명 다름 |

각 불일치를 수정하되, 프론트엔드 UI에서 필요한 추가 필드는 별도 확장 타입으로 분리.

---

## Task 10.2: API 엔드포인트 경로 정렬

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: 백엔드 실제 엔드포인트와 프론트엔드 호출 경로 비교**

| 기능 | 프론트 (`api.ts`) | 백엔드 실제 | 일치 |
|------|---|---|---|
| 인증 challenge | `POST /auth/near/challenge` | `POST /auth/near/challenge` | OK |
| 인증 verify | `POST /auth/near/verify` | `POST /auth/near/verify` | OK |
| 이력서 조회 | `GET /resume/{id}` | `GET /resume/{id}` | 확인 필요 |
| 이력서 생성 | `POST /resume/generate` | `POST /resume/generate` | 확인 필요 |
| 데이터소스 상태 | `GET /datasource/status` | 준하 구현 확인 필요 | 확인 필요 |
| 채용공고 목록 | `GET /jobs` | `GET /jobs/:id` (단건만) | **불일치 가능** |
| 채용공고 채팅 | `POST /jobs/chat` | `POST /jobs/chat` | OK |
| 매칭 조회 | `GET /match/seeker/{id}` | `GET /match/seeker/{id}` | 확인 필요 |
| 협상 세션 | `GET /negotiation/sessions` | 목록 API 존재 여부 확인 | 확인 필요 |
| 에스크로 잔액 | `GET /escrow/balance` | 성훈 API 확인 필요 | 확인 필요 |

- [ ] **Step 2: 불일치 경로 수정 및 응답 매핑 추가**

---

## Task 10.3: Wallet Selector 서명을 auth.tsx에 연결

**Files:**
- Modify: `frontend/src/lib/auth.tsx`
- Modify: `frontend/src/lib/wallet-selector.tsx`

- [ ] **Step 1: doLogin()의 placeholder 서명을 Wallet Selector signMessage()로 교체**

현재 (하드코딩):
```typescript
const signature = 'poc-signature-placeholder';
const publicKey = 'ed25519:placeholder';
```

변경: Wallet Selector의 `wallet.signMessage()` (NEP-413) 사용:
```typescript
const wallet = await selector.wallet();
const signed = await wallet.signMessage({ message: nonce, recipient: 'talent-tee', nonce: Buffer.from(nonce) });
```

- [ ] **Step 2: signMessage 미지원 지갑 폴백 처리**

일부 지갑은 NEP-413 signMessage를 지원하지 않음. 미지원 시 에러 메시지 표시.

---

## Task 10.4: 더미 데이터를 계정별 동적 생성으로 개선

**Files:**
- Modify: `frontend/src/lib/dummy/*.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: getDummyUser()를 계정 ID 기반으로 변경**

현재: `role === 'SEEKER' ? DUMMY_ALICE : DUMMY_BOB` (하드코딩)
변경: 지갑 주소를 기반으로 동적 더미 유저 생성

```typescript
export async function getDummyUser(role: UserRole, nearAccountId: string): Promise<User> {
  return {
    id: `user-${nearAccountId}`,
    nearAccountId,
    role,
    publicKey: 'ed25519:dummy',
    createdAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: 나머지 더미 API도 userId 파라미터 반영**

`getResume(userId)`, `getSeekerMatches(seekerId)` 등에서 userId를 더미 데이터에 반영.
데이터 내용은 동일하더라도 userId가 실제 계정과 매칭되어야 함.

---

## Task 10.5: 빌드 + 테스트 검증

- [ ] `npx next build` 성공
- [ ] `npx vitest run` 전체 통과
- [ ] `USE_DUMMY=true` → 지갑 연결 후 계정별 더미 데이터 정상 표시
- [ ] `USE_DUMMY=false` → 백엔드 엔드포인트 호출 시 올바른 경로/타입 사용 (백엔드 미실행이면 네트워크 에러 OK)

---

## Phase 10 완료 기준

- [ ] `types.ts` ↔ 백엔드 엔티티 타입 일치
- [ ] `api.ts` 엔드포인트 경로가 백엔드와 정확히 일치
- [ ] Wallet Selector signMessage()로 실제 서명 가능 (NEP-413)
- [ ] 더미 데이터가 계정별로 동적 생성 (하드코딩 제거)
- [ ] 빌드 성공 + 테스트 통과
