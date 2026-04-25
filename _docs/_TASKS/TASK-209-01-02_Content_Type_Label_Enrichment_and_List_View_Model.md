# TASK-209-01-02: Content Type Label Enrichment and List View Model
# FileName: TASK-209-01-02_Content_Type_Label_Enrichment_and_List_View_Model.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-209-01-01
**Status:** To Do

---

## Overview

Build a Custom Screens list view model that enriches screen rows with
content-type labels without changing the API response shape.

Custom Screens persist `contentTypeId`; the list needs human-readable labels for
filters, table rows, and create-drawer options. Keep the enrichment in the admin
UI/client layer and preserve the current `CustomScreenRecord` contract returned
by `/custom-screens`.

## Sub-Tasks

No child task files.

## Implementation Checklist

- In `CustomScreenListPage` or a small list-local helper, create a deterministic
  view model:

```ts
type CustomScreenListRow = {
  screen: CustomScreenRecord;
  contentTypeLabel: string;
  contentTypeSlug?: string;
  modeLabel: string;
  updatedAt: string;
};
```

- Derive `contentTypeLabel` from `ContentTypeSummary.name` when available and
  fall back to `screen.contentTypeId`.
- Keep content-type fetching cached-first:
  - seed from `getCachedContentTypes()`;
  - revalidate through `listContentTypesCached({ force })` only, using
    foreground loading only when no cached labels exist and background refresh
    when cached labels already hydrated the list;
  - before relying on `getCachedContentTypes()` for the seed, migrate
    `contentTypesClient` list memory to `createMemoryBackedLocalCache` so
    module memory cannot outlive `cacheTtlMs.list`;
  - when cached labels exist, the background revalidation path must still bypass
    stale module memory by using the TTL-backed shared content-type client and
    a forced background revalidation when the cache-bus path requires it;
  - do not extend `contentTypesClient` with a `background` option for this
    task. Background is UI loading-state semantics in the existing Pages/cache
    pattern, while cached service clients own cache reads, request de-dupe, and
    writes;
  - keep any label refresh spinner/error handling in the Custom Screens list
    component or a list-local hook;
  - do not call `listContentTypesCached({ force: true })` unconditionally in
    foreground when cached labels exist.
- Subscribe to `cacheKeys.contentTypesList` in the list or a list-local hook and
  refresh labels in the background when Engine/content-type mutations broadcast
  an update or invalidation.
- Use `resolveCustomScreenCapabilities`/`screen.capabilities` for mode labels;
  do not duplicate capability logic in the list.
- Keep mode copy deterministic:
  - `collection-only` -> `Collection`
  - `dashboard` -> `Dashboard`
  - `editor` -> `Editor`
- Build content-type filter options from the enriched rows plus fetched content
  types. If a screen references a missing content type, expose its stable
  `contentTypeId` as the option label/value instead of hiding the row from the
  filter model.
- Keep `CustomScreenRecord` as the API/client owner. The view model is a UI
  projection only.

## Security Contract

- Visibility: internal admin list read path only.
- Auth model: existing authenticated admin session/admin API key model.
- RBAC: `content:read` for custom screens and content types.
- CSRF: no writes.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: no new API payloads.
- Anti-abuse: no public path or write action.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/contentTypesClient.test.ts`
- New focused view-model test if enrichment is extracted from the component.
- Mounted list test proving a `contentTypes:list` cache-bus event refreshes the
  rendered content-type label without mutating `CustomScreenRecord`.
- Test the missing-content-type fallback so rows with only `contentTypeId`
  remain searchable, filterable, and renderable.
- Add or extend `contentTypesClient` coverage proving expired module memory is
  cleared before storage/network fallback and storage updates are visible after
  the shared list TTL expires.
- Existing records/editor smoke:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-records.test.tsx`

## Documentation Updates Required

- `_docs/ADMIN_CACHE_MAP.md` if content-type cached APIs are added to the
  Custom Screens list entry.
- `_docs/CONTENT_LIST_UX.md` on final closure.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Custom Screen rows show human-readable content-type labels when cached or
   loaded labels are available.
2. Missing content-type labels degrade to the stable `contentTypeId`.
3. Filtering/table code consumes a view model instead of mutating
   `CustomScreenRecord`.
4. The API response and service contract remain unchanged.
5. Content-type cache-bus updates refresh visible labels and filter options.
6. Background label refresh cannot keep serving a module-memory content-type
   list after `cacheTtlMs.list` has expired.
