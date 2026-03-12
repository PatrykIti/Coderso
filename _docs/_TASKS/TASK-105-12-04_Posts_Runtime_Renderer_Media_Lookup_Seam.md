# TASK-105-12-04: Posts Runtime Renderer Media Lookup Seam
# FileName: TASK-105-12-04_Posts_Runtime_Renderer_Media_Lookup_Seam.md

**Priority:** Medium  
**Category:** Platform + Posts  
**Estimated Effort:** Medium  
**Dependencies:** TASK-105-12  
**Status:** Done (2026-03-12)

---

## Overview

Refactor post runtime renderer mapping so pure rendering helpers do not import media DB lookup by default.

## Acceptance Criteria

1. The post runtime renderer can be imported in Vitest without dragging DB/media service by default.
2. Runtime media lookup still works through explicit injected or lazy default deps.
3. The currently blocked runtime-renderer test can be reconsidered for Vitest after the seam is in place.

## Completion Notes

- Refactored `postBlockRuntimeMapper.ts` so the media lookup is resolved lazily only when image/media branches actually need it.
- Moved `post-block-runtime-renderer.test.tsx` into `tests/vitest/posts/*`.
- This closes the last obvious runtime-media import seam in the pure posts helper slice.

## Testing Requirements

- targeted `vitest`
- targeted `bun test` or runtime parity smoke where still needed
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-12_Mixed_Module_Product_Refactors_for_Runner_Eligibility.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
