# TASK-464-04-L03: Extract Registry Panel Renderer And Control Routing
# FileName: TASK-464-04-L03-Extract-Registry-Panel-Renderer-And-Control-Routing.md

**Parent Subtask:** TASK-464-04
**Priority:** High
**Category:** Pages / Admin UI / Floating Panel
**Estimated Effort:** Medium
**Dependencies:** TASK-464-04-L02
**Status:** ✅ Done
**Completed:** 2026-06-14

---

## Overview

Extract registry-driven section/block panel rendering and control routing from
`ToolbarSubpanel` into a Page-specific adapter over the reusable floating
toolbar shell. Dynamic option sources and media URL lookups must be consumed
only through the provider contracts from TASK-464-04-L02.

Hard constraint: no UX/UI changes. Keep panel order, panel labels, grid layout,
control primitives, add-block button placement, and close behavior unchanged.

---

## Sub-Tasks

- [x] Extract Page registry panel component.
- [x] Keep section/block control selection logic identical.
- [x] Keep section variant control behavior identical.
- [x] Preserve unsupported-control fail-closed behavior.
- [x] Add panel routing tests.

---

## Implementation Pseudocode

```tsx
export function PageEditorRegistryPanel(props: PageEditorRegistryPanelProps) {
  const blockControls = resolveBlockControls(props.target, props.panel, props.optionProvider);
  const sectionControls = resolveSectionControls(props.section, props.panel, props.optionProvider);
  return (
    <FloatingToolbarPanelChrome panel={props.panel} onClose={props.onClose}>
      <RegistryControlGrid
        blockControls={blockControls}
        sectionControls={sectionControls}
        onBlockChange={props.onBlockControlChange}
        onSectionChange={props.onSectionControlChange}
      />
    </FloatingToolbarPanelChrome>
  );
}
```

Expected data flow:

- Registry metadata stays in `pageEditorControlRegistry`.
- UI model stays in `pageEditorControlUiModel`.
- Dynamic options and media URLs are injected through normalized provider
  callbacks; this module never imports clients.
- Page adapter maps registry controls to existing editor control primitives.

Error handling:

- Unknown controls render the current non-mutating unsupported state.
- Invalid values are clamped or rejected before mutation.

Regression-test shape:

- Representative section and block panel selection.
- Ensure no native raw fallback is reintroduced for dedicated controls.

---

## Security Contract

- Control labels/options render as text.
- Control values mutate only through typed callbacks and clamps.
- Dynamic provider results must be normalized before rendering.
- No `dangerouslySetInnerHTML`.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
