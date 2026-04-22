# TASK-194-02-02: Create Drawer Validation Affordance and Autosave Microcopy
# FileName: TASK-194-02-02_Create_Drawer_Validation_Affordance_and_Autosave_Microcopy.md

**Priority:** Medium
**Category:** CMS/Pages + Admin/UI + UX Copy
**Estimated Effort:** Small
**Dependencies:** TASK-194-02
**Status:** To Do

---

## Overview

Explain two currently opaque UI states:

- the primary `Create Page` button is disabled until required input exists,
- Page Settings footer copy talks about `autosave snapshot` instead of the user
  outcome.

These are copy/affordance fixes, not persistence or validation redesign.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageCreateDrawer.tsx:59-61`
  - current `canSubmit` rule.
- `core/admin/ui/pages/PageCreateDrawer.tsx:102-145`
  - input helper text / `aria-describedby` / inline requirement copy.
- `core/admin/ui/pages/PageCreateDrawer.tsx:156-181`
  - disabled-state explanation near the primary button.
- `core/admin/ui/pages/PageSettingsDrawer.tsx:736-759`
  - replace `autosave snapshot` jargon with user-facing language.
- `tests/vitest/ui/page-post-list-wave.test.tsx:565-610`
- `tests/vitest/ui/page-settings-drawer-wave.test.tsx`

## Implementation Direction

- Keep validation simple: title and slug are still required.
- Add help text instead of tooltip-only behavior so keyboard and touch users can
  understand the disabled state.
- Replace footer jargon with copy that describes the outcome:
  `close to keep one draft version in history`, not `keep one autosave snapshot`.

## Implementation Sketch

```ts
const createHelp =
  canSubmit ? "Ready to create the page." : "Add a page title to generate a slug and enable Create Page.";
```

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: copy must match actual validation; do not imply optional fields are
  sufficient when they are not.

## Testing Requirements

- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - helper copy appears while the button is disabled,
  - button enables once required fields are present.
- `tests/vitest/ui/page-settings-drawer-wave.test.tsx`
  - updated footer copy renders in dirty and clean states without changing
    autosave behavior.

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The create drawer explains why `Create Page` is disabled.
2. Footer copy in Page Settings uses user-facing autosave language.
3. No validation rules or autosave behavior change under the hood.
