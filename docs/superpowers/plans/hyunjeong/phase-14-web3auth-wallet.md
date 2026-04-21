# Phase 14 — Web3Auth 소셜 로그인 지갑 연동

**목적:** NEAR Wallet Selector(확장 프로그램 필수)를 Web3Auth(소셜 로그인)로 교체하여 Web2 수준의 온보딩 UX 확보
**우선순위:** 상용화 필수
**예상 기간:** 3-5일

---

## 배경

### 현재 문제
- `@near-wallet-selector` + MyNearWallet/Meteor/HERE 사용 중
- 모든 지갑이 **확장 프로그램 또는 외부 앱 필수** → 비크립토 유저 이탈률 80%+
- 타겟 유저(구직자·HR)는 크립토 네이티브가 아님

### Web3Auth 도입 효과
```
[현재] 유저 → 지갑 확장 설치 → 시드구문 백업 → 계정 생성 → 연결
[이후] 유저 → Google/카카오/이메일 로그인 → 끝 (NEAR 키 자동 생성)
```

- MetaMask / NEAR 지갑 앱 불필요
- 시드구문 없음
- NEAR 체인·에스크로 컨트랙트 전부 그대로 유지

---

## 기술 스택

| 패키지 | 용도 |
|--------|------|
| `@web3auth/modal` | 소셜 로그인 모달 UI |
| `@web3auth/base` | 코어 SDK |
| `@web3auth/openlogin-adapter` | Google/카카오/이메일 로그인 어댑터 |
| `near-api-js` | 기존 유지 — Web3Auth에서 받은 키로 NEAR 트랜잭션 서명 |

---

## Tasks

### Step 1: Web3Auth SDK 설치 및 초기화

- `npm install @web3auth/modal @web3auth/base @web3auth/openlogin-adapter`
- Web3Auth Dashboard에서 프로젝트 생성 → Client ID 발급
- 환경변수: `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID`

**파일:**
| File | Change |
|------|--------|
| `frontend/package.json` | Web3Auth 패키지 추가 |
| `frontend/.env.local` | `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` 추가 |

---

### Step 2: Web3Auth Provider 생성

- `Web3AuthProvider` 컨텍스트 생성
- 초기화 시 NEAR 네트워크 설정 (testnet → mainnet 전환 가능)
- 로그인 성공 시 NEAR `KeyPair` 추출
- 기존 `useAuth()` 훅과 통합

**핵심 플로우:**
```
Web3Auth.login()
  → Google/카카오 OAuth
  → Web3Auth MPC로 개인키 분산 저장
  → ed25519 KeyPair 반환
  → NEAR Account 생성/연결
  → JWT 발급 (기존 백엔드 auth 유지)
```

**파일:**
| File | Change |
|------|--------|
| `frontend/src/lib/web3auth.ts` | Web3Auth 초기화 + NEAR 키 추출 유틸 |
| `frontend/src/lib/auth.tsx` | `useAuth()` 훅에 Web3Auth 로그인 옵션 추가 |

---

### Step 3: 로그인 페이지 UI 교체

- 기존 Wallet Selector 모달 → Web3Auth 소셜 로그인 버튼으로 교체
- 로그인 옵션: Google / 카카오 / 이메일
- 기존 NEAR 지갑 로그인도 "Advanced" 옵션으로 유지 (크립토 유저용)

**파일:**
| File | Change |
|------|--------|
| `frontend/src/app/login/page.tsx` | 소셜 로그인 버튼 UI |
| `frontend/src/app/signup/page.tsx` | 회원가입 플로우 통합 |

---

### Step 4: 기존 Wallet Selector 의존성 정리

- `@near-wallet-selector/*` 패키지 제거 (또는 Advanced 옵션으로 유지)
- wallet-selector 관련 코드 제거/정리
- 에스크로 deposit 플로우에서 지갑 서명 → Web3Auth 키로 서명하도록 변경

**파일:**
| File | Change |
|------|--------|
| `frontend/src/lib/near.ts` | Web3Auth 키 기반 서명으로 변경 |
| `frontend/src/app/escrow/page.tsx` | deposit 서명 플로우 변경 |
| `frontend/package.json` | wallet-selector 패키지 정리 |

---

### Step 5: NEAR 계정 자동 생성

- 소셜 로그인 최초 시 → NEAR implicit account 자동 생성
- 또는 백엔드에서 named account 생성 (`{userId}.talenttee.near`)
- Agent FunctionCall Access Key 자동 등록

**파일:**
| File | Change |
|------|--------|
| `backend/src/auth/auth.service.ts` | 소셜 로그인 시 NEAR 계정 자동 생성 로직 |
| `backend/src/escrow/escrow.service.ts` | Agent key 자동 등록 |

---

## 환경 변수

| Key | 값 | 설명 |
|-----|---|------|
| `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` | (Dashboard에서 발급) | Web3Auth 프로젝트 ID |
| `NEXT_PUBLIC_WEB3AUTH_NETWORK` | `sapphire_devnet` → `sapphire_mainnet` | Web3Auth 네트워크 |

---

## 유저 경험 변화

### 구직자 (Seeker)
1. 랜딩 → "Google로 시작하기" 클릭
2. Google 로그인 완료 → 대시보드 진입
3. 지갑·시드구문·가스비 개념 없이 서비스 이용
4. 이력서 열람비 수령도 자동 (NEAR 계정 뒤에서 동작)

### 기업 (Employer)
1. 랜딩 → "Google로 시작하기" 클릭
2. 에스크로 입금 시 → Web3Auth 키로 트랜잭션 서명 (원클릭)
3. 기존 MetaMask 팝업 없음

---

## 마이그레이션 영향도

| 영역 | 변경 필요 | 비고 |
|------|----------|------|
| 에스크로 컨트랙트 | **없음** | 그대로 유지 |
| 백엔드 API | **최소** | auth 엔드포인트에 소셜 로그인 추가 |
| NEAR AI 연동 | **없음** | 서버 사이드라 지갑 무관 |
| 프론트 지갑 코드 | **전면 교체** | wallet-selector → Web3Auth |
| 프론트 나머지 | **없음** | API 호출은 JWT 기반이라 변경 없음 |

---

## Success Criteria

- [ ] Google/카카오/이메일 소셜 로그인으로 서비스 진입 가능
- [ ] 지갑 확장 프로그램 없이 전체 플로우 동작
- [ ] 에스크로 입금·이력서 열람비 결제가 Web3Auth 키로 서명됨
- [ ] 기존 NEAR 지갑 유저도 "Advanced" 옵션으로 로그인 가능
- [ ] 시드구문 노출 없음 — Web3Auth MPC가 키 관리
