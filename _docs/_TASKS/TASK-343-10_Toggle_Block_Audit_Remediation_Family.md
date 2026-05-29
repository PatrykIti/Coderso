# TASK-343-10: Toggle Block Audit Remediation Family

# FileName: TASK-343-10_Toggle_Block_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Toggle Block + Runtime + Theme + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Fix the confirmed Toggle Block contrast regression where setting `Accent color`
makes the active trigger label unreadable and turns `Accent contrast color` into
a dead control.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_TOGGLE_BLOCK_WIDGET.md:184-190,214-220`
- `core/widgets/core/toggleBlock.tsx`

## Sub-Tasks

- [ ] Stop applying the accent text color inline to the active trigger.
- [ ] Restore real ownership of `accentContrastColor` for active-trigger text.
- [ ] Clean up duplicated `shadow-sm` when pane surface and border emphasis both
  contribute the same class.
- [ ] Add renderer regression coverage for contrast and class composition.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/core/toggleBlock.tsx` | Separate inactive text color from active contrast handling. |
| `tests/vitest/widgets/toggleBlock.test.tsx` | Cover active/inactive trigger colors and duplicate shadow cleanup. |
| `_docs/PLAYWRIGHT/28-05-2026/REPORT_TOGGLE_BLOCK_WIDGET.md` | Update final task routing. |

## Implementation Pseudocode

```ts
function resolveTriggerStyle(style: ToggleBlockStyle, isActive: boolean): CSSProperties | undefined {
  if (isActive) return undefined;
  return style.accentColor ? { color: style.accentColor } : undefined;
}
```

## Regression Test Shape

- Active trigger text uses contrast color when accent is set.
- Inactive trigger text may still inherit accent styling if that remains the
  intended design.
- Pane class output does not duplicate `shadow-sm`.

## Security Contract

No API routes are added.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_TOGGLE_BLOCK_WIDGET.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Active Toggle Block labels remain readable when accent is configured.
- `Accent contrast color` has a real visible effect.

