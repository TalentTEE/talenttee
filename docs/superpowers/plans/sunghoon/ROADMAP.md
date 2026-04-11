# Sunghoon Foundation — Roadmap

**담당:** 성훈 (기반 인프라, 인증, 스마트컨트랙트)
**마감:** 2026-04-17
**스펙:** [`specs/team/sunghoon-foundation.md`](../specs/team/sunghoon-foundation.md)

---

## Architecture

NestJS 11 + TypeORM 0.3 + PostgreSQL 16(pgvector) + Redis 7.
Auth는 NEP-413 Ed25519 서명 검증 → JWT. 스마트컨트랙트는 near-sdk-rs (Rust) → NEAR Testnet.

## Phase Overview

```
Phase 1 ─── Day 1 오전 (4/12) ─── 인프라 + DB 스키마 + 공유 타입
  │         ↓ 팀원 언블록: 준하, 승연, 현정이 엔티티/타입 사용 가능
  │
Phase 2 ─── Day 1 오후 (4/12) ─── NEAR Auth (NEP-413 + JWT)     ┐
  │         ↓ 현정 Auth 연동 가능, JwtGuard 사용 가능             │ 병렬 가능
Phase 3 ─── Day 1 오후 ~ Day 2 오전 (4/12-13) ─── Smart Contracts ┘
  │         ↓ 승연 컨트랙트 ABI 참조 가능
  │
Phase 4 ─── Day 2 오후 (4/13) ─── Escrow API + 백엔드 통합
  │         ↓ 현정 Escrow UI 연결 가능
  │
Phase 5 ─── Day 3-4 (4/14-15) ─── 프론트 연결 지원 + E2E
Phase 6 ─── Day 4-5 (4/15-16) ─── 온체인 검증 + 고도화
Phase 7 ─── Day 6 (4/17) ─── 최종 리허설 + 제출
```

## Phase 의존 관계

```
Phase 1 ──→ Phase 2 ──→ Phase 4
   │                        │
   └──→ Phase 3 ────────────┘──→ Phase 5 ──→ Phase 6 ──→ Phase 7
```

## 팀원 제공 일정

| 시점 | 제공 대상 | 제공 항목 | Phase |
|------|-----------|-----------|-------|
| Day 1 오전 | 준하, 승연, 현정 | DB 스키마, TypeORM 엔티티, 공유 타입/Enum | Phase 1 |
| Day 1 오후 | 현정 | Auth API (challenge/verify), JWT, JwtGuard | Phase 2 |
| Day 2 | 승연 | 스마트컨트랙트 ABI (Agreement + Escrow) | Phase 3 |
| Day 2 오후 | 현정 | Escrow API (잔액 조회, deposit 파라미터) | Phase 4 |

## Phase Plans (개별 문서)

| Phase | 문서 | 상태 | 예상 소요 |
|-------|------|------|-----------|
| 1 | [phase-1-infra-db-types.md](./phase-1-infra-db-types.md) | 상세 계획 완료 | ~1h |
| 2 | [phase-2-near-auth.md](./phase-2-near-auth.md) | 상세 계획 완료 | ~40m |
| 3 | [phase-3-smart-contracts.md](./phase-3-smart-contracts.md) | 상세 계획 완료 | ~40m |
| 4 | [phase-4-escrow-api.md](./phase-4-escrow-api.md) | 상세 계획 완료 | ~30m |
| 5 | phase-5-frontend-e2e.md | Phase 4 완료 후 확정 | TBD |
| 6 | phase-6-onchain-verification.md | Phase 5 완료 후 확정 | TBD |
| 7 | phase-7-rehearsal.md | Phase 6 완료 후 확정 | TBD |

## 전체 수락 기준 (스펙 Section 6)

- [ ] `docker-compose up` → PostgreSQL + pgvector + Redis 정상 기동
- [ ] 마이그레이션 실행 → 10개 테이블 생성, pgvector 확장 활성화
- [ ] `POST /auth/near/verify` → 유효한 서명 시 JWT 반환
- [ ] Agreement Contract — Testnet 배포, `record_agreement` + `get_agreement` 동작
- [ ] Escrow Contract — Testnet 배포, `deposit` + `pay_for_profile` + `get_balance` 동작
- [ ] Function Call Key로 `pay_for_profile` 호출 가능 (지갑 팝업 없이)
