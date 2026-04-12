# Phase 5: 사용자 중간 개입

> 스펙 참조: seungyeon-negotiation.md §3-5
> PRD 참조: FR-010 동작 6
> 검증 결과: **PASS (주의사항 있음)**

---

## 구현 파일

| 파일 | 위치 |
|------|------|
| Controller 엔드포인트 | `negotiation.controller.ts` L36-40 |
| Service 로직 | `negotiation.service.ts` L89-95 |
| 개입 적용 | `negotiation.service.ts` L134, 211-213 |
| InterveneDto | `negotiation/dto/intervene.dto.ts` |

---

## 스펙 대비 구현 검증

### API 비교

| 항목 | 스펙 | 구현 | 상태 |
|------|------|------|------|
| 엔드포인트 | `POST /negotiation/sessions/:id/intervene` | 동일 | **PASS** |
| Body.direction | "연봉은 6,800만 이하로 양보하지 마" | `direction: string` | **PASS** |
| Body.applyFromRound | "next" | **미구현** — 항상 다음 라운드 적용 | **N/A** (스펙과 동일 효과) |

### 개입 처리 흐름

```
1. POST /intervene → nearAccountId로 역할 식별 (SEEKER or EMPLOYER)
2. interventions Map에 저장: key = "${sessionId}:${role}", value = direction
3. 다음 라운드 시작 시 → 해당 역할의 intervention 조회 (L134)
4. 프롬프트의 "사용자 추가 지시" 필드에 주입 (L152, L165)
5. 적용 후 삭제 (L211-213) → 1회성 적용
```

### 스펙과 동일한 동작

- **"진행 중인 라운드에는 영향 없음"**: ✅ — Map에 저장만 하고, 다음 executeRound 사이클에서 읽음
- **"다음 차례부터 적용"**: ✅ — actor가 자기 차례일 때만 intervention 조회
- **에이전트 프롬프트 반영**: ✅ — 양측 프롬프트 모두 `userIntervention` 파라미터 포함

### 스펙에 없지만 구현된 것

- **1회성 적용**: 개입이 적용된 후 Map에서 삭제됨 → 다음 라운드에서는 반영 안 됨
  - 이는 합리적 설계 — 지속 개입이 필요하면 다시 POST

---

## 주의 사항

### In-Memory 저장

```typescript
private interventions = new Map<string, string>();
```

| 위험 | 영향도 | 대응 |
|------|--------|------|
| 서버 재시작 시 개입 소실 | 낮음 | 개입은 즉시 다음 라운드에 적용되므로 시간 윈도우가 짧음 |
| 멀티 인스턴스 배포 시 동기화 안됨 | 중 | 해커톤 단일 서버 환경에서는 문제없음, 프로덕션 시 Redis로 전환 필요 |

---

## 결론

Phase 5는 스펙의 개입 기능을 정확히 구현했다. `applyFromRound` 파라미터는 구현하지 않았으나, 스펙에서도 "next"만 예시로 들었으므로 기본 동작(항상 다음 라운드 적용)이 스펙과 동일한 효과를 낸다. In-memory 저장은 해커톤 범위에서 적절하다.
