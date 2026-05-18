# 854 - TASK-303 divider spacer shared controls

**Date:** 2026-05-18
**Version:** Unreleased
**Tasks:** TASK-303

## Key Changes

### Shared token/custom controls

- Added a shared `TokenOrPixelField` helper for the late Divider/Spacer shared
  token-control slice.
- Divider and Spacer now collapse the legacy duplicate `0` off-state behind the
  canonical `None` option.
- Choosing `Custom px` now enters explicit custom-edit mode instead of silently
  doing nothing.

### Shared color-preservation behavior

- Divider color swatches no longer overwrite CSS-variable values when authors
  only interact with the native color input.

### Validation

- Re-ran focused Divider/Spacer Vitest coverage, core lint/types,
  `bun run gates:coderso`, and `bun run scan:security:strict`.
