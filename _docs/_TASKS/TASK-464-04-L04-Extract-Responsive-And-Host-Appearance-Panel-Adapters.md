# TASK-464-04-L04: Extract Responsive And Host Appearance Panel Adapters
# FileName: TASK-464-04-L04-Extract-Responsive-And-Host-Appearance-Panel-Adapters.md

**Parent Subtask:** TASK-464-04
**Priority:** High
**Category:** Pages / Admin UI / Floating Panel
**Estimated Effort:** Medium
**Dependencies:** TASK-464-04-L03
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
  return props.panel.render({
    document: props.document,
    device: props.device,
    actions: props.sanitizedHostAppearanceActions
  });
}
```

Expected data flow:

- Page responsive adapter receives base target and callbacks.
- Host appearance panel receives only current draft, device, and typed
  sanitizer-safe actions. If a host still needs draft-style ergonomics, wrap the
  updater so the result is normalized through the Page/Menu owner normalizers
  before persistence.

Error handling:

- Desktop override reset is ignored as today.
- Missing host panel renders no host panel tab.

Regression-test shape:

- Responsive state badges, reset actions, hide toggles.
- Menu Design host appearance panel remains first active panel.

---

## Security Contract

- Host appearance panel writes must use typed sanitizer-safe mutation helpers.
- Raw `(current) => PageDocumentV2` updater callbacks must not cross this
  reusable seam unless wrapped by a normalizing adapter that rejects unsafe
  values before save.
- This leaf must provide the typed/normalizing seam before TASK-464-06 lands;
  TASK-464-06 later centralizes the shared helper owners behind that seam.
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
