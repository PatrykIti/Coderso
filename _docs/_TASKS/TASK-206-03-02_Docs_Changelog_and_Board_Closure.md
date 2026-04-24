# TASK-206-03-02: Docs, Changelog, and Board Closure
# FileName: TASK-206-03-02_Docs_Changelog_and_Board_Closure.md

**Priority:** Medium
**Category:** CMS/Media + Docs + QA
**Estimated Effort:** Small
**Dependencies:** TASK-206-03-01, TASK-206-00
**Status:** To Do

---

## Overview

Close the Media cache lifecycle task family by syncing source-of-truth docs,
task board state, changelog, and final validation evidence.

This leaf is intentionally separate so implementation does not finish with green
tests but stale docs. The cache docs already describe the intended behavior for
admin lists; after this family lands, Media must be explicitly listed with the
same lifecycle guarantees and the actual mutation cache semantics.

## Sub-Tasks

No child task files.

## Files to Change

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-task-206-media-cache-lifecycle.md`
- `_docs/_CHANGELOG/README.md`
- this task family files, to mark `Done` with dates.

## Implementation Direction

- Update docs after code and tests are final.
- Record exact commands and outcomes.
- If any route/service DB-backed tests were skipped because `DATABASE_URL` was
  unavailable, state that explicitly and do not mark DB-backed validation as
  passed.
- Keep changelog scoped to TASK-206. Do not mix unrelated media QA or widget
  changes into this closure entry.

## Documentation Checklist

- `_docs/ADMIN_CACHE.md`
  - add shared in-memory TTL policy:
    - TTL applies to storage envelopes and module-level read-through cache,
    - expired memory values fall through to storage/network instead of serving
      stale rows.
  - add Media lifecycle policy:
    - cache present -> no forced mount reload,
    - cache missing -> foreground load,
    - cache event update -> hydrate from patched cache,
    - true invalidation/explicit refresh -> full reload allowed.
  - document upload/update/recover/replace/delete cache behavior.
- `_docs/ADMIN_CACHE_MAP.md`
  - verify Media Library and Media Picker cached APIs,
  - list mutation cache owners and read-only usage API.
- `_docs/_TASKS/README.md`
  - move all TASK-206 family rows from To Do to Done,
  - update statistics.
- `_docs/_CHANGELOG/README.md`
  - add the new changelog entry number and title.

## Security Contract

- Visibility: docs/process only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - docs must not claim public/cache behavior that is not validated,
  - docs must preserve backend-only secret handling and media delivery access
    boundaries.

## Testing Requirements

At closure, run:

```sh
bun --cwd core lint
bun --cwd core lint:types
./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-picker.test.tsx tests/vitest/admin/storageCache.test.ts tests/vitest/admin/mediaClient.test.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/admin/menusClient.test.ts tests/vitest/admin/postsClient.test.ts tests/vitest/admin/admin-prefetch-policy.test.ts tests/vitest/admin/adminPrefetch.test.ts
```

If upload response/service route changed:

```sh
set -a && source .env && set +a
bun test tests/integration/routes/media.test.ts
bun test tests/unit/media/mediaService.test.ts
```

If prefetch implementation changed:

```sh
bun test tests/perf/admin-prefetch-budget.test.ts
```

## Documentation Updates Required

- Same as Files to Change.

## Acceptance Criteria

1. `_docs/ADMIN_CACHE.md` describes the final Media lifecycle.
2. `_docs/ADMIN_CACHE.md` describes the shared in-memory TTL behavior if
   `TASK-206-00` lands with this family.
3. `_docs/ADMIN_CACHE_MAP.md` points to the actual Media cache owners.
4. `_docs/_TASKS/README.md` statistics and status tables are synced.
5. Changelog entry records implementation scope and validation.
6. No TASK-206 file remains with stale status or stale validation notes.
