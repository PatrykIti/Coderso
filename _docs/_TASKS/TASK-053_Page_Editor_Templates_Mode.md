# TASK-053: Page Editor Templates Mode
# FileName: TASK-053_Page_Editor_Templates_Mode.md

**Priority:** High  
**Category:** CMS/Pages + Admin/UI + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-049, TASK-052  
**Status:** Done (2026-03-06)  

---

## Overview

Expand page editing with template composition and UX fixes:
- add a Templates mode to insert widget templates as sections,
- fix page settings drawer usability,
- improve runtime preview dialog UX and device sync,
- document and decide on page revision retention,
- reduce FOUC in runtime preview,
- add WordPress-like autosave history for Page Settings.

---

## Sub-Tasks

1. **TASK-053-01** Page Builder Templates Mode (Template Sections)
2. **TASK-053-02** Page Settings Drawer Usability
3. **TASK-053-03** Runtime Preview Dialog UX + Device Sync
4. **TASK-053-04** Page Revisions Retention Policy
5. **TASK-053-05** Runtime Preview FOUC Reduction
6. **TASK-053-06** Page Settings Autosave + History

---

## Acceptance Criteria

1. Template sections can be inserted, reordered, and rendered in runtime preview.
2. Page settings drawer is fully scrollable and allows template changes after creation.
3. Runtime preview uses the current preview device and has a single close button.
4. Revision storage behavior is documented, and retention rules are explicit.
5. Runtime preview no longer flashes unstyled content on first load (or is significantly reduced).
6. Page Settings autosaves are tracked and recoverable.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/TEMPLATE_SECTION.md` (new)
- `_docs/CMS_SPEC.md`
- `_docs/PREVIEW_SPEC.md`
