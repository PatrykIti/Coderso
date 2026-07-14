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

Create one cross-leaf aggregate regression suite for TASK-540, run every source-owner
suite read-only, update Custom Screen/cache/API documentation, execute seven real
browser flows, and close the family only after every descendant and required gate is
green. Approximately five fresh post-audit lenses must cover schema/URL compatibility,
Tabs/accessibility, async/dirty/cache safety, per-user responsive behavior, and
test/docs/smoke-feasibility/task-graph integrity before runtime starts; the separate
smoke-evidence audit runs only after the live flows. A missing lens result is not a pass. This
subtask owns no production source and may not edit shared/source-owner test suites.

## Leaf

| ID | Title | Ownership | Status |
|---|---|---|---|
| TASK-540-06-L01 | Seven builder-save-entry flows and closure | one new aggregate test, docs, smoke evidence, TASK-540 closure metadata | ⏳ To Do |

## Security Contract

No new route. Tests must prove existing internal auth/RBAC/CSRF, user-settings
session self-scope and rate-limit/error mapping, and strict nested validation.
Smoke uses uniquely scoped synthetic Screen/content/media/user fixtures, records
their server IDs plus redacted session/setting/override/storage identifiers for
exact cleanup; session resources use only non-secret database IDs/labels, never
cookies or session tokens/hashes. Before canonicalization, value-aware validation
scans runtime subjects, fixture/cleanup identifiers and probes, every browser command
(including non-credential run-code), operation descriptor, and output for raw secret
values without rejecting benign prose that only names a security concept. Linked
browser receipts retain bounded sanitized assertion output and actual CLI stdout/stderr
hashes; runtime receipts hash real command/Node/DB/storage observation bytes rather
than sanitized prose. Credential fills retain only literal environment-variable
references and a discarded-output marker. Login
credentials are loaded from `.env` and never printed or persisted in smoke evidence.
All non-empty classified secret-like environment values (including short values via
boundary-aware matching) join the private corpus. Raw smoke failure results, full-gate
summaries, findings, and every other structured agent result are scanned before reuse;
rejected dispatch/schema errors are discarded behind a generic label-only error, and
the complete created changelog is scanned before its canonical block is byte-verified.
Changelog 1252 receives and byte-verifies the canonical redacted smoke block, then
the complete full validation passes while every contract is still In Progress. Only
then may the separate status mutation mark descendants Done; it must touch all 17
physical TASK-540 contracts and bind them to the same evidence hash. Any later
mechanical/final failure atomically reopens all 17 where execution can continue.
