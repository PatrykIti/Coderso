# 942. Layout widget Advanced token policy

- **Date:** 2026-05-24
- **Version:** Unreleased
- **Tasks:** TASK-336-14

## Key Changes

### Editor contract
- Added strict v2 editor contracts for Section, Grid Columns, Split Layout,
  Stack, Spacer, and Divider.
- Standardized the layout widget ownership model: Wizard remains setup-only,
  Visual owns daily layout/style authoring, and Advanced is read-only
  diagnostics plus normalized payload snapshots.
- Preserved Section/Grid Columns truthfulness fixes while removing unallowlisted
  writable Advanced duplicates.

### UX and safety
- Replaced visible custom CSS/token-style authoring in touched layout Visual
  flows with bounded presets, selects, swatches, sliders, and diagnostic copy.
- Kept legacy compatibility hooks hidden, `aria-hidden`, and out of the tab
  order so nontechnical users are not asked for webdeveloper-specific values.
- Added raw payload snapshots and technical summaries for support/debugging
  without making Advanced a second daily editing surface.

### QA and documentation
- Added focused editor-contract, widget render, and UI wave coverage for the
  six layout widgets.
- Updated the shared widget spec, per-widget docs, task board, and Playwright
  evidence for TASK-336-14.
