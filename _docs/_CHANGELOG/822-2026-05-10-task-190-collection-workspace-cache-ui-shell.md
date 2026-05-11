# 822 - TASK-190 collection workspace cache UI shell

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-06, TASK-190-06-03, TASK-190-06-03-01, TASK-190-06-03-01-03

## Key Changes

### Admin cache and prefetch

- Added `contentTypes:collectionWorkspace:<contentTypeId>` as the cached read
  namespace for the server-owned collection workspace summary.
- Added `getContentTypeCollectionWorkspace(...)`,
  `getContentTypeCollectionWorkspaceCached(...)`, and
  `getCachedContentTypeCollectionWorkspace(...)` under `contentTypesClient.ts`
  instead of creating a parallel collections client.
- Added a predicate `/advanced/engine/:contentTypeId/collection` prefetch entry
  ahead of the generic `/advanced/engine` prefix so workspace warmup loads the
  content-types list plus the workspace summary with `{ force: false }`.

### Workspace UI

- Replaced the placeholder workspace route with an `AdminShell` page under the
  existing Engine route family.
- Added overview and readiness panels that render canonical resources from the
  server summary without client-side scatter-gather or slug/title guessing.
- Kept cache-bus pending and manual refresh state route-local to
  `CollectionWorkspacePage.tsx`.

### Docs and board

- Marked `TASK-190-06-03-01-03` and parent `TASK-190-06-03-01` done.
- Updated architecture, admin cache, admin cache map, task board, and workspace
  task notes.

## Validation

- `bun run test:vitest -- tests/vitest/admin/contentTypesClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/ui/collection-workspace.test.tsx tests/vitest/admin/adminApp.test.tsx`
  - 4 files passed / 35 tests passed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:bun` outside sandbox with DB-backed suites enabled
  - 204 files / 750 tests passed.
- `bun run test:vitest`
  - 577 files / 2561 tests passed.
- `bun run lint`
- `bun run scan:security:strict` outside sandbox
  - Semgrep, Bun audit, Trivy vuln/config/secret, and Gitleaks
    history/worktree completed cleanly.
- `git diff --check`
