# Phase 9: 랜딩 페이지 + NEAR Wallet Selector 연동 (Day 7+)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 랜딩 페이지 분리, 가입/로그인 프로세스 실서비스화, NEAR Wallet Selector 팝업을 통한 지갑 연결 방식으로 전환 (계정 ID 직접 입력 제거)
**선행:** Phase 8 (UX 폴리싱 완료)
**완료 기준:** 랜딩 → 가입(역할 선택 + 지갑 연결) → 로그인(지갑 연결만) 전체 플로우 정상 동작, MetaMask 포함 다수 지갑 지원
**예상 소요:** ~4시간
**상태:** 🔧 진행 중 (Task 9.1 완료)

---

## 배경

Phase 2에서 구현한 로그인 화면은 Alice/Bob 데모 카드 선택 방식이었음. Phase 9에서는:
1. `/` 루트를 랜딩 페이지로 교체 (AI Agent 가치 어필)
2. `/signup` 가입 페이지 신규 — 역할 선택 + 계정 생성
3. `/login` 로그인 페이지 신규 — 계정 입력으로 로그인 (역할은 가입 시 저장)
4. NEAR Wallet Selector 연동으로 계정 ID 직접 입력 없이 지갑 팝업 로그인

---

## Task 9.1: 랜딩 페이지 + 가입/로그인 분리 (완료)

**Files:**
- Modify: `frontend/src/app/page.tsx` — 랜딩 페이지로 교체
- Create: `frontend/src/app/signup/page.tsx` — 역할 선택 → 계정 생성
- Create: `frontend/src/app/login/page.tsx` — 계정 입력 로그인 폼
- Modify: `frontend/src/lib/auth.tsx` — `signup()`, `loginByAccount()` 추가
- Delete: `frontend/src/components/auth/login-selector.tsx` — 더 이상 사용 안 함
- Delete: `frontend/src/components/auth/login-selector.test.tsx`

- [x] **Step 1: 랜딩 페이지 (`/`) 구현**

`page.tsx`를 랜딩 페이지로 교체. Server Component로 빠른 초기 로드.
- Nav bar (로고 + Log In + Sign Up 버튼)
- Hero section: "AI Agents That Negotiate Your Career"
- Feature cards 3개: AI 매칭, 자율 협상, 블록체인 에스크로
- How it Works 3단계
- CTA + Footer

- [x] **Step 2: Auth 컨텍스트 확장**

`auth.tsx`에 새로운 인증 메서드 추가:
- `signup(nearAccountId, role)` — `registeredAccounts` localStorage에 계정→역할 매핑 저장 후 로그인
- `loginByAccount(nearAccountId)` — 저장된 역할 조회 후 로그인. 미가입이면 에러
- 기존 `login()`, `loginWithNear()`는 레거시 호환용 유지

- [x] **Step 3: 가입 페이지 (`/signup`) 구현**

2단계 가입 플로우:
1. 역할 선택 (Job Seeker / Employer 카드)
2. NEAR 계정 ID 입력 → Create Account

- [x] **Step 4: 로그인 페이지 (`/login`) 구현**

단순 로그인 폼:
- NEAR Account ID 입력 → Log In
- 미가입 계정 시 "Account not found. Please sign up first." 에러
- "Don't have an account? Sign up" 링크

- [x] **Step 5: 정리 및 테스트**

- `login-selector.tsx` 및 테스트 파일 삭제
- `auth.test.tsx` 환경 변수 처리 수정
- 빌드 성공 + 135개 테스트 통과 확인

---

## Task 9.2: NEAR Wallet Selector 패키지 설치 및 설정

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/lib/wallet-selector.tsx` — WalletSelector 초기화 + Context Provider

- [ ] **Step 1: 패키지 설치**

```bash
npm install @near-wallet-selector/core \
  @near-wallet-selector/modal-ui \
  @near-wallet-selector/my-near-wallet \
  @near-wallet-selector/ethereum-wallets \
  @near-wallet-selector/meteor-wallet \
  @near-wallet-selector/here-wallet
```

- [ ] **Step 2: WalletSelector Provider 구현**

```typescript
// frontend/src/lib/wallet-selector.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { setupWalletSelector, WalletSelector } from '@near-wallet-selector/core';
import { setupModal, WalletSelectorModal } from '@near-wallet-selector/modal-ui';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupEthereumWallets } from '@near-wallet-selector/ethereum-wallets';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { setupHereWallet } from '@near-wallet-selector/here-wallet';

interface WalletContextType {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  signedAccountId: string | null;
}

const WalletContext = createContext<WalletContextType>({
  selector: null,
  modal: null,
  signedAccountId: null,
});

export function WalletSelectorProvider({ children }: { children: React.ReactNode }) {
  // selector 초기화, modal 설정, signedIn 상태 추적
  // ...
}

export function useWallet() {
  return useContext(WalletContext);
}
```

- [ ] **Step 3: layout.tsx에 WalletSelectorProvider 추가**

`AuthProvider` 바깥에 `WalletSelectorProvider`로 감싸기.

---

## Task 9.3: 가입 플로우에 Wallet Selector 연동

**Files:**
- Modify: `frontend/src/app/signup/page.tsx`
- Modify: `frontend/src/lib/auth.tsx`

- [ ] **Step 1: 가입 페이지 UI 변경**

현재: 역할 선택 → NEAR 계정 ID 텍스트 입력
변경: 역할 선택 → "Connect Wallet" 버튼 → Wallet Selector 모달 팝업 → 지갑 연결 → 자동 가입

```
[역할 선택] → [Connect Wallet 버튼] → 팝업에서 지갑 선택 → 연결 완료 → 대시보드 이동
```

- [ ] **Step 2: auth.tsx의 signup() 수정**

Wallet Selector에서 받은 `signedAccountId`를 사용하도록 변경. 텍스트 입력 제거.

---

## Task 9.4: 로그인 플로우에 Wallet Selector 연동

**Files:**
- Modify: `frontend/src/app/login/page.tsx`
- Modify: `frontend/src/lib/auth.tsx`

- [ ] **Step 1: 로그인 페이지 UI 변경**

현재: NEAR 계정 ID 텍스트 입력 → Log In
변경: "Connect Wallet" 버튼 하나 → Wallet Selector 모달 → 지갑 연결 → 저장된 역할 조회 → 대시보드 이동

- [ ] **Step 2: NEP-413 서명 연동**

Wallet Selector의 `signMessage()` (NEP-413) 사용하여 백엔드 challenge/verify 플로우 연결:
1. 백엔드에서 nonce 요청
2. Wallet Selector로 nonce 서명
3. 서명 + 공개키를 백엔드에 전송
4. JWT 수신 → 로그인 완료

---

## Task 9.5: 더미 모드 폴백 처리

**Files:**
- Modify: `frontend/src/lib/wallet-selector.tsx`
- Modify: `frontend/src/app/signup/page.tsx`
- Modify: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: USE_DUMMY 모드 분기**

`NEXT_PUBLIC_USE_DUMMY=true`일 때는 Wallet Selector 모달 대신 테스트 계정 입력 폼 표시.
실제 모드일 때만 Wallet Selector 팝업 사용.

- [ ] **Step 2: 기존 테스트 호환성 유지**

더미 모드에서 기존 테스트 플로우 (계정 ID 입력 → 로그인) 그대로 동작하도록 보장.

---

## Task 9.6: 테스트 + 검증

**Files:**
- Create 또는 Modify: 관련 테스트 파일

- [ ] **Step 1: Wallet Selector 통합 테스트**

- 더미 모드: 가입 → 로그인 → 대시보드 정상 이동
- 실제 모드: Wallet Selector 모달 열림 확인
- 역할 저장/조회 정상 동작

- [ ] **Step 2: 빌드 + 기존 테스트 통과 확인**

```bash
npx next build
npx vitest run
```

---

## Phase 9 완료 기준

- [ ] `/` 랜딩 페이지 정상 렌더 (AI Agent 가치 어필)
- [ ] `/signup` 역할 선택 → Wallet Selector 팝업 → 가입 완료
- [ ] `/login` Wallet Selector 팝업 → 역할 자동 감지 → 대시보드 이동
- [ ] MetaMask 등 EVM 지갑으로도 연결 가능
- [ ] 더미 모드에서 기존 테스트 계정 입력 방식 유지
- [ ] NEP-413 서명을 통한 백엔드 인증 연동
- [ ] 로그아웃 → `/` 랜딩으로 복귀
- [ ] 모바일 반응형 정상
- [ ] 빌드 성공 + 기존 테스트 전부 통과

## 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `frontend/src/app/page.tsx` | Modify — 랜딩 페이지로 교체 |
| `frontend/src/app/signup/page.tsx` | Create — 역할 선택 + 지갑 연결 가입 |
| `frontend/src/app/login/page.tsx` | Create → Modify — 지갑 연결 로그인 |
| `frontend/src/lib/auth.tsx` | Modify — signup/loginByAccount 추가 |
| `frontend/src/lib/wallet-selector.tsx` | Create — Wallet Selector Provider |
| `frontend/src/app/layout.tsx` | Modify — WalletSelectorProvider 추가 |
| `frontend/src/components/auth/login-selector.tsx` | Delete |
| `frontend/src/components/auth/login-selector.test.tsx` | Delete |

## 팀 의존 사항

| 대상 | 내용 | 필요 시점 |
|------|------|-----------|
| 성훈 | Auth API `/auth/near/verify`에서 실제 Ed25519 서명 검증 활성화 필요 | Task 9.4 |
| 성훈 | Wallet Selector가 보내는 publicKey 형식이 백엔드와 호환되는지 확인 | Task 9.4 |

## 참고 자료

- [NEAR Wallet Selector Docs](https://docs.near.org/tools/wallet-selector)
- [Wallet Selector GitHub](https://github.com/near/wallet-selector)
- [@near-wallet-selector/core (npm)](https://www.npmjs.com/package/@near-wallet-selector/core)
- [Ethereum Wallets Support](https://docs.near.org/blog/hello-ethereum-wallets)
