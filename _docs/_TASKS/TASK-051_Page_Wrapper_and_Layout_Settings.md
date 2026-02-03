# TASK-051: Page Wrapper & Layout Settings (WordPress-like)
# FileName: TASK-051_Page_Wrapper_and_Layout_Settings.md

**Priority:** 🔴 High  
**Category:** CMS/Pages + Site/Appearance  
**Estimated Effort:** Large  
**Dependencies:** TASK-002 (Pages data), TASK-010 (Page Builder UI), TASK-045 (Site Themes)  
**Status:** 🟡 To Do

---

## Overview

Add **page-level wrapper settings** so non‑technical users can control the
overall layout and look of a page **independently from widgets**. This mirrors
WordPress behavior: theme defaults → template structure → page overrides.

**Goal UX:** user can set page width, background, section spacing, and default
widget layout from the Page Settings panel.

---

## Precedence Model

1) **Theme tokens** (global defaults)
2) **Template** structure (widget templates)
3) **Page wrapper settings** (this task)
4) **Block overrides** (widget-level layout/visibility)

Page settings should **not** overwrite explicit block settings unless user
chooses “apply defaults to blocks”.

---

## Sub-Tasks

- **TASK-051-01:** Page Layout Model + Validation  
- **TASK-051-02:** Page Wrapper Rendering + Inheritance  
- **TASK-051-03:** Admin UI — Page Layout Settings

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (page settings + wrapper schema)
- `_docs/WIDGETS.md` (inheritance rules for layout)
- `_docs/SITE_RUNTIME.md` (rendering pipeline w/ wrapper)
- `_docs/CMS_API.md` (page payload fields)
- `_docs/_CHANGELOG/<new>.md`
