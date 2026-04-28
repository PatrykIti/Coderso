# TASK-193: Pages Bun Route Timeout Stabilization
# FileName: TASK-193_Pages_Bun_Route_Timeout_Stabilization.md

**Priority:** Medium
**Category:** QA + CMS/Pages
**Estimated Effort:** Small
**Dependencies:** TASK-191
**Status:** Done (2026-04-21)

---

## Overview

Stabilize the Bun-owned Pages route lifecycle coverage after `bun run test:bun`
started failing on the existing DB-backed happy-path route test due to the
default `5000ms` per-test timeout.

The route/service behavior is already correct. The failure is a test harness
stability issue: the full create/update/autosave/publish/preview/restore/
discard/duplicate/unpublish/delete lifecycle now takes more than five seconds
in the current DB-backed environment.

This task must keep the existing coverage breadth and avoid changing the Pages
admin API contract or production route behavior.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/integration/routes/pages.test.ts`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog entry on completion

## Security Contract

- Visibility: internal admin API only (`/admin/api/pages*`).
- Auth model: existing authenticated admin session / admin API key flow from
  the shared admin layer.
- RBAC: unchanged from TASK-191-01 route coverage:
  - `content:read` for reads/preview token creation,
  - `content:write` for draft mutations, restore, discard, duplicate, delete,
  - `content:publish` for publish/unpublish.
- CSRF: unchanged; existing shared admin middleware coverage remains
  authoritative.
- Rate-limit bucket: unchanged; existing admin read/write buckets remain
  authoritative.
- Reject-unknown validation: unchanged; payload validation still runs through
  `pageSchemas`.
- Anti-abuse: unchanged; this task only stabilizes test execution time.
- Public write hardening: not applicable; no public route is introduced.

## Testing Requirements

- Re-run the failing Bun route suite:
  - `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts`
- Re-run repo-required checks:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Re-run the original failing command:
  - `set -a && source .env && set +a && bun run test:bun`

## Documentation Updates Required

- `_docs/_TASKS/README.md` status/statistics.
- `_docs/_CHANGELOG/README.md` and new changelog entry on completion.
- No Pages API or architecture docs changes are required because the product
  contract is unchanged.

## Completion Notes (2026-04-21)

- Added an explicit `15_000ms` timeout for the DB-backed Pages route lifecycle
  coverage test in `tests/integration/routes/pages.test.ts`.
- Kept the existing happy-path and audit coverage intact; no route/service logic
  changed.
- Confirmed this is a Bun integration test stability adjustment, not a Pages
  API behavior change.

## Validation (2026-04-21)

- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun run test:bun`
