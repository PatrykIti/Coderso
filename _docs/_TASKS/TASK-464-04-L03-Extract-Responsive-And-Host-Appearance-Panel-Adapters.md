# TASK-464-04-L03: Extract Responsive And Host Appearance Panel Adapters
# FileName: TASK-464-04-L03-Extract-Responsive-And-Host-Appearance-Panel-Adapters.md

**Parent Subtask:** TASK-464-04
**Priority:** High
**Category:** Pages / Admin UI / Floating Panel
**Estimated Effort:** Medium
**Dependencies:** TASK-464-04-L02
**Status:** ⏳ To Do

---

## Overview

Extract the responsive panel content and host appearance panel adapter. Preserve
responsive base/inherited/override semantics, hide-on-screen toggles, reset
actions, and Menu Design appearance panel behavior.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [ ] Move `ResponsivePanelContent` to a Page panel adapter module.
- [ ] Move host appearance panel chrome adapter.
- [ ] Keep responsive badge/readout/reset behavior identical.
- [ ] Keep host appearance panel first-tab behavior identical.
- [ ] Add tests for responsive and host appearance panels.

---

## Implementation Pseudocode

```tsx
export function PageEditorResponsivePanel(props: PageEditorResponsivePanelProps) {
  const target = props.baseBlock ?? props.baseSection;
  const entries = projectPageResponsiveOverrideEntries(props.targetDescriptor, props.device, props.overrideSource);
  return (
    <ResponsivePanelChrome>
      <ResponsiveHideToggleGroup target={target} onChange={props.onVisibleChange} />
      <ResponsiveOverrideList entries={entries} onReset={props.onOverrideReset} />
    </ResponsivePanelChrome>
  );
}

export function HostAppearancePanelSlot(props: HostAppearancePanelSlotProps) {
  return props.panel.render({ document: props.document, device: props.device, updateDocument: props.updateDocument });
}
```

Expected data flow:

- Page responsive adapter receives base target and callbacks.
- Host appearance panel receives only current draft, device, and draft updater.

Error handling:

- Desktop override reset is ignored as today.
- Missing host panel renders no host panel tab.

Regression-test shape:

- Responsive state badges, reset actions, hide toggles.
- Menu Design host appearance panel remains first active panel.

---

## Security Contract

- Host appearance panel writes must use typed draft updater.
- Host appearance content must not bypass sanitizer helpers after TASK-464-06.
- No server/client imports in reusable panel shell.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run check:admin-boundary`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/TASK-464*.md`
