# 1079 - Search Box widget 31-05 UI audit remediation

**Date:** 2026-06-02  
**Version:** Unreleased  
**Tasks:** TASK-389, TASK-389-01

## Key Changes

### CMS Widgets / Search Box

- Search Box Advanced now shows an active routing summary that reflects the current runtime mode.
- Route-submit-only diagnostics for `Results page` and `Search term routing` now render only in `route-submit` mode, so listing/global modes no longer imply route-submit settings are active.

### QA / Docs

- Added focused Advanced editor regression coverage for listing, global, and route-submit diagnostics.
- Updated the 31-05 audit report, widget contract docs, task board, and audit index with the TASK-389 closure status.
