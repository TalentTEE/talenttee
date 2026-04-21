# Phase F-4: TEE Attestation Proof

> Priority: Medium | Effort: High | Duration: 1-2 weeks

## Judge Feedback

> "How do you prove that it's running inside of TEE? Do you have any sort of attestation?"
> "What's very exciting about TEEs is you have the ability to say, hey, your data is running inside of TEE. Here is proof."
> "It's a nice to have, but I do think it's important long-term."

## Goal

AI 추론이 TEE 환경에서 실행되었음을 암호학적으로 증명하는 attestation 시스템 구축.

---

## Background

현재 TalentTEE의 "TEE"는 브랜딩 (Talent + TEE = Trust Execution). 실제 구현은:
- ECDH 키 교환 + XChaCha20-Poly1305 암호화 (소프트웨어)
- NEAR AI Cloud에서 추론 실행

Judge가 요구하는 것은 **hardware TEE attestation** — Intel SGX, ARM TrustZone, 또는 NEAR의 Confidential Computing.

---

## Tasks

### 1. Research: NEAR Confidential Computing

- NEAR AI의 TEE 지원 현황 조사
- Intel SGX/TDX attestation flow 확인
- AWS Nitro Enclaves 대안 검토
- 비용 + 성능 트레이드오프 분석

### 2. Attestation Flow Design

```
[User Request] → [TEE Enclave] → [AI Inference] → [Attestation Report]
                       ↓
              [Signed Quote + Measurement]
                       ↓
              [On-chain Record (NEAR)]
                       ↓
              [User Verifies via UI]
```

- Enclave measurement (MRENCLAVE) 해시
- Quote 서명 (Intel IAS 또는 DCAP)
- NEAR에 attestation hash 기록
- 사용자 UI에서 검증

### 3. Attestation Badge UI (F-3 확장)

- F-3의 VerifyModal에 "TEE Attestation" 탭 추가
- 표시 정보:
  - Enclave ID
  - Measurement hash
  - Attestation timestamp
  - Verification status (Valid/Invalid/Pending)
  - 검증 도구 링크

### 4. Fallback: Software Attestation (MVP)

하드웨어 TEE 없이도 "증명 가능한 보안"을 보여줄 수 있는 중간 단계:
- NEAR AI inference log hash → on-chain 기록
- Server의 public key로 서명된 inference result
- "이 결과는 서버 X에서 Y 시점에 생성되었으며, 원본 데이터는 폐기됨" 증명서
- Open-source 코드 + 감사 보고서 링크

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `backend/src/tee/attestation.service.ts` | **NEW** — Attestation 생성 |
| `backend/src/tee/attestation.controller.ts` | **NEW** — 검증 API |
| `frontend/src/components/negotiation/AttestationTab.tsx` | **NEW** — UI |
| `contract/attestation/` | **NEW** — On-chain attestation 저장 컨트랙트 (선택) |

---

## Phased Approach

| Stage | Scope | Timeline |
|-------|-------|----------|
| MVP | Software attestation (서명 + hash) | 1주 |
| V1 | NEAR AI TEE integration (있다면) | 2-4주 |
| V2 | Full hardware attestation + audit | 2-3개월 |

---

## Success Criteria

- [ ] (MVP) 각 AI inference에 서명된 attestation report 생성
- [ ] (MVP) On-chain에 attestation hash 기록
- [ ] (MVP) UI에서 "이 결과는 검증되었습니다" 배지 + 상세 정보
- [ ] (V1) 하드웨어 TEE에서 실행 증명 가능
- [ ] 피치에서 "우리는 증명 가능한 프라이버시를 제공합니다" 시연
