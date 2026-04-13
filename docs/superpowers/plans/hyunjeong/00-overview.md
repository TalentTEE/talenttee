# Hyunjeong Frontend — Roadmap

**담당:** 현정 (프론트엔드 전체 UI 구현)
**마감:** 2026-04-17
**스펙:** Talent-Tee 프론트엔드 — AI 기반 채용 에이전트 플랫폼 UI

---

## Architecture

Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4.
인증은 AuthContext + localStorage 기반 (더미/NEAR 분기).
API 레이어는 `USE_DUMMY` 플래그로 더미 데이터와 실제 백엔드를 분기.
UI 컴포넌트는 shadcn/ui + Material Symbols + Manrope 폰트.

## Phase Overview

```
Phase 1 ─── Day 1 오전 (4/12) ─── 프로젝트 셋업 + 더미 데이터 + 타입 정의
  │         ↓ 모든 페이지에서 타입/더미 데이터 import 가능
  │
Phase 2 ─── Day 1 오후 (4/12) ─── 로그인 + 대시보드 + 데이터소스 UI
  │         ↓ Alice(구직자) / Bob(채용담당자) 역할 기반 전체 흐름 확인 가능
  │
Phase 3 ─── Day 2 오전 (4/13) ─── 이력서 + 채용공고 + 에스크로 + 매칭 페이지
  │         ↓ 구직자/채용담당자 핵심 기능 페이지 완성
  │
Phase 4 ─── Day 2 오후 (4/13) ─── 협상 모니터링 + 합의 확인
  │         ↓ 전체 프론트엔드 더미 데이터 기반 데모 가능
  │
Phase 5 ─── Day 3 (4/14) ─── 백엔드 API 연결 (Auth + Escrow)
  │         ↓ 실제 백엔드 연동 시작, NEAR 인증 + 에스크로 실제 API 호출
  │
Phase 6 ─── Day 3 (4/14) ─── 백엔드 API 연결 — 나머지 (이력서/데이터소스/공고/매칭)
  │         ↓ 전체 API 실제 백엔드 연결 완료
  │
Phase 7 ─── Day 4 (4/15) ─── ECDH 복호화 + 에스크로 지갑 연동
  │         ↓ E2E 암호화 협상 히스토리 + NEAR 지갑 트랜잭션 서명
  │
Phase 8 ─── Day 5-6 (4/16-17) ─── UX 폴리싱 + 데모 리허설
  │         ↓ 에러 핸들링, 로딩 상태, 반응형, 데모 리허설 완료
  │
Phase 9 ─── Day 7+ (4/18~) ─── 랜딩 페이지 + NEAR Wallet Selector 연동
            ↓ 실서비스 가입/로그인 + 지갑 팝업 연결 + 랜딩 어필
```

## Phase 의존 관계

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6 ──→ Phase 7 ──→ Phase 8
                                                    │            │            │
                                          (성훈 Phase 2:   (준하 백엔드:  (승연 백엔드:
                                           Auth API 필요)  이력서/데이터   ECDH 암호화
                                          (성훈 Phase 4:   소스/매칭 API)  협상 히스토리)
                                           Escrow API 필요)(승연 백엔드:
                                                           공고/협상/합의)
```

## 팀원 의존 일정

| 시점 | 의존 대상 | 필요 항목 | Phase |
|------|-----------|-----------|-------|
| Day 1 오전 | 성훈 Phase 1 | 공유 타입/Enum (프론트 타입과 동기화 확인) | Phase 1 |
| Day 3 | 성훈 Phase 2 | Auth API (challenge/verify), JWT | Phase 5 |
| Day 3 | 성훈 Phase 4 | Escrow API (잔액 조회, deposit 파라미터) | Phase 5 |
| Day 3 | 준하 백엔드 | 이력서 API (generate/status), 데이터소스 API, 매칭 API | Phase 6 |
| Day 3 | 승연 백엔드 | 공고 API (chat), 협상 API (sessions/rounds), 합의 API | Phase 6 |
| Day 4 | 승연 백엔드 | ECDH 암호화 협상 히스토리 API, 키 파생 파라미터 공유 | Phase 7 |

## Phase Plans (개별 문서)

| Phase | 문서 | 상태 | 예상 소요 |
|-------|------|------|-----------|
| 1 | [phase-1-setup-dummy-data.md](./phase-1-setup-dummy-data.md) | 완료 | ~1h |
| 2 | [phase-2-login-dashboard-datasource.md](./phase-2-login-dashboard-datasource.md) | 완료 | ~1.5h |
| 3 | [phase-3-resume-jobs-escrow.md](./phase-3-resume-jobs-escrow.md) | 완료 | ~1.5h |
| 4 | [phase-4-negotiation-agreement.md](./phase-4-negotiation-agreement.md) | 완료 | ~1.5h |
| 5 | [phase-5-backend-api-connection.md](./phase-5-backend-api-connection.md) | 완료 | ~1h |
| 6 | [phase-6-backend-api-remaining.md](./phase-6-backend-api-remaining.md) | 완료 | ~2h |
| 7 | [phase-7-ecdh-escrow-wallet.md](./phase-7-ecdh-escrow-wallet.md) | 완료 | ~3h |
| 8 | [phase-8-ux-polishing-demo.md](./phase-8-ux-polishing-demo.md) | 완료 | ~3h |
| 9 | [phase-9-landing-wallet-selector.md](./phase-9-landing-wallet-selector.md) | 진행 중 | ~4h |
| 10 | [phase-10-interface-alignment.md](./phase-10-interface-alignment.md) | 미시작 | ~2h |
| 11 | [phase-11-onboarding-ux.md](./phase-11-onboarding-ux.md) | 미시작 | ~3h |

## 전체 수락 기준

- [x] `npm run dev` → Next.js 개발 서버 정상 기동
- [x] Alice/Bob 로그인 → 역할별 대시보드 정상 표시
- [x] 더미 데이터 기반 전체 페이지 렌더링 정상
- [x] `NEXT_PUBLIC_USE_DUMMY=false` 시 Auth + Escrow 실제 API 호출 동작
- [x] `NEXT_PUBLIC_USE_DUMMY=false` 시 전체 API (이력서/데이터소스/공고/매칭/협상/합의) 실제 호출 동작
- [x] 모든 페이지 네비게이션 정상 (사이드바 + 헤더)
- [x] 협상 모니터링 → 합의 확인 → 온체인 기록 플로우 완성
- [x] ECDH 복호화로 암호화된 협상 히스토리 평문 표시
- [x] NEAR 지갑 팝업 통한 에스크로 deposit 트랜잭션 서명
- [x] 에러 핸들링 (toast 알림) + 로딩 상태 (Skeleton/Spinner) 전체 적용
- [x] 반응형 레이아웃 (모바일/태블릿/데스크톱) 정상 표시
- [x] 전체 E2E 데모 시나리오 1회 이상 리허설 완료
- [ ] 랜딩 페이지에서 AI Agent 가치 어필 + 가입/로그인 유도
- [ ] NEAR Wallet Selector 팝업으로 지갑 연결 (MetaMask 포함)
- [ ] 가입 시 역할 선택 → 로그인 시 역할 자동 감지
