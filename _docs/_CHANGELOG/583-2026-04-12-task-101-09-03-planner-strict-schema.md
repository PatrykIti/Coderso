# 583. TASK-101-09-03 planner strict schema

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-101-09-03, TASK-101-09-03-01, TASK-101-09-03-02, TASK-101-09-03-03, TASK-101-09-03-04

## Key Changes

### Planner Schema
- Added strict nested action-plan validation and normalization.
- Existing planner output now goes through strict plan schema before returning from `planAssistantActions`.
- Per-action input validation covers catalog, form/page/listing, and `site-kit.*` action families.

### Planner Heuristics
- Moved prompt/context heuristics into a pure `actionPlanHeuristics.ts` module.
- Refinement routing can use route, runtime selected resource, and resource catalog summaries.

### Provider Draft Safety
- Added a pure provider draft adapter for mocked provider JSON.
- Malformed drafts, unknown fields/actions, missing actions, and secret-like keys recover to typed `needs_input` questions.
- No live provider/network call was introduced.

### Validation
- Added Vitest coverage for strict schema, heuristics, provider draft recovery, and planner regressions.
- Kept Bun route/executor regression coverage green.
