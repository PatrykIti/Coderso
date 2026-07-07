# TASK-483-01: Traffic Schema And Domain Contract
# FileName: TASK-483-01-Traffic-Schema-And-Domain-Contract.md

**Parent Task:** TASK-483
**Priority:** High
**Category:** Tools / Analytics / Schema
**Estimated Effort:** Large
**Dependencies:** None
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

Establish the persistence and domain foundation for real traffic analytics. This
subtask introduces the schema-first traffic contract (types, enums, defaults,
`normalize*`), the two new Drizzle tables (`analytics_pageviews`,
`analytics_sessions`) with full migration artifacts, and a thin repository that
writes ingested events and reads them back for aggregation.

These modules are **distinct** from `core/services/analytics/analyticsService.ts`
and `analyticsTypes.ts` (content inventory). Nothing here counts pages/entries.

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-01-L01 | Traffic Event Domain Contract And Normalizers | Medium | ✅ Done |
| TASK-483-01-L02 | Traffic Tables And Migration Artifacts | Medium | ✅ Done |
| TASK-483-01-L03 | Traffic Repository Writers And Readers | Medium | ✅ Done |

## Dependencies

- None external. L02 depends on L01 (column shape mirrors the normalized event);
  L03 depends on L01 + L02.

## Testing Requirements

- **Vitest** for L01 (pure normalizers/enums, Bun-free).
- **Bun** for L02 (migration apply + table existence smoke) and L03 (DB-backed
  insert/read round-trip with uniquely scoped fixtures). Both Bun suites live
  under `tests/integration/analytics/`; L02 owns the required additive update
  of the root `package.json` `test:bun` glob (and its
  `_docs/TESTING_STRATEGY.md` mirror) so the directory actually runs — without
  it the lane silently skips these suites.
- Run `set -a && source .env && set +a` before DB-backed suites.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
