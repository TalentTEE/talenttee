# Phase F-1: Candidate Boundary UX 강화

> Priority: Critical | Effort: Low | Duration: 1-2 days

## Judge Feedback

> "I don't want an AI to always negotiate for me. I want to be able to say, no, that's too little."

## Goal

후보자가 AI 협상의 경계를 명확히 설정하고, 협상 결과가 "제안"임을 UI에서 강조.

---

## Tasks

### 1. Salary Boundary Settings UI 개선
- **현재:** NegotiationHandoff에서 min/max salary 입력 존재
- **개선:**
  - Min salary를 "절대 수락 불가" 라인으로 명확히 라벨링
  - Max salary를 "이상적 목표" 라인으로 변경
  - 슬라이더 or 범위 인풋으로 시각화
  - "AI는 이 범위 안에서만 협상합니다" 안내 텍스트

### 2. "Proposal, Not Contract" 명확화
- 협상 완료 시 결과 화면에 배지 추가: "AI Proposal — 최종 결정은 양측이 직접"
- Agreement 페이지 상단에 disclaimer 추가
- CTA 버튼: "제안 수락" / "조건 재협상 요청" / "거절"

### 3. Auto-Negotiate Limit 설정
- Seeker 설정에 "자동 협상 최대 N개 회사" 옵션 추가
- 기본값: 5개
- 초과 시 수동 승인 요구

### 4. Negotiation Pause/Override
- 진행 중 협상에 "일시정지" 버튼
- 후보자가 직접 메시지를 추가할 수 있는 "수동 개입" 모드

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/components/negotiation/NegotiationHandoff.tsx` | Boundary UI 개선 |
| `frontend/src/components/negotiation/AgreementView.tsx` | Proposal disclaimer |
| `frontend/src/app/(app)/settings/page.tsx` | Auto-negotiate limit 설정 |
| `backend/src/negotiation/negotiation.service.ts` | Limit 체크 로직 |

---

## Success Criteria

- [ ] 후보자가 min/max 연봉을 설정하는 UI가 명확하고 직관적
- [ ] 협상 결과 화면에 "이것은 제안입니다" 명시
- [ ] 자동 협상 개수 제한 설정 가능
- [ ] 피치 데모에서 30초 내 boundary 설정 시연 가능
