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
affordances for color controls.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_NAVIGATION_WIDGET.md:322-331`
- `core/admin/ui/widgets/editors/NavigationEditors.tsx:1009-1018,1306-1360,1431-1432,1799-1822,1911-1912`
- `core/widgets/core/navigation.tsx:998-1031,1114-1148,1304-1467`

## Sub-Tasks

- [ ] Complete the Advanced runtime summary for all declared read-only paths.
- [ ] Make link clearing truthful with inline feedback instead of silent render
  removal.
- [ ] Fix `Clear image` so image mode does not fall back to a broken `"Coderso"`
  `src`.
- [ ] Decide and ship a consistent reset policy for the remaining color fields.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Expand diagnostics, add clearer guidance, and align reset affordances. |
| `core/widgets/core/navigation.tsx` | Fix image fallback and keep normalized items/render output truthful. |
| `tests/vitest/widgets/navigation.test.tsx` | Cover image fallback, item removal semantics, and runtime summary output. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Cover editor diagnostics and clear/reset affordances. |

## Implementation Pseudocode

```ts
function normalizeNavigationLogoImage(value: string | undefined, type: NavigationLogoType) {
  if (type !== "image") return undefined;
  return value?.trim() ? value : undefined;
}

function normalizeNavigationItems(items: NavigationItemInput[]) {
  return items.filter((item) => hasRenderableNavigationDestination(item));
}
```

## Regression Test Shape

- Clearing a logo image no longer yields a broken fallback `src`.
- Advanced summary surfaces `transparent`, `mobileMode`, `hideCtaOnMobile`,
  and `activeLinkMode`.
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

