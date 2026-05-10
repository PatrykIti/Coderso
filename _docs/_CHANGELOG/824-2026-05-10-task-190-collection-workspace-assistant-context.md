# 824 - TASK-190 collection workspace assistant context

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-06, TASK-190-06-03, TASK-190-06-03-03

## Key Changes

### Assistant Context

- Added identity-only `collectionWorkspaceHint` and server-hydrated
  `collectionWorkspace` support to the existing assistant action context.
- Scoped workspace hints to
  `/admin/advanced/engine/:contentTypeId/collection` and kept the runtime
  selected resource as the content-type shell.
- Added `detail-page` active-surface support for the detail-template editor
  through the existing active-surface transport.

### Server Hydration and Security

- Reused the collection-workspace read model and detail-page document service
  to hydrate assistant follow-up context server-side.
- Reconciled stale or mismatched detail-page hints to `null` instead of trusting
  browser state.
- Kept route permission parity explicit: `detail-page` planning context requires
  `content:read` plus `widgets:read`.
- Rejected browser-supplied `collectionWorkspace` summaries at the strict
  assistant action-plan schema boundary.

### Docs and Board

- Marked `TASK-190-06-03-03`, `TASK-190-06-03`, and `TASK-190-06` done.
- Updated architecture, CMS API, assistant builder, TASK-190 task files, and
  the task board.

## Validation

- `bun run test:vitest -- tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui/detail-template-editor.test.tsx tests/vitest/assistant/admin-context-service.test.ts tests/vitest/assistant/active-surface-hydration.test.ts tests/vitest/assistant/provider-planning-context.test.ts`
  - 5 files passed / 39 tests passed.
- `bun test tests/integration/routes/assistant.test.ts`
  - 25 tests passed.
- `bun run test:vitest`
  - 578 files passed / 2578 tests passed.
- `bun run test:bun`
  - 752 tests passed / 204 files passed.
- `bun run lint`
  - passed.
- `bun run scan:security:strict`
  - passed.
- `bun --cwd core lint:types`
  - passed.
- `bun --cwd core lint`
  - passed.
