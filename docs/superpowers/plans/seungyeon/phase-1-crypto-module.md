# Phase 1: ECDH 암호화 모듈

> 스펙 참조: seungyeon-negotiation.md §2 (Day 1 선행 작업)
> PRD 참조: Section 9, NFR-1, FR-014
> 검증 결과: **PASS**

---

## 구현 파일

| 파일 | 경로 | LOC |
|------|------|-----|
| CryptoService | `backend/src/crypto/crypto.service.ts` | ~70 |
| CryptoModule | `backend/src/crypto/crypto.module.ts` | ~10 |
| 테스트 | `backend/src/crypto/__tests__/crypto.service.spec.ts` | ~90 |

---

## 스펙 대비 구현 검증

### 1. 키 유도 흐름

| 스펙 단계 | 구현 | 라인 | 상태 |
|-----------|------|------|------|
| Ed25519 priv → Curve25519 priv | `ed25519.utils.toMontgomerySecret(secret.subarray(0, 32))` | L36 | **PASS** |
| Ed25519 pub → Curve25519 pub | `ed25519.utils.toMontgomery(theirEd25519Public)` | L38 | **PASS** |
| X25519 ECDH | `x25519.getSharedSecret(myX25519Priv, theirX25519Pub)` | L40 | **PASS** |
| HKDF-SHA256 | `hkdf(sha256, sharedSecret, salt, info, 32)` | L44 | **PASS** |
| XChaCha20-Poly1305 암호화 | `xchacha20poly1305(sessionKey, nonce)` | L52 | **PASS** |

### 2. 라이브러리

| 스펙 | 실제 사용 | 상태 |
|------|-----------|------|
| tweetnacl | `nacl` — 키페어 생성용 | **PASS** |
| @noble/hashes | `hkdf`, `sha256` — HKDF-SHA256 | **PASS** |
| @noble/ciphers | `xchacha20poly1305` — AEAD 암호화 | **PASS** |
| @noble/curves | `ed25519`, `x25519` — 키 변환 + ECDH | **PASS** (스펙에는 명시 안 됐으나 올바른 선택) |

### 3. 메서드 시그니처

| 스펙 메서드 | 구현 메서드 | 차이점 |
|------------|------------|--------|
| `deriveSessionKey(myPriv, theirPub, nonce)` | `deriveSessionKey(myEd25519Secret, theirEd25519Public, nonce)` | 이름만 다름, 동일 |
| `encrypt(sessionKey, plaintext)` | `encrypt(sessionKey, plaintext)` | 동일 |
| `decrypt(sessionKey, ciphertext)` | `decrypt(sessionKey, ciphertext)` | 동일 |

### 4. 추가 구현 (스펙에 없으나 필요한 것)

| 메서드 | 설명 | 용도 |
|--------|------|------|
| `getServerPublicKey()` | 서버 Ed25519 공개키 반환 | 클라이언트가 ECDH 수행 시 필요 |
| `deriveServerSessionKey(theirPub, nonce)` | 서버 비밀키로 세션키 유도 | 서버측 암호화/복호화에 사용 |

### 5. SERVER_KEYPAIR_SEED (서버 키 영속화)

```
환경변수 있음 → SHA256(seedHex) → nacl.sign.keyPair.fromSeed(seed) → 결정적 키페어
환경변수 없음 → nacl.sign.keyPair() → 임시 키페어 (재시작 시 소실, 경고 로그)
```

- **상태**: PASS — 프로덕션에서 키 영속성 보장됨

---

## 테스트 커버리지

| 테스트 | 검증 내용 | 상태 |
|--------|-----------|------|
| 32-byte key 출력 | deriveSessionKey 결과 크기 | **PASS** |
| ECDH 대칭성 | Alice→Bob == Bob→Alice | **PASS** |
| Nonce 민감도 | 같은 키쌍, 다른 nonce → 다른 키 | **PASS** |
| 암복호화 라운드트립 | encrypt→decrypt 원본 복원 | **PASS** |
| 랜덤 nonce 검증 | 같은 평문 2회 암호화 → 다른 암호문 | **PASS** |
| 잘못된 키 복호화 실패 | 다른 키로 복호화 시 예외 | **PASS** |
| 서버 키페어 연동 | deriveServerSessionKey 32-byte 출력 | **PASS** |

**총 7개 테스트, 전수 통과**

---

## 결론

Phase 1은 스펙을 충실히 구현했으며, 서버 키 영속화와 편의 메서드(`deriveServerSessionKey`)를 추가로 제공한다. 테스트 커버리지도 충분하다.
