# TASK-202-02-03: Row Action Menu and Editor Lifecycle Entry Points
# FileName: TASK-202-02-03_Row_Action_Menu_and_Editor_Lifecycle_Entry_Points.md

**Priority:** Medium
**Category:** CMS/Engine + Admin/UI + Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-202-02, TASK-202-02-02; TASK-202-03-01 only to enable active Delete
**Status:** To Do

---

## Overview

Replace the single `Edit` action from `ContentTypeTable.tsx:104-108` with a
clear lifecycle action surface for Edit, Duplicate, and Delete. This leaf owns
discoverable entry points only. Delete must render disabled or unavailable until
`TASK-202-03-01` lands the server guard, then `TASK-202-03-02` owns enabling the
real delete confirmation flow. Do not make this leaf depend on all of
`TASK-202-03`; that creates a cycle with the destructive-safety family.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeTable.tsx:104-108`
  - replace the single inline `Edit` button with the list-owned row action menu
    for Edit / Duplicate / Delete.
- `core/admin/ui/content-types/ContentTypeEditor.tsx:353-382`
  - this is the current editor toolbar owner for save/publish/preview actions;
    add lifecycle entry points here only if the final UX keeps them in the
    sticky toolbar. If lifecycle actions are moved to a dedicated header or
    danger-zone section, document that owner before implementation and keep the
    behavior wired through existing admin route/action helpers.
- shared menu/dialog primitives already used by Pages/Posts/Menus where
  applicable.
- `tests/vitest/ui/content-type-table.test.tsx`
- `tests/vitest/ui/content-type-editor.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged.
- RBAC: UI affordances must respect existing write/publish capability if the
  app exposes permission-aware controls.
- CSRF: mutations continue through client wrappers.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - destructive actions are confirmation-gated,
  - disabled delete must explain why when entries exist or guard data is
    unavailable,
  - row menu labels must name the target type.

## Testing Requirements

- Row menu contains accessible Edit, Duplicate, and Delete actions.
- Delete action is disabled or unavailable before `TASK-202-03-01`; after the
  guarded delete service exists, `TASK-202-03-02` may wire the active
  confirmation flow through this entry point.
- Editor lifecycle actions mirror list behavior through the chosen existing
  owner without hand-built hrefs or a second action system.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Lifecycle actions are discoverable from the list and editor.
2. Delete cannot be triggered as an unsafe direct action.
3. Navigation uses shared admin route helpers.
