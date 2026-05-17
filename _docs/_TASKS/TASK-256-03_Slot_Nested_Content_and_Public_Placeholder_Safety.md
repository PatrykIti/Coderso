# TASK-256-03: Slot Nested Content and Public Placeholder Safety

# FileName: TASK-256-03_Slot_Nested_Content_and_Public_Placeholder_Safety.md

**Priority:** High
**Category:** Widgets + Page Builder + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256, TASK-256-01
**Status:** Done (2026-05-17)

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
| `core/widgets/types.ts` | inline `WidgetDefinition.render` props around 98-106 and `WidgetEditorContext` | Add a backward-compatible `WidgetRenderContext`/`renderContext` field that distinguishes public runtime from editor/admin preview. Update the existing `renderBlock?: (block: WidgetBlock) => ReactNode` seam so context cannot be dropped by nested renderers. Add typed repeatable slot target metadata to `WidgetEditorContext` so editors do not rediscover slot topology. |
| `core/widgets/slots.ts` | slot topology helpers | Keep repeatable slot target metadata aligned with the live shared slot topology owner used by `BlockSettings` and structural renderers; update this file if slot target shape/helper behavior changes. |
| `core/widgets/renderers/widgetRenderer.tsx` | 194 and render callsites around 201-214 | Pass the render context to widget renderers through the existing renderer owner and wrap the `renderBlock` callback with the current context so public placeholder behavior is centralized. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | slot target helpers around 42 and editor context assembly | Own repeatable slot target calculation and pass typed targets through `WidgetEditorContext` or run the sync before calling widget editors. |
| `core/admin/ui/pages/builder/BlockList.tsx` | 232 | Pass `renderContext={{ mode: "editor-preview" }}` into the page-builder canvas renderer so editor placeholders remain visible only in the admin canvas. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | repeatable column config section | Read `context.slotTargets` from `BlockSettings` for grid column targets; prevent config count from drifting from actual slots or add explicit sync actions with warnings. |
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | 277-302 | Replace `slot id` copy with user-facing panel labels and metadata. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | 272-297 | Replace `slot id` copy with user-facing item labels and metadata. |
| `core/widgets/core/section.tsx` | 403-413 | Accept `renderContext`/context-aware `renderBlock`, pass that context through nested `WidgetRenderer` calls, and gate `Empty region.` to editor/preview only or render `null` publicly. |
| `core/widgets/core/gridColumns.tsx` | 452-503 | Accept `renderContext`/context-aware `renderBlock`, pass context through column children, gate `Empty column.` to editor/preview only, and preserve layout wrappers only when needed. |
| `core/widgets/core/splitLayout.tsx` | 247-270 | Accept `renderContext`/context-aware `renderBlock`, pass context through pane children, and gate `Empty left/right pane.` to editor/preview only. |
| `core/widgets/core/tabs.tsx` | 498-505 | Accept `renderContext`/context-aware `renderBlock`, pass context through tab panel children, and gate `Add widgets to this tab panel.` to editor/preview only. |
| `core/widgets/core/accordion.tsx` | 361-368 | Accept `renderContext`/context-aware `renderBlock`, pass context through accordion children, and gate `Add widgets to this accordion item.` to editor/preview only. |
| `core/widgets/core/toggleBlock.tsx` | 357-384 | Accept `renderContext`/context-aware `renderBlock`, pass context through both view panes, and gate `Add widgets for the primary/secondary view.` to editor/preview only. |

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

type WidgetEditorSlotTarget = {
  definitionId: string;
  slotId: string;
  label: string;
};

type WidgetEditorContext = {
  surface: WidgetSurface;
  jumpToBindingPropPath?: (propPath: string) => void;
  getBindingState?: (propPath: string) => "literal" | "bound" | "mixed";
  slotTargets?: WidgetEditorSlotTarget[];
};

type RenderBlockWithContext = (
  block: WidgetBlock,
  context?: WidgetRenderContext
) => ReactNode;

type WidgetRendererPropsWithContext = {
  block: WidgetBlock;
  pageDefaults?: WidgetRendererPageDefaults;
  previewDevice?: DeviceTarget;
  renderContext?: WidgetRenderContext;
  renderBlock?: RenderBlockWithContext;
};

function WidgetRenderer({
  block,
  pageDefaults,
  previewDevice,
  renderBlock,
  renderContext: incomingContext,
}: WidgetRendererPropsWithContext) {
  const def = getWidget(block.type);
  if (!def) return <MissingWidget type={block.type} />;

  const normalized = normalizeWidgetBlock(block);
  if (normalized.visibility?.enabled === false) return null;

  const renderContext: WidgetRenderContext = incomingContext ?? {
    mode: "public",
    previewDevice,
  };
  const renderBlockWithContext: RenderBlockWithContext = (child, nextContext = renderContext) =>
    renderBlock ? (
      renderBlock(child, nextContext)
    ) : (
      <WidgetRenderer
        block={child}
        pageDefaults={pageDefaults}
        previewDevice={previewDevice}
        renderContext={nextContext}
      />
    );

  const WidgetComponent = def.render;
  return (
    <WidgetComponent
      data={normalized.data}
      variant={normalized.variant ?? def.variants[0].id}
      slots={normalized.slots}
      previewDevice={previewDevice}
      pageDefaults={pageDefaults}
      blockId={normalized.id}
      renderContext={renderContext}
      renderBlock={renderBlockWithContext}
    />
  );
}
```

Nested renderer rule:

```tsx
function renderNestedBlock(block: WidgetBlock, context: WidgetRenderContext) {
  return props.renderBlock
    ? props.renderBlock(block, context)
    : <WidgetRenderer block={block} renderContext={context} />;
}
```

Grid columns sync shape:

```tsx
function reconcileColumnConfigsWithSlots(
  data: GridColumnsData,
  targets: Array<{ slotId: string; label: string }>
): GridColumnsData {
  const normalized = normalizeGridColumnsData(data);
  const columnsById = new Map((normalized.columns ?? []).map((column) => [column.id ?? "", column]));
  const columns = targets.map((target, index) => {
    const parsed = parseRepeatableSlotId(target.slotId);
    const columnId = parsed?.instanceId ?? String(index + 1);
    const existing = columnsById.get(columnId) ?? normalized.columns?.[index] ?? {};
    return {
      ...existing,
      id: columnId,
      label: existing.label?.trim() || target.label || `Column ${index + 1}`,
    };
  });

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
- Existing custom `renderBlock` callsites must be wrapped or extended to accept
  the current context; nested widgets must not fall back to public mode inside
  an editor preview.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve existing widget schemas.
- Anti-abuse: public runtime must not expose admin-only instructions or debug
  IDs.
- Secret handling: no slot metadata should include secrets.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor-slot-insert-flow.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- Add assertions that public output does not contain `Empty column.`,
  `Empty region.`, `Add widgets`, or similar admin-only copy.
- Add renderer assertions for default public mode, page-builder
  `editor-preview` mode, and nested context propagation.
- Add a renderer assertion for a custom `renderBlock` callback receiving or
  preserving the current render context.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/WIDGETS.md` only if render-mode/placeholder contract changes.
- Update structural widget docs for any slot-sync behavior change.
- Update relevant Playwright reports with public/admin before-after evidence.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Empty-slot helper text remains available in editor/admin preview.
- Public runtime output does not contain admin-only placeholder copy.
- Repeatable slot widgets expose clear, non-technical labels in editors.
- Grid columns no longer require silent manual slot/config synchronization.
- Tests cover both editor affordance and public-render safety.
