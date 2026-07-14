# TASK-540-06: Tests, Smoke, and Closure

# FileName: TASK-540-06-Tests-Smoke-And-Closure.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Testing / Documentation / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01..05
**Status:** 🚧 In Progress
**Started:** 2026-07-14
**Changelog:** 1252 (pinned; closure only)
**Changelog File:** `_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md`

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
| TASK-540-06-L01 | Seven builder-save-entry flows and closure | one new aggregate test, docs, smoke evidence, TASK-540 closure metadata | 🚧 In Progress |

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
Before any closure status mutation, the evidence owner writes and byte-verifies one
strict canonical control anchor in the existing changelog index plus changelog 1252's
redacted smoke block. The anchor binds its evidence SHA-256, generation, board baseline,
the fixed safe changelog path above, and the SHA-256 of the closure-leaf gate value. It
remains independent authority if the changelog file is missing and may carry one exact
old-gate -> Repair Pending -> successor-gate authorization during closure-leaf repair.
The three active closure contracts then persist identical
Closure Pending, Closure Board Baseline, and Closure Changelog Path receipts. A restart
must compare their status-owner state against that independent control rather than
recapturing it. Then
the complete full validation passes while the TASK-540 root, TASK-540-06, and
TASK-540-06-L01 closure contracts remain In Progress. Already completed source
descendants stay Done and byte-identical. Only then may the separate status mutation
mark those three closure contracts Done and synchronize the board row against the
same evidence hash. A later mechanical or final-validation failure reopens the root
and closure contracts; it reopens an earlier source-owner leaf only when a classified
finding names that exact owner, while unrelated completed descendants remain Done.
Every shared board/index mutation preserves an orchestrator-captured projection of all
unrelated rows and bytes after both success and dispatch failure. Only TASK-540's board
row/statistics, the exact 1252 row/reservation prose, and the exact TASK-540 control
anchor are mutable.
