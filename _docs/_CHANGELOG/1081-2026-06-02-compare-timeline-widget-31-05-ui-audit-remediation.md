# 1081 - Compare Timeline widget 31-05 UI audit remediation

**Date:** 2026-06-02  
**Version:** Unreleased  
**Tasks:** TASK-391, TASK-391-01, TASK-391-02, TASK-391-03

## Key Changes

### CMS Widgets / Compare Timeline

- Compare Timeline label-size `none` now uses inherited/no explicit size semantics in admin copy instead of promising hidden labels.
- Axis-row step labels now honor the same step label size setting as track-row labels.
- Advanced highlight diagnostics now mark saved targets dormant in `dual-track` and active in `dual-track-highlight`.

### QA / Docs

- Added renderer regression coverage for inherited label-size visibility and axis/track size parity.
- Added UI regression coverage for label-size copy and variant-aware Advanced highlight diagnostics.
- Updated the 31-05 audit report, widget docs, task board, and audit index with TASK-391 closure evidence.
