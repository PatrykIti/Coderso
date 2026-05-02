# TASK-250-03: Runtime and Registry Unification
# FileName: TASK-250-03_Runtime_and_Registry_Unification.md

**Priority:** High
**Category:** Coderso Custom Screens + Widget Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-250-01, TASK-250-02
**Status:** To Do

---

## Overview

Eliminate the biggest structural drift risks in the current screen widget
stack:

- duplicated rendering logic between preview and dedicated record editor,
- missing end-to-end assertions for the real `admin-editor-view` registry
  contract.

## Sub-Tasks

- [ ] TASK-250-03-01: Canonical Widget Renderer Reuse in the Dedicated Record Editor
- [ ] TASK-250-03-02: `admin-editor-view` Registry, Picker, and Surface Contract Coverage

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenPreview.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx`
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/widgets/registry.ts`
- `core/admin/ui/widgets/registry.ts`
- `tests/vitest/widgets/screenWidgets.test.tsx`
- `tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- `tests/unit/widgets/registry.test.ts`
- new `tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`

## Security Contract

- Visibility: internal admin UI and shared widget runtime only.
- Auth model: unchanged authenticated admin session.
- RBAC:
  - no new permissioned mutation is introduced by this task area,
  - existing screen-definition writes remain under `content:write`,
  - existing entry-save flows remain under `content:write` where surrounding
    editor behavior is touched.
- CSRF: unchanged current admin clients.
- Rate-limit bucket: unchanged current admin buckets.
- Reject-unknown validation:
  - runtime/editor unification must continue to rely on shared widget schema
    validation,
  - registry assertions must reflect the real `admin-editor-view` metadata for
    concrete screen widgets.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- Run the focused suites required by TASK-250-03-01 and TASK-250-03-02.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CMS_API.md` if runtime semantics change
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Preview and dedicated record editor stop maintaining unnecessary divergent
   read-only rendering behavior for the same `screen-*` widgets.
2. `admin-editor-view` registry/picker metadata is asserted end to end.
