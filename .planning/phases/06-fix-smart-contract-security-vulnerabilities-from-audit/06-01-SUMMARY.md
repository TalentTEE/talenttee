---
phase: 06-fix-smart-contract-security-vulnerabilities-from-audit
plan: 01
subsystem: payments
tags: [near, rust, smart-contract, escrow, security, access-control]

# Dependency graph
requires: []
provides:
  - "Access-controlled pay_for_profile: only employer or authorized agent can call"
  - "withdraw method for employers to reclaim deposited NEAR"
  - "authorize_agent / revoke_agent methods for delegation"
  - "is_authorized_agent helper"
  - "owner field on EscrowContract"
  - "authorized_agents IterableMap on EscrowContract"
  - "10 new security tests covering fund-drain attack, withdraw, and boundary cases"
affects: [contract-deployment, backend-escrow-integration]

# Tech tracking
tech-stack:
  added: [near_sdk::json_types::U128]
  patterns:
    - "Caller authorization check: caller == employer_id || self.is_authorized_agent(&employer_id, &caller)"
    - "Agent delegation via IterableMap<AccountId, Vec<AccountId>>"
    - "NEAR Promise::new(...).transfer() for on-chain NEAR transfers"

key-files:
  created: []
  modified:
    - contract/escrow/src/lib.rs

key-decisions:
  - "Use authorized_agents IterableMap rather than a flat whitelist to scope agent permissions per employer"
  - "Revoke test uses #[should_panic(expected = 'Unauthorized')] variant instead of catch_unwind to avoid NEAR test environment incompatibility"
  - "withdraw takes U128 (JSON-friendly) not u128 directly, consistent with NEAR SDK conventions"

patterns-established:
  - "Caller auth pattern: assert!(caller == owner_id || self.is_authorized_agent(&owner_id, &caller), 'Unauthorized: ...')"
  - "Agent delegation: authorized_agents IterableMap<AccountId, Vec<AccountId>>"

requirements-completed: [P0-ESCROW, P1-ESCROW]

# Metrics
duration: 75min
completed: 2026-04-16
---

# Phase 06 Plan 01: Escrow Security Hardening Summary

**Access-controlled pay_for_profile with authorized-agent delegation and employer withdraw — closes P0 fund-drain attack vector in NEAR escrow contract**

## Performance

- **Duration:** ~75 min
- **Started:** 2026-04-16T02:03:00Z
- **Completed:** 2026-04-16T03:18:23Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments
- Blocked unauthorized third-party fund-drain attack on pay_for_profile (P0 critical)
- Added employer withdraw capability with full validation (P1 high)
- Added agent delegation system (authorize_agent / revoke_agent) so AI agents can call pay_for_profile on behalf of employers
- Expanded test coverage from 6 to 16 tests — all pass, contract compiles to WASM

## Task Commits

Each task was committed atomically:

1. **Task 1: Add access control to pay_for_profile and implement withdraw** - `d89581a` (feat)

**Plan metadata:** (created with this SUMMARY)

## Files Created/Modified
- `contract/escrow/src/lib.rs` - Added owner, authorized_agents fields; is_authorized_agent helper; authorize_agent/revoke_agent methods; caller check in pay_for_profile; withdraw method; U128 import; 10 new tests

## Decisions Made
- Used `IterableMap<AccountId, Vec<AccountId>>` for authorized_agents to scope delegation per employer — allows multiple agents per employer and clean revocation
- Used `#[should_panic(expected = "Unauthorized")]` for revoke test instead of `catch_unwind` — NEAR's VMContextBuilder does not support `catch_unwind` cleanly in unit test environment
- `withdraw` takes `U128` (NEAR JSON type) not raw `u128` — consistent with NEAR SDK conventions for cross-contract calls and front-end JSON serialization

## Deviations from Plan

None - plan executed exactly as written. The note in the plan about `catch_unwind` vs `#[should_panic]` was pre-acknowledged; the `#[should_panic]` variant was used as suggested.

## Issues Encountered
- Two compiler warnings for unused `Promise` results (pre-existing in codebase from original `pay_for_profile`). These are warnings only, not errors, and are out-of-scope for this plan. Logged for deferred attention.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Escrow contract is now safe for testnet deployment
- pay_for_profile access control is in place — backend/agent integration must pass employer_id calls as the employer account or a registered agent
- Phase 06-02 (agreement contract hardening) can proceed independently

---
*Phase: 06-fix-smart-contract-security-vulnerabilities-from-audit*
*Completed: 2026-04-16*
