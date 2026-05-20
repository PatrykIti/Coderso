# TASK-317: Widget Editor Live Preview Surface and Preview-State Contract

# FileName: TASK-317_Widget_Editor_Live_Preview_Surface_and_Preview_State_Contract.md

**Priority:** High
**Category:** Shared Admin UI + Page Builder + Widget Preview
**Estimated Effort:** Large
**Dependencies:** TASK-256-01, TASK-256-03, TASK-275
**Status:** To Do

---

## Overview

Create the exact shared owner for widget-editor live-preview rows that cannot be
closed truthfully inside one widget family. The repo already has shared
`previewState` and atomic block-patch seams, but there is no single shared
editor surface that renders the currently edited widget with the latest local
panel state across Wizard, Visual, and Advanced.

This task owns the shared editor-preview surface contract. Widget families such
as Navigation may consume that surface, but they must not invent widget-local
preview shells when the missing behavior is a builder/editor-platform concern.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:181` - Navigation editor modes
  lack live preview feedback.
- `core/widgets/types.ts:50-60,93-104` - `WidgetPreviewState` and
  `WidgetEditorContext.previewState` already exist as shared preview seams.
- `core/admin/ui/pages/builder/BlockList.tsx:110-117,242` - the page-builder
  canvas already knows how to apply preview-state data patches to the real
  `WidgetRenderer` path.
- `core/admin/ui/widgets/WidgetDetailsDrawer.tsx:28-37` - there is already a
  local configuration-preview host, but it is isolated to the widget library
  drawer and does not solve page-builder live-preview parity for selected
  widgets.
- `_docs/_TASKS/TASK-259-01_Booking_Calendar_Admin_Preview_Runtime_Catalog_Parity.md:25-40`
  - widget families already treat generic preview architecture as shared owner
  scope and split it before local implementation.

## Sub-Tasks

- [ ] Define one shared editor-preview surface for selected widget blocks that
  works in Wizard, Visual, and Advanced without mutating saved widget JSON.
- [ ] Reuse the current block data plus optional `previewState.dataPatch`
  instead of creating a second widget-config model inside editor panels.
- [ ] Keep the preview render path on the real `WidgetRenderer` contract with
  `renderContext={{ mode: "editor-preview" }}` so widget runtime/editor parity
  stays truthful.
- [ ] Keep widget-specific async preview data optional: widgets with their own
  preview resolvers may enrich `previewState`, but this shared task must not
  invent a generic server-preview fetcher.
- [ ] Add focused shared tests for the preview surface plus one consuming widget
  proof after a widget family opts in.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Mount a shared read-only live-preview surface for the selected block and pass the current editor mode, block data, and shared preview state through it. |
| `core/admin/ui/pages/builder/WizardPanel.tsx` | Keep preview placement and mode copy truthful when Wizard uses the shared live-preview surface. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | Keep preview placement and mode copy truthful when Visual uses the shared live-preview surface. |
| `core/admin/ui/pages/builder/AdvancedPanel.tsx` | Keep preview placement and mode copy truthful when Advanced uses the shared live-preview surface. |
| `core/widgets/types.ts` | Reuse or narrowly extend shared editor preview context types only if the surface needs an explicit typed seam. |
| `core/widgets/renderers/widgetRenderer.tsx` | Preserve `editor-preview` render-context propagation so the shared surface renders the same widget/runtime contract as the builder canvas. |
| `tests/vitest/ui/widget-editor-live-preview-surface.test.tsx` | Add a new shared integration-style test for the real `BlockSettings -> WidgetRenderer` preview surface using current block state plus `previewState.dataPatch`. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Add a consuming-widget proof once Navigation uses the shared preview surface. |
| `_docs/PREVIEW_SPEC.md` | Update only if the shared admin preview/editor-preview contract changes. |

## Implementation Pseudocode

```tsx
function WidgetEditorLivePreview({
  block,
  previewState,
}: {
  block: WidgetBlock;
  previewState?: WidgetPreviewState | null;
}) {
  const previewBlock =
    previewState?.dataPatch && block.data && typeof block.data === "object"
      ? {
          ...block,
          data: {
            ...block.data,
            ...previewState.dataPatch,
          },
        }
      : block;

  return (
    <WidgetRenderer
      block={previewBlock}
      renderContext={{
        mode: "editor-preview",
        previewState: previewState ?? null,
      }}
    />
  );
}
```

Error handling:

- If preview rendering fails, keep the panel usable and show a bounded shared
  preview-error state instead of crashing the editor shell.
- Preview-only data patches must never be written back into saved widget JSON
  unless the user changes a real widget-owned field.
- This task must not create a generic remote preview resolver or new preview
  route family; widget-specific async preview data stays with the widget family.

## Data Flow

1. The selected block remains the single editing source of truth.
2. Shared editor panels optionally receive `previewState` from widget-local or
   builder-local preview owners.
3. The shared preview surface derives a read-only `previewBlock` from the
   current block plus any transient `previewState.dataPatch`.
4. `WidgetRenderer` renders that `previewBlock` with
   `renderContext.mode = "editor-preview"` so widgets can keep preview-only
   behavior explicit.
5. Consuming widget families add local tests only for their own preview copy or
   widget-specific preview-state payloads; the shared surface contract remains
   owned here.

## Security Contract

This shared task adds no API routes.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged existing admin editor access.
- Reject-unknown validation: preview-only state must not widen widget schemas.
- Anti-abuse: no secrets, tokens, or privileged server-only payloads may be
  persisted into widget data or emitted in preview diagnostics. The surface must
  reuse existing typed widget data plus bounded preview-state patches only.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/widget-editor-live-preview-surface.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx` when
  Navigation adopts the shared surface
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun scripts/coderso-release-gates.ts --gate ux`
- `bun scripts/coderso-release-gates.ts --gate reliability` when preview state
  ownership or live panel updates change
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/TASK-317_Widget_Editor_Live_Preview_Surface_and_Preview_State_Contract.md`
- `_docs/_TASKS/README.md`
- `_docs/PREVIEW_SPEC.md` only if the shared editor-preview contract changes

## Acceptance Criteria

- The repo has one exact shared owner for widget-editor live preview rows.
- The shared surface renders the currently edited block through the real
  `WidgetRenderer` contract instead of a widget-local mock shell.
- Preview-only state remains transient and does not mutate saved widget JSON by
  itself.
- Widget families can route live-preview report rows to this exact task ID
  instead of vague shared-owner wording.
