# Phase 7: ECDH 복호화 + 에스크로 지갑 연동 (Day 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** tweetnacl 기반 ECDH 클라이언트 복호화 구현 (Ed25519 -> Curve25519 -> 공유키 -> HKDF -> XChaCha20-Poly1305), near-api-js 트랜잭션 서명으로 에스크로 deposit/addKey 지갑 팝업 연동, 협상 라운드 실시간 반영 (SSE/polling)
**선행:** Phase 6 (전체 API 연결 완료), 승연 백엔드 (ECDH 암호화된 협상 히스토리 API)
**완료 기준:** 암호화된 협상 히스토리 복호화 → 평문 라운드 표시, 에스크로 deposit → NEAR 지갑 팝업 → 잔액 반영, 실시간 협상 업데이트 동작
**예상 소요:** ~3시간
**상태:** ⬜ 미구현

> **참고:** 이 Phase는 승연과 페어 프로그래밍으로 진행한다. ECDH 복호화 로직은 승연의 암호화 로직과 대칭이어야 하므로, 키 파생/암호화 파라미터를 함께 확인한다.

---

## Task 7.1: tweetnacl + 관련 의존성 설치

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: tweetnacl 및 유틸 설치**

```bash
cd frontend && npm install tweetnacl tweetnacl-util @noble/hashes
```

- `tweetnacl`: Ed25519 서명, Curve25519 DH, XSalsa20-Poly1305
- `tweetnacl-util`: base64/UTF-8 인코딩 유틸
- `@noble/hashes`: HKDF (SHA-256 기반 키 파생)

> **참고:** XChaCha20-Poly1305는 tweetnacl의 `nacl.secretbox` (XSalsa20-Poly1305)로 대체하거나, `@noble/ciphers`를 추가 설치하여 XChaCha20-Poly1305를 직접 사용할 수 있다. 승연과 합의하여 결정한다.

- [ ] **Step 2: 빌드 확인**

Run: `cd frontend && npm run build`
Expected: 에러 없이 빌드 완료

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add tweetnacl and @noble/hashes for ECDH decryption"
```

---

## Task 7.2: ECDH 복호화 유틸 모듈 구현

**Files:**
- Create: `frontend/src/lib/crypto.ts`

- [ ] **Step 1: Ed25519 → Curve25519 변환 함수**

NEAR 프로토콜은 Ed25519 키를 사용하지만, ECDH는 Curve25519에서 수행된다.
Ed25519 공개키/비밀키를 Curve25519로 변환해야 한다.

```typescript
// frontend/src/lib/crypto.ts
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8 } from 'tweetnacl-util';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Ed25519 키쌍을 Curve25519 키쌍으로 변환
 * NEAR 지갑의 Ed25519 키를 ECDH용 Curve25519 키로 변환한다.
 */
export function ed25519ToCurve25519KeyPair(ed25519SecretKey: Uint8Array): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} {
  // tweetnacl의 내부 변환 사용
  // nacl.box.keyPair.fromSecretKey는 Curve25519 비밀키를 받지만,
  // Ed25519 -> Curve25519 변환은 별도 처리가 필요
  const curveSecretKey = nacl.sign.keyPair.fromSecretKey(ed25519SecretKey)
    ? ed25519SecretKey.slice(0, 32) // Ed25519 seed (32바이트)
    : ed25519SecretKey;

  // seed로부터 Curve25519 키쌍 생성
  const curveKeyPair = nacl.box.keyPair.fromSecretKey(
    sha256(curveSecretKey) // 일관된 키 파생을 위해 해시 사용
  );

  return {
    publicKey: curveKeyPair.publicKey,
    secretKey: curveKeyPair.secretKey,
  };
}
```

> **승연과 확인 필요:** Ed25519 -> Curve25519 변환 방식은 백엔드 암호화 로직과 정확히 일치해야 한다. 변환 함수의 구체적 구현은 페어 프로그래밍 시 확정한다.

- [ ] **Step 2: ECDH 공유키 복원 + HKDF 키 파생**

```typescript
/**
 * ECDH 공유키 생성 + HKDF로 session_key 파생
 *
 * @param mySecretKey - 내 Curve25519 비밀키
 * @param theirPublicKey - 상대방 Curve25519 공개키
 * @param sessionId - 세션 ID (HKDF info 파라미터)
 * @returns 32바이트 session_key
 */
export function deriveSessionKey(
  mySecretKey: Uint8Array,
  theirPublicKey: Uint8Array,
  sessionId: string,
): Uint8Array {
  // 1. ECDH: Curve25519 DH로 공유 비밀 생성
  const sharedSecret = nacl.box.before(theirPublicKey, mySecretKey);

  // 2. HKDF: 공유 비밀에서 session_key 파생
  //    salt: 없음 (빈 바이트), info: sessionId
  const sessionKey = hkdf(sha256, sharedSecret, undefined, sessionId, 32);

  return new Uint8Array(sessionKey);
}
```

- [ ] **Step 3: XChaCha20-Poly1305 복호화 (또는 XSalsa20-Poly1305)**

```typescript
/**
 * 암호화된 메시지를 session_key로 복호화
 *
 * @param encryptedData - base64 인코딩된 암호문 (nonce + ciphertext)
 * @param sessionKey - 32바이트 session_key
 * @returns 평문 문자열
 */
export function decryptMessage(
  encryptedData: string,
  sessionKey: Uint8Array,
): string {
  const data = decodeBase64(encryptedData);

  // nonce (24바이트) + ciphertext
  const nonce = data.slice(0, nacl.secretbox.nonceLength); // 24바이트
  const ciphertext = data.slice(nacl.secretbox.nonceLength);

  const plaintext = nacl.secretbox.open(ciphertext, nonce, sessionKey);
  if (!plaintext) throw new Error('Decryption failed: invalid key or corrupted data');

  return encodeUTF8(plaintext);
}
```

- [ ] **Step 4: 전체 복호화 파이프라인 함수**

```typescript
/**
 * 전체 복호화 파이프라인:
 * Ed25519 비밀키 + 상대방 Ed25519 공개키 + sessionId → session_key → 복호화
 */
export function decryptNegotiationRound(
  myEd25519SecretKey: Uint8Array,
  theirEd25519PublicKey: Uint8Array,
  sessionId: string,
  encryptedData: string,
): string {
  const myKeys = ed25519ToCurve25519KeyPair(myEd25519SecretKey);
  const theirCurvePublic = ed25519ToCurve25519KeyPair(
    // 상대방은 공개키만 있으므로, nacl의 내부 변환 사용
    nacl.sign.keyPair.fromSeed(theirEd25519PublicKey.slice(0, 32)).secretKey
  ).publicKey;

  const sessionKey = deriveSessionKey(myKeys.secretKey, theirCurvePublic, sessionId);
  return decryptMessage(encryptedData, sessionKey);
}
```

> **참고:** 위 코드는 초안이다. Ed25519 공개키 → Curve25519 공개키 변환의 정확한 구현은 승연과 페어 프로그래밍 시 확정한다. libsodium의 `crypto_sign_ed25519_pk_to_curve25519`에 해당하는 변환이 필요할 수 있다.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/crypto.ts
git commit -m "feat: implement ECDH decryption pipeline — Ed25519→Curve25519→HKDF→decrypt"
```

---

## Task 7.3: 협상 히스토리 복호화 페이지 구현

**Files:**
- Create: `frontend/src/app/negotiation/[sessionId]/history/page.tsx`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: 암호화된 협상 히스토리 API 함수 추가**

```typescript
// frontend/src/lib/api.ts — 암호화된 히스토리 API 추가

export interface EncryptedRound {
  id: string;
  sessionId: string;
  round: number;
  actor: 'SEEKER_AGENT' | 'EMPLOYER_AGENT';
  encryptedPayload: string; // base64 인코딩된 암호문
  serverPublicKey: string;  // 서버의 Ed25519 공개키 (base64)
}

export async function getEncryptedHistory(sessionId: string): Promise<EncryptedRound[]> {
  return apiFetch(`/negotiation/sessions/${sessionId}/history`);
}
```

- [ ] **Step 2: history/page.tsx 구현 — 복호화 + 표시**

```typescript
// frontend/src/app/negotiation/[sessionId]/history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getEncryptedHistory, EncryptedRound } from '@/lib/api';
import { decryptMessage, deriveSessionKey, ed25519ToCurve25519KeyPair } from '@/lib/crypto';
import { NegotiationRound } from '@/lib/types';
import { decodeBase64 } from 'tweetnacl-util';

export default function NegotiationHistoryPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [encryptedRounds, setEncryptedRounds] = useState<EncryptedRound[]>([]);
  const [decryptedRounds, setDecryptedRounds] = useState<NegotiationRound[]>([]);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    getEncryptedHistory(sessionId).then(setEncryptedRounds);
  }, [sessionId]);

  const handleDecrypt = async () => {
    setIsDecrypting(true);
    setDecryptionError(null);
    try {
      // 사용자의 Ed25519 비밀키 (localStorage 또는 NEAR 지갑에서 획득)
      const userKeyB64 = localStorage.getItem('nearSecretKey');
      if (!userKeyB64) throw new Error('NEAR secret key not found. Please re-authenticate.');

      const userSecretKey = decodeBase64(userKeyB64);
      const myKeys = ed25519ToCurve25519KeyPair(userSecretKey);

      const decrypted = encryptedRounds.map((round) => {
        const serverPublicKey = decodeBase64(round.serverPublicKey);
        // 서버 공개키 → Curve25519 변환 (승연과 합의 필요)
        const sessionKey = deriveSessionKey(myKeys.secretKey, serverPublicKey, sessionId);
        const plaintext = decryptMessage(round.encryptedPayload, sessionKey);
        const parsed = JSON.parse(plaintext) as NegotiationRound;
        return { ...parsed, id: round.id, sessionId: round.sessionId, round: round.round, actor: round.actor };
      });

      setDecryptedRounds(decrypted);
    } catch (err) {
      setDecryptionError(err instanceof Error ? err.message : 'Decryption failed');
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 복호화 전: 안내 + 버튼 */}
      {decryptedRounds.length === 0 && (
        <div className="bg-card rounded-2xl border border-border/10 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-primary">lock</span>
          <h2 className="text-lg font-bold mt-3">Encrypted Negotiation History</h2>
          <p className="text-sm text-muted-foreground mt-2">
            This negotiation history is end-to-end encrypted.
            Click below to decrypt with your NEAR key.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {encryptedRounds.length} encrypted rounds available
          </p>
          <button
            onClick={handleDecrypt}
            disabled={isDecrypting || encryptedRounds.length === 0}
            className="mt-6 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            {isDecrypting ? 'Decrypting...' : 'Decrypt History'}
          </button>
          {decryptionError && (
            <p className="mt-3 text-sm text-red-400">{decryptionError}</p>
          )}
        </div>
      )}

      {/* 복호화 후: 라운드 목록 (기존 round-card 스타일 재사용) */}
      {decryptedRounds.map((round) => (
        <div key={round.id} className="bg-card rounded-2xl border border-border/10 p-5">
          {/* Round {round.round} — 기존 협상 모니터링과 동일 스타일 */}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 협상 모니터링 페이지에서 History 링크 추가**

```typescript
// frontend/src/app/negotiation/[sessionId]/page.tsx — History 버튼 추가

{isTerminal && (
  <Link
    href={`/negotiation/${sessionId}/history`}
    className="px-4 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-accent"
  >
    <span className="material-symbols-outlined text-sm mr-1">history</span>
    View Encrypted History
  </Link>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/crypto.ts frontend/src/app/negotiation/
git commit -m "feat: add negotiation history page with ECDH decryption"
```

---

## Task 7.4: near-api-js 트랜잭션 서명 — deposit() 지갑 팝업

**Files:**
- Create: `frontend/src/lib/near.ts`
- Modify: `frontend/src/app/escrow/page.tsx`

- [ ] **Step 1: NEAR 지갑 연결 유틸 모듈 생성**

```typescript
// frontend/src/lib/near.ts
import { connect, keyStores, WalletConnection, utils } from 'near-api-js';

const NEAR_CONFIG = {
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://testnet.mynearwallet.com',
  helperUrl: 'https://helper.testnet.near.org',
  contractId: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || 'escrow.talent-tee.testnet',
};

let walletConnection: WalletConnection | null = null;

/**
 * NEAR 지갑 연결 초기화
 */
export async function initNearWallet(): Promise<WalletConnection> {
  if (walletConnection) return walletConnection;

  const keyStore = new keyStores.BrowserLocalStorageKeyStore();
  const near = await connect({
    ...NEAR_CONFIG,
    keyStore,
  });
  walletConnection = new WalletConnection(near, 'talent-tee');
  return walletConnection;
}

/**
 * 에스크로 deposit() 트랜잭션 — 지갑 팝업으로 서명
 *
 * @param amountNear - NEAR 단위 금액 (e.g. "5.0")
 */
export async function depositViaWallet(amountNear: string): Promise<void> {
  const wallet = await initNearWallet();
  if (!wallet.isSignedIn()) {
    throw new Error('NEAR wallet not signed in');
  }

  const account = wallet.account();
  await account.functionCall({
    contractId: NEAR_CONFIG.contractId,
    methodName: 'deposit',
    args: {},
    attachedDeposit: utils.format.parseNearAmount(amountNear)!,
    gas: '30000000000000', // 30 TGas
  });
}

/**
 * addKey() — Function Call Access Key 부여
 * 에이전트가 에스크로에서 자동 결제할 수 있도록 Function Call Access Key를 추가한다.
 *
 * @param agentPublicKey - 에이전트의 공개키 (ed25519:xxx 형태)
 */
export async function addAgentKey(agentPublicKey: string): Promise<void> {
  const wallet = await initNearWallet();
  if (!wallet.isSignedIn()) {
    throw new Error('NEAR wallet not signed in');
  }

  const account = wallet.account();
  await account.functionCall({
    contractId: NEAR_CONFIG.contractId,
    methodName: 'add_key',
    args: { public_key: agentPublicKey },
    attachedDeposit: '0',
    gas: '30000000000000',
  });
}
```

- [ ] **Step 2: escrow/page.tsx에서 지갑 팝업 연동**

```typescript
// frontend/src/app/escrow/page.tsx — handleDeposit 수정

import { depositViaWallet, addAgentKey } from '@/lib/near';

const handleDeposit = async () => {
  const amount = parseFloat(depositAmount);
  if (isNaN(amount) || amount <= 0) return;

  if (USE_DUMMY) {
    alert(`Deposit of ${amount} NEAR initiated (mock).`);
    return;
  }

  try {
    setDepositing(true);
    await depositViaWallet(depositAmount);
    // 지갑 팝업 → 서명 → 트랜잭션 전송
    // 성공 후 잔액 재조회
    const updated = await getEscrowBalance(user!.nearAccountId);
    setEscrow(updated);
    setDepositAmount('');
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Deposit failed');
  } finally {
    setDepositing(false);
  }
};

// Agent Key 설정 핸들러
const handleAddAgentKey = async () => {
  try {
    setAddingKey(true);
    const agentKey = 'ed25519:AgentPublicKeyPlaceholder'; // 백엔드에서 제공
    await addAgentKey(agentKey);
    setAgentKeySet(true);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to add agent key');
  } finally {
    setAddingKey(false);
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/near.ts frontend/src/app/escrow/page.tsx
git commit -m "feat: integrate NEAR wallet deposit and addKey via near-api-js"
```

---

## Task 7.5: 잔액 조회 — RPC로 컨트랙트 상태 직접 조회

**Files:**
- Modify: `frontend/src/lib/near.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: RPC로 에스크로 컨트랙트 잔액 직접 조회**

백엔드 API 외에, 온체인 데이터를 RPC로 직접 조회하여 잔액의 정확성을 보장한다.

```typescript
// frontend/src/lib/near.ts — RPC 잔액 조회 추가

/**
 * 에스크로 컨트랙트의 잔액을 NEAR RPC로 직접 조회
 * view 함수 호출이므로 가스/서명 불필요
 */
export async function getEscrowBalanceOnChain(accountId: string): Promise<string> {
  const response = await fetch(NEAR_CONFIG.nodeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'balance-query',
      method: 'query',
      params: {
        request_type: 'call_function',
        finality: 'final',
        account_id: NEAR_CONFIG.contractId,
        method_name: 'get_balance',
        args_base64: btoa(JSON.stringify({ account_id: accountId })),
      },
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  // result.result는 바이트 배열, UTF-8 디코딩 필요
  const resultBytes = new Uint8Array(data.result.result);
  const resultStr = new TextDecoder().decode(resultBytes);
  return JSON.parse(resultStr); // yoctoNEAR 문자열
}
```

- [ ] **Step 2: api.ts에서 RPC 직접 조회 옵션 추가**

```typescript
// frontend/src/lib/api.ts — getEscrowBalance 수정

import { getEscrowBalanceOnChain } from './near';

export async function getEscrowBalance(accountId?: string): Promise<EscrowAccount> {
  if (USE_DUMMY) return DUMMY_ESCROW;

  try {
    // 1차: 백엔드 API
    const data = await apiFetch<{ balance: string }>(`/escrow/balance?accountId=${accountId}`);
    return {
      employerId: accountId || '',
      balance: yoctoToNear(data.balance),
      agentKeySet: false,
    };
  } catch {
    // 2차: RPC 직접 조회 (백엔드 장애 시 fallback)
    const yoctoBalance = await getEscrowBalanceOnChain(accountId || '');
    return {
      employerId: accountId || '',
      balance: yoctoToNear(yoctoBalance),
      agentKeySet: false,
    };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/near.ts frontend/src/lib/api.ts
git commit -m "feat: add on-chain RPC balance query as fallback for escrow"
```

---

## Task 7.6: 실시간 협상 업데이트 — SSE 또는 polling

**Files:**
- Modify: `frontend/src/app/negotiation/[sessionId]/page.tsx`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: SSE (Server-Sent Events) 연결 함수 추가**

백엔드가 SSE를 지원하면 SSE 사용, 미지원 시 polling fallback.

```typescript
// frontend/src/lib/api.ts — SSE 연결 함수 추가

export function subscribeNegotiationUpdates(
  sessionId: string,
  onRound: (round: NegotiationRound) => void,
  onStateChange: (state: string) => void,
): () => void {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
  const url = `${API_URL}/negotiation/sessions/${sessionId}/stream?token=${token}`;

  const eventSource = new EventSource(url);

  eventSource.addEventListener('round', (event) => {
    const round = JSON.parse(event.data) as NegotiationRound;
    onRound(round);
  });

  eventSource.addEventListener('state', (event) => {
    const { state } = JSON.parse(event.data);
    onStateChange(state);
  });

  eventSource.onerror = () => {
    // SSE 연결 실패 시 자동 재연결 (EventSource 기본 동작)
    console.warn('SSE connection error, will retry...');
  };

  // cleanup 함수 반환
  return () => eventSource.close();
}
```

- [ ] **Step 2: 협상 모니터링 페이지에서 SSE 적용**

```typescript
// frontend/src/app/negotiation/[sessionId]/page.tsx — SSE/polling 통합

useEffect(() => {
  if (!sessionId) return;

  // 초기 데이터 로드
  getNegotiationSession(sessionId).then(setSession);
  getNegotiationRounds(sessionId).then(setRounds);

  if (USE_DUMMY || isTerminal) return; // 더미 모드이거나 종료 상태면 실시간 불필요

  // SSE 연결 시도
  let cleanup: (() => void) | null = null;
  try {
    cleanup = subscribeNegotiationUpdates(
      sessionId,
      (newRound) => {
        setRounds(prev => {
          const exists = prev.some(r => r.id === newRound.id);
          return exists ? prev : [...prev, newRound];
        });
      },
      (newState) => {
        setSession(prev => prev ? { ...prev, state: newState as NegotiationSession['state'] } : prev);
      },
    );
  } catch {
    // SSE 미지원 시 polling fallback (Phase 6에서 구현한 5초 polling)
    console.warn('SSE not available, falling back to polling');
  }

  return () => {
    if (cleanup) cleanup();
  };
}, [sessionId, isTerminal]);
```

- [ ] **Step 3: 새 라운드 추가 시 스크롤 + 알림 효과**

```typescript
// frontend/src/app/negotiation/[sessionId]/page.tsx — 새 라운드 알림

const scrollRef = useRef<HTMLDivElement>(null);
const prevRoundCount = useRef(rounds.length);

useEffect(() => {
  if (rounds.length > prevRoundCount.current) {
    // 새 라운드 추가 → 하단으로 자동 스크롤
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    prevRoundCount.current = rounds.length;
  }
}, [rounds.length]);

// JSX 하단에:
// <div ref={scrollRef} />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/app/negotiation/[sessionId]/page.tsx
git commit -m "feat: add SSE real-time negotiation updates with polling fallback"
```

---

## Phase 7 완료 기준

- [ ] `tweetnacl`, `@noble/hashes` 의존성 설치 완료 (`package.json` 확인)
- [ ] `crypto.ts` — Ed25519→Curve25519 변환 + ECDH 공유키 + HKDF + 복호화 파이프라인 구현
- [ ] `/negotiation/{sessionId}/history` — "Decrypt History" 클릭 → 암호화된 라운드 복호화 → 평문 표시
- [ ] 복호화 실패 시 에러 메시지 표시 (키 불일치, 데이터 손상 등)
- [ ] `near.ts` — `depositViaWallet(amount)` → NEAR 지갑 팝업 → 서명 → 트랜잭션 전송
- [ ] `near.ts` — `addAgentKey(publicKey)` → Function Call Access Key 추가
- [ ] `/escrow` — Deposit 버튼 → 지갑 팝업 → 잔액 반영
- [ ] `getEscrowBalanceOnChain()` — RPC로 직접 잔액 조회 (백엔드 fallback)
- [ ] 협상 모니터링 페이지 — SSE 실시간 업데이트 동작 (또는 polling fallback)
- [ ] 새 라운드 추가 시 자동 스크롤 + UI 업데이트
- [ ] `npm run build` → 빌드 에러 없음

## 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `frontend/package.json` | Modify (tweetnacl, @noble/hashes 추가) |
| `frontend/src/lib/crypto.ts` | Create (ECDH 복호화 유틸) |
| `frontend/src/lib/near.ts` | Create (NEAR 지갑 연결 + deposit + addKey + RPC 조회) |
| `frontend/src/lib/api.ts` | Modify (getEncryptedHistory, subscribeNegotiationUpdates, RPC fallback) |
| `frontend/src/app/negotiation/[sessionId]/history/page.tsx` | Create (복호화 히스토리 페이지) |
| `frontend/src/app/negotiation/[sessionId]/page.tsx` | Modify (SSE 실시간 + 스크롤 + History 링크) |
| `frontend/src/app/escrow/page.tsx` | Modify (지갑 팝업 deposit + addAgentKey) |
