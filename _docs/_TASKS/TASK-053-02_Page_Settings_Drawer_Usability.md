# TASK-053-02: Page Settings Drawer Usability
# FileName: TASK-053-02_Page_Settings_Drawer_Usability.md

**Priority:** High  
**Category:** CMS/Pages + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-052-04  
**Status:** To Do  

---

## Overview

Fix Page Settings Drawer usability issues:
- ensure the drawer content scrolls on wide screens,
- make template selection reliably editable after page creation,
- keep local form state in sync when the drawer opens or the page changes.

---

## Scope

1. **Scrollable drawer**: ensure settings content scrolls when taller than viewport.
2. **Template editability**: template can be changed after page creation.
3. **State reset rules**: when opening the drawer or switching pages, form values reset to the latest page settings.
4. **No data loss**: avoid overwriting in-progress edits while the drawer stays open.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/pages/PageSettingsDrawer.tsx` | update | add `useEffect` to reset `title/slug/template/showInNav/layout` on open or page change; keep unsaved edits while open |
| `core/admin/ui/pages/PageSettingsDrawer.tsx` | update | fix scroll container layout (ensure `min-h-0`, `h-full`, and `overflow-hidden` on parent + `ScrollArea` gets real height) |
| `core/admin/ui/pages/PageEditor.tsx` | verify | ensure `PageSettingsDrawer` re-mount keying is correct; avoid stale props |
| `tests/unit/ui/page-settings-drawer.test.tsx` | new | verify template value updates on open + on page change |
| `tests/unit/ui/page-editor.test.tsx` | update | confirm template changes persist via `onSave` payload |

---

## Acceptance Criteria

1. On wide screens, the Page Settings drawer scrolls and all fields are reachable.
2. Template selection can be changed after page creation and is persisted on save.
3. Opening the drawer resets fields to the latest page settings without overwriting edits mid-session.

---

## Testing Requirements

- `bun test tests/unit/ui/page-settings-drawer.test.tsx`
- `bun test tests/unit/ui/page-editor.test.tsx`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/CMS_SPEC.md` (page settings behavior + template editing)
