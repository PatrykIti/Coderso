# TASK-215-01-02: Widget Library Cache Hydration and State Ownership
# FileName: TASK-215-01-02_Widget_Library_Cache_Hydration_and_State_Ownership.md

**Priority:** High
**Category:** Coderso Widgets + Admin Cache + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-215-01, TASK-206
**Status:** To Do

---

## Overview

Align Widget Library data loading with the shared list mount policy and make
the shell the explicit owner for section, view, selection, and action targets.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/widgetLibraryUtils.ts` if state normalization helpers
  are extracted.
- `core/admin/utils/adminPrefetch.ts` only if the warmup matrix changes.
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/admin/widgetsClient.test.ts`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
- `tests/vitest/admin/widgetTemplateCategoriesClient.test.ts`
- `tests/vitest/admin/adminPrefetch.test.ts`

## Security Contract

- Visibility: internal admin Widgets UI.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: `widgets:read` for catalog, template, and category reads.
- CSRF: no new writes in this leaf.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: unchanged route schemas.
- Anti-abuse: cache contents must be validated through existing client cache
  guards before being treated as rows.

## Pseudocode

```ts
const mountOptions = resolveListMountRefreshOptions(Boolean(initialCatalog));
await refreshCatalog(mountOptions);
```

State owner shape:

```ts
type WidgetLibraryShellState = {
  section: WidgetLibrarySectionId;
  viewMode: "table" | "grid";
  selectedIds: Set<string>;
  pendingActionTarget: string | null;
};
```

## Testing Requirements

- Cached catalog/category/page data hydrates before background refresh.
- Cache-missing mount uses foreground loading.
- Cache-bus events refresh catalog, template categories, templates, and pages
  without clearing current section/view state.
- Selection is trimmed after rows disappear from refreshed data.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/widgetsClient.test.ts tests/vitest/admin/widgetTemplatesClient.test.ts tests/vitest/admin/widgetTemplateCategoriesClient.test.ts tests/vitest/admin/adminPrefetch.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Widget Library follows cache-present/background and cache-missing/foreground
   mount behavior.
2. Shell-owned state survives background refreshes.
3. Prefetch remains shared and route-based.
