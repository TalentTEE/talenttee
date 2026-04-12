# Phase 7: 협상 히스토리 열람 (복호화)

> 스펙 참조: seungyeon-negotiation.md §3-7
> PRD 참조: FR-013
> 검증 결과: **PARTIAL**

---

## 구현 파일

| 파일 | 위치 |
|------|------|
| 라운드 조회 API | `negotiation.controller.ts` L31-34 |
| getRounds 서비스 | `negotiation.service.ts` L82-87 |

---

## 스펙 대비 구현 검증

### 스펙 요구사항

```
GET /negotiation/sessions/:id/rounds
  → 암호화된 라운드 목록 반환

POST /negotiation/sessions/:id/decrypt
  → 프론트엔드에서 사용자의 NEAR 개인키로 ECDH 공유키 복원
  → session_key 재생성 → 각 라운드 복호화
  → 복호화는 프론트엔드에서 수행 (개인키가 서버에 전달되지 않음)
```

### 구현 현황

| 요구사항 | 상태 | 설명 |
|----------|------|------|
| `GET /sessions/:id/rounds` | **PASS** | 암호화된 라운드 목록 반환 (encryptedData as bytea) |
| `POST /sessions/:id/decrypt` | **미구현** | 엔드포인트 자체가 없음 |
| 클라이언트 측 ECDH 복호화 | **미구현** | 프론트엔드 자체가 없음 |
| 서버 공개키 제공 API | **미구현** | 클라이언트가 ECDH 수행에 필요한 서버 공개키 엔드포인트 없음 |

---

## 현재 동작하는 부분

### 라운드 조회 (`GET /sessions/:id/rounds`)

```typescript
// negotiation.service.ts L82-87
async getRounds(sessionId: string): Promise<NegotiationRound[]> {
  return this.roundRepo.find({
    where: { sessionId },
    order: { round: 'ASC' },
  });
}
```

- 세션에 속한 모든 라운드를 round 번호 순으로 반환
- `encryptedData`는 bytea(Buffer)로 반환 — **암호화된 상태 그대로**
- 클라이언트가 복호화해야 읽을 수 있음

---

## 복호화 플로우 (미구현 부분)

스펙에 따르면 복호화는 **클라이언트 사이드**에서 수행:

```
1. 클라이언트가 서버 공개키를 조회 (API 필요)
2. 사용자의 NEAR 개인키로 ECDH 공유키 복원
   - Ed25519 priv → Curve25519 priv
   - 서버 Ed25519 pub → Curve25519 pub
   - X25519 ECDH → shared secret
   - HKDF-SHA256(shared secret, sessionNonce) → session_key
3. session_key로 각 라운드의 encryptedData 복호화
   - XChaCha20-Poly1305: 첫 24바이트 = nonce, 나머지 = ciphertext
4. 복호화된 JSON → 라운드별 proposal, reasoning, decision 표시
```

### 필요한 추가 구현

| 항목 | 담당 | 설명 |
|------|------|------|
| `GET /crypto/server-public-key` | 승연 (백엔드) | CryptoService.getServerPublicKey() 노출 |
| 프론트엔드 복호화 로직 | 현정 (프론트) | tweetnacl + @noble/* 클라이언트 라이브러리 |
| NEAR 지갑 개인키 접근 | 현정 (프론트) | 지갑에서 서명/키 접근 방식 확인 필요 |

---

## 결론

Phase 7의 서버측 구현(암호화된 라운드 조회)은 완료됐으나, 클라이언트 복호화 플로우가 미구현이다. 이는 스펙에서도 Phase 8(프론트 연결 + ECDH 복호화 연동, 현정과 페어)로 계획되어 있으므로, 현재 시점에서는 **예정대로 진행 중**이다.

### 승연 추가 작업 필요 사항
1. 서버 공개키를 반환하는 엔드포인트 추가
2. 현정에게 복호화 로직 가이드 제공 (키 유도 순서, 라이브러리 사용법)
