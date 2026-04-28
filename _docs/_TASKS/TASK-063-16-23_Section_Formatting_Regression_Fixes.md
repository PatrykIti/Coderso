# TASK-063-16-23: Section Formatting Regression Fixes
# FileName: TASK-063-16-23_Section_Formatting_Regression_Fixes.md

**Priority:** Medium  
**Category:** Admin/UI + Runtime  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-16  
**Status:** Done (2026-03-05)

---

## Overview
Address regressions reported after the Section formatting rollout: missing preview styling, inconsistent heading icons, inline code caret behavior, list typography alignment, clear formatting attribute cleanup, and editor settings dialog overflow.

---

## Sub-Tasks
1. Ensure runtime preview formatting styles are available when preview uses admin CSS.
2. Normalize inline-code caret range when caret sits on whitespace.
3. Align list typography selection to update list items reliably.
4. Clear formatting should remove alignment/font/text-scale attributes.
5. Unify heading level icons (H1–H6) in toolbar menus.
6. Clamp editor settings dialog height with scrollable content.

---

## Testing Requirements
- `bun test tests/unit/ui/post-richtext-inline-wrapper.test.ts`
- `bun test tests/unit/ui/post-richtext-clear-formatting.test.tsx`

---

## Documentation Updates Required
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
