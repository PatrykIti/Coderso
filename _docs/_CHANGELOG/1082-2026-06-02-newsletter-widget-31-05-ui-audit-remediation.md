# 1082 - Newsletter widget 31-05 UI audit remediation

**Date:** 2026-06-02  
**Version:** Unreleased  
**Tasks:** TASK-392, TASK-392-01, TASK-392-02, TASK-392-03, TASK-392-04

## Key Changes

### CMS Widgets / Newsletter

- Newsletter admin preview now projects bound Form fields into the strict resolved-field schema before preview hydration.
- Legacy webhook metadata remains preserved but is labelled inactive until migrated to a Coderso Form or supported external action URL.
- Public Forms-runtime rendering now requires a projected submission nonce before emitting native form/script markup.
- Newsletter variant cards render disabled/read-only when variant mutation is unavailable.

### QA / Security / Docs

- Added Newsletter renderer and editor regressions for no-nonce public runtime, preview field projection, legacy webhook diagnostics, and read-only variant cards.
- Re-ran Forms nonce resolver coverage and the Coderso security gate nonce/captcha baseline.
- Updated the 31-05 audit report, widget docs, task board, and audit index with TASK-392 closure evidence.
