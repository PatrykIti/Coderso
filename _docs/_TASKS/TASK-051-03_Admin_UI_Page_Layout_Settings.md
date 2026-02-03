# TASK-051-03: Admin UI — Page Layout Settings
# FileName: TASK-051-03_Admin_UI_Page_Layout_Settings.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-051-01  
**Status:** To Do

---

## Overview

Expose page-level wrapper controls in the Page Settings panel (WordPress-like):
page width, background, section spacing, and default widget layout.

---

## UX Requirements

- Settings appear in **Page Settings** drawer.
- Non-technical labels (e.g. “Page width”, “Section spacing”).
- Provide preview text/hints for each setting.
- Toggle: “Apply defaults to new blocks”.
- Button: “Reset to theme defaults”.

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

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/pages/PageSettingsDrawer.tsx` | add layout controls | sections + fields |
| `core/admin/ui/pages/PageEditor.tsx` | pass settings changes | save to page data |
| `core/admin/ui/pages/builder/blockUtils.ts` | use defaults for new blocks | if enabled |
| `tests/unit/ui/page-editor.test.tsx` | update snapshot expectations | layout labels |
| `tests/integration/ui/pageBuilder.test.tsx` | ensure new section renders | |

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (settings.layout)
- `_docs/CMS_API.md` (page payload fields)
- `_docs/WIDGETS.md` (inheritance behavior)
