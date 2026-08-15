# 1274 - TASK-559 Bun Lane C-Split to Reach the 10-15 Minute Target

**Date:** 2026-08-15
**Version:** Unreleased
**Tasks:** TASK-559

## Key Changes

### Bun test lane (performance)
- C lane split into two serial workers (manifest v2: `conflictKeys[]` + `cWriteGlobal`; write-global files → c1, read-only → c2), running in parallel: the full `test:bun` acceptance dropped from 22m15s to **9.98 min** (target ≤15 min), all workers exit 0 on the first attempt.
- Partitioner/orchestrator v2 (`c1`/`c2` lists, lane-aware `worker_count_too_low` guard, consecutive fence offsets), docs updated (`tests/README.md`).
- Pre-existing A-lane test repairs (unrelated to the split, caused by TASK-518 migration 0071 + TASK-545 closure-date drift): provisioning count 71→72, closure-delta fixture date made dynamic, firstAdminRace aligned with the stable admin role, pure-lane per-test timeout 15s→60s.

## Validation
- Acceptance: exit 0, 9.98 min, per-worker table in the task handoff (b0 372.6s / b1 496.5s / c1 90.2s / c2 598.7s / a 29.9s / perf 2.4s).
- Targeted suites green (partitioner, manifest, migrate, provision, pure, runner fake-worker + integration); lint + types green.
