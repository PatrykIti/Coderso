# TASK-557-07: Schema-Isolation Test Hygiene and Seed Assumptions
# FileName: TASK-557-07-Schema-Isolation-Test-Hygiene-And-Seed-Assumptions.md
**Parent Task:** TASK-557
**Priority:** High
**Category:** Testing / Database
**Estimated Effort:** Medium
**Dependencies:** TASK-557-03 (worker schemas exist to validate against)
**Status:** ⏳ To Do
---
## Overview
Fresh worker schemas are empty after migration: no admin user, no starter
content, no settings rows, and hardcoded `public.` probes would read the WRONG
schema. This subtask makes the test harness schema-aware and inventories which
files assume seeded state, so parallel workers run green against empty
schemas. It does NOT seed production data; it fixes helpers and, where a test
genuinely needs a default (admin user, content routes), creates it inside that
file's own scope or a per-worker seed module.

## Sub-Tasks
- TASK-557-07-L01: Schema-aware test helpers (no hardcoded `public.`)
- TASK-557-07-L02: Seed-assumption inventory and per-worker seed

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Helper tests: `hasTable` resolves within the CURRENT schema (search_path),
  not `public`; `canConnect` unchanged.
- Seed tests: a file that needs an admin creates one (or the worker seed runs
  once per schema) and cleans up; no file reads rows another worker wrote.
- Full DB lane green on fresh worker schemas (the real proof).

## Documentation Updates Required
- `tests/README.md` — schema-aware helpers and seed contract.
- `_docs/TESTING_STRATEGY.md` — empty-schema invariant for parallel workers.
