# TASK-215-04-01: Favorites Section Actions and User Settings
# FileName: TASK-215-04-01_Favorites_Section_Actions_and_User_Settings.md

**Priority:** High
**Category:** Coderso Widgets + Favorites + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-215-04
**Status:** Done (2026-04-26)

---

## Overview

Make `Favorites` a first-class section in the new dropdown/table/grid flow.
Favorites shows favorite core widgets and favorite templates, with management
actions focused on removing favorites and then source-specific Edit/Insert
actions where applicable. Destructive template management does not run from
the Favorites context; template Duplicate/Delete belongs to the Templates
section action contract.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/widgetLibraryUtils.ts`
- `core/admin/services/userSettingsClient.ts` only if typing needs a compatible
  update.
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
- `tests/vitest/admin/userSettingsClient.test.ts` only if the admin settings
  client typing or cache behavior changes.
- `tests/unit/settings/userSettingsService.test.ts` and
  `tests/integration/routes/userSettings.test.ts` only if settings validation
  or route behavior changes.

## Security Contract

- Visibility: internal admin UI.
- Auth model: authenticated admin user settings path.
- RBAC: unchanged user setting access plus `widgets:read` for catalog rows.
- CSRF: `setUserSetting` keeps existing transport behavior.
- Rate-limit bucket: existing user/admin write bucket.
- Reject-unknown validation: persisted favorites remain a string array.
- Anti-abuse: preserve max-50 favorites and remove only ids present in the
  active authorized catalog/template rows.

## Pseudocode

```ts
function buildFavoritesRows(rows: WidgetLibraryRow[], favoriteIds: Set<string>) {
  return rows.filter((row) => favoriteIds.has(row.id));
}

function getFavoriteActions(row: WidgetLibraryRow): WidgetLibraryAction[] {
  const sourceActions =
    row.source === "core"
      ? ["preview-placeholder", "edit", "insert"]
      : ["preview-placeholder", "edit-template"];

  return [...sourceActions, "remove-favorite"];
}

async function removeVisibleFavorites(ids: string[]) {
  const visibleIds = new Set(visibleRows.map((row) => row.id));
  const next = new Set(favoriteIds);
  for (const id of ids) {
    if (visibleIds.has(id)) next.delete(id);
  }
  await setUserSetting("widgets.favorites", Array.from(next));
  trimSelectionToVisibleRows();
}
```

## Testing Requirements

- Favorites section includes favorite core widgets and favorite templates.
- Row action `Remove from favorites` updates `widgets.favorites`.
- Favorite template rows do not expose Duplicate/Delete from the Favorites
  context.
- Bulk remove affects only visible selected favorite rows.
- Removing favorites trims selection and updates counts.
- If this task changes the `widgets.favorites` client/schema contract, settings
  client/unit/route coverage is mandatory.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widgetLibraryUtils.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CMS_API.md` only if user setting docs change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Favorites is no longer a rail-only state.
2. Favorite management is table/grid compatible.
3. Favorites cannot mutate non-visible rows.
