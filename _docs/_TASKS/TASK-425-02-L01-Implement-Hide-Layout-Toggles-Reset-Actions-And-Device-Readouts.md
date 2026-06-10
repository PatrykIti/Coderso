# TASK-425-02-L01: Implement Hide Layout Toggles Reset Actions And Device Readouts
# FileName: TASK-425-02-L01-Implement-Hide-Layout-Toggles-Reset-Actions-And-Device-Readouts.md

**Parent Subtask:** TASK-425-02
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-425-02, TASK-425-01-L01
**Status:** ⏳ To Do

---

## Overview

Render the dedicated Responsive-panel controls, device labels, and reset
affordances described by the contract so authors can manage overrides directly
instead of hunting for inline badges across unrelated panels.

---

## Sub-Tasks

- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```tsx
function ResponsivePanel({ target, device }) {
  return (
    <>
      <DeviceReadout device={device} />
      <ResponsiveToggle control="visible" />
      <ResponsiveToggle control="stackOnMobile" />
      <ResponsiveResetList target={target} device={device} />
    </>
  );
}
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageDocumentV2.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Device switcher shows explicit width labels and active scope copy.
- Responsive panel renders real toggles and reset actions per target/device.
- Changes keep using the current override-write path.

Error handling:

- Desktop hides override-only controls when no override exists.
- Unsupported targets degrade to an informative empty state only when necessary.

Regression-test shape:

- Vitest UI coverage for toggle behavior, reset rendering, and device readouts.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned override fields may be written.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
