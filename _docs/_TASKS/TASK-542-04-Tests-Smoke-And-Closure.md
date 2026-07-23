# TASK-542-04: Tests, Smoke, and Closure

# FileName: TASK-542-04-Tests-Smoke-And-Closure.md

**Parent Task:** TASK-542
**Priority:** High
**Category:** Testing / Documentation / Runtime Smoke / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-542-01..03
**Status:** ⏳ To Do
**Changelog:** 1254 (pinned; closure only)

---

## Scope

Own additive Menu consumer/integration coverage, rerun every source-leaf direct suite,
update documentation/cache maps, execute at least six cross-device publish-to-front smoke
flows, and close metadata. Do not reopen production source or rebaseline a source-leaf
owner suite from this subtask.

## Leaf

| ID | Title | Ownership | Status |
|---|---|---|---|
| TASK-542-04-L01 | Six cross-device publish-front flows and closure | tests, docs, smoke evidence, TASK-542 closure metadata | ⏳ To Do |

## Security Contract

Tests preserve existing internal `menus:read/write`, CSRF and error mapping, and
prove anonymous projection does not reveal logged-in nodes. Synthetic smoke data
contains no credentials, tokens, PII, or raw user content.
