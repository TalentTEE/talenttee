# Pitch Feedback Implementation Plan

> Date: 2026-04-21
> Source: Judge feedback from 9_original.txt (English pitch session)
> Branch: jhj-front

---

## Phase Summary

| Phase | Title | Priority | Effort | Dependencies |
|-------|-------|----------|--------|--------------|
| F-1 | Candidate Boundary UX 강화 | Critical | Low | None |
| F-2 | PDF Resume Upload | High | Medium | None |
| F-3 | On-chain Verification UI | High | Medium | Phase 7 (ECDH) |
| F-4 | TEE Attestation Proof | Medium | High | F-3, NEAR AI |
| F-5 | Salary Data Flywheel | Medium | High | Phase 9 (Negotiation) |

---

## Judge's Core Message

1. **"Novel, creative idea"** — 컨셉 자체는 높은 평가
2. **Escrow = Ghost Job 검증** — 이미 구현됨, 피치에서 더 강조만 하면 됨
3. **TEE 증명 필요** — 대기업/정부 고객은 "플랫폼이 데이터를 못 본다"는 증명 없으면 안 씀
4. **PDF 이력서** — GitHub 없는 사용자 대응 필수
5. **Human-in-the-loop** — AI 협상 결과는 "제안"이지 "계약"이 아님을 명확히

---

## Implementation Order

```
F-1 (Boundary UX) ──┐
                     ├──→ F-3 (On-chain Verify) ──→ F-4 (TEE Attestation)
F-2 (PDF Upload)  ──┘
                          F-5 (Salary Flywheel) — independent, can parallel
```

F-1, F-2는 독립적으로 병렬 진행 가능. F-3는 기존 ECDH 인프라 위에 구축. F-4는 F-3 완료 후.
