# 1194 - TASK-473 Record Detail Overrides Closure

**Date:** 2026-06-25
**Version:** Unreleased
**Tasks:** TASK-473, TASK-473-03, TASK-473-05

## Key Changes

### Custom Screens

- Added cached admin client support for record-scoped presentation overrides,
  including `customScreens:entryOverrides:<screenId>:<entryId>` cache keys,
  cache-first reads, CSRF-protected replace writes, invalidation, and
  `cacheBus` broadcasts.
- Added the record-detail Presentation panel for persisted records and selected
  override-eligible blocks. The main record Save remains content-only; the panel
  owns save, reload, and clear actions for presentation changes.
- Kept content dirty state separate from presentation dirty state. Remote
  override cache updates refresh clean drafts and surface a pending remote-update
  warning without overwriting dirty local presentation edits.
- Added render-only text and media override merging in the Custom Screen runtime
  renderer. Overrides never mutate `content_entries.data`, entry values, screen
  definitions, or bindings.
- Split the pure presentation override contract into a Bun-free module so admin
  browser code can import schemas/enums without pulling DB/runtime dependencies.

### Docs And Board

- Updated `_docs/CMS_SPEC.md`, `_docs/ADMIN_CACHE.md`, and
  `_docs/ADMIN_CACHE_MAP.md` for the record-detail presentation panel and
  override cache contract.
- Closed TASK-473-03, TASK-473-05, and the TASK-473 parent; synchronized the
  task board statistics.
- Read-only Claude pre-implementation audit after the TASK-474 merge reported no
  blocking issues. Medium-risk notes were addressed through the pure contract
  split, media override render support, panel placement outside block DOM, and
  targeted regression tests.

## Validation

- `bun run test:vitest -- tests/vitest/admin/customScreensClient.test.ts`
  - Passed.
- `bun run test:vitest -- tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
  - Passed.
- `bun run test:vitest -- tests/vitest/customScreens`
  - Passed.
- `set -a && source .env && set +a && bun test tests/integration/routes/customScreensRoutes.test.ts`
  - Passed.
- `bun --cwd core lint`
  - Passed.
- `bun --cwd core lint:types`
  - Passed.
- `bun --cwd core build:admin`
  - Passed.
- `bun run check:admin-boundary`
  - Passed.
- `bun run check:admin-bundle`
  - Passed.
- `bun run gates:coderso`
  - Passed all configured gates.
- `bun run test:bun`
  - Passed: 1132 tests, 1 skipped live OpenAI route test.
- `bun run test:vitest`
  - Passed: 4211 tests across 688 files.
- `git diff --check`
  - Passed.
- `bun run precommit`
  - Passed.
- `playwright-cli -s=task473-record-overrides-smoke-pass run-code --filename .tmp/task-473-record-detail-overrides-smoke.js`
  - Passed against `coderso-dev-core-host` on
    `http://coderso-a.localhost:5173/admin/`. The smoke created a scoped content
    type, entry, and active Custom Screen; verified create mode hides
    presentation controls; verified record mode has no builder controls; saved,
    reloaded, rendered, and cleared text presentation overrides; verified
    presentation writes used the override route without mutating entry data;
    verified inline content editing used the entry save route; reported no
    console/page errors; and cleaned up the scoped fixture.
