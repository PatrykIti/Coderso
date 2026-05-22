# TASK-283-05-02: Section Angle and Overlay Slider Controls After Shared Ownership Cleanup

# FileName: TASK-283-05-02_Section_Angle_and_Overlay_Slider_Controls_After_Shared_Ownership_Cleanup.md

**Priority:** Medium
**Category:** Widgets + Section + Style + Admin UI + Shared Ownership
**Estimated Effort:** Medium
**Dependencies:** TASK-283, TASK-283-05, TASK-283-05-01, TASK-326
**Status:** To Do

---

## Overview

Close the remaining `TASK-283-05` editor UX finding for `gradientAngle` and
`overlayOpacity` after shared `TASK-326` removes the duplicate Visual/Advanced
ownership contract.

This subtask owns report finding U2 only after the Section editor has one
truthful owner mode for these controls.

## Scope Boundary

In scope:

- slider/stepper controls for `gradientAngle` and `overlayOpacity` in the final
  owning editor section;
- focused editor tests for slider interaction and persisted normalized values;
- report/docs/task closure for U2 once the shared owner cleanup is already
  landed.

Out of scope:

- removing the duplicate Advanced ownership itself;
- shadow/motion/preview work already owned by `TASK-283-05-01`;
- arbitrary animation or preview persistence changes.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:92` - U2 numeric-only angle and
  opacity controls.
- `_docs/_TASKS/TASK-326_Section_Shared_Structural_Truthfulness_Followup.md` -
  duplicate Visual/Advanced ownership must be removed first.

## Sub-Tasks

- [ ] Wait for `TASK-326` to remove duplicate `gradientAngle` / `overlayOpacity`
  ownership from Advanced.
- [ ] Replace or augment the surviving owner-mode controls with sliders and
  stepper-friendly value labels.
- [ ] Add focused Section editor tests for the final control contract.
- [ ] Update Section report/docs/board evidence for U2 closure.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Replace the final owner-mode number inputs with slider/stepper controls after `TASK-326`. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Cover slider interaction and final mode ownership expectations. |
| `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` | Close U2 once the shared owner cleanup is already present. |
| `_docs/_TASKS/TASK-283-05_Section_Surface_Shadow_Motion_and_Preview_Controls.md` | Mark the parent task truthful about the post-`TASK-326` U2 dependency. |

## Implementation Pseudocode

```ts
function renderAngleAndOpacityControls(owner: "visual" | "advanced") {
  assertSharedOwnerCleanupIsLanded();
  return (
    <SectionSliderRow
      angle={normalized.style?.gradientAngle}
      opacity={normalized.style?.overlayOpacity}
      onAngleChange={(next) => updateStyle(value, onChange, { gradientAngle: clampAngle(next) })}
      onOpacityChange={(next) => updateStyle(value, onChange, { overlayOpacity: clampOpacity(next) })}
    />
  );
}
```

Error handling:

- Do not land this task while Advanced still duplicates the same controls.
- Slider state must keep the existing clamping behavior and write only real
  Section style values.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged; no new persisted fields are introduced.
- Anti-abuse: no raw CSS or arbitrary animation strings.
- Secret handling: no secrets in slider UI or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` row U2 after validation.
- Update `_docs/_WIDGETS/SECTION.md` if the final owner-mode control model changes.
- Update `_docs/_TASKS/TASK-283-05_Section_Surface_Shadow_Motion_and_Preview_Controls.md`.

## Acceptance Criteria

- The Section editor exposes `gradientAngle` and `overlayOpacity` in one
  truthful owner mode only.
- Slider/stepper controls preserve current clamping semantics.
- Focused editor tests cover the final control contract.
