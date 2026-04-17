# Phase 12 — 협상 후 마무리 플로우 (수락/거절 → 완료 화면)

**목적:** 시연 시 협상 종료 후 "다음 단계가 없는" 어색함 해소. 거절 백엔드 반영 + 양측 승인 대기 UX + 최종 완료 페이지 + 대시보드 상태 반영
**예상 소요:** ~1일
**의존:** Phase 4(협상 UI), Phase 6(백엔드 API 연결) 완료 상태

---

## 현재 문제 분석

| 문제 | 위치 | 영향 |
|------|------|------|
| **Reject 버튼이 프론트 state만 변경** | `agree/page.tsx:126-128` | 새로고침하면 다시 수락/거절 선택지 노출, 백엔드 세션 상태 불변 |
| **한쪽만 승인 시 대기 화면 부재** | `agree/page.tsx` | approve API가 `waiting_for_other_party` 반환하지만 UI에 미반영 |
| **승인 완료 후 랜딩 없음** | 전체 | txHash 보여주고 끝. "채용 합의 완료" 안내 없음 |
| **Negotiations 목록에 진행 중(IN_PROGRESS) 세션 미표시** | `negotiations/page.tsx:43-44` | AGREED/FAILED만 필터링, 진행 중인 협상이 보이지 않음 |
| **대시보드에 완료 상태 미반영** | 
대시보드 | 합의 완료/거절된 건의 상태 구분 없음 |
| **NegotiationState에 REJECTED 없음** | `enums/index.ts` | 거절을 표현할 상태값 자체가 없음 |

---

## Step 1: 백엔드 — Reject API + REJECTED 상태 추가

### 1-1. NegotiationState enum에 REJECTED 추가

**파일:** `backend/src/common/enums/index.ts`

```diff
 export enum NegotiationState {
   INITIATED = 'INITIATED',
   EMPLOYER_OFFER = 'EMPLOYER_OFFER',
   SEEKER_COUNTER = 'SEEKER_COUNTER',
   EMPLOYER_COUNTER = 'EMPLOYER_COUNTER',
   AGREED = 'AGREED',
   FAILED = 'FAILED',
   MAX_ROUNDS = 'MAX_ROUNDS',
+  REJECTED = 'REJECTED',
 }
```

### 1-2. Reject 엔드포인트 추가

**파일:** `backend/src/agreement/agreement.controller.ts`

```typescript
@Post('negotiation/sessions/:id/reject')
async reject(@Param('id') id: string, @Req() req) {
  return this.agreementService.reject(id, req.user.id);
}
```

**파일:** `backend/src/agreement/agreement.service.ts`

```typescript
async reject(sessionId: string, userId: string): Promise<{ status: string }> {
  const session = await this.sessionRepo.findOne({
    where: { id: sessionId },
  });
  if (!session) throw new NotFoundException('Session not found');
  if (session.state !== NegotiationState.AGREED) {
    throw new ConflictException('Session is not in AGREED state');
  }
  const isParticipant = session.seekerId === userId || session.employerId === userId;
  if (!isParticipant) throw new ForbiddenException('Not a participant');

  session.state = NegotiationState.REJECTED;
  await this.sessionRepo.save(session);
  return { status: 'rejected' };
}
```

### 1-3. NegotiationSession 엔티티 — state 컬럼 길이 확인

- `@Column({ type: 'varchar', length: 20 })` → `REJECTED`는 8자라 문제 없음

### 수정 파일
- [ ] `backend/src/common/enums/index.ts` — REJECTED 추가
- [ ] `backend/src/agreement/agreement.controller.ts` — reject 엔드포인트
- [ ] `backend/src/agreement/agreement.service.ts` — reject 로직

---

## Step 2: 프론트엔드 — Reject API 연동 + 승인 대기 UI

### 2-1. API 함수 추가

**파일:** `frontend/src/lib/api.ts`

```typescript
export async function rejectAgreement(sessionId: string): Promise<void> {
  if (USE_DUMMY) return;
  await apiFetch(`/negotiation/sessions/${sessionId}/reject`, { method: 'POST' });
}
```

### 2-2. Agree 페이지 개선

**파일:** `frontend/src/app/negotiation/[sessionId]/agree/page.tsx`

변경 사항:
1. `handleReject()`에서 `rejectAgreement(sessionId)` API 호출 추가
2. `handleApprove()` 후 `waiting_for_other_party` 응답 처리 → 대기 UI 표시
3. 이미 승인/거절된 상태 감지 (페이지 로드 시 세션 상태 확인)

```
상태 흐름:
- 초기: Approve / Reject 버튼 표시
- Approve 클릭 → API 응답이 waiting_for_other_party:
    "상대방의 승인을 기다리고 있습니다" 대기 화면
- Approve 클릭 → API 응답이 both_approved:
    txParams 수신 → 온체인 기록 → 완료 화면
- Reject 클릭 → API 호출 → 거절 확인 화면 (되돌릴 수 없음 경고 후)
- 페이지 재진입 시 세션 상태가 REJECTED면 → 거절 완료 화면 바로 표시
```

**새로운 UI 상태:**

```
┌─────────────────────────────────────┐
│  ⏳ Waiting for Approval            │
│                                     │
│  You have approved the agreement.   │
│  Waiting for the other party...     │
│                                     │
│  [Your approval: ✅ Done]            │
│  [Other party:   ⏳ Pending]        │
└─────────────────────────────────────┘
```

### 수정 파일
- [ ] `frontend/src/lib/api.ts` — `rejectAgreement()` 추가
- [ ] `frontend/src/lib/types.ts` — NegotiationSession state에 `REJECTED` 추가
- [ ] `frontend/src/app/negotiation/[sessionId]/agree/page.tsx` — reject API 호출 + 대기 UI + 거절 확인 모달

---

## Step 3: 최종 완료 페이지

### 3-1. 양측 승인 완료 시 최종 화면

**기존 agree 페이지 내에서 분기 처리** (별도 페이지 불필요)

양측 모두 승인 + onChainTxHash 존재 시:

```
┌──────────────────────────────────────────────┐
│  🎉 Hiring Agreement Finalized               │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Position:   Senior Frontend Engineer   │  │
│  │ Salary:     $135,000/yr                │  │
│  │ Work Type:  Hybrid (3 days in-office)  │  │
│  │ Start Date: 2026-05-01                 │  │
│  │ Rounds:     4 rounds                   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ✅ Seeker Approved                           │
│  ✅ Employer Approved                         │
│                                              │
│  📋 On-Chain Record                           │
│  TX: 0x3f8a...2c1b                           │
│  Agreement Hash: a7d2e...f9c1               │
│  [View on NEAR Explorer ↗]                   │
│                                              │
│  ← Back to Dashboard                         │
└──────────────────────────────────────────────┘
```

### 3-2. 거절 완료 화면

```
┌──────────────────────────────────────────────┐
│  ❌ Agreement Rejected                        │
│                                              │
│  This negotiation has been declined.         │
│  The position remains open for               │
│  other candidates.                           │
│                                              │
│  ← Back to Negotiations                      │
└──────────────────────────────────────────────┘
```

### 수정 파일
- [ ] `frontend/src/app/negotiation/[sessionId]/agree/page.tsx` — 완료/거절 최종 화면 분기

---

## Step 4: Negotiations 목록 페이지 개선

### 4-1. 진행 중 + 승인 대기 + 거절 세션 표시

**파일:** `frontend/src/app/negotiations/page.tsx`

현재는 `AGREED`와 `FAILED/MAX_ROUNDS`만 분류. 다음으로 확장:

```typescript
const inProgress = sessions.filter(s =>
  ['INITIATED', 'EMPLOYER_OFFER', 'SEEKER_COUNTER', 'EMPLOYER_COUNTER'].includes(s.state)
);
const agreed = sessions.filter(s => s.state === 'AGREED');
const rejected = sessions.filter(s => s.state === 'REJECTED');
const failed = sessions.filter(s => s.state === 'FAILED' || s.state === 'MAX_ROUNDS');
```

**섹션 구성:**

| 섹션 | 상태 | 버튼 |
|------|------|------|
| In Progress | INITIATED~COUNTER | "Watch Live" → `/negotiation/:id` |
| Agreement Reached | AGREED | "Review & Decide" → `/negotiation/:id/agree` |
| Completed | seekerApproved && employerApproved && onChainTxHash | "View Agreement" → `/negotiation/:id/agree` |
| Rejected | REJECTED | "View Details" → `/negotiation/:id/agree` |
| Failed | FAILED / MAX_ROUNDS | "View History" → `/negotiation/:id` |

### 수정 파일
- [ ] `frontend/src/app/negotiations/page.tsx` — 5가지 상태 분류 + 각 상태별 Row 컴포넌트

---

## Step 5: 대시보드 협상 상태 반영

### 5-1. 대시보드 Negotiation 카드에 상태 뱃지

**파일:** `frontend/src/app/dashboard/seeker/page.tsx`, `frontend/src/app/dashboard/employer/page.tsx`

대시보드의 협상 목록에서 세션 상태에 따라 뱃지 표시:
- 🟢 `Completed` — 양측 승인 완료
- 🟡 `Awaiting Approval` — AGREED 상태 (아직 한쪽/양쪽 미승인)
- 🔴 `Rejected` — REJECTED
- 🔵 `In Progress` — 협상 진행 중
- ⚫ `Failed` — FAILED / MAX_ROUNDS

### 수정 파일
- [ ] `frontend/src/app/dashboard/seeker/page.tsx` — 협상 상태 뱃지
- [ ] `frontend/src/app/dashboard/employer/page.tsx` — 협상 상태 뱃지

---

## Step 6: 더미 데이터 대응

**파일:** `frontend/src/lib/api.ts`, `frontend/src/lib/dummy/` (필요 시)

- `rejectAgreement()` — `USE_DUMMY` 시 즉시 return
- `approveAgreement()` — 더미 모드에서 `waiting_for_other_party` 시뮬레이션 (첫 호출 시 대기, 두 번째 호출 시 완료)
- Negotiations 목록 더미 데이터에 다양한 상태 추가

### 수정 파일
- [ ] `frontend/src/lib/api.ts` — 더미 모드 분기 보강

---

## 전체 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `backend/src/common/enums/index.ts` | REJECTED 상태 추가 |
| `backend/src/agreement/agreement.controller.ts` | reject 엔드포인트 |
| `backend/src/agreement/agreement.service.ts` | reject 로직 |
| `frontend/src/lib/api.ts` | `rejectAgreement()` + 더미 보강 |
| `frontend/src/lib/types.ts` | REJECTED 상태 타입 |
| `frontend/src/app/negotiation/[sessionId]/agree/page.tsx` | 대기 UI + 완료 화면 + reject API |
| `frontend/src/app/negotiations/page.tsx` | 5가지 상태 분류 |
| `frontend/src/app/dashboard/seeker/page.tsx` | 상태 뱃지 |
| `frontend/src/app/dashboard/employer/page.tsx` | 상태 뱃지 |

---

## 수락 기준

- [ ] Reject 버튼 클릭 → 백엔드 세션 상태 `REJECTED`로 변경 확인
- [ ] 새로고침 후에도 거절 상태 유지 (프론트 state가 아닌 서버 상태 기반)
- [ ] 한쪽만 Approve → "상대방 대기 중" UI 표시
- [ ] 양측 모두 Approve → 최종 완료 화면 (합의 요약 + txHash + Explorer 링크)
- [ ] Negotiations 목록에서 진행 중/합의/완료/거절/실패 5가지 구분
- [ ] 대시보드에 협상 상태 뱃지 표시
- [ ] `USE_DUMMY=true` 모드에서도 전체 플로우 정상 동작
- [ ] 시연 시나리오: 데이터소스 → 이력서 → 매칭 → 협상 → 수락 → 완료 화면까지 끊김 없이 진행
