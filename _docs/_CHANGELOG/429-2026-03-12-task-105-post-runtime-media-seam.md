# 429. TASK-105 Post Runtime Media Seam

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-12, TASK-105-12-04

## Key Changes

### Architecture / Testing
- Refactored `postBlockRuntimeMapper.ts` so the default media lookup is loaded lazily only when runtime image/media branches actually need it.
- Moved `post-block-runtime-renderer.test.tsx` into the Vitest lane.

### Validation
- Targeted Vitest run passed for the runtime renderer suite after the seam change.
- `bun --cwd core lint` and `bun --cwd core lint:types` passed.
