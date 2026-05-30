# TASK-343-15: Navigation Audit Remediation Family

# FileName: TASK-343-15_Navigation_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Navigation + Admin Preview + UX + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Close the Navigation truthfulness drift around incomplete runtime diagnostics,
silent destination removal, broken clear-image fallback, and partial reset
affordances for color controls. The same report also proves admin preview
runtime boundaries and theme-token color state need truthful copy.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_NAVIGATION_WIDGET.md:322-331`
- `core/admin/ui/widgets/editors/NavigationEditors.tsx:1009-1018,1306-1360,1431-1432,1799-1822,1911-1912`
- `core/widgets/core/navigation.tsx:998-1031,1114-1148,1304-1467`

## Sub-Tasks

- [ ] Complete the Advanced runtime summary for all declared read-only paths.
- [ ] Make admin preview limitations explicit for drawer/sub-menu/collapse and
  active-link runtime behavior, or provide bounded React-local preview state.
- [ ] Reconcile `var(--color-bg)` preview resolution so admin and public do not
  imply different default navigation backgrounds without explanation.
- [ ] Stop labeling pristine theme-token defaults as user-saved custom colors.
- [ ] Make link clearing truthful with inline feedback instead of silent render
  removal.
- [ ] Fix `Clear image` so image mode does not fall back to a broken `"Coderso"`
  `src`.
- [ ] Decide and ship a consistent reset policy for the remaining color fields.
- [ ] Route report notes N2/N4/N7 explicitly: either cover them in this family
  or mark them deferred/shared with owner task IDs.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Expand diagnostics, add clearer guidance, and align reset affordances. |
| `core/widgets/core/navigation.tsx` | Fix image fallback and keep normalized items/render output truthful. |
| `tests/vitest/widgets/navigation.test.tsx` | Cover image fallback, item removal semantics, and runtime summary output. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Cover editor diagnostics, preview-boundary copy, theme-token state, and clear/reset affordances. |

## Implementation Pseudocode

```ts
function normalizeNavigationLogoImage(value: string | undefined, type: NavigationLogoType) {
  if (type !== "image") return undefined;
  return value?.trim() ? value : undefined;
}

function normalizeNavigationItems(items: NavigationItemInput[]) {
  return items
    .map((item) => ({ ...item, label: toTrimmedString(item.label), href: normalizeNavigationHref(item.href) }))
    .filter((item) => item.label && item.href);
}
```

The logo-image fix belongs in the existing `normalizeNavigationData` logo
fallback and `NavigationLogoSourceFields` clear handler, not in a duplicate
route/editor-only adapter. `normalizeNavigationItems` already exists; extend it
only if item removal semantics need to change.

## Regression Test Shape

- Clearing a logo image no longer yields a broken fallback `src`.
- Advanced summary surfaces `transparent`, `mobileMode`, `hideCtaOnMobile`,
  and `activeLinkMode`.
- Admin preview copy does not imply public runtime behaviors are interactive
  when React has not mounted the navigation runtime script.
- Pristine theme-token colors are not counted or labeled as author overrides.
- Clearing a destination gives truthful feedback before the render disappears.

## Security Contract

No API routes are added. Existing safe-link rules remain unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_NAVIGATION_WIDGET.md`.
- Update `_docs/_WIDGETS/NAVIGATION.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Navigation diagnostics cover all declared runtime behavior fields.
- Image clear and destination clear are both truthful and recoverable.
- Color/default and admin-preview messaging match the real runtime boundary.
