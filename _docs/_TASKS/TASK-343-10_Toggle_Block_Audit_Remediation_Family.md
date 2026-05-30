# TASK-343-10: Toggle Block Audit Remediation Family

# FileName: TASK-343-10_Toggle_Block_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Toggle Block + Runtime + Theme + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Fix the confirmed Toggle Block contrast regression where setting `Accent color`
makes the active trigger label unreadable and turns `Accent contrast color` into
a dead control. Also keep the contrast advisory truthful for the real rendered
color pair and document the admin preview's non-interactive runtime boundary.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_TOGGLE_BLOCK_WIDGET.md:184-190,214-220`
- `core/widgets/core/toggleBlock.tsx`

## Sub-Tasks

- [x] Stop applying the accent text color inline to the active trigger.
- [x] Restore real ownership of `accentContrastColor` for active-trigger text.
- [x] Make the contrast advisory evaluate the real rendered foreground/background
  pair, not only the intended token pair.
- [x] Make the non-interactive admin/Wizard preview state explicit or add a
  React-local preview switcher if product scope requires interaction there.
- [x] Clean up duplicated `shadow-sm` when pane surface and border emphasis both
  contribute the same class.
- [x] Route any remaining shared color/default wording from the report to
  `TASK-343-30` and any shared wrapper/visibility wording to `TASK-343-21` so
  Toggle-local scope does not hide shared follow-ups.
- [x] Add renderer regression coverage for contrast and class composition.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/core/toggleBlock.tsx` | Separate inactive text color from active contrast handling. |
| `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` | Align advisory copy/state and admin preview guidance with rendered behavior. |
| `tests/vitest/widgets/toggleBlock.test.tsx` | Cover active/inactive trigger colors and duplicate shadow cleanup. |
| `tests/vitest/ui/toggle-block-editor-wave.test.tsx` | Cover contrast advisory truthfulness and preview-boundary messaging. |
| `_docs/PLAYWRIGHT/28-05-2026/REPORT_TOGGLE_BLOCK_WIDGET.md` | Update final task routing. |

## Implementation Pseudocode

```ts
function resolveTriggerStyle(style: ToggleBlockStyle, isActive: boolean): CSSProperties | undefined {
  if (isActive) return undefined;
  return style.accentColor ? { color: style.accentColor } : undefined;
}
```

This helper is new. The current renderer has one trigger style object; the fix
must split active foreground from inactive/accent styling instead of reusing the
same inline color for both states.

## Regression Test Shape

- Active trigger text uses contrast color when accent is set.
- Inactive trigger text may still inherit accent styling if that remains the
  intended design.
- Contrast guidance cannot report safe contrast when the real active trigger is
  unreadable.
- Admin preview either switches panels locally or clearly states that public
  runtime interactivity is not mounted in the editor preview.
- Pane class output does not duplicate `shadow-sm`.
- Active trigger output is asserted directly so it cannot receive inline
  `color: accentColor` again.

## Security Contract

No API routes are added.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_TOGGLE_BLOCK_WIDGET.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Active Toggle Block labels remain readable when accent is configured.
- `Accent contrast color` has a real visible effect.
- The contrast advisory and admin preview copy describe the real rendered state.

## Completion Notes (2026-05-30)

- Active triggers no longer receive inline `color: accentColor`; the active text
  now resolves through `--nextless-toggle-accent-contrast`, while inactive
  triggers may still use the configured accent text color.
- Toggle pane class composition now dedupes repeated utility tokens so
  Contrast surface plus Strong border emits a single `shadow-sm`.
- Visual and Wizard copy now state that editor previews are static and that
  public pages mount click/keyboard switching. The Theme advisory label now
  describes the rendered active-trigger color pair.
- Shared wrapper visibility wording remains routed to `TASK-343-21`; shared
  color/default vocabulary remains routed to `TASK-343-30`.

## Validation Executed (2026-05-30)

- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-10
  drift review: no blockers; verified minor fallback note as non-issue because
  unknown contrast states still render the shared notice)
