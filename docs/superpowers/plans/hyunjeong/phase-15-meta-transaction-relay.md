# Phase 15 — Meta-Transaction (NEP-366) 가스비 대납 릴레이

**목적:** Web3Auth 소셜 로그인 유저(implicit account, 잔액 0 NEAR)가 온체인 트랜잭션을 보낼 수 있도록 서버가 가스비를 대납하는 릴레이 구현
**우선순위:** 보류 — 아래 미결정 사항 해결 필요
**예상 기간:** 1-2일 (코드는 이미 작성됨, 테스트 + 펀딩만 남음)

---

## 배경

### 현재 문제
- Web3Auth로 소셜 로그인하면 새 implicit account 생성 (잔액 0 NEAR)
- NEAR 블록체인에서 트랜잭션을 보내려면 가스비(수수료)가 필요
- 잔액 0이면 가스비를 못 내서 온체인 트랜잭션 불가

### NEP-366 Meta-Transaction 해결 방식
```
유저 (잔액 0 NEAR)          서버 (relayer, 잔액 5+ NEAR)
─────────────────           ──────────────────────────
트랜잭션 내용에 서명만    →  서명 확인 후 대신 제출 + 가스비 납부
```

---

## ⚠️ 미결정 사항 — 이 Phase를 진행하기 전에 결정 필요

### 핵심 질문: 현재 구조에서 가스비 대납이 정말 필요한가?

현재 온체인 트랜잭션 목록:
1. **에스크로 충전** (기업) — `deposit()` + NEAR 첨부 → **어차피 NEAR가 있어야 함**
2. **Agent key 등록** (기업) — `addKey` → 가스비만 필요, NEAR 첨부 없음
3. **이력서 열람비 지불** — 서버가 agent key로 직접 실행 → **relay 필요 없음**

**문제점:**
- 에스크로 충전은 NEAR를 보내는 거라, 유저가 이미 NEAR를 가지고 있어야 함
- NEAR가 있으면 가스비도 낼 수 있음
- 가스비 대납이 실제로 필요한 건 agent key 등록뿐인데, 이것도 에스크로 충전 이후에 하므로 이미 계정에 잔액이 있는 상태

### 결정해야 할 것들

1. **Web3Auth 유저가 NEAR를 어떻게 확보하는가?**
   - 플랫폼이 초기 NEAR를 에어드롭?
   - 유저가 직접 거래소에서 구매?
   - 신용카드 → NEAR 온램프 (Transak, MoonPay 등)?
   - 이 문제가 해결되면 가스비 대납도 자동으로 해결될 수 있음

2. **가스비 대납 없이 진행 가능한가?**
   - Wallet Selector 유저 (MyNearWallet 등): 이미 NEAR 있음 → 문제 없음
   - Web3Auth 유저: NEAR 확보 방법이 먼저 결정되어야 함

3. **만약 가스비 대납을 한다면, 비용은 누가 부담?**
   - 건당 ~0.0001 NEAR로 매우 적지만, 대규모 사용 시 누적됨
   - 플랫폼 운영비로 처리? 유저 수수료에 포함?

---

## 구현 현황 (코드 작성 완료)

### 새 파일
| 파일 | 설명 |
|------|------|
| `backend/src/relay/relay.module.ts` | NestJS 모듈 |
| `backend/src/relay/relay.service.ts` | 핵심: prepare, submit, fund, rate-limit, action 검증 |
| `backend/src/relay/relay.controller.ts` | `POST /relay/prepare`, `POST /relay/submit` (JWT 인증) |

### 수정 파일
| 파일 | 변경사항 |
|------|----------|
| `backend/src/app.module.ts` | `RelayModule` import 추가 |
| `backend/src/auth/auth.module.ts` | `RelayModule` import 추가 |
| `backend/src/auth/auth.controller.ts` | 회원가입 시 implicit account 자동 펀딩 (0.01 NEAR) |
| `frontend/src/lib/api.ts` | `relayPrepare()`, `relaySubmit()`, `ActionDescriptor` 타입 |
| `frontend/src/lib/wallet-adapter.tsx` | Web3Auth 경로를 relay 프로토콜로 교체 |

### 동작 흐름
```
프론트 (Web3Auth 유저)            백엔드 (Relayer)
──────────────────────            ─────────────────
1. POST /relay/prepare    →      2. DelegateAction 생성 + Borsh 인코딩
3. SHA-256(bytes) + ed25519 서명
4. POST /relay/submit     →      5. SignedDelegate 재구성
                                 6. relayerAccount.relayMetaTransaction()
                                 7. { txHash } 반환
```

### 보안
- JWT 인증 필수
- Action whitelist: 에스크로 컨트랭트 FunctionCall + 본인 계정 AddKey만 허용
- Rate limit: 유저당 5분에 10건

### 빌드 상태
- `tsc --noEmit` + `nest build` 클린 통과
- 실제 테스트 미완료 (relayer 계정 펀딩 필요)

---

## 테스트 절차 (미결정 사항 해결 후)

1. 백엔드 시작 → 로그에서 `Relayer account: <hex-id>` 확인
2. 릴레이어 펀딩: `near send company-alpha.testnet <hex-id> 5 --networkId testnet`
3. Web3Auth 회원가입 → implicit account 자동 펀딩 확인
4. 에스크로 deposit (Web3Auth 유저) → relay 경유 성공 확인
5. Agent key 등록 → relay 경유 성공 확인
6. Wallet Selector 유저 → 기존 직접 서명 경로 정상 동작 확인
