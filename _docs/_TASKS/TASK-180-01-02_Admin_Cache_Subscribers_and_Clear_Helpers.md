# TASK-180-01-02: Admin Cache Subscribers and Clear Helpers
# FileName: TASK-180-01-02_Admin_Cache_Subscribers_and_Clear_Helpers.md

**Priority:** High
**Category:** Admin/UI + Cache Subscribers
**Estimated Effort:** Medium
**Dependencies:** TASK-180-01-01
**Status:** Done (2026-04-18)

---

## Overview

Ensure admin surfaces actually respond to the cache events emitted after assistant execution.

`TASK-180-01-01` owns producing safe events. This leaf owns consuming them consistently in list/editor hooks and exposing narrow client cache clear helpers where the admin client already owns in-memory cache state.

## Sub-Tasks

No child task files.

## Files to Inspect and Change

- `core/admin/services/pagesClient.ts`
- `core/admin/services/customScreensClient.ts`
- `core/admin/services/formsClient.ts`
- `core/admin/services/entriesClient.ts`
- `core/admin/services/contentTypesClient.ts`
- `core/admin/services/listingsClient.ts`
- `core/admin/services/menusClient.ts`
- `core/admin/services/widgetTemplatesClient.ts`
- `core/admin/services/mediaClient.ts`
- `core/admin/ui/pages/PageListPage.tsx`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/forms/hooks/useForms.ts`
- `core/admin/ui/forms/FormBuilderPage.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryEditor.tsx`
- `core/admin/ui/content-types/ContentTypeList.tsx`
- `core/admin/ui/content-types/ContentTypeEditor.tsx`
- `core/admin/ui/listings/hooks/useListingQueries.ts`
- `core/admin/ui/listings/hooks/useListingTemplates.ts`
- `core/admin/ui/listings/ListingEditorPage.tsx`
- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/widgets/hooks/useWidgetTemplates.ts`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/layouts/AdminShell.tsx`

## Implementation Notes

- Reuse existing `subscribeCacheEvents` patterns.
- Do not add mount-force refetch loops.
- Refresh in background when cache exists; preserve dirty editor state.
- Add client clear helpers only for clients with in-memory cache maps/promises.
- Keep helpers narrow, e.g. `clearEntriesCache(typeSlug)`, not a global wipe.
- If a resource has no admin cache owner yet, document that instead of adding unused events.

## Acceptance Criteria

1. All cache events emitted by `TASK-180-01-01` have a documented admin consumer or a documented no-op reason.
2. Lists refresh after assistant-executed create/update/delete/archive without full reload.
3. Editors refresh only when safe and do not overwrite unsaved changes.
4. Existing custom screen sidebar shortcut refresh still works.
5. No new global route-entry forced refetch loops are introduced.

## Security Contract

- Visibility: admin UI cache behavior only.
- Auth model: existing admin session.
- RBAC: UI refresh does not bypass backend read permissions.
- CSRF: no new write route.
- Rate-limit bucket: no new route bucket.
- Reject-unknown validation: cache events with unknown keys are ignored.
- Anti-abuse: subscribers must react only to known `cacheKeys`.
- Secret handling: subscribers must not store secrets, submissions, API keys, cookies, or privileged settings in localStorage/debug payloads.

## Testing Requirements

- Vitest admin/client tests for added clear helpers.
- UI tests only for surfaces whose behavior changes:
  - pages/custom screens regression,
  - entries/listings/forms/widgets/menus if subscribers are added or changed.
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted Vitest suites for touched admin clients/hooks/pages.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion

## Completion Notes (2026-04-18)

- Reused existing cache subscribers and clear helpers for pages, entries, content types, custom screens, forms, listings, menus, and widget templates.
- Added SEO cache bus keys and `SeoManagerPage` subscription so assistant-executed SEO mutations refresh the open SEO manager without reload.
- Added same-tab cache bus fanout so subscribers in the current admin tab can refresh after assistant execution.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/admin/cacheBus.test.ts tests/vitest/admin/seoClient.test.ts tests/vitest/ui/seo-manager.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
