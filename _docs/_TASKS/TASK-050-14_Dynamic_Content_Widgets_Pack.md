# TASK-050-14: Dynamic Content Widgets Pack
# FileName: TASK-050-14_Dynamic_Content_Widgets_Pack.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-13, TASK-003-06, TASK-048  
**Status:** To Do

---

## Overview

Section 3 of widget expansion focused on dynamic content consumption.
These widgets connect page/template layout with Content Types entries.

Order inside section:
1) Content List
2) Entry Teaser

---

## Sub-Tasks

- **TASK-050-14-01:** Content List Widget
- **TASK-050-14-02:** Entry Teaser Widget

---

## Shared Runtime Rules

- Fetch and render published content entries only (unless preview context).
- Preserve deterministic SSR output.
- Reuse content route and preview rules from site runtime tasks.
- Expose explicit empty/error states in runtime and preview.

---

## Testing Requirements

- Unit tests for query mapping, fallback behavior, and renderer output.
- UI tests for source selection and filter controls.
- Runtime tests for preview vs published behavior.

---

## Documentation Updates Required

- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/_WIDGETS/ENTRY_TEASER.md`
- `_docs/WIDGETS.md`
- `_docs/PAGE_MODEL.md` (if widget runtime metadata expands)
