# TASK-473-05: Docs, Validation, And Board Closure
# FileName: TASK-473-05-Docs-Validation-And-Board-Closure.md

**Parent Task:** TASK-473
**Priority:** Medium
**Category:** Custom Screens / Docs / Closure
**Estimated Effort:** Small
**Dependencies:** TASK-473-01, TASK-473-02, TASK-473-03, TASK-473-04
**Status:** ⏳ To Do

---

## Overview

Close the TASK-473 family: document the override storage/API contract, run the
full validation surface, synchronize the board/index and statistics, and add the
changelog evidence. No production behavior change beyond docs/closure.

## Current State (summary)

- Contract + routes + UI + cleanup land in TASK-473-01..04.
- Closure rules require docs, board sync, and a changelog entry per
  `AGENTS.md` and `_docs/_CHANGELOG/README.md`.

## Sub-Tasks

- [ ] Update `_docs/CMS_API.md` (override routes) and `_docs/CMS_SPEC.md`
  (product/UX scope).
- [ ] Update `_docs/DATA_MODEL.md` (override store) and `_docs/ADMIN_CACHE*.md`
  (cached override resource).
- [ ] Run the full validation surface and record results.
- [ ] Update `_docs/_TASKS/README.md` statuses/statistics; set children + parent
  to `✅ Done` only when all descendants are Done/Superseded/Cancelled.
- [ ] Add a `_docs/_CHANGELOG/` entry and update `_docs/_CHANGELOG/README.md`.

## Files To Change

| File | Required change |
|---|---|
| `_docs/CMS_API.md` | Override route contract. |
| `_docs/CMS_SPEC.md` | Per-record presentation scope. |
| `_docs/DATA_MODEL.md` | Override store. |
| `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` | Cached override resource. |
| `_docs/_TASKS/README.md` | Status + statistics sync. |
| `_docs/_CHANGELOG/NNNN-*.md` *(new)* + `_docs/_CHANGELOG/README.md` | Closure evidence. |

## Implementation Pseudocode

Not applicable (docs + closure). Validation flow:

```
bun --cwd core lint && bun --cwd core lint:types
bun run test:vitest -- tests/vitest/customScreens
bun run test:vitest -- tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx
bun run test:vitest -- tests/vitest/admin/customScreensClient.test.ts
set -a && source .env && set +a && bun test tests/integration/routes/customScreensRoutes.test.ts
bun run check:admin-boundary && bun --cwd core build:admin && bun run check:admin-bundle
```

Error handling:

- If DB-backed tests cannot run (no `DATABASE_URL`), record the gap explicitly in
  the changelog and rerun after recovery.

Regression-test shape:

- No new tests; this subtask asserts the family's existing suites are green and
  evidence is recorded.

## Security Contract

- **Endpoint visibility:** none — docs/closure only.
- **Auth / RBAC / CSRF / rate-limit / reject-unknown / anti-abuse:** inherited
  from TASK-473-02; this subtask documents them, adds no surface.
- **Secret handling:** changelog/evidence must not include secrets, credentials,
  CSRF tokens, or unredacted sensitive logs.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/customScreens`
- `bun run test:vitest -- tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/customScreensClient.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/customScreensRoutes.test.ts`
- `bun run check:admin-boundary`
- `bun --cwd core build:admin`
- `bun run check:admin-bundle`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`, `_docs/CMS_SPEC.md`, `_docs/DATA_MODEL.md`,
  `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`, `_docs/_TASKS/README.md`,
  `_docs/_CHANGELOG/` + its `README.md`.

## Acceptance Criteria

1. The override storage/API contract is documented across CMS/data-model/cache
   docs.
2. Validation suites are green (or gaps recorded with rationale).
3. Board/index statuses + statistics are synchronized; no open child remains under
   a closed parent.
4. A changelog entry records the closure with no leaked secrets.
