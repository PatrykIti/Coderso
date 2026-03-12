# TASK-105-12: Mixed Module Product Refactors for Runner Eligibility
# FileName: TASK-105-12_Mixed_Module_Product_Refactors_for_Runner_Eligibility.md

**Priority:** High  
**Category:** QA + Platform + Architecture  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-11  
**Status:** Done (2026-03-12)

---

## Overview

Refactor the remaining mixed modules so Bun/Vitest ownership follows architecture by design, not by accidental import graphs.

This task starts after the legacy suite migration cleanup:
- Bun-free suites have already been moved where possible,
- the remaining blockers are production-code seams,
- the goal is to stop future Bun-free logic from importing DB/settings/runtime modules at module load time.

## Scope

1. Split pure helper logic out of mixed modules.
2. Replace top-level runtime/DB/settings imports with lazy default deps where appropriate.
3. Keep public/runtime/server/plugin boundaries explicit for the parts that must remain Bun-owned.
4. Update contributor guardrails so future code does not recreate the same coupling.

## Candidate Refactor Areas

- assistant provider/docs/service dependency seams
- forms runtime resolver / nonce / automation runner dependency seams
- posts runtime renderer media lookup seam
- any remaining server helper modules still blocked only by import-time settings coupling

## Progress Notes

Completed slices:
- assistant provider/docs lazy dependency seams
- forms runtime resolver / nonce boundary seams
- forms automation runner dependency split
- posts runtime renderer media lookup seam
- import-boundary guardrails added to `AGENTS.md`, `_docs/TESTING_STRATEGY.md`, and `tests/README.md`

Remaining slices:
- none; the mixed-module runner-eligibility track is now closed

## Sub-Tasks

1. `TASK-105-12-01_Assistant_Provider_and_Docs_Lazy_Dependency_Seams.md`
2. `TASK-105-12-02_Forms_Runtime_Resolver_and_Nonce_Boundary_Seams.md`
3. `TASK-105-12-03_Forms_Automation_Runner_Dependency_Split.md`
4. `TASK-105-12-04_Posts_Runtime_Renderer_Media_Lookup_Seam.md`
5. `TASK-105-12-05_Guardrails_Docs_and_Closure.md`

## Acceptance Criteria

1. Remaining mixed modules expose a clear pure seam for Vitest-owned logic.
2. Import-time DB/settings/runtime coupling is reduced or removed where the logic is meant to stay Bun-free.
3. AGENTS/docs explicitly tell contributors how to avoid recreating the coupling.

## Completion Notes

- `formAutomationRunner` is now split into a Vitest-safe core module plus a thin lazy runtime wrapper, closing the last forms blocker in this track.
- The previously delivered assistant/docs, forms runtime/nonce, and posts runtime-media seams remain in place and are now joined by the final forms automation runner split.
- After this closure, the remaining `TASK-105` backlog is ordinary product coverage work, not mixed-module runner-eligibility cleanup.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted `vitest` for newly unlocked suites
- targeted `bun test` for the parts intentionally left in Bun

## Documentation Updates Required

- `AGENTS.md`
- `_docs/TESTING_STRATEGY.md`
- `tests/README.md`
- `tests/RUNNER_OWNERSHIP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`
