# TASK-051-03: Admin UI — Page Layout Settings
# FileName: TASK-051-03_Admin_UI_Page_Layout_Settings.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-051-01  
**Status:** Done (2026-02-07)

---

## Overview

Expose page-level wrapper controls in the Page Settings panel (WordPress-like):
page width, background, section spacing, and default widget layout.
Keep admin editing UX and runtime preview UX clearly separated but consistent.

---

## Current Progress

Completed:
- Widget template editor now supports template-level layout/appearance settings.
- Widget template runtime preview uses template wrapper settings in runtime render path.
- Widget template API/service/revisions now persist strict `settings.layout`.
- Page Settings drawer now exposes `Template and navigation`, `Layout and appearance`, and `Default widget layout`.
- Page editor applies page wrapper settings in canvas and supports `applyDefaultsToNewBlocks` for inserted widgets.
- Shared `RuntimePreviewDialog` is used by page editor, entry editor, and widget template preview.
- Runtime preview copy now clearly distinguishes canvas (admin theme) vs runtime (site theme).
- UI tests updated for preview parity and page settings sections.

---

## UX Requirements

- Settings appear in **Page Settings** drawer.
- Non-technical labels (e.g. “Page width”, “Section spacing”).
- Provide preview text/hints for each setting.
- Toggle: “Apply defaults to new blocks”.
- Button: “Reset to theme defaults”.
- Distinguish two preview modes in UI copy:
  - Canvas preview (editable, admin theme)
  - Runtime preview (read-only, site theme)
- Reuse the same runtime preview controls pattern for all resources with preview
  (pages, content entries, widget templates).

---

## UI Layout (proposed)

**Page Settings**
1) Template + Show in Nav (existing)
2) **Layout & Appearance**
   - Page width (default / narrow / full)
   - Max width (optional)
   - Background color / image
   - Section spacing (gap)
3) **Default Widget Layout**
   - Default container (inherit)
   - Default padding top/bottom
   - Default margin top/bottom

---

## Preview UX Contract (Admin)

1) Runtime Preview buttons across admin should use one shared behavior:
- same device switcher options
- same loading/error/empty states
- same accessibility and keyboard behavior

2) Resource-specific editors keep their own canvas UX, but runtime preview
opens with a consistent frame and contract.

3) UI should not imply that canvas preview equals final runtime output.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/pages/PageSettingsDrawer.tsx` | add layout controls | sections + fields |
| `core/admin/ui/pages/PageEditor.tsx` | pass settings changes | save to page data |
| `core/admin/ui/pages/builder/blockUtils.ts` | use defaults for new blocks | implemented in `PageEditor` insertion flow |
| `core/admin/ui/preview/RuntimePreviewDialog.tsx` | create/reuse shared runtime preview dialog | common UX for previewables |
| `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx` | align with shared runtime preview UX | avoid custom-only behavior |
| `core/admin/ui/entries/EntryEditor.tsx` | align with shared runtime preview UX | if not already unified |
| `core/admin/services/widgetTemplatePreviewClient.ts` | align response typing with unified preview contract | previewUrl/expiresAt |
| `tests/unit/ui/page-editor.test.tsx` | update snapshot expectations | layout labels |
| `tests/integration/ui/pageBuilder.test.tsx` | ensure new section renders | |
| `tests/unit/ui/widget-template-editor.test.tsx` | runtime preview UX parity assertions | |

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (settings.layout)
- `_docs/CMS_API.md` (page payload fields)
- `_docs/WIDGETS.md` (inheritance behavior)
- `_docs/PREVIEW_SPEC.md` (admin preview behavior and mode split)
