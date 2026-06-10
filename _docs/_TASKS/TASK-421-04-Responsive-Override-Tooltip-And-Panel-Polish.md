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
The panel must be slightly shorter than the browser/editor viewport; long
content scrolls inside the subpanel, while the header/title and any close or
collapse action remain reachable.

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
          maxHeight="min(72vh, calc(100dvh - toolbarAndChromeOffset))"
          overflowY="auto"
          stickyHeader
          stickyActions
          responsiveState={resolveResponsiveState(selection)}
        />
      ) : null}
    </div>
  );
}
```

Expected data flow:

- Tooltip labels and hover descriptions come from toolbar panel/action metadata,
  not from ad hoc button `title` strings.
- Override badges continue using existing responsive override readers.
- Subpanels remain visible and scrollable within the browser/editor viewport;
  accepted implementation uses a concrete bounded-height class or inline style
  such as `max-h-[min(72vh,calc(100dvh-8rem))]` plus `overflow-y-auto`.
- The subpanel title/category header remains visible while scrolling. If the
  implementation has close/collapse/footer actions, they stay inside the
  bounded panel and never below the bottom edge.
- Command palette / add-section-or-block dialogs touched by this work keep the
  same viewport-safe rule: shell `overflow-hidden`, body `overflow-y-auto`, and
  Close outside the scroll body.
- Keyboard shortcuts keep ignoring editable fields.

Regression-test shape:

- Tests assert only one panel is open at a time.
- Tests assert tooltip labels/descriptions are present in title/aria or the
  project tooltip component.
- Tests assert subpanel has bounded height/overflow contract.
- Tests assert command palette/add-block dialog keeps Close outside the
  scrollable results area.
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
