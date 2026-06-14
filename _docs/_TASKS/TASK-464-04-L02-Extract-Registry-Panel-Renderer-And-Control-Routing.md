# TASK-464-04-L02: Extract Registry Panel Renderer And Control Routing
# FileName: TASK-464-04-L02-Extract-Registry-Panel-Renderer-And-Control-Routing.md

**Parent Subtask:** TASK-464-04
**Priority:** High
**Category:** Pages / Admin UI / Floating Panel
**Estimated Effort:** Medium
**Dependencies:** TASK-464-04-L01
**Status:** ⏳ To Do

---

## Overview

Extract registry-driven section/block panel rendering and control routing from
`ToolbarSubpanel` into a Page-specific adapter over the reusable floating
toolbar shell.

Hard constraint: no UX/UI changes. Keep panel order, panel labels, grid layout,
control primitives, add-block button placement, and close behavior unchanged.

---

## Sub-Tasks

- [ ] Extract Page registry panel component.
- [ ] Keep section/block control selection logic identical.
- [ ] Keep section variant control behavior identical.
- [ ] Preserve unsupported-control fail-closed behavior.
- [ ] Add panel routing tests.

---

## Implementation Pseudocode

```tsx
export function PageEditorRegistryPanel(props: PageEditorRegistryPanelProps) {
  const blockControls = resolveBlockControls(props.target, props.panel);
  const sectionControls = resolveSectionControls(props.section, props.panel);
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
- No `dangerouslySetInnerHTML`.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
