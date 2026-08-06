# 1264 - TASK-552 Runtime Smoke Harness Performance

**Date:** 2026-08-06
**Version:** Unreleased
**Tasks:** TASK-552, TASK-552-01, TASK-552-01-L01, TASK-552-02,
TASK-552-02-L01, TASK-552-03, TASK-552-03-L01, TASK-552-03-L02
**Type:** Testing/Developer Experience/Performance/Reliability/Security/Docs/Task Board

## Overview

Adds one reusable runtime-smoke platform and migrates the complete TASK-540
Custom Screens flow to it. The final seven-scenario smoke now completes in
`19:38.580`, down from `36.9m` for the earlier fast run and `56.5m` for the
historical full-strength run, without removing logical actions, screenshots,
console checks, or cleanup.

## Key Changes

### Shared runtime-smoke platform

- Adds the strict `scripts/runtime-smoke.ts` entry point with a static suite
  registry, fast/certification profiles, awaited lifecycle, bounded polling and
  process supervision, repository guards, timing, redaction, and structured
  reporting.
- Adds thin TASK-540, focused widget-contract, and production-boundary adapters
  so new workflows can reuse the same entry point instead of copying task-local
  lifecycle, browser, worker, cleanup, or reporting loops.
- Adds generic browser segment/frame contracts and strict checkpoint identity,
  sealing, compatibility, and atomic-storage primitives. TASK-540 exposes its
  seven-scenario reset inventory but does not claim automatic checkpoint resume.

### Workers, database, and browser batching

- Replaces TASK-540's process-per-operation bridge with lazy profile-isolated
  Bun workers and `DB_POOL_MAX=1`. Its 18 setup baselines are reduced to two
  profile frames while preserving their ordered logical receipts.
- Batches the database-owned cleanup/proof work through bounded registered
  handlers and retains API/storage ownership where those layers prove product
  behavior.
- Compiles consecutive Playwright work into bounded segments around runtime,
  screenshot, native-command, and capture-dependency barriers. Materialized
  programs are split below the host argument-size ceiling without changing
  logical ordering or first-failure identity.
- Keeps bootstrap CAS restore as one conscious canonical one-shot operation.
  Node and Bun produce different `Function#toString` identities for that source;
  all other registered operations remain persistent/batched.

### Governance and documentation

- Requires new reusable smokes to use the shared entry point and thin static
  adapters in `AGENTS.md`.
- Documents profiles, extension boundaries, workers, DB batches, browser
  segments, evidence, cleanup, the CAS exception, and truthful checkpoint scope
  in `tests/README.md` and `_docs/TESTING_STRATEGY.md`.

## Validation and Benchmark

- `bun test tests/unit/runtime-smoke`: 58 pass, 548 assertions, 0 fail.
- Root TypeScript check passed.
- The canonical TASK-540 executor self-test passed its 496-action contract,
  72 cleanup receipts, and negative/mutant coverage after the bridge changes.
- Fresh TASK-540 fast smoke: 7/7 scenarios, 13 PNGs, zero console errors,
  `serverUp=true`, nine repository snapshots, lifecycle cleanup PASS, and wall
  time `1178.580s` (`19:38.580`).
- Bounded post-run proof confirmed exact auth/bootstrap restoration, zero
  fixture/storage residue, zero owned processes, and released task ports.
- The measured result is `46.77%` shorter (`1.879x`) than the earlier `36.9m`
  fast run and `65.23%` shorter (`2.876x`) than the historical `56.5m`
  full-strength run. The latter used the 60-second authentication profile;
  TASK-552 does not present it as an identical-profile comparison.

## Database and Security

No endpoint, product auth/RBAC/CSRF/rate-limit behavior, product data model,
dependency, schema, migration, snapshot, journal, or index changed. Migration
`0070` remains the intentionally owner-approved recurring access-log lookup
index. Workers receive only registered least-privilege environment profiles;
protocols and reports remain bounded, reject-unknown, and secret-redacted.
