# 820 - TASK-190 collection workspace route read model

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-06, TASK-190-06-03, TASK-190-06-03-01, TASK-190-06-03-01-01

## Key Changes

### Collection workspace read model

- Added the internal collection workspace summary service for one content type /
  collection root.
- Registered `GET /admin/api/content-types/:id/collection-workspace` under the
  existing content-type route family with `content:read`.
- Added the canonical admin route landing at
  `/admin/advanced/engine/:contentTypeId/collection`.

### Safety and ownership

- The server summary exposes bounded `canonical`, `linkedSecondary`,
  `unresolved`, and `candidates` buckets without raw custom-screen bindings,
  preview tokens, signed media URLs, or browser-owned source-of-truth state.
- Full canonical resolution/read redaction and the cached UI shell remain in the
  next `TASK-190-06-03-01-*` leaves.

### Docs and board

- Marked `TASK-190-06-03-01-01` done and moved the parent workspace tasks to
  In Progress.
- Updated the TASK-190 board counts plus CMS API and architecture notes.

## Validation

- `set -a && source .env && set +a && bun test --parallel=1 tests/integration/routes/contentTypes.test.ts` - 9 passed outside the sandbox after the sandbox could not reach the DB.
- `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx` - 6 passed.
- `bun --cwd core lint:types`
- `bun run test:bun` - 538 passed, 210 skipped by DB/suite guards in the sandbox.
- `bun run test:vitest` - 576 files passed, 2552 tests passed.
- `bun run lint`
- `bun run scan:security:strict` - passed outside the sandbox after the sandbox
  Semgrep/Bun audit attempt failed on CA/network setup.
