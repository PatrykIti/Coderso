# TASK-485-05: Security, Perf, Docs & Closure
# FileName: TASK-485-05-Security-Perf-Docs-And-Closure.md

**Parent Task:** TASK-485
**Priority:** High
**Category:** Store / Plugins / Gates & Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-485-01..04.
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Cross-cutting gates and documentation that finalize the feature: a focused
security gate covering the whole new surface (catalog reads + lifecycle writes),
a perf check on catalog caching, and the doc sync (CMS_API, ADMIN_CACHE*,
STORE_SPEC/contract) plus the closure gate matrix.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-485-05-L01 | Security + perf gates (Bun) | ⏳ To Do |
| TASK-485-05-L02 | Docs sync + closure gate matrix | ⏳ To Do |

---

## Dependencies

- All feature subtasks (01–04) landed.
- `tests/security/codersoSecurityGate.test.ts`, `tests/perf/*`.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Bun:** `tests/security/pluginStore.test.ts`,
  `tests/security/codersoSecurityGate.test.ts`, `tests/perf/*` (catalog cache).
- Full matrix recorded at closure (see L02).
