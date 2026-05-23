# TASK-336-08: Accordion Mode Ownership

# FileName: TASK-336-08_Accordion_Mode_Ownership.md

**Priority:** High
**Category:** Widgets + Accordion + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03
**Status:** To Do

---

## Overview

Remove duplicated Accordion controls from Advanced and align the widget with
the v2 mode ownership contract.

Accordion is a P1 widget because Advanced can still behave like another daily
editor for structure, layout, trigger styling, or panel presentation. Advanced
should help diagnose behavior and ids, not provide a second place to author the
same visible controls.

## Ownership Decision

- `Wizard` owns starter item count, initial open-item behavior, and first-time
  setup guidance.
- `Visual` owns item labels/content affordances, trigger/panel style, spacing,
  icon placement, layout, animation, and public presentation.
- `Advanced` owns read-only open-state diagnostics, item ids, keyboard/a11y
  summary, and runtime behavior notes.

## Sub-Tasks

- [ ] Inventory Accordion writable paths by current mode.
- [ ] Add or update `accordion` `editorContract` metadata.
- [ ] Remove duplicate writable structure/style paths from Advanced.
- [ ] Add read-only Advanced summaries for open behavior and item ids.
- [ ] Preserve existing runtime accessibility behavior.
- [ ] Add focused Vitest UI coverage.
- [ ] Add Playwright admin and public smoke evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/accordion.tsx` | Add/update `editorContract`; preserve schema/runtime behavior. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Remove/downgrade duplicate Advanced controls and use shared metadata. |
| `tests/vitest/widgets/accordion.test.tsx` | Cover schema/runtime regressions if touched. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | Cover mode ownership and Advanced read-only diagnostics. |
| `_docs/_WIDGETS/ACCORDION.md` | Document final ownership if wording changes. |

## Implementation Pseudocode

```tsx
const accordionContract: WidgetEditorContract = {
  version: 2,
  sections: [
    { mode: "wizard", id: "accordion-setup", role: "setup", title: "Accordion setup", writablePaths: ["items", "defaultOpenItemId"] },
    { mode: "visual", id: "accordion-items", role: "content", title: "Items", writablePaths: ["items"] },
    { mode: "visual", id: "accordion-style", role: "visual", title: "Style", writablePaths: ["style.variant", "style.spacing", "style.iconPosition"] },
    { mode: "advanced", id: "accordion-runtime", role: "diagnostics", title: "Runtime diagnostics", writablePaths: [], readOnlyPaths: ["defaultOpenItemId", "items"] },
  ],
};
```

Data flow:

- Visual owns day-to-day content and style edits after initial setup.
- Advanced displays normalized state and technical summaries.
- The renderer continues to consume the same normalized widget data.

Error handling:

- Legacy item ids should be preserved or normalized without breaking saved
  pages.
- Empty accordions should show editor guidance without creating inaccessible
  public markup.
- Advanced must not expose a second writable item editor.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: no public write changes.
- Secret handling: no secrets in diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/accordion.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for `accordion` admin modes and public fixture.

Regression-test shape:

- Advanced does not expose writable item/style controls.
- Visual remains the single owner for content/style.
- Runtime accessibility and open-state behavior remain stable.

## Documentation Updates Required

- Update Accordion widget docs if ownership wording changes.
- Update Playwright report rows for Accordion P1 closure.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Accordion Advanced is technical/read-only, not a duplicate Visual surface.
- Widget contract and DOM metadata are present and test-backed.
- Public rendering behavior does not regress.

