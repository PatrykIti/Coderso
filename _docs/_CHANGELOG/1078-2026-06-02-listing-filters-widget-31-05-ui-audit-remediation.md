# 1078 - Listing Filters widget 31-05 UI audit remediation

**Date:** 2026-06-02  
**Version:** Unreleased  
**Tasks:** TASK-388, TASK-388-01

## Key Changes

### CMS Widgets / Listing Filters

- Listing Filters Visual now marks a saved Action background as inactive while Auto apply hides the manual submit button.
- Saved action color values remain preserved and editable so manual apply mode restores the visible button color without destructive resets.

### QA / Docs

- Added a focused Visual editor regression for `autoApply=true` plus saved `style.actionBackground`.
- Updated the 31-05 audit report, widget contract docs, task board, and audit index with the TASK-388 closure status.
