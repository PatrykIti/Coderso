# TASK-105-11-03-03: Posts Pure Editor Model Suites Move to Vitest
# FileName: TASK-105-11-03-03_Posts_Pure_Editor_Model_Suites_Move_to_Vitest.md

**Priority:** High  
**Category:** QA + Platform  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-11-03-01  
**Status:** Done (2026-03-12)

---

## Overview

Split the clearly Bun-free post editor/model suites out of `tests/unit/posts/*` into Vitest without touching DB/runtime/public-rendering contracts that should stay in Bun.

## Candidate Targets

- `block-transforms`
- document/stat selectors
- layout state/preferences/focus-return helpers
- serializer, command engine, paste normalizer, image-wrap layout

## Acceptance Criteria

1. Pure posts editor/model suites no longer depend on `bun:test`.
2. Runtime or DB-coupled post suites stay in Bun with explicit reasoning.
3. The split reduces the old blanket `posts` refactor-first bucket.

## Completion Notes

- Moved the pure posts editor/model suites into `tests/vitest/posts/*`.
- Removed the old Bun `block-transforms.test.ts` duplicate because the stronger Vitest suite already exists.
- Left `schema.test.ts` in Bun because it is DB-backed.
- Left `post-block-runtime-renderer.test.tsx` out of this migration because runtime/media lookup coupling still blocks a clean Vitest move.

## Testing Requirements

- targeted `vitest`
- relevant `bun test` for the post suites intentionally left in Bun
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-105-11-03_Refactor_First_Cluster_Ownership_Audit.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
