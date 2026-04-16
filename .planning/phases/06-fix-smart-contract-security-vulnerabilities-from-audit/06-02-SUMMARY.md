---
phase: 06-fix-smart-contract-security-vulnerabilities-from-audit
plan: "02"
subsystem: smart-contract
tags: [near-sdk, rust, ed25519-dalek, sha2, security, access-control, signature-verification]

# Dependency graph
requires:
  - phase: 06-fix-smart-contract-security-vulnerabilities-from-audit
    provides: audit report identifying P0/P1/P3 vulnerabilities in agreement contract
provides:
  - Access-controlled record_agreement (P0 fix)
  - On-chain Ed25519 signature verification for both parties (P1 fix)
  - SHA-256 hash integrity enforcement for agreement content (P3 fix)
  - system_agent support for trusted backend recording
  - 11 passing unit tests (4 original updated + 7 new security tests)
affects: [near-ai-agent integration, agreement verification workflows, backend agreement recording]

# Tech tracking
tech-stack:
  added: [ed25519-dalek v2, sha2 v0.10, hex v0.4]
  patterns:
    - canonical serialization format for deterministic hashing and signing
    - verify-before-store pattern (all checks pass before any state mutation)
    - owner-configurable system agent role for trusted backend callers

key-files:
  created: []
  modified:
    - contract/agreement/Cargo.toml
    - contract/agreement/src/lib.rs
    - contract/agreement/Cargo.lock

key-decisions:
  - "Use ed25519-dalek v2 with default-features=false, features=[alloc] for WASM compatibility"
  - "Canonical serialization format: position_title:agreed_salary:start_date:negotiation_rounds (colon-delimited)"
  - "Verify-before-store: all checks (access, empty sig, hash, sig validity) performed before inserting record"
  - "system_agent is owner-configurable to allow trusted backend agent to record on behalf of parties"

patterns-established:
  - "Canonical serialization pattern: deterministic format used for both hashing and signing to ensure consistency"
  - "Verify-before-store: all validation assertions before any state mutation prevents partial writes"

requirements-completed: [P0-AGREEMENT, P1-AGREEMENT, P3-AGREEMENT]

# Metrics
duration: 3min
completed: 2026-04-16
---

# Phase 06 Plan 02: Agreement Contract Security Hardening Summary

**Agreement contract hardened with P0 access control (caller must be party or system agent), P1 on-chain Ed25519 signature verification for both parties, and P3 SHA-256 hash integrity check using ed25519-dalek v2 and sha2**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-16T03:15:58Z
- **Completed:** 2026-04-16T03:18:27Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Eliminated P0 critical vulnerability: any third-party can no longer forge agreement records — caller must be seeker, employer, or owner-configured system agent
- Eliminated P1 vulnerability: both seeker and employer Ed25519 signatures are verified on-chain before storage; empty signatures rejected
- Eliminated P3 vulnerability: agreement_hash is verified to match SHA-256 of canonical summary serialization, preventing hash tampering
- 11 tests pass: 4 original updated for new API + 7 new security tests covering all attack scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1: Add access control, signature verification, and hash integrity to agreement contract** - `306ef1e` (feat)

**Plan metadata:** (to be added after metadata commit)

## Files Created/Modified

- `contract/agreement/Cargo.toml` - Added ed25519-dalek v2, sha2 v0.10, hex v0.4 dependencies
- `contract/agreement/src/lib.rs` - Added owner/system_agent fields, access control, Ed25519 verification, SHA-256 hash integrity, 11 tests
- `contract/agreement/Cargo.lock` - Updated lock file with new dependencies

## Decisions Made

- Used `ed25519-dalek v2` with `default-features = false, features = ["alloc"]` for WASM compatibility (no std dependency)
- Canonical serialization format is colon-delimited: `"position_title:agreed_salary:start_date:negotiation_rounds"` — deterministic, simple, no external JSON library needed in contract code
- `verify_ed25519_signature` is a private helper; `canonical_summary_bytes` is `pub(crate)` so tests can call it via `AgreementContract::canonical_summary_bytes`
- Access control check happens first, before duplicate check, before signature checks — fail fast on authorization

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — ed25519-dalek v2 with `default-features = false, features = ["alloc"]` compiled to WASM without issues on first attempt.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

- contract/agreement/src/lib.rs: FOUND
- contract/agreement/Cargo.toml: FOUND
- commit 306ef1e: FOUND

## Next Phase Readiness

- Agreement contract is now fully hardened against P0, P1, and P3 vulnerabilities identified in audit
- Backend code that calls `record_agreement` must be updated to pass `seeker_public_key` and `employer_public_key` parameters and generate valid Ed25519 signatures
- The `set_system_agent` method should be called post-deploy with the backend agent's account ID to enable server-side recording

---
*Phase: 06-fix-smart-contract-security-vulnerabilities-from-audit*
*Completed: 2026-04-16*
