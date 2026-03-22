# 535. TASK-137 admin UI theme assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-137

## Key Changes

### Assistant Docs
- Rewrote `docs/screens/themes.md` against the shipped Admin UI Theme surface
  instead of the old generic tokens summary.
- Expanded the doc with guided `Basic`, `Medium`, `Instruction`, `Advanced`,
  `Troubleshooting`, `Decision Guide`, `Checklist`, and `Security` sections.
- Documented the real templates flow, profile activation flow, export/new
  actions, and the current `ACTIVE` vs `CURRENT` profile state markers.

### Validation
- Completed:
  - authenticated CDP walkthrough of local Admin UI Theme screen
  - template search, export, and new-template actions
  - profiles section with `ACTIVE` and `CURRENT` labels
  - active profile summary verified against the live UI
- No automated lint or test commands were run because this was a docs-only
  change.
