# TASK-464-04: Extract Reusable Floating Toolbar And Panel Module
# FileName: TASK-464-04-Extract-Reusable-Floating-Toolbar-And-Panel-Module.md

**Parent Task:** TASK-464
**Priority:** High
**Category:** Pages / Admin UI / Floating Panel
**Estimated Effort:** Large
**Dependencies:** TASK-464-02, TASK-464-03
**Status:** ⏳ To Do

---

## Overview

Extract the floating toolbar, icon action row, panel tab row, registry
subpanel, host appearance panel slot, responsive panel content, and toolbar
measurement/drag plumbing into reusable modules. The module should be reusable
by Page-v2-like surfaces immediately and by future non-Page-v2 authoring
surfaces through a generic panel descriptor adapter.

Hard constraint: **no UX/UI changes**. Do not change the bottom-centered
position, width, dark surface, border radii, row structure, icons, tooltips,
panel order, collapse/expand behavior, drag behavior, viewport-safe max height,
scroll behavior, or copy.

---

## Sub-Tasks

- [ ] [TASK-464-04-L01](TASK-464-04-L01-Extract-Floating-Toolbar-Shell-And-Action-Row.md): Extract floating toolbar shell and action row.
- [ ] [TASK-464-04-L02](TASK-464-04-L02-Extract-Registry-Panel-Renderer-And-Control-Routing.md): Extract registry panel renderer and control routing.
- [ ] [TASK-464-04-L03](TASK-464-04-L03-Extract-Responsive-And-Host-Appearance-Panel-Adapters.md): Extract responsive and host appearance panel adapters.

---

## Implementation Pseudocode

```tsx
export type FloatingEditorToolbarProps<TPanel extends string> = {
  targetLabel: string;
  targetMeta: string;
  device: PageBreakpoint;
  collapsed: boolean;
  dragging: boolean;
  offset: { x: number; y: number };
  activePanel: TPanel | null;
  panels: readonly FloatingToolbarPanelDescriptor<TPanel>[];
  actions: readonly FloatingToolbarAction[];
  onPanelChange: (panel: TPanel | null) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onDragStart: (event: React.PointerEvent) => void;
};

export function FloatingEditorToolbar<TPanel extends string>(
  props: FloatingEditorToolbarProps<TPanel>
) {
  return <FloatingToolbarShell>{/* copied current markup */}</FloatingToolbarShell>;
}

export function PageEditorRegistryPanel(props: PageEditorRegistryPanelProps) {
  const controls = resolveRegistryControls(props.target, props.panel);
  return controls.map((control) => <RegistryControlField control={control} />);
}
```

Expected data flow:

- Generic toolbar shell owns layout and panel slots.
- Page-specific adapter owns Page v2 registry controls, responsive override
  projection, section variant controls, and section/block mutation callbacks.
- Host appearance panel content remains injected and writes through the same
  draft updater.

Error handling:

- Unknown panel ids fail closed to no active panel.
- Unsupported registry controls render the existing non-mutating unsupported
  control state instead of raw fallback inputs.
- Toolbar measurement failures must not block editing; they only skip extra
  scroll clearance.

Regression-test shape:

- DOM tests assert existing toolbar rows, tooltip labels, panel buttons,
  subpanel viewport markers, host appearance panel behavior, and responsive
  panel markers.
- Interaction tests cover collapse/expand, panel switch, close panel, drag
  state flags, and representative registry control mutation.

---

## Security Contract

- Tooltip labels/descriptions and panel labels must be static or sanitized
  strings; never render untrusted HTML.
- Registry values must mutate only through typed control callbacks and schema
  clamps.
- The toolbar module must not import admin clients, route helpers, runtime
  services, or server-only modules.
- No new `dangerouslySetInnerHTML` path.

---

## Testing Requirements

- New focused Vitest UI suite for the floating toolbar module if practical.
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
- `_docs/_CHANGELOG/` on completion.
