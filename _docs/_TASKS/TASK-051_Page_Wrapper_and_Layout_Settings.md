# TASK-051: Page Wrapper & Layout Settings (WordPress-like)
# FileName: TASK-051_Page_Wrapper_and_Layout_Settings.md

**Priority:** 🔴 High  
**Category:** CMS/Pages + Site/Appearance  
**Estimated Effort:** Large  
**Dependencies:** TASK-002 (Pages data), TASK-010 (Page Builder UI), TASK-044 (Public pages + preview), TASK-045 (Site Themes), TASK-050-01 (Widget template preview)  
**Status:** 🟡 To Do

---

## Overview

Add **page-level wrapper settings** so non‑technical users can control the
overall layout and look of a page **independently from widgets**. This mirrors
WordPress behavior: theme defaults → template structure → page overrides.

**Goal UX:** user can set page width, background, section spacing, and default
widget layout from the Page Settings panel.

---

## Cross-Preview Consistency (Required)

The platform must expose two preview layers with explicit responsibilities:

1) **Editor Canvas Preview (inside admin editors)**
- Fast, editable, in-context preview in builder/editor panels.
- Styled by **Admin UI theme tokens** to keep editing UX consistent.

2) **Runtime Preview (Preview action)**
- Read-only preview rendered by the same runtime pipeline as public pages.
- Styled by **Site theme tokens** and page/widget runtime styles.
- Used for pages, content entries, and widget templates.

Rules that must hold after TASK-051:

1) Preview output and published output must use the same renderer path for a given target type.
2) Page wrapper/layout precedence must be identical in runtime preview and published pages.
3) Widget templates inserted into pages must render with the same rules in canvas, runtime preview, and public output.
4) Preview API contract must be consistent across previewable resources.

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
  Owns normalized page layout data and strict validation used by both preview and runtime.
- **TASK-051-02:** Page Wrapper Rendering + Inheritance  
  Owns runtime/public parity and unified preview rendering contract.
- **TASK-051-03:** Admin UI — Page Layout Settings  
  Owns editor UX split (canvas vs runtime preview) and consistent preview controls in admin.

---

## Definition of Done (Task Level)

1) Runtime preview for pages/templates/content is visually and structurally aligned with published runtime rendering.
2) Admin canvas remains admin-themed while runtime preview remains site-themed.
3) No previewable resource relies on an isolated rendering path that bypasses runtime layout/theme rules.
4) Documentation in `_docs` reflects the final contract and rendering flow.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (page settings + wrapper schema)
- `_docs/WIDGETS.md` (inheritance rules for layout)
- `_docs/SITE_RUNTIME.md` (rendering pipeline w/ wrapper)
- `_docs/CMS_API.md` (page payload fields)
- `_docs/_CHANGELOG/<new>.md`
