# TASK-201-06: QA Docs and Closure
# FileName: TASK-201-06_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** QA + CMS/Media + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-201-01, TASK-201-02, TASK-201-03, TASK-201-04, TASK-201-05
**Status:** To Do

---

## Overview

Close the `TASK-201` family with targeted validation, docs parity, changelog,
board synchronization, and source-report traceability.

Closure responsibility note:

- this leaf must close the loop back to `_docs/PLAYWRIGHT/SUMMARY-MEDIA.md`,
  not only `_docs/_TASKS/README.md`,
- closure notes must map every report item (`BUG-1..BUG-6`, `UX-1..UX-5`) to
  landed evidence or an explicit open/follow-up state,
- any server/API changes must include the route/security contract that landed,
  not just UI screenshots.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/ui/media-details.test.tsx`
- `tests/vitest/ui/media-details-panel.test.tsx`
- `tests/vitest/ui/media-card.test.tsx`
- `tests/vitest/ui/media-picker.test.tsx`
- `tests/vitest/ui-integration/media.test.tsx`
- `tests/vitest/mediaUi/mediaLibrary.test.tsx`
- `tests/vitest/mediaUi/mediaSettingsDrawer.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/vitest/admin/userSettingsClient.test.ts` if preference ownership changed
- `tests/unit/media/mediaService.test.ts`
- `tests/unit/media/imageDimensions.test.ts` if added by TASK-201-02
- `tests/unit/media/mediaUsageService.test.ts` if added by TASK-201-04
- `tests/integration/routes/media.test.ts`
- runtime media delivery tests if `/media/*` behavior changes
- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`
- `_docs/DATA_MODEL.md` if stored semantics changed
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache semantics changed
- `_docs/PLAYWRIGHT/SUMMARY-MEDIA.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry for TASK-201

## Security Contract

- Visibility: no new surface beyond what earlier leaves explicitly introduced.
- Auth/RBAC/CSRF/rate-limit: closure must document the final state for any
  metadata, dimension, usage, bulk, or user-setting route touched by the family.
- Reject-unknown validation: all new payloads/query params must be covered by
  tests or recorded as unchanged.
- Anti-abuse:
  - destructive bulk actions confirmed,
  - usage summaries bounded and permission-protected,
  - internal media delivery access remains protected,
  - no browser cache/localStorage contains secrets or privileged settings.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest:
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-details.test.tsx tests/vitest/ui/media-details-panel.test.tsx tests/vitest/ui/media-card.test.tsx tests/vitest/ui/media-picker.test.tsx tests/vitest/ui-integration/media.test.tsx tests/vitest/mediaUi/mediaLibrary.test.tsx tests/vitest/mediaUi/mediaSettingsDrawer.test.tsx tests/vitest/admin/mediaClient.test.ts`
  - append any new suites added by the leaves before closure.
- Bun:
  - before DB-backed tests, confirm `DATABASE_URL` is reachable,
  - `set -a && source .env && set +a && bun test tests/unit/media tests/integration/routes/media.test.ts`
  - add runtime media delivery suites only if `/media/*` access behavior changed.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`
- `_docs/DATA_MODEL.md` if applicable
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if applicable
- `_docs/PLAYWRIGHT/SUMMARY-MEDIA.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry

## Acceptance Criteria

1. The full targeted Media Vitest/Bun matrix is recorded with pass/skip reasons.
2. `_docs/PLAYWRIGHT/SUMMARY-MEDIA.md` includes dated closure status per
   `BUG-*` and `UX-*` item.
3. Docs describe the final Media UI, API, cache, and storage behavior.
4. `_docs/_TASKS/README.md` and changelog are synchronized with `TASK-201`
   closure.
