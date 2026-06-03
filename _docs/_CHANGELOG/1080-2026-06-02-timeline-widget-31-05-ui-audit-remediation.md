# 1080 - Timeline widget 31-05 UI audit remediation

**Date:** 2026-06-02  
**Version:** Unreleased  
**Tasks:** TASK-390, TASK-390-01, TASK-390-02, TASK-390-03

## Key Changes

### CMS Widgets / Timeline

- Timeline process/compact layouts now render configured step CTA links instead of silently dropping them.
- Whole-step links remain suppressed when a CTA is present, preserving the nested-anchor safety contract.
- Timeline Visual now marks saved non-compact variants inactive while `mode="process"` owns compact rendering.

### Admin UI / Editor Contract

- Timeline Visual mutating controls now expose stable shared control metadata for fields, destination pickers, mode/variant cards, colors, and step actions.
- Timeline editor contract paths now match the sections where controls actually render.

### QA / Docs

- Added renderer coverage for compact/process CTA output.
- Added UI regression coverage for section path metadata and process-mode variant inactive state.
- Updated the 31-05 audit report, widget contract docs, task board, and audit index with the TASK-390 closure status.
