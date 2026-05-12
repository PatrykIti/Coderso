# 840 - Admin detail page schema browser-safe hashing

**Date:** 2026-05-12
**Version:** Unreleased
**Tasks:** TASK-252

## Key Changes

### Admin bundle safety

- Removed the `node:crypto` dependency from
  `core/services/content/detailPageSchema.ts`, which was leaking into the
  admin browser bundle and crashing the admin shell with a blank screen during
  module evaluation.
- Replaced the deterministic detail-page ID helper with a browser-safe
  synchronous SHA-1 implementation in plain TypeScript so shared
  schema/normalization code stays importable from both runtime and admin UI.

### Contract verification

- Added a deterministic UUID assertion for `buildDeterministicDetailPageId`
  so the browser-safe implementation preserves the previous stable ID contract.
- Verified the fix on the schema lane, runtime detail-page lane, `AdminApp`
  load path, and a production admin Vite build.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/content/detailPageSchema.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/detail-page-composer-runtime.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx`
- `bunx vite build --config vite.config.ts`
