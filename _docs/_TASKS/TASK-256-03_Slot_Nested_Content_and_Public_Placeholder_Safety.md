# TASK-256-03: Slot Nested Content and Public Placeholder Safety

# FileName: TASK-256-03_Slot_Nested_Content_and_Public_Placeholder_Safety.md

**Priority:** High
**Category:** Widgets + Page Builder + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256, TASK-256-01
**Status:** To Do

---

## Overview

Repair slot/nested-content drift so builder controls remain useful in the
editor while public runtime output does not leak admin placeholder copy.

The shared contract says widgets with slots or nested content place structure
controls in named `Visual` or `Advanced` sections. Reports show two separate
drifts: slot/config counts can desynchronize, and empty-slot placeholder copy is
rendered into frontend output.

## Drift Evidence

- `_docs/WIDGETS.md:100-105` requires stable editor metadata and named
  slot/nested-content sections.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:252,270,283` reports that
  `Empty region.` can leak into public frontend output.
- `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md:63,150-160,188-191,215-217`
  confirms manual slot/config desync and public `Empty column.` output.
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:174-176,202,218-224`
  reports redundant slot info and empty pane placeholder UX.
- `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md:91,96` reports unclear panel-slot
  ownership.
- `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md:106` reports technical slot IDs
  exposed to editors.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:124` reports empty placeholder
  leakage for toggle panes.

## Sub-Tasks

- [ ] Add a shared runtime guard for empty-slot placeholders based on a concrete
  renderer context owned by `WidgetRenderer`, not by ad hoc per-widget flags.
- [ ] Replace public placeholder copy with `null` output in production runtime.
- [ ] Keep editor preview affordances visible in page builder/preview only.
- [ ] Synchronize repeatable config counts with slot add/remove actions for
  `grid-columns`.
- [ ] Replace technical slot-id labels with editor-friendly labels plus stable
  `data-widget-control` metadata.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/pages/builder/VisualPanel.tsx` | 101-162 | Keep slot controls in named sections and expose enough metadata for repeated slots without technical copy. |
| `core/widgets/types.ts` | render props around `WidgetBlockRenderProps` | Add a backward-compatible render context or `renderMode` field that distinguishes public runtime from editor/admin preview. |
| `core/widgets/renderers/widgetRenderer.tsx` | 194 and render callsites | Pass the render context to widget renderers through the existing renderer owner so public placeholder behavior is centralized. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | repeatable column config section | Prevent config count from drifting from actual slots or add explicit sync actions with warnings. |
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | 277-302 | Replace `slot id` copy with user-facing panel labels and metadata. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | 272-297 | Replace `slot id` copy with user-facing item labels and metadata. |
| `core/widgets/core/section.tsx` | 403-413 | Gate `Empty region.` to editor/preview only or render `null` publicly. |
| `core/widgets/core/gridColumns.tsx` | 452-503 | Gate `Empty column.` to editor/preview only; preserve layout wrappers only when needed. |
| `core/widgets/core/splitLayout.tsx` | 247-270 | Gate `Empty left/right pane.` to editor/preview only. |
| `core/widgets/core/tabs.tsx` | 498-505 | Gate `Add widgets to this tab panel.` to editor/preview only. |
| `core/widgets/core/accordion.tsx` | 361-368 | Gate `Add widgets to this accordion item.` to editor/preview only. |
| `core/widgets/core/toggleBlock.tsx` | 357-384 | Gate `Add widgets for the primary/secondary view.` to editor/preview only. |

## Implementation Pseudocode

```tsx
type WidgetRenderMode = "public" | "editor-preview" | "admin-preview";

function shouldRenderSlotPlaceholder(mode: WidgetRenderMode | undefined): boolean {
  return mode === "editor-preview" || mode === "admin-preview";
}

function renderSlotPlaceholder(message: string, mode: WidgetRenderMode | undefined) {
  if (!shouldRenderSlotPlaceholder(mode)) return null;
  return (
    <div className="rounded-md border border-dashed px-4 py-5 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
```

Renderer contract shape:

```tsx
type WidgetRenderContext = {
  mode: WidgetRenderMode;
  previewDevice?: "desktop" | "tablet" | "mobile";
};

function WidgetRenderer(props: WidgetRendererProps) {
  const renderContext: WidgetRenderContext = props.renderContext ?? { mode: "public" };

  return renderWidget({
    data: props.data,
    variant: props.variant,
    slots: props.slots,
    previewDevice: props.previewDevice,
    blockId: props.blockId,
    renderContext,
  });
}
```

Grid columns sync shape:

```tsx
function reconcileColumnConfigsWithSlots(data: GridColumnsData, slotIds: string[]): GridColumnsData {
  const bySlot = new Map(data.columns.map((column) => [column.slotId, column]));
  const columns = slotIds.map((slotId, index) =>
    normalizeGridColumnConfig(bySlot.get(slotId), { slotId, index })
  );

  return normalizeGridColumnsData({ ...data, columns });
}
```

Error handling:

- If legacy payloads contain extra configs without matching slots, preserve them
  in data but do not render phantom public columns.
- If slots exist without configs, normalize a default config for preview and
  save it only through an explicit editor update.
- Public renderers should not emit admin instructions.
- If `renderContext` is missing on legacy callsites, default to `public` so
  placeholders fail closed outside the page builder.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve existing widget schemas.
- Anti-abuse: public runtime must not expose admin-only instructions or debug
  IDs.
- Secret handling: no slot metadata should include secrets.

## Testing Requirements

- Update `tests/vitest/pageBuilder/visualPanel.test.tsx` for slot-control
  metadata.
- Update `tests/vitest/ui/page-editor-slot-insert-flow.test.tsx`.
- Update widget editor waves for grid-columns, split-layout, tabs, accordion,
  and toggle-block.
- Update runtime widget tests:
  - `tests/vitest/widgets/section.test.tsx`
  - `tests/vitest/widgets/gridColumns.test.tsx`
  - `tests/vitest/widgets/splitLayout.test.tsx`
  - `tests/vitest/widgets/tabs.test.tsx`
  - `tests/vitest/widgets/accordionWidget.test.tsx`
  - `tests/vitest/widgets/toggleBlock.test.tsx`
- Add assertions that public output does not contain `Empty column.`,
  `Empty region.`, `Add widgets`, or similar admin-only copy.
- Run targeted Vitest suites plus `bun --cwd core lint` and
  `bun --cwd core lint:types`.

## Documentation Updates Required

- Update `_docs/WIDGETS.md` only if render-mode/placeholder contract changes.
- Update structural widget docs for any slot-sync behavior change.
- Update relevant Playwright reports with public/admin before-after evidence.

## Acceptance Criteria

- Empty-slot helper text remains available in editor/admin preview.
- Public runtime output does not contain admin-only placeholder copy.
- Repeatable slot widgets expose clear, non-technical labels in editors.
- Grid columns no longer require silent manual slot/config synchronization.
- Tests cover both editor affordance and public-render safety.
