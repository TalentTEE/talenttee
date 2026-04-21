# Phase F-3: On-chain Verification UI

> Priority: High | Effort: Medium | Duration: 3-4 days

## Judge Feedback

> "I can click this, show me... checking the confidentiality, that the message has a signature address and it actually was done inside."
> "Otherwise I just have to trust you."

## Goal

협상 라운드마다 on-chain 기록을 확인할 수 있는 "Verify" 버튼 추가. 사용자가 직접 무결성을 검증할 수 있도록.

---

## Tasks

### 1. Transaction Hash 저장

- 협상 라운드 생성 시 NEAR tx hash를 DB에 저장
- `negotiation_rounds` 테이블에 `tx_hash` 컬럼 추가
- `pay_for_profile` 결제 tx도 별도 저장

### 2. Verification Badge UI

- 각 협상 메시지 옆에 shield/lock 아이콘
- 클릭 시 팝오버/모달:
  - NEAR Transaction Hash
  - 블록 번호 + 타임스탬프
  - 암호화 방식 (ECDH + XChaCha20-Poly1305)
  - "Explorer에서 확인" 링크 → NEAR Explorer
  - 서명 주소 (sender public key)

### 3. Agreement Verification Page

- 합의 완료 시 agreement hash를 NEAR에 기록
- Agreement 페이지에 "On-chain Record" 섹션:
  - Agreement hash
  - 양측 서명 (public keys)
  - 타임스탬프
  - NEAR Explorer 링크

### 4. Escrow Payment Verification

- 에스크로 입금/결제 내역에도 tx hash 표시
- Wallet 페이지에서 "View on Explorer" 링크

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `frontend/src/components/negotiation/VerifyBadge.tsx` | **NEW** — 검증 배지 |
| `frontend/src/components/negotiation/VerifyModal.tsx` | **NEW** — 검증 상세 모달 |
| `frontend/src/components/negotiation/ChatBubble.tsx` | Badge 연동 |
| `frontend/src/components/agreement/AgreementVerify.tsx` | **NEW** — 합의 검증 |
| `backend/src/negotiation/negotiation.service.ts` | tx_hash 저장 로직 |
| `backend/migration/add-tx-hash.ts` | **NEW** — DB 마이그레이션 |

---

## NEAR Explorer Links

- Testnet: `https://testnet.nearblocks.io/txns/{tx_hash}`
- Mainnet: `https://nearblocks.io/txns/{tx_hash}`

---

## Success Criteria

- [ ] 모든 협상 메시지에 verification badge 표시
- [ ] 클릭 시 tx hash + explorer 링크 확인 가능
- [ ] Agreement에 on-chain hash 기록
- [ ] 피치 데모에서 "여기 클릭하면 블록체인에서 확인됩니다" 시연 가능
