# 729 - TASK-201 media library QA recovery

**Date:** 2026-04-23
**Version:** Unreleased
**Tasks:** TASK-201, TASK-201-01, TASK-201-02, TASK-201-03, TASK-201-04, TASK-201-05, TASK-201-06

## Key Changes

### Media Admin UI

- Added real async feedback for metadata autosave, Copy URL, replace, and
  selected-image dimension recovery in the existing media details drawer flow.
- Reworked media cards/grid to show readable names, missing-alt warnings,
  distinct grid/list modes, visible-scope selection, bulk download, and
  confirmed bulk delete.
- Separated the upload surface from the asset list and kept
  `media.openAfterUpload` on the existing user-setting owner.

### Media API and Services

- Added bounded image dimension parsing for upload/replace and legacy selected
  asset recovery.
- Added usage summaries for pages, entries, posts, and commerce products through
  the internal `GET /media/:id/usage` route.
- Added `POST /media/:id/dimensions/recover` and `POST /media/:id/replace`
  with existing admin auth/RBAC/CSRF semantics and strict media route
  validation/error mapping.
- Fixed partial media metadata updates so omitted fields are preserved.

### QA and Docs

- Closed `_docs/PLAYWRIGHT/SUMMARY-MEDIA.md` item by item.
- Updated media API/spec/cache docs and synchronized the TASK-201 board.

## Validation

- `bun --cwd core lint` - pass.
- `bun --cwd core lint:types` - pass.
- `set -a && source .env && set +a && bun test tests/unit/media/imageDimensions.test.ts tests/unit/media/mediaUsageService.test.ts tests/integration/routes/media.test.ts tests/unit/media/mediaService.test.ts` - pass (`10 pass`; DB-backed media service tests ran against reachable `DATABASE_URL` outside the sandbox).
- `set -a && source .env && set +a && ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/mediaClient.test.ts tests/vitest/admin/mediaUtils.test.ts tests/vitest/ui/media-components.test.tsx` - pass (`14 pass`).
