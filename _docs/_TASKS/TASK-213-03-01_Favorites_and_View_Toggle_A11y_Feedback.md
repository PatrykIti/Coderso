# TASK-213-03-01: Favorites and View Toggle A11y Feedback
# FileName: TASK-213-03-01_Favorites_and_View_Toggle_A11y_Feedback.md

**Priority:** High
**Category:** Widget Library + Accessibility + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-213-03, TASK-208
**Status:** To Do

---

## Overview

Fix `BUG-2` and `UX-4` from the Widget Library report.

Favorite star buttons and grid/list view toggle buttons need accessible names,
truthful pressed/selected state, and visible feedback. The favorite save path
also needs bounded success/error feedback so editors are not left guessing
whether a favorite toggle persisted.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetCard.tsx`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/shared/actionToasts.ts` only if adding a shared small action
  helper is appropriate
- `tests/vitest/ui/widget-card.test.tsx`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/unit/settings/userSettingsService.test.ts` only if settings validation
  changes

## Implementation Direction

Favorite button:

```tsx
const favoriteLabel = isFavorite
  ? `Remove ${name} from favorites`
  : `Add ${name} to favorites`;

<Button
  aria-label={favoriteLabel}
  title={favoriteLabel}
  aria-pressed={isFavorite}
>
  <Star className={cn(isFavorite && "fill-yellow-400 text-yellow-500")} />
</Button>
```

View toggle:

```tsx
<Button aria-label="Show widgets as grid" aria-pressed={view === "grid"} />
<Button aria-label="Show widgets as list" aria-pressed={view === "list"} />
```

Favorites feedback should use the shared Admin UI toast path for success/error
or a clearly visible inline status if product chooses not to toast every toggle.

## Security Contract

- Visibility: internal admin Widget Library.
- Auth model: existing admin session/API-key user-settings write.
- RBAC: existing user settings/write permission.
- CSRF: `setUserSetting` keeps existing CSRF behavior.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: `widgets.favorites` remains a bounded string array.
- Anti-abuse: never include raw settings payloads, headers, or API errors in
  visible feedback.

## Testing Requirements

- `tests/vitest/ui/widget-card.test.tsx`
  - favorite button label changes with state;
  - `aria-pressed` matches visual state.
- `tests/vitest/ui/widget-library.test.tsx`
  - grid/list buttons have labels and selected state;
  - favorite success/failure feedback is visible/bounded.
- Manual Playwright:
  - hover/focus favorite star;
  - toggle favorite and inspect visual/sidebar count/state;
  - use grid/list toggle and verify visible layout/state changes.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `docs/coderso/widget-library.md` if favorite/view behavior copy changes.

## Acceptance Criteria

1. Favorite buttons are accessible and stateful.
2. View toggle buttons are labeled and expose selected state.
3. Favorite persistence success/failure is visible.
4. No raw user-settings data leaks through UI feedback.
