# 453. TASK-105 Post Classic Editor Shell Follow-up

**Date:** 2026-03-13  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Expanded `PostClassicEditorShell` coverage for missing-post-id preview fallback, generic preview failure handling, and manual slug edit dirty-state flow on top of the earlier save/publish/metadata/refresh coverage.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/post-classic-editor-shell-wave.test.tsx`
- Targeted coverage re-check showed:
  - `PostClassicEditorShell.tsx` -> `92.06%` lines / `78.19%` branches
