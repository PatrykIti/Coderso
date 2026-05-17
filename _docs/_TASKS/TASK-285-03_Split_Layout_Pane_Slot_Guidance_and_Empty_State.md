# TASK-285-03: Split Layout Pane Slot Guidance and Empty State

# FileName: TASK-285-03_Split_Layout_Pane_Slot_Guidance_and_Empty_State.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render + Slots
**Estimated Effort:** Medium
**Dependencies:** TASK-285, TASK-256-03
**Status:** To Do

---

## Overview

Repair Split Layout-only slot guidance and empty-state UX from
`_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md`:

- ISSUE-02: the Visual `Pane slots` section is redundant and non-actionable.
- ISSUE-06: empty pane placeholders do not suggest the next admin action.

TASK-256-03 owns public placeholder gating and shared slot metadata. This leaf
must consume that final preview/editor context instead of exposing admin-only
copy in public runtime output.

## Sub-Tasks

- [ ] Replace the redundant `Pane slots` section with one actionable Split
  Layout editor guidance block or remove it when shared Structure already owns
  slot status.
- [ ] Add preview-only empty-pane guidance for admin/editor surfaces after
  TASK-256-03 exposes the render context.
- [ ] Keep public runtime output free of admin-only instructions.
- [ ] Preserve fixed `left` and `right` slot IDs and existing nested widget
  rendering.
- [ ] Add tests that distinguish public SSR output from editor/preview output.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | Remove redundant static slot copy or replace it with action-oriented guidance aligned with shared Structure metadata. |
| `core/widgets/core/splitLayout.tsx` | Add preview-only empty-pane guidance only through the TASK-256-03 render context. |
| `tests/vitest/ui/split-layout-editor-wave.test.tsx` | Assert slot guidance is not duplicated and remains actionable. |
| `tests/vitest/widgets/splitLayout.test.tsx` | Assert public runtime does not render admin-only empty-pane instructions. |
| `tests/vitest/widgets/renderer.test.tsx` | Update when the shared render context or nested renderer assertions change. |

## Implementation Pseudocode

```tsx
function renderSplitPaneEmptyState(side: "left" | "right", context?: WidgetRenderContext) {
  if (!shouldRenderSlotPlaceholder(context?.mode)) {
    return null;
  }

  return (
    <div data-split-empty-pane={side}>
      <p>{side === "left" ? "Left pane is empty" : "Right pane is empty"}</p>
      <p>Add a widget to this pane from the builder insert controls.</p>
    </div>
  );
}

function SplitLayoutVisualEditor() {
  return (
    <EditorSection title="Pane content">
      <p>Left and right panes use builder slots; use the Structure panel for counts and targeting.</p>
    </EditorSection>
  );
}
```

Flow:

1. Read the final TASK-256-03 render-context API before editing.
2. Render empty guidance only when `WidgetRenderContext.mode` confirms an
   editor/admin preview.
3. In public SSR, render no admin instruction for empty panes or keep the final
   TASK-256 null/placeholder behavior.
4. Keep the editor copy aligned with the shared slot insert/Structure UI.

Error handling:

- If TASK-256-03 has not landed a render-context gate, keep this leaf blocked or
  implement only editor-copy cleanup; do not add public placeholder copy.
- Existing saved pages with empty slots must remain renderable.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: empty-state copy must not expose admin URLs, internal IDs,
  secrets, or privileged diagnostics in public output.
- Secret handling: no secrets in widget data, DOM markers, or Playwright report
  evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when shared
  render-context behavior changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before a manual commit for this leaf, also run the TASK-285 implementation
  baseline: `bun run gates:coderso`, `bun run scan:security:strict`, and
  `bun run precommit`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` ISSUE-02 and ISSUE-06
  evidence after implementation.
- Update `_docs/_WIDGETS/SPLIT_LAYOUT.md` slot and empty-state behavior notes.
- Update `_docs/WIDGETS.md` only if TASK-256 changes the shared slot/placeholder
  contract.

## Changelog Policy

- Covered by the TASK-285 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Split Layout editor no longer shows redundant slot instructions.
- Empty-pane guidance is useful in admin/editor preview and absent from public
  runtime output unless a shared public placeholder policy explicitly allows it.
- Fixed left/right slot rendering remains backward compatible.
