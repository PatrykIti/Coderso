# TASK-220-04: Form, Drawer, Dialog, and Derived Field State
# FileName: TASK-220-04_Form_Drawer_Dialog_and_Derived_Field_State.md

**Priority:** High
**Category:** Admin/UI + Derived State
**Estimated Effort:** Large
**Dependencies:** TASK-220-01
**Status:** To Do

---

## Overview

Fix effects that repair local form/dialog state after render: auto-slugs,
default selections, dialog resets, preview steps, settings snapshots, and route
derived profile/user selections. These should move to initializers, reducers, or
event handlers so UI does not render an intermediate incorrect state.

## Sub-Tasks

- [ ] TASK-220-04-01: Create Drawers Auto Slug and Reset State
- [ ] TASK-220-04-02: Dialog Preview Picker and Slot Derived State
- [ ] TASK-220-04-03: Settings Form Snapshots and Profile Route State

## Security Contract

- Visibility: internal admin UI form/dialog state.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged.
- CSRF: existing writes unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged; route/service schemas still own payload
  validation.
- Anti-abuse: do not introduce client-only validation as a substitute for
  backend validation; preserve destructive confirmations.
- Secret handling: settings forms must not expose secret values.

## Testing Requirements

- Focused Vitest for changed drawers/dialogs/settings forms.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed form/dialog/settings files are free of `set-state-in-effect` findings.
2. Reset/default behavior remains deterministic across open/close and route
   transitions.
3. No backend validation or security boundary is weakened.
