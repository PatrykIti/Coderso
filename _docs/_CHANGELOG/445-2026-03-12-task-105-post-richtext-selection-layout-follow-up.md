# 445. TASK-105 Post Richtext Selection And Layout Follow-up

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Expanded `PostRichTextAdapter` interaction coverage for inline typography selection, collapsed inline wrappers, block alignment plus clear-formatting flows, and selected-image layout controls for wrap, width, and spacing updates.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for the adapter coverage suites under `tests/vitest/ui/*`, `tests/vitest/ui-dom/*`, and `tests/vitest/ui-integration/*`.
- Targeted coverage re-check showed:
  - `PostRichTextAdapter.tsx` -> `80.97%` lines / `61.41%` branches
