# TASK-421-04: Responsive Override Tooltip And Panel Polish
# FileName: TASK-421-04-Responsive-Override-Tooltip-And-Panel-Polish.md

**Parent Task:** TASK-421
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-421-03
**Status:** ⏳ To Do

---

## Overview

Polish the floating inspector behavior so it matches the reference interaction:
single open subpanel, icon tooltips, visible override badges, reset inheritance
actions, scrollable subpanels, and no panel overflow outside the editor viewport.

---

## Implementation Pseudocode

```tsx
function FloatingInspector({ activePanel, selection }) {
  return (
    <div data-page-editor-floating-toolbar>
      <ToolbarIconGroup tooltips />
      {activePanel ? (
        <InspectorSubpanel
          panel={activePanel}
          maxHeight="viewport-safe"
          overflow="auto"
          responsiveState={resolveResponsiveState(selection)}
        />
      ) : null}
    </div>
  );
}
```

Expected data flow:

- Tooltip labels come from toolbar panel/action metadata.
- Override badges continue using existing responsive override readers.
- Subpanels remain visible and scrollable within the browser/editor viewport.
- Keyboard shortcuts keep ignoring editable fields.

Regression-test shape:

- Tests assert only one panel is open at a time.
- Tests assert tooltip labels/title/aria-labels are present.
- Tests assert subpanel has bounded height/overflow contract.
- Tests assert override/inherited/base states remain correct.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** no schema changes.
- **Anti-abuse controls:** tooltips must not include secrets or raw payloads.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- Playwright CLI smoke for real viewport overflow/scroll behavior.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
