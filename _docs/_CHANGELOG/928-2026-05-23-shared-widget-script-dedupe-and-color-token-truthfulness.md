# 928. Shared widget script dedupe and color-token truthfulness

- **Date:** 2026-05-23
- **Version:** Unreleased
- **Tasks:** TASK-327, TASK-329

## Key Changes

### Shared editor controls
- `SharedColorFieldInputs` now preserves CSS-variable and custom token text when the swatch changes, unless a widget explicitly opts into picker replacement.
- Added focused shared tests for token preservation, picker-compatible hex/rgb writes, and explicit override callbacks.

### Shared runtime transport
- Public page renders now collect static widget runtime scripts once per page instead of emitting duplicate inline payloads per widget instance.
- Tabs and Toggle Block now consume the shared collector while keeping editor-preview output script-free and widget roots isolated.

### QA and documentation
- Added focused Vitest coverage for shared color fields, Tabs, Toggle Block, and public page rendering.
- Refreshed Section and Tabs report routing, adopted widget docs, task statuses, board counts, and family notes so the repository matches the fixed branch state.
