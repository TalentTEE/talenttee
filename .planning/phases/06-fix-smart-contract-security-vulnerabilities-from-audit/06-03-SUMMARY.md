---
phase: 06-fix-smart-contract-security-vulnerabilities-from-audit
plan: "03"
subsystem: payments
tags: [near-sdk, rust, escrow, smart-contract, storage-management]

# Dependency graph
requires:
  - phase: 06-01
    provides: authorized_agents delegation, withdraw, pay_for_profile access control

provides:
  - Owner-configurable profile view cost (set_profile_view_cost / get_profile_view_cost)
  - Storage-bounded access_records with FIFO eviction at MAX_RECORDS_PER_EMPLOYER=1000
  - Paginated access history query (get_access_history_paginated)

affects: [escrow-contract-deployment, frontend-cost-display, admin-cost-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic cost storage in contract struct field (u128 profile_view_cost) with DEFAULT_ constant fallback"
    - "FIFO ring-buffer eviction: records.remove(0) when len >= MAX before push"
    - "Paginated slice via from_index/limit into Vec with bounds checking"

key-files:
  created: []
  modified:
    - contract/escrow/src/lib.rs

key-decisions:
  - "MAX_RECORDS_PER_EMPLOYER = 1000 chosen as reasonable upper bound preventing storage DoS while retaining meaningful history"
  - "profile_view_cost stored as u128 in struct (not NearToken) consistent with existing balance field pattern"
  - "set_profile_view_cost accepts U128 (NEAR JSON type) consistent with withdraw parameter convention from Plan 01"

patterns-established:
  - "Owner-only mutation guard: assert_eq!(env::predecessor_account_id(), self.owner, message)"
  - "Non-zero validation on configurable cost: assert!(cost_val > 0, ...)"

requirements-completed:
  - P2-ESCROW-STORAGE
  - P2-ESCROW-DYNAMIC-COST

# Metrics
duration: 5min
completed: 2026-04-16
---

# Phase 06 Plan 03: Dynamic Profile View Cost and Bounded Storage Summary

**Owner-configurable NEAR escrow cost with FIFO-bounded access_records storage and paginated history queries, eliminating hardcoded 0.1 NEAR and storage DoS vectors**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-16T03:20:00Z
- **Completed:** 2026-04-16T03:21:55Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced hardcoded `PROFILE_VIEW_COST` constant with struct field `profile_view_cost` initialized to `DEFAULT_PROFILE_VIEW_COST`
- Added `set_profile_view_cost` (owner-only with zero-value guard) and `get_profile_view_cost` view method
- Bounded `access_records` at `MAX_RECORDS_PER_EMPLOYER = 1000` with FIFO eviction on insert
- Added `get_access_history_paginated` for efficient offset/limit queries over access history
- Updated all tests from `PROFILE_VIEW_COST` to `DEFAULT_PROFILE_VIEW_COST`; added 6 new P2 tests
- All 22 tests pass; WASM build succeeds with no errors

## Task Commits

1. **Task 1: Dynamic profile view cost and bounded storage** - `c70e38f` (feat)

**Plan metadata:** (to be committed with this SUMMARY)

## Files Created/Modified

- `contract/escrow/src/lib.rs` - Added profile_view_cost field, set/get methods, storage bounding, paginated history, 6 new tests; updated existing test references to DEFAULT_PROFILE_VIEW_COST

## Decisions Made

- `MAX_RECORDS_PER_EMPLOYER = 1000`: Arbitrary but reasonable upper bound that prevents storage DoS while retaining meaningful access history per employer.
- `profile_view_cost` stored as `u128` to be consistent with the existing `balance: u128` pattern rather than wrapping as `NearToken`.
- `set_profile_view_cost` accepts `U128` (NEAR JSON type) consistent with `withdraw(amount: U128)` established in Plan 01.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The existing tests that used `PROFILE_VIEW_COST` literal in one place (`test_exact_boundary_payment` via `NearToken::from_yoctonear(PROFILE_VIEW_COST)`) required updating to `DEFAULT_PROFILE_VIEW_COST` as specified in the plan instructions.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Escrow contract now has all P2 security and economic improvements from the audit report applied.
- P1 (access control + withdraw) completed in Plan 01; P2 (storage bounds + dynamic cost) complete here.
- Contract is ready for deployment iteration or further feature phases.

---
*Phase: 06-fix-smart-contract-security-vulnerabilities-from-audit*
*Completed: 2026-04-16*
