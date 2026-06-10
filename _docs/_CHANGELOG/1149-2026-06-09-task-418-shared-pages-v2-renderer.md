# 1149 - TASK-418 shared Pages v2 renderer

**Date:** 2026-06-09
**Version:** Unreleased
**Tasks:** TASK-418-04-L01

## Key Changes

- Added `core/services/pages/pageRendererV2.tsx` as the shared Pages v2
  section/block renderer and style helper owner for normalized Page documents.
- Updated public Pages runtime to delegate through the shared renderer while
  keeping `core/site/pageRuntimeV2.tsx` as a thin runtime adapter.
- Updated PageEditor canvas content to use the shared renderer and keep only
  editor chrome, selection, and responsive badges locally.
- Suppressed admin-canvas default link navigation for rendered button anchors so
  clicking a CTA selects the block instead of leaving the editor.
- Removed disconnected static page-editor mockup components and their dead
  scoped tests while preserving live `PageList` coverage.
- Updated `_docs/PAGE_MODEL.md` to document the shared renderer ownership move.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-leaf-components.test.tsx tests/vitest/ui-integration/pageBuilder.test.tsx` (46 tests)
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts` (10 tests)
- Drift fix rerun: `bun run test:vitest -- tests/vitest/pages/page-renderer-v2.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx` (26 tests)
- Drift fix rerun: `bun --cwd core lint:types`
- Drift fix rerun: `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
