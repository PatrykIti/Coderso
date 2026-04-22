# TASK-194-02-02: Create Drawer Validation, Dialog Accessibility, and Settings Microcopy
# FileName: TASK-194-02-02_Create_Drawer_Validation_Affordance_and_Autosave_Microcopy.md

**Priority:** Medium
**Category:** CMS/Pages + Admin/UI + UX Copy
**Estimated Effort:** Small
**Dependencies:** TASK-194-02
**Status:** To Do

---

## Overview

Explain the currently opaque Pages drawer states:

- the primary `Create Page` button is disabled until required input exists,
- Page Settings footer copy talks about `autosave snapshot` instead of the user
  outcome,
- `Max width` becomes disabled with no explanation when `Page width = full`,
- create/settings/history drawers do not provide explicit descriptions and can
  trigger Radix accessibility warnings.

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
- `core/admin/ui/pages/PageSettingsDrawer.tsx:194-220`
  - add explicit drawer description content.
- `core/admin/ui/pages/PageSettingsDrawer.tsx:394-420`
  - explain why `Max width` is disabled for full-width layouts.
- `core/admin/ui/pages/PageSettingsDrawer.tsx:736-759`
  - replace `autosave snapshot` jargon with user-facing language.
- `core/admin/ui/pages/PageRevisionDrawer.tsx:69-87`
  - add explicit history-drawer description content.
- `core/admin/components/ui/sheet.tsx`
  - only if the repo chooses a wrapper-level fallback for optional descriptions
    instead of per-surface descriptions.
- `tests/vitest/ui/page-post-list-wave.test.tsx:565-610`
- `tests/vitest/ui/page-settings-drawer-wave.test.tsx`
- `tests/vitest/ui/page-revision-drawer.test.tsx`

## Implementation Direction

- Keep validation simple: title and slug are still required.
- Add help text instead of tooltip-only behavior so keyboard and touch users can
  understand the disabled state.
- Replace footer jargon with copy that describes the outcome:
  `close to keep one draft version in history`, not `keep one autosave snapshot`.
- Add explicit description content to the create/settings/history drawers rather
  than hiding the warning.
- When `Max width` is disabled, explain the dependency inline or via
  `aria-describedby`; users should not have to infer the `Page width = full`
  rule.

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
  - disabled `Max width` renders helper copy explaining the dependency,
  - updated footer copy renders in dirty and clean states without changing
    autosave behavior.
- `tests/vitest/ui/page-revision-drawer.test.tsx`
  - rendered drawer includes explicit descriptive text for the history flow.
- At least one Vitest path in this leaf must render the real `Sheet` wrapper
  instead of a mock so missing-description regressions fail locally.

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The create drawer explains why `Create Page` is disabled.
2. Settings and history drawers include explicit accessible descriptions.
3. Disabled `Max width` explains why it is unavailable.
4. Footer copy in Page Settings uses user-facing autosave language.
5. No validation rules or autosave behavior change under the hood.
