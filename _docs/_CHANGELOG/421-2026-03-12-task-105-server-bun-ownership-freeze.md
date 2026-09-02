# 421. TASK-105 Server Bun Ownership Freeze

**Date:** 2026-03-12
**Version:** Unreleased
**Status:** Draft — family reopened as TASK-105-11-03-05 (To Do); Draft marker per the changelog README reopen-draft policy, index row removed until fresh reclosure validation succeeds.
**Tasks:** TASK-105, TASK-105-11, TASK-105-11-03, TASK-105-11-03-05

## Key Changes

### QA / Runner Ownership
- Documented the remaining Bun-owned `tests/unit/server/*` cluster after the pure helper suites were moved out.
- Explicitly kept `adminAssetsRouting`, `hostPolicy`, `previewUrls`, `publicBaseUrl`, and `publicBookingApi` in Bun.

### Rationale
- These suites still validate server-boundary modules or modules that pull settings/runtime concerns at import time.
- This closes the recurring ambiguity around whether every `tests/unit/server/*` file should automatically move to Vitest.

### Remaining Focus
- The runner split backlog is now mostly the search import-coupling problem and any future refactors needed to peel more pure logic away from runtime-bound modules.
