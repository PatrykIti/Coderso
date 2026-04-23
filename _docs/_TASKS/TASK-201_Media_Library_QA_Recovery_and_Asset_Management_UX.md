# TASK-201: Media Library QA Recovery and Asset Management UX
# FileName: TASK-201_Media_Library_QA_Recovery_and_Asset_Management_UX.md

**Priority:** High
**Category:** CMS/Media + Admin/UI + UX + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-006, TASK-058, TASK-170-03-02-03, TASK-184-10
**Status:** To Do

---

## Overview

Address the Media admin defects and UX gaps captured in
`_docs/PLAYWRIGHT/SUMMARY-MEDIA.md` without redesigning the media product
surface or weakening the existing storage/security contracts.

The report findings that must stay explicitly tracked are:

### Bugs

- Critical: metadata edits in `Media Details` autosave on blur but provide no
  trustworthy saved/failed feedback.
- Medium: image dimensions show `-` / `--` even when the underlying image has
  real dimensions.
- Medium: `Documents` and `Audio` filters render an empty grid without an empty
  state while `Load More Assets` remains visible.
- Medium: `Copy URL` has no copied/failed feedback.
- Low: `Load More Assets` is visible when every asset is already displayed.
- Low: `Usage` entries look clickable but do not navigate to the referenced
  resource.

### UX gaps

- Media cards and the details header prefer UUID-like storage names instead of
  `title` / `originalName` display names.
- Image assets without alt text do not show an accessibility warning.
- The library has no multi-select flow for bulk delete/download.
- The upload dropzone and asset grid are visually merged into one surface.
- `Open details after upload` is easy to miss in the toolbar and should be moved
  or reinforced through the settings/upload preference flow.

This family must preserve what the report marked as already good: grid/list
switching, realtime search, type filters, native file picker upload, media
settings access mode, existing replace/delete affordances, the current media
delivery access model, and the admin cache invalidation behavior. "Preserve"
means verify and repair the current owner path when the checked-out code has
drifted from the report, not assume the positive is already implemented. In the
current code, the toolbar owns a `view` state but `MediaGrid` still renders only
the grid surface, and the details `Replace` button is visible without an action
owner. Those gaps are owned by dedicated leaves in this family.

Implementation principle:

- repair the existing media/admin contracts instead of introducing parallel
  flows, duplicate helpers, or media-only infrastructure where shared owners
  already exist,
- name the owner and responsibility before changing a boundary that spans UI,
  client, route, service, storage, cache, or navigation,
- keep fixes grounded in current code paths and tests; do not create a new
  media management model, notification host, navigation DSL, storage contract,
  or bulk API unless the existing owner cannot satisfy the report safely,
- prefer extending existing owner modules and shared helpers over creating new
  abstractions; add a new helper/module only when it becomes the clear owner of
  a real contract such as dimension parsing or usage discovery,
- keep user-facing behavior simple and logically consistent: visible controls
  must have a real owner callback/result, and unavailable actions must render as
  unavailable instead of pretending to work,
- when ownership is unclear during implementation, document the chosen owner in
  the leaf before coding so later leaves do not add a second path.

## Sub-Tasks

- `TASK-201-01_Metadata_Save_Feedback_and_Asset_Identity.md`
- `TASK-201-02_Image_Dimensions_and_File_Information.md`
- `TASK-201-03_Filter_Empty_States_and_Load_More_Truth.md`
- `TASK-201-04_Usage_Navigation_and_Reference_Contracts.md`
- `TASK-201-05_Bulk_Asset_Actions_and_Upload_Surface_Clarity.md`
- `TASK-201-06_QA_Docs_and_Closure.md`

## Scope

This umbrella covers five owner areas:

1. Metadata confidence and asset identity:
   - autosave status/error feedback,
   - copy URL feedback,
   - user-facing display names,
   - missing-alt accessibility warnings.
2. File information correctness:
   - image dimension extraction,
   - persistence/backfill for existing image rows where possible,
   - details rendering that differentiates unknown from non-image assets.
3. List truthfulness:
   - filter/search empty states,
   - `Load More Assets` visibility based on real `hasMore`/loaded-count state,
   - cache-safe list refresh after mutation,
   - real grid/list view parity from the existing toolbar `view` state.
4. Usage navigation:
   - replace hard-coded usage examples with a real bounded usage read model,
   - navigate through canonical admin helpers when a target is resolvable,
   - avoid clickable affordances when a target is not navigable.
5. Asset management and upload clarity:
   - visible-scope multi-select,
   - bulk delete/download with explicit destructive confirmation,
   - a real replace action for the existing details affordance or an explicit
     non-interactive/open follow-up state during closure,
   - clearer upload/dropzone placement,
   - stronger placement for `media.openAfterUpload`.

Out of scope:

- replacing the media storage driver model,
- changing public runtime `/media/*` delivery semantics,
- folder/tag taxonomy unless a separate task is opened,
- drag-reorder or media collections,
- a new public write endpoint,
- one-off client-only dimension hacks that do not update the source media
  contract for future uploads or existing rows,
- a bulk backend route unless the leaf proves existing per-asset routes cannot
  satisfy the UX safely.

## Architecture

Current owner seams in code:

- Media library shell, filters, cache, settings, upload orchestration:
  - `core/admin/ui/media/MediaLibraryPage.tsx`
    - owns page state, filtered/visible asset set, selected details asset,
      upload orchestration, open-after-upload preference wiring, list/grid mode,
      replace-action orchestration, and the decision to show empty states or
      load-more controls.
  - `core/admin/ui/media/MediaToolbar.tsx`
    - owns search/filter/view/preference controls only; it must not own media
      persistence, navigation, or cache state.
  - `core/admin/ui/media/UploadDropzone.tsx`
    - owns file input/drop handling only; it must call existing upload handlers
      and never bypass upload validation.
  - `core/admin/ui/media/MediaSettingsDrawer.tsx`
    - owns delivery-access settings UI; if `media.openAfterUpload` is exposed
      here, it still writes through `userSettingsClient` and the existing key.
  - `core/admin/services/mediaClient.ts`
    - owns admin API wrappers, media list cache, cache updates, and cache-bus
      broadcasts.
  - `core/admin/services/userSettingsClient.ts`
    - owns `media.openAfterUpload`; do not create a second browser storage key.
- Grid/card/details presentation:
  - `core/admin/ui/media/MediaGrid.tsx`
    - owns grid/list presentation wiring from the existing `view` prop and
      reusable selection props shared by the library, picker, and post editor
      surfaces. It must not create a second media-list state model.
  - `core/admin/ui/media/MediaCard.tsx`
    - owns card display, selected state, readable names, missing-alt card badge,
      and keyboard-accessible per-card selection affordance.
  - `core/admin/ui/media/MediaDetailsDrawer.tsx`
    - owns the primary details drawer, metadata draft state, save/copy feedback,
      usage rendering, and details actions. Visible actions such as Replace must
      call an owner callback with a real async result or be rendered as
      unavailable; no inert action buttons.
  - `core/admin/ui/media/MediaDetailsPanel.tsx`
    - secondary details component; if kept, it must receive the same display
      name, dimension, and metadata-save semantics as the drawer or be retired
      deliberately in a separate cleanup.
  - `core/admin/ui/media/types.ts`
    - owns UI-facing media item and usage summary types.
  - `core/admin/ui/media/utils.ts`
    - owns display-name, date/size, dimension, and kind formatting helpers.
- Server/service contract:
  - `core/server/routes/mediaRoutes.ts`
    - owns route orchestration, permission checks, validation calls, and the
      central media-domain error mapping (`mapMediaError` or the existing route
      mapper if one already exists). New usage, backfill, pagination, or replace
      routes must not add ad-hoc error translation; existing media errors such as
      `media_not_found`, `media_file_invalid`, `media_file_too_large`,
      `media_mime_not_allowed`, and `media_storage_unavailable` should be mapped
      through the same boundary when that route family is touched.
  - `core/server/validation/mediaSchemas.ts`
    - owns strict media route payload/query schemas.
  - `core/services/media/mediaService.ts`
    - owns media domain mutations, metadata merge semantics, upload defaults,
      dimension persistence/backfill orchestration, same-id replace semantics
      if implemented, and storage adapter calls.
  - `core/services/media/storage/adapter.ts`
    - owns the storage read/write/delete interface; only extend it if legacy
      dimension backfill cannot use the current `get(key)` read path safely.
  - `core/services/media/storage/index.ts`
    - owns adapter selection and storage settings resolution.
  - `core/db/schema.ts` (`media.width` and `media.height` already exist)
- Related reference owners for usage lookups:
  - `core/db/schema.ts` (`pages.currentData`, `pages.publishedData`,
    `contentEntries.data`, `posts.featuredMediaId`, `posts.data`,
    `commerceProducts.mediaIds`)
  - `core/services/content/contentListResolver.ts`
    - reference only for current media-id candidate shapes; usage lookup should
      not fork runtime listing behavior.
  - `core/services/posts/editor/postBlockDocument.ts`
  - `core/services/posts/runtime/postBlockRuntimeMapper.ts`
    - reference only for post block/rich-text media-id ownership; usage lookup
      should read bounded summaries, not render post runtime content.
  - `core/services/search/searchService.ts` for search/navigation reference only
  - `core/admin/ui/search/searchNavigation.ts` for media selected-query pattern
- Navigation/cache helpers:
  - `core/admin/ui/shared/AdminLink.tsx`
  - `core/admin/utils/adminPrefetch.ts`
  - `core/admin/utils/adminPaths.ts`
  - `core/admin/services/cachePolicy.ts`
  - `core/admin/utils/cacheBus.ts`
- Direct owner tests:
  - `tests/vitest/ui/media-library.test.tsx`
  - `tests/vitest/ui/media-details.test.tsx`
  - `tests/vitest/ui/media-details-panel.test.tsx`
  - `tests/vitest/ui/media-card.test.tsx`
  - `tests/vitest/ui/media-picker.test.tsx`
  - `tests/vitest/ui-integration/media.test.tsx`
  - `tests/vitest/mediaUi/mediaLibrary.test.tsx`
  - `tests/vitest/mediaUi/mediaSettingsDrawer.test.tsx`
  - `tests/vitest/admin/mediaClient.test.ts`
  - `tests/unit/media/mediaService.test.ts`
  - `tests/integration/routes/media.test.ts`

Reuse-first rule:

- fix current contracts in their owner modules before adding new abstractions,
  and remove or align any old path that would keep writing/reading a different
  shape,
- keep `MediaGrid` usable by both `MediaLibraryPage` and `MediaPicker`; library
  bulk selection must not break picker selection semantics,
- keep grid/list switching in the existing media grid/card components; do not
  add a parallel list component with separate filtering, cache, or selection
  state unless the leaf proves the shared component cannot stay simple,
- use existing `sonner` / shared `AdminApp` toaster mounting for feedback rather
  than adding a media-only toaster host,
- keep media cache updates on `mediaClient` and `cacheBus`; do not introduce
  mount-force refetch loops,
- use current per-item `DELETE /media/:id` unless a new bulk route is explicitly
  justified and covered by route/security tests,
- keep the existing Replace affordance honest: either implement it through the
  media drawer -> page -> client -> service route owner chain with cache
  invalidation and route error mapping, or remove the clickable styling and
  record an explicit open state in the source report,
- route usage navigation through `AdminLink`, `resolveAdminHref`, and existing
  admin path helpers,
- keep dimensions in the media service/domain contract; UI fallback probing may
  be used only as an explicit temporary compatibility path that does not replace
  server-side persistence,
- keep metadata PATCH semantics non-destructive: partial updates must preserve
  omitted fields or the drawer/client must explicitly send the full normalized
  draft; do not add UI-only workarounds that hide data loss,
- keep `media.openAfterUpload` in `userSettingsClient`; settings/upload UI may
  move or expose that preference, but must not create a second storage key.

## Security Contract

- Visibility: internal admin Media UI plus existing runtime asset read paths.
- Internal admin endpoints remain under `/admin/api/media*`.
- Auth model: authenticated admin session / admin API key where already
  supported by the shared admin stack.
- RBAC:
  - `media:read` for list/detail/usage/settings reads,
  - `media:write` for upload, metadata update, delete, dimension backfill, and
    any replace/bulk mutation that remains in scope.
- CSRF: unchanged for all mutating admin endpoints.
- Rate-limit buckets: existing `admin_read`, `admin_write`, and runtime
  `public_read` / protected internal read behavior for `/media/*`.
- Reject-unknown validation: all route payloads stay schema-first with
  `additionalProperties: false`; new usage/dimensions payloads need explicit
  schemas and route-level validation.
- Anti-abuse:
  - no new public write path,
  - bulk delete requires visible-scope selection and confirmation,
  - copy/download URLs must not leak signed secrets or backend-only storage
    credentials,
  - usage lookup must return bounded summaries, not raw page/entry/post payloads
    or secret-bearing settings,
  - internal media delivery mode must continue to require admin session or API
    key scope `media.read`.

## Implementation Order

1. Ship metadata/save/copy confidence and human-readable identity because this
   closes the critical UX trust gap without changing storage.
2. Fix image dimensions at the service contract and details UI.
3. Make the list truthful for empty filters and loaded/paginated state.
4. Replace hard-coded usage examples with a real bounded usage read model and
   navigation fallback.
5. Add multi-select/bulk actions and clarify upload/preference placement.
6. Re-run the Media report checklist, update docs, board, changelog, and the
   source Playwright summary with item-level closure evidence.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest:
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-details.test.tsx tests/vitest/ui/media-details-panel.test.tsx tests/vitest/ui/media-card.test.tsx tests/vitest/ui/media-picker.test.tsx tests/vitest/ui-integration/media.test.tsx tests/vitest/mediaUi/mediaLibrary.test.tsx tests/vitest/mediaUi/mediaSettingsDrawer.test.tsx tests/vitest/admin/mediaClient.test.ts`
  - add new focused suites under `tests/vitest/mediaUi/*` or `tests/vitest/ui/*`
    for bulk bar, empty state, usage navigation, upload layout, grid/list view
    parity, replace action feedback, and metadata autosave feedback as leaves
    land.
  - include regression coverage that grid/list switching renders distinct
    usable views while preserving search/filter selection state.
- Bun:
  - `set -a && source .env && set +a && bun test tests/unit/media tests/integration/routes/media.test.ts`
  - DB-backed media service assertions should run only when `DATABASE_URL` is
    reachable; otherwise closure must record skipped DB coverage.
- If runtime asset delivery behavior changes, also run the relevant runtime
  media delivery suite under `tests/integration/server` or add one if missing.

## Documentation Updates Required

- `_docs/MEDIA_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`
- `_docs/DATA_MODEL.md` only if the media read model or stored metadata changes
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` only if media cache keys
  or invalidation semantics change materially
- `_docs/PLAYWRIGHT/SUMMARY-MEDIA.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry when TASK-201 closes

## Acceptance Criteria

1. Every `BUG-*` and `UX-*` item in `_docs/PLAYWRIGHT/SUMMARY-MEDIA.md` is
   mapped to a landed leaf, a validated out-of-scope follow-up, or an explicit
   open state.
2. Media metadata edits and copy URL actions provide visible success/failure
   feedback without duplicating notification infrastructure.
3. Image dimensions are filled by the media contract and rendered accurately in
   details for new and recoverable existing assets.
4. Empty filters/searches and loaded-all states are truthful and do not expose
   dead `Load More Assets` controls.
5. Usage entries are either real navigable references or non-clickable bounded
   summaries with clear affordance.
6. Multi-select and upload preferences improve library operations without
   breaking `MediaPicker` or the existing storage/security contract.
7. Report positives that are currently only partial in code, especially
   grid/list switching and Replace, are either implemented through their named
   owner paths or recorded as explicit open states with no misleading UI.
