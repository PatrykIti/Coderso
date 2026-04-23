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
- closure must verify preserved report positives, especially grid/list
  switching, realtime search, type filters, native file picker upload, media
  settings access mode, replace/delete affordances, media delivery access, and
  cache invalidation behavior. If a positive flow was only partially implemented
  in the checked-out code, closure must show the owner leaf that fixed it or mark
  the source report item as explicitly open.

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
- focused grid/list view parity coverage added by `TASK-201-03-03`
- focused replace action coverage added by `TASK-201-05-03`
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
  - include a targeted regression that changing the Media toolbar view mode
    renders the list view distinctly from the grid view, while search/filter and
    selected-item state remain coherent.
  - include a targeted regression that existing upload, settings, replace,
    delete, and copy actions still route through their original owner callbacks
    rather than through duplicated local code.
- Bun:
  - before DB-backed tests, confirm `DATABASE_URL` is reachable,
  - `set -a && source .env && set +a && bun test tests/unit/media tests/integration/routes/media.test.ts`
  - add runtime media delivery suites only if `/media/*` access behavior changed.

## Report Replay Checklist

- `BUG-1` / `BUG-4`: metadata save and copy feedback must be based on the real
  async result from the existing drawer/page/client path.
- `BUG-2`: dimensions must be filled by media service/domain behavior and
  rendered truthfully for known, pending/recoverable, unknown, and non-image
  assets. Closure must show the selected-asset recovery trigger for legacy image
  rows with missing dimensions, or mark `BUG-2` open; truthful copy alone is not
  enough to close the report item.
- `BUG-3` / `BUG-5`: empty states and `Load More Assets` must be based on the
  current visible/list pagination contract, not fixed copy.
- `BUG-6`: usage entries must come from the bounded usage read model and use
  canonical admin navigation only when the target is resolvable.
  Usage coverage must include exact `assetId` / `id` object-shaped references
  already used by page/widget/content code, not only simple string fields.
- `UX-1` / `UX-2`: readable names and missing-alt warnings must come from shared
  media display helpers and existing media metadata.
- `UX-3`: bulk selection must operate on the visible asset set and must not
  change `MediaPicker` selection semantics. Bulk download must be covered with
  safe URL/anchor behavior and user-safe partial failure handling.
- `UX-4` / `UX-5`: upload separation and `media.openAfterUpload` placement must
  keep the same upload handler and user-setting key.
- Grid/list positive: the toolbar view mode must render distinct usable views
  from the same media list owner state.
- Replace positive: the details Replace button must be real and tested, or be
  explicitly unavailable with an open source-report state; no inert button can
  be counted as preserved behavior.
- Route boundary: any usage, backfill, pagination, or replace route added by the
  family must include route registration, permission, validation, and mapped
  `ApiError` coverage. If an existing media route is touched while adding the
  family work, map the existing media-domain errors through the same centralized
  route boundary instead of adding route-local ad-hoc translations. Persisted
  dimension recovery must not be hidden behind a read-only `GET` route.
- Preserved positives: grid/list switching, search, filters, native file picker,
  media settings access mode, replace/delete affordances, delivery access mode,
  and media cache invalidation must still work after all leaves land.

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
5. The report's existing positive flows are regression-covered or manually
   replayed with evidence and no duplicated owner paths.
