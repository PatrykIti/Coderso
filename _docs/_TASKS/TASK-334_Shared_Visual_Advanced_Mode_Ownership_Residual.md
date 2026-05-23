# TASK-334: Shared Visual/Advanced Mode Ownership Residual

# FileName: TASK-334_Shared_Visual_Advanced_Mode_Ownership_Residual.md

**Priority:** High
**Category:** Widgets + Page Builder + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-290
**Status:** To Do

---

## Overview

Reopen the shared editor-mode ownership drift after `TASK-256-01` because the
current Testimonials editor still duplicates end-user-facing controls across
`Visual` and `Advanced`.

Concrete evidence from `TASK-290` shows `spacing`, `ratingDisplay`, and
`sliderNavigation` still render as writable controls in both modes even though
final closure docs claimed Advanced was technical-only.

## Drift Evidence

- `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` - Visual owns card
  spacing plus slider/rating controls, while Advanced still repeats the same
  three fields.
- `tests/vitest/ui/testimonials-editor-wave.test.tsx` - current widget coverage
  proves the duplicated controls exist, not that ownership is resolved.
- `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` - UX-08 was incorrectly
  closed as fixed in the previous isolated worktree and now remains a shared
  residual on `feature/corrections`.
- `_docs/WIDGETS.md` and `TASK-256-01` remain the source contract for editor
  mode ownership.

## Scope Boundary

In scope:

- Decide the single owner mode for each duplicated Testimonials control.
- Keep `Advanced` technical-only by removing, downgrading to read-only
  diagnostics, or relabeling duplicate controls where appropriate.
- Reconcile any shared docs/report rows that currently claim the duplication is
  solved.

Out of scope:

- Testimonials-only styling or content features already owned by `TASK-290`.
- New widget capabilities unrelated to mode ownership.
- Generic page-builder atomic patch work already completed by `TASK-256-01`.

## Sub-Tasks

- [ ] Audit duplicated writable controls that still appear in both `Visual` and
  `Advanced` for Testimonials and any sibling widgets covered by the same shared
  mode-ownership contract.
- [ ] Choose one owner surface per control and remove or downgrade the
  non-owning duplicate.
- [ ] Update focused widget tests and any shared builder tests that describe the
  final mode ownership.
- [ ] Refresh the affected report/task closure docs so they no longer claim the
  residual drift is fixed prematurely.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TestimonialsEditors.tsx` | Remove or downgrade duplicated `Visual`/`Advanced` controls so one mode owns each field. |
| `tests/vitest/ui/testimonials-editor-wave.test.tsx` | Cover the final single-owner behavior. |
| `_docs/WIDGETS.md` | Confirm the shared editor-mode ownership contract if wording changes. |
| `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` | Move UX-08 from “fixed” to the truthful shared owner until implementation lands. |

## Implementation Pseudocode

```tsx
function renderAdvancedSpacingControl() {
  return <ReadOnlyTokenSummary label="Card spacing token" value={normalized.style?.spacing} />;
}

function renderVisualSpacingControl() {
  return <Select value={normalized.style?.spacing} onValueChange={handleSpacingChange} />;
}
```

Decision flow:

1. Inventory every duplicated writable control.
2. Keep the user-facing editor in one mode only.
3. If Advanced still needs visibility, render a read-only summary instead of a
   second mutating control.
4. Update closure docs only after the new owner split is test-backed.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: not applicable.
- Secret handling: unchanged.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` UX-08 ownership.
- Update any affected widget-mode contract docs if the shared owner wording
  changes.

## Acceptance Criteria

- No duplicated end-user-facing Testimonials control remains writable in both
  `Visual` and `Advanced`.
- Tests prove the final owner mode instead of merely proving both controls
  exist.
- Closure docs no longer claim UX-08 is fixed before the shared owner lands.
