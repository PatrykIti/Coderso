# TASK-418-03-L03: Responsive Override Indicators And Reset UX
# FileName: TASK-418-03-L03-Responsive-Override-Indicators-And-Reset-UX.md

**Parent Subtask:** TASK-418-03
**Priority:** High
**Category:** Admin UI / Pages / Responsive
**Estimated Effort:** Medium
**Dependencies:** TASK-418-03-L01, TASK-418-03-L02
**Status:** ✅ Done
**Started:** 2026-06-09
**Completed:** 2026-06-09
**Pre-Implementation Audits:** Read-only subagents
`019eae83-3fcc-7d71-8836-1ea175c0497f`,
`019eae86-c1bd-7811-8124-808488b99f9f`, and
`019eae89-29ab-7653-9633-4c438853ede0`.

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
- **Validation:** sparse overrides must normalize through `pageDocumentV2` and
  preserve strict reject-unknown server validation for persisted payloads.
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

---

## Completion Notes

- Section and block controls now show `Base`, `Inherited`, or `Override` state.
- Tablet/mobile overrides can be reset per field without removing unrelated
  override values.
- Canvas and layers show responsive override badges for section and block
  targets at the current breakpoint.
- `clearBlockResponsiveOverride` mirrors section reset pruning for sparse block
  override objects.
- Final drift audit `019eae91-254a-7c73-b0d5-e712fc1610b9` found and the
  implementation fixed a low pruning mismatch where the last block override
  reset could leave an empty `responsive` object.
- Validation passed:
  - `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx`
  - `bun --cwd core lint:types`
  - `bun --cwd core lint`
