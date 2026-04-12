# Phase 5: 백엔드 API 연결 — Auth + Escrow (Day 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 실제 백엔드 Auth API (challenge/verify) 연동, NEAR 인증 흐름 구현, Escrow API (잔액 조회/예치) 실제 호출, yocto-NEAR 변환 유틸
**선행:** Phase 4 (전체 프론트엔드 더미 플로우 완성), 성훈 Phase 2 (Auth API), 성훈 Phase 4 (Escrow API)
**완료 기준:** `NEXT_PUBLIC_USE_DUMMY=false` 시 Auth + Escrow 실제 백엔드 호출 동작
**예상 소요:** ~1시간

---

## Task 5.1: near-api-js 의존성 추가

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: near-api-js 설치**

Run:
```bash
cd frontend && npm install near-api-js
```

Expected: `"near-api-js": "^7.2.0"` 의존성 추가

- [ ] **Step 2: 빌드 확인**

Run: `cd frontend && npm run build`
Expected: 에러 없이 빌드 완료

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add near-api-js dependency for NEAR Protocol integration"
```

---

## Task 5.2: Auth API 함수 추가 (api.ts)

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: requestChallenge() + verifyNearAuth() 함수 추가**

기존 더미 Auth 함수 아래에 실제 백엔드 호출 함수를 추가한다.

```typescript
// frontend/src/lib/api.ts — Auth (Real API) 섹션 추가

export async function requestChallenge(): Promise<{ nonce: string; expiresAt: string }> {
  return apiFetch('/auth/near/challenge', { method: 'POST' });
}

export async function verifyNearAuth(params: {
  nearAccountId: string;
  publicKey: string;
  signature: string;
  nonce: string;
  role: string;
}): Promise<{ jwt: string; user: User }> {
  return apiFetch('/auth/near/verify', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
```

**동작 흐름:**
1. `requestChallenge()` → 백엔드 `POST /auth/near/challenge` → `{ nonce, expiresAt }` 반환
2. 프론트에서 nonce를 서명 (PoC에서는 placeholder 사용)
3. `verifyNearAuth()` → 백엔드 `POST /auth/near/verify` → `{ jwt, user }` 반환
4. JWT를 localStorage에 저장하여 이후 API 호출에 사용

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add requestChallenge and verifyNearAuth API functions"
```

---

## Task 5.3: Auth 컨텍스트에 loginWithNear() 구현 (auth.tsx)

**Files:**
- Modify: `frontend/src/lib/auth.tsx`

- [ ] **Step 1: loginWithNear() 함수 구현**

Phase 1에서 비워둔 `loginWithNear()`를 실제 challenge -> verify -> JWT 흐름으로 구현한다.

```typescript
// frontend/src/lib/auth.tsx — loginWithNear 구현

const loginWithNear = async (nearAccountId: string, role: UserRole) => {
  // 1. 백엔드에서 challenge nonce 요청
  const { nonce } = await requestChallenge();

  // 2. PoC: 백엔드가 실제 서명 검증을 하지 않으므로 placeholder 사용
  const signature = 'poc-signature-placeholder';
  const publicKey = 'ed25519:placeholder';

  // 3. 백엔드에 verify 요청 → JWT + User 반환
  const { jwt, user: apiUser } = await verifyNearAuth({
    nearAccountId,
    publicKey,
    signature,
    nonce,
    role,
  });

  // 4. localStorage에 저장 + 상태 업데이트
  const userData: User = {
    id: apiUser.id,
    nearAccountId: apiUser.nearAccountId,
    role: apiUser.role as UserRole,
    publicKey: apiUser.publicKey,
    createdAt: apiUser.createdAt,
  };
  localStorage.setItem('user', JSON.stringify(userData));
  localStorage.setItem('jwt', jwt);
  setUser(userData);
};
```

- [ ] **Step 2: import 추가**

```typescript
import { getDummyUser, requestChallenge, verifyNearAuth } from './api';
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/auth.tsx
git commit -m "feat: implement loginWithNear with challenge-verify-JWT flow"
```

---

## Task 5.4: 로그인 UI에 USE_DUMMY 분기 + 커스텀 계정 입력 (login-selector.tsx)

**Files:**
- Modify: `frontend/src/components/auth/login-selector.tsx`

- [ ] **Step 1: handleLogin에 USE_DUMMY 분기 적용**

```typescript
const handleLogin = async (role: 'SEEKER' | 'EMPLOYER') => {
  setIsLoggingIn(true);
  setError(null);
  try {
    if (USE_DUMMY) {
      await login(role);           // 더미 로그인
    } else {
      const nearAccountId = role === 'SEEKER' ? 'alice.testnet' : 'bob.testnet';
      await loginWithNear(nearAccountId, role);  // 실제 NEAR 인증
    }
    router.push(role === 'SEEKER' ? '/dashboard/seeker' : '/dashboard/employer');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Login failed');
  } finally {
    setIsLoggingIn(false);
  }
};
```

- [ ] **Step 2: 커스텀 NEAR 계정 입력 UI (USE_DUMMY가 false일 때만)**

```typescript
{!USE_DUMMY && (
  <div className="mt-10 w-full max-w-5xl">
    <div className="rounded-2xl border border-border/10 bg-card p-8">
      <h3 className="font-bold text-lg mb-4">Custom NEAR Account</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={customAccount}
          onChange={(e) => setCustomAccount(e.target.value)}
          placeholder="your-account.testnet"
          className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm"
        />
        <select
          value={customRole}
          onChange={(e) => setCustomRole(e.target.value as UserRole)}
          className="bg-muted rounded-xl px-4 py-3 text-sm"
        >
          <option value="SEEKER">Seeker</option>
          <option value="EMPLOYER">Employer</option>
        </select>
        <button
          onClick={handleCustomLogin}
          disabled={!customAccount.trim() || isLoggingIn}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground"
        >
          Login
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 3: 에러/로딩 상태 처리**

```typescript
{/* Error Message */}
{error && (
  <div className="mt-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
    {error}
  </div>
)}

{/* Loading Overlay */}
{isLoggingIn && (
  <div className="mt-6 flex items-center gap-2 text-muted-foreground">
    <span className="material-symbols-outlined animate-spin">progress_activity</span>
    <span className="text-sm">Authenticating...</span>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/auth/login-selector.tsx
git commit -m "feat: add USE_DUMMY branch and custom NEAR account login to login selector"
```

---

## Task 5.5: Escrow API 실제 연동

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/escrow/page.tsx`
- Modify: `frontend/src/app/dashboard/employer/page.tsx`

- [ ] **Step 1: yoctoToNear() 변환 유틸 추가**

```typescript
// frontend/src/lib/api.ts — Escrow 섹션

function yoctoToNear(yocto: string): number {
  const YOCTO_PER_NEAR = 1e24;
  return Number(BigInt(yocto || '0')) / YOCTO_PER_NEAR;
}
```

- [ ] **Step 2: getEscrowBalance() 파라미터 추가 + 실제 API 분기**

```typescript
export async function getEscrowBalance(accountId?: string): Promise<EscrowAccount> {
  if (USE_DUMMY) return DUMMY_ESCROW;
  const data = await apiFetch<{ balance: string }>(`/escrow/balance?accountId=${accountId}`);
  return {
    employerId: accountId || '',
    balance: yoctoToNear(data.balance),
    agentKeySet: false,
  };
}
```

- [ ] **Step 3: depositToEscrow() 함수 추가**

```typescript
export async function depositToEscrow(amount: string): Promise<{
  contractId: string; methodName: string; args: object; deposit: string;
}> {
  return apiFetch('/escrow/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}
```

- [ ] **Step 4: escrow/page.tsx에서 실제 API 호출 적용**

```typescript
// frontend/src/app/escrow/page.tsx — handleDeposit 수정

const handleDeposit = async () => {
  const amount = parseFloat(depositAmount);
  if (isNaN(amount) || amount <= 0) return;

  if (USE_DUMMY) {
    alert(`Deposit of ${amount} NEAR initiated (mock).`);
  } else {
    // yocto 단위로 변환하여 백엔드에 전달
    const nearAmount = (amount * 1e24).toLocaleString('fullwide', { useGrouping: false });
    const txParams = await depositToEscrow(nearAmount);
    alert(`Transaction prepared:\nContract: ${txParams.contractId}\nMethod: ${txParams.methodName}\nDeposit: ${amount} NEAR`);
  }
};
```

- [ ] **Step 5: employer 대시보드에서 getEscrowBalance(user.nearAccountId) 호출**

```typescript
// frontend/src/app/dashboard/employer/page.tsx

useEffect(() => {
  if (!user) return;
  getEscrowBalance(user.nearAccountId).then(setEscrow);  // accountId 파라미터 전달
  getJobs().then(setJobs);
  getEmployerMatches('job-1').then(setMatches);
  getNegotiationSessions().then(setSessions);
}, [user]);
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/escrow/page.tsx frontend/src/app/dashboard/employer/page.tsx
git commit -m "feat: integrate real Escrow API with yoctoToNear conversion and deposit flow"
```

---

## Phase 5 완료 기준

- [ ] `near-api-js` 의존성 설치 완료 (`package.json` 확인)
- [ ] `NEXT_PUBLIC_USE_DUMMY=false` + 백엔드 기동 시 Auth 동작:
  - `requestChallenge()` → nonce 반환
  - `verifyNearAuth()` → JWT + User 반환
  - JWT가 localStorage에 저장되어 후속 API 호출에 사용
- [ ] `NEXT_PUBLIC_USE_DUMMY=false` 시 Escrow 동작:
  - `getEscrowBalance(accountId)` → 실제 잔액 반환 (yocto -> NEAR 변환)
  - `depositToEscrow(amount)` → 트랜잭션 파라미터 반환
- [ ] 커스텀 NEAR 계정 입력 → 로그인 → 대시보드 진입 동작
- [ ] 에러 발생 시 에러 메시지 표시 (Auth 실패, API 호출 실패 등)
- [ ] `NEXT_PUBLIC_USE_DUMMY=true` 시 기존 더미 동작 정상 유지 (회귀 없음)

## 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `frontend/package.json` | Modify (near-api-js 추가) |
| `frontend/src/lib/api.ts` | Modify (requestChallenge, verifyNearAuth, yoctoToNear, depositToEscrow 추가) |
| `frontend/src/lib/auth.tsx` | Modify (loginWithNear 구현) |
| `frontend/src/components/auth/login-selector.tsx` | Modify (USE_DUMMY 분기, 커스텀 계정, 에러/로딩) |
| `frontend/src/app/escrow/page.tsx` | Modify (실제 API 호출) |
| `frontend/src/app/dashboard/employer/page.tsx` | Modify (getEscrowBalance에 accountId 전달) |
