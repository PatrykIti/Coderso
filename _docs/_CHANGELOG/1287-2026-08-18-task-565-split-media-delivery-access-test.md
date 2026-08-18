# 1287 - TASK-565 Split Media Delivery Access Test Below 1000 Lines

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-565

## Key Changes

### Tests
- `tests/integration/server/mediaDeliveryAccess.test.ts` (1051 lines) split
  into clearly named suites (per-grant access matrix, auth/permission
  variants, redirect/error cases), each at or below 1000 physical lines per
  the AGENTS.md gate.
- Shared support module `tests/integration/server/mediaDeliveryTestSupport.ts`
  owns `createMediaDeliveryHarness()` (module state, installHarness, the
  `__setMediaDeliveryDepsForTests` singleton seam, and the
  beforeEach/afterEach/afterAll hooks) so every split file stays
  independently runnable.
- No assertion/control-flow weakening; the 22 original tests' behavior is
  preserved across the split.

## Validation
- `bun --cwd core lint` + `lint:types` green; all split media-delivery
  suites pass; touched-file line-count gate verified.
- Docs: corrected the lane command typo in the task file.
