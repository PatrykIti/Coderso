# TASK-540-06: Tests, Smoke, and Closure

# FileName: TASK-540-06-Tests-Smoke-And-Closure.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Testing / Documentation / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01..05
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Scope

Add the complete regression matrix for TASK-540, update Custom Screen/cache/API
documentation, execute real browser flows, and close the family only after every
descendant and required gate is green. Approximately five fresh post-audit lenses must
cover schema/URL compatibility, Tabs/accessibility, async/dirty/cache safety, per-user
responsive behavior, and test/docs/smoke/task-graph integrity; a missing lens result is
not a pass. This subtask owns no production source.

## Leaf

| ID | Title | Ownership | Status |
|---|---|---|---|
| TASK-540-06-L01 | Six builder-save-entry flows and closure | tests, docs, smoke evidence, TASK-540 closure metadata | ⏳ To Do |

## Security Contract

No new route. Tests must prove existing internal auth/RBAC/CSRF and strict nested
validation. Smoke uses synthetic Screen/content fixtures and records no secret,
token, PII, or raw user data.
