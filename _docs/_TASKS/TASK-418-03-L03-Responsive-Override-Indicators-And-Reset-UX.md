# TASK-418-03-L03: Responsive Override Indicators And Reset UX
# FileName: TASK-418-03-L03-Responsive-Override-Indicators-And-Reset-UX.md

**Parent Subtask:** TASK-418-03
**Priority:** High
**Category:** Admin UI / Pages / Responsive
**Estimated Effort:** Medium
**Dependencies:** TASK-418-03-L01
**Status:** ⏳ To Do

---

## Overview

Complete the Webflow/Framer-style responsive cascade UX from the redesign:
desktop is base, tablet/mobile edits create sparse overrides, overridden fields
are visibly marked, and each override can be reset to inheritance without
clearing unrelated values.

---

## Implementation Pseudocode

```ts
function readControlValue(document, target, control, breakpoint) {
  const baseValue = readPath(target.base, control.path);
  const overrideValue = breakpoint === "desktop"
    ? undefined
    : readPath(target.responsive?.[breakpoint], control.overridePath);
  return {
    value: overrideValue ?? baseValue,
    inherited: breakpoint !== "desktop" && overrideValue === undefined,
    override: breakpoint !== "desktop" && overrideValue !== undefined
  };
}

function patchResponsiveControl(document, target, control, breakpoint, value) {
  return breakpoint === "desktop"
    ? patchBasePath(document, target, control.path, value)
    : patchOverridePath(document, target, breakpoint, control.overridePath, value);
}

function clearResponsiveControl(document, target, control, breakpoint) {
  return removeOverridePath(document, target, breakpoint, control.overridePath);
}
```

Expected data flow:

- Breakpoint switcher sets edit context.
- Controls read base plus breakpoint override state.
- Canvas/layers show override badges for sections and blocks.
- Reset removes only the selected control path from the breakpoint override.

Error handling:

- Empty override objects are pruned.
- Desktop controls never create `responsive.desktop`.
- Invalid override paths are caught by registry tests.

Regression-test shape:

- Mobile edit writes only `responsive.mobile`.
- Reset removes only the edited field.
- Badge appears on target with breakpoint override.
- Base desktop change propagates when no override exists.

---

## Security Contract

- **Endpoint visibility:** existing internal Pages writes only.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** sparse overrides must normalize through `pageDocumentV2`.
- **Anti-abuse controls:** no public write endpoint; no privileged payloads in
  browser storage.

---

## Testing Requirements

- Vitest pure tests for responsive path patch/reset helpers.
- Vitest UI tests for override badges and reset controls.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
