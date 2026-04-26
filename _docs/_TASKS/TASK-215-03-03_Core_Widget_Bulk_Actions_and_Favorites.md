# TASK-215-03-03: Core Widget Bulk Actions and Favorites
# FileName: TASK-215-03-03_Core_Widget_Bulk_Actions_and_Favorites.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI + Favorites
**Estimated Effort:** Medium
**Dependencies:** TASK-215-03, TASK-213-03-01
**Status:** To Do

---

## Overview

Add visible-scope bulk favorite management for core widget sections. Bulk
actions should support adding selected visible core widgets to favorites and
removing selected visible core widgets from favorites without crossing section,
filter, or pagination boundaries.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetLibraryBulkActionsBar.tsx` if extracted.
- `core/admin/services/userSettingsClient.ts` only if existing typing needs a
  backward-compatible extension.
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/admin/userSettingsClient.test.ts` only if the admin settings
  client typing or cache behavior changes.
- `tests/unit/settings/userSettingsService.test.ts` and
  `tests/integration/routes/userSettings.test.ts` only if settings validation
  or route behavior changes.

## Security Contract

- Visibility: internal admin UI.
- Auth model: existing authenticated admin session.
- RBAC: user setting writes follow the existing authenticated user settings
  path.
- CSRF: `setUserSetting` keeps the existing admin transport behavior.
- Rate-limit bucket: existing user/admin write bucket.
- Reject-unknown validation: favorite ids are strings from visible catalog rows.
- Anti-abuse: preserve the max-50 favorites limit and do not persist ids that
  are not present in the current authorized catalog result.

## Pseudocode

```ts
const visibleCoreIds = visibleRows
  .filter((row) => row.source === "core")
  .map((row) => row.id);

const selectedVisibleCoreIds = selectedIds.filter((id) =>
  visibleCoreIds.includes(id)
);

async function bulkAddFavorites() {
  const next = new Set(currentFavoriteIds);
  for (const id of selectedVisibleCoreIds) next.add(id);
  if (next.size > 50) {
    showFavoriteLimitError();
    return;
  }
  await setUserSetting("widgets.favorites", Array.from(next));
  trimSelectionToVisibleRows();
}

async function bulkRemoveFavorites() {
  const next = new Set(currentFavoriteIds);
  for (const id of selectedVisibleCoreIds) next.delete(id);
  await setUserSetting("widgets.favorites", Array.from(next));
  trimSelectionToVisibleRows();
}
```

## Testing Requirements

- Bulk add to favorites updates only selected visible core widget ids.
- Bulk remove from favorites updates only selected visible core widget ids.
- Max-50 favorites behavior remains enforced.
- Bulk favorite actions are disabled when no visible eligible row is selected.
- If `widgets.favorites` validation or client typing changes, user settings
  client/unit/route tests cover the change in the correct lane.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CMS_API.md` only if user setting docs change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Bulk favorite actions are visible-scope safe.
2. Favorite persistence still uses `widgets.favorites`.
3. Bulk insert remains out of scope.
