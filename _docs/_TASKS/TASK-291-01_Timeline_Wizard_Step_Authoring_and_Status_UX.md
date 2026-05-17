# TASK-291-01: Timeline Wizard Step Authoring and Status UX

# FileName: TASK-291-01_Timeline_Wizard_Step_Authoring_and_Status_UX.md

**Priority:** High
**Category:** Widgets + Admin UI + Timeline Editor
**Estimated Effort:** Large
**Dependencies:** TASK-291, TASK-256-01
**Status:** To Do

---

## Overview

Repair Timeline Wizard authoring so the beginner path can safely edit the full
Timeline model called out by `REPORT_TIMELINE_WIDGET.md`.

This leaf owns Timeline-only Wizard behavior for C1-C4, U5, and U7. It does not
implement the shared atomic block update mechanism from TASK-256-01.

## Sub-Tasks

- [ ] Replace the Wizard `steps.slice(0, 4)` quick-title surface with a bounded
  all-step editor for every normalized step from `timelineStepMin` to
  `timelineStepMax`.
- [ ] Add Wizard status controls with an explicit `None` option that removes
  `step.status` instead of serializing a fake status.
- [ ] Add Wizard icon and accent controls for each step with compact guidance.
- [ ] Add step removal from Wizard with `timelineStepMin` guard, a clear target
  step label, and either confirmation or immediate undo.
- [ ] Warn when `style.titleSize === "none"` would make step titles invisible.
- [ ] Keep Wizard density beginner-safe; deeper fields remain in Visual.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Expand `TimelineWizardEditor`, add optional-status handling, icon/accent controls, and remove/undo or confirm flow. |
| `core/widgets/core/timeline.tsx` | Add schema/default support only if this leaf changes persisted status or Wizard-owned fields. |
| `tests/vitest/ui/timeline-editor-wave.test.tsx` | Cover all-step Wizard editing, no-status clearing, icon/accent fields, remove min guard, and hidden-title warning. |
| `tests/vitest/widgets/timeline.test.tsx` | Cover any schema/default/normalizer change introduced by this leaf. |

## Implementation Pseudocode

```tsx
const statusOptions = [
  { id: "__none__", label: "No status" },
  { id: "upcoming", label: "Upcoming" },
  { id: "current", label: "Current" },
  { id: "complete", label: "Complete" },
];

function updateWizardStatus(index: number, next: string) {
  updateStep(value, onChange, index, {
    status: next === "__none__" ? undefined : (next as TimelineStatus),
  });
}

function renderWizardStep(step: TimelineStep, index: number) {
  return (
    <TimelineWizardStepCard
      key={step.id ?? index}
      titleValue={step.title}
      statusValue={step.status ?? "__none__"}
      onTitleChange={(title) => updateStep(value, onChange, index, { title })}
      onStatusChange={(status) => updateWizardStatus(index, status)}
      onIconChange={(icon) => updateStep(value, onChange, index, { icon })}
      onAccentChange={(accent) => updateStep(value, onChange, index, { accent })}
      onRemove={() => removeStep(value, onChange, index)}
      removeDisabled={steps.length <= timelineStepMin}
    />
  );
}
```

Data flow:

1. Normalize incoming steps through `normalizeTimelineSteps(value.steps)`.
2. Render every normalized step, not only the first four.
3. Persist changes through `updateStep()` so existing stable IDs remain intact.
4. Omit `status`, `icon`, and `accent` when the user clears them.

Error handling:

- If a stale payload contains an unknown status, the normalizer keeps it omitted
  and the Wizard shows `No status`.
- If removing a step would drop below `timelineStepMin`, disable the action and
  keep the current payload unchanged.
- If an accent value is not a hex color, preserve the text field for later
  shared validation but avoid forcing the color swatch to overwrite it.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless new persisted fields are added;
  then update `timelineSchema` and validator coverage.
- Anti-abuse: no public write path. Icon and accent values remain plain data and
  must not be rendered as HTML or class names.
- Secret handling: no secrets in editor state, diagnostics, or test fixtures.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx` if schema or
  normalizer behavior changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Include this leaf in final `bun run scan:security:strict` and
  `bun run precommit` before closure.

## Documentation Updates Required

- Update `_docs/_WIDGETS/TIMELINE.md` with final Wizard responsibilities.
- Update `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` with fixed/deferred
  status and textual evidence for C1-C4, U5, and U7.
- Update `_docs/_TASKS/README.md` and changelog only when this leaf or the
  umbrella is closed.

## Acceptance Criteria

- Wizard can edit all 3-8 Timeline steps.
- Wizard can set and clear status without forcing `upcoming`.
- Wizard can edit icon/accent and remove a chosen step safely.
- `titleSize: none` has visible editor feedback before users hide titles.
- Tests prove the previous four-step Wizard regression cannot return.
