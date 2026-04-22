# TASK-194-02: Page Settings and Create Flow Clarity
# FileName: TASK-194-02_Page_Settings_and_Create_Flow_Clarity.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI + UX Copy
**Estimated Effort:** Medium
**Dependencies:** TASK-194, TASK-053
**Status:** To Do

---

## Overview

Clean up the Pages create/settings flows where the UI is currently functional
but misleading:

- template options can be usable while the drawer still claims it is loading,
- `Create Page` stays disabled without telling the user what is missing,
- Page Settings footer copy exposes `autosave snapshot` jargon instead of
  product-facing language,
- Pages sheets/dialogs lack explicit descriptions and trigger Radix a11y
  warnings,
- disabled dependent controls such as `Max width` do not explain why they are
  unavailable.

## Sub-Tasks

- `TASK-194-02-01_Template_Options_Loading_Lifecycle_and_Settings_Status_Copy.md`
- `TASK-194-02-02_Create_Drawer_Validation_Affordance_and_Autosave_Microcopy.md`

## Scope

- Make template loading state truthful and non-blocking.
- Explain create-form validation directly in the drawer.
- Replace technical autosave wording with user-facing language.
- Add description / `aria-describedby` coverage for the Pages drawers touched by
  this wave.
- Explain why dependent settings controls are disabled.

Out of scope:

- a new template-selection architecture,
- changes to revision/autosave persistence semantics,
- a redesign of Page Settings layout already covered by `TASK-053`.

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/pages/PageSettingsDrawer.tsx`
- `core/admin/ui/pages/PageCreateDrawer.tsx`
- `core/admin/ui/pages/PageRevisionDrawer.tsx`
- `core/admin/components/ui/sheet.tsx`
- `tests/vitest/ui/page-settings-drawer.test.tsx`
- `tests/vitest/ui/page-settings-drawer-wave.test.tsx`
- `tests/vitest/ui/page-revision-drawer.test.tsx`
- `tests/vitest/ui/page-post-list-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: copy/loading changes must not hide true backend errors; error
  states remain explicit.

## Testing Requirements

- Vitest coverage for:
  - truthful template-loading copy,
  - disabled create-button helper behavior,
  - disabled dependent-field helper behavior,
  - drawer description / `aria-describedby` coverage,
  - updated autosave wording,
  - no regression to existing settings save/autosave flows.

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/PREVIEW_SPEC.md` only if preview wording changes materially
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Page Settings no longer shows a misleading permanent loading message when the
   template field is already usable.
2. Create Page explains why the primary action is disabled.
3. Pages drawers stop emitting missing-description warnings.
4. Disabled dependent controls explain how to unlock them.
5. Settings footer copy uses user-facing autosave language.
