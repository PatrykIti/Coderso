# TASK-417-07: Validation Docs Changelog And Closure
# FileName: TASK-417-07-Validation-Docs-Changelog-And-Closure.md

**Parent Task:** TASK-417
**Priority:** High
**Category:** QA / Documentation / Release Gates
**Estimated Effort:** Large
**Dependencies:** TASK-417-01, TASK-417-02, TASK-417-03, TASK-417-04, TASK-417-05, TASK-417-06
**Status:** ✅ Done

---

## Overview

Close the Pages v2 rewrite with targeted validation, release gates, final docs,
task board synchronization, changelog entries, and final read-only drift passes.
The parent task cannot close while any physical descendant remains open.

---

## Security Contract

- **Endpoint visibility:** no new endpoint in this child.
- **Auth model:** not applicable except validation must prove the inherited
  Pages and assistant contracts.
- **RBAC:** not applicable except validation must prove required permissions.
- **CSRF:** not applicable except validation must prove write paths retain CSRF.
- **Rate-limit bucket:** not applicable except validation must prove no new
  public write or unbounded assistant path exists.
- **Validation:** final pass verifies reject-unknown schemas and documented
  validation evidence.
- **Anti-abuse controls:** final pass verifies preview token and assistant
  provider-output hardening remains intact.

---

## Sub-Tasks

- [x] TASK-417-07-L01: Targeted validation lanes and gates.
- [x] TASK-417-07-L02: Docs, changelog, board, and final drift.
- [x] TASK-417-07-L03: Live server and Playwright smokes.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- All targeted Vitest/Bun suites from child tasks.
- Incremental live smoke tests with `coderso-dev-core-host` and
  `playwright-cli` whenever a runtime/admin slice is testable.
- `bun run gates:coderso`
- Final read-only drift passes after validation and docs are updated.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md`
- All source-of-truth docs touched by TASK-417 children.
