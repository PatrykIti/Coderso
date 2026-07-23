# TASK-545-02: Canonical Audit and Post-Audit Workflow

# FileName: TASK-545-02-Canonical-Audit-And-Post-Audit-Workflow.md

**Parent Task:** TASK-545
**Priority:** High
**Category:** Workflow Orchestration / Audit Integrity
**Estimated Effort:** Large
**Dependencies:** TASK-545-01-L01
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Scope

Converge every active author/audit and implement/fix/full workflow on complete
result checks, five sequential audit rounds with one reconcile each, about five
independent post-audit lenses, literal task changelog pins, owner-only commits,
and mandatory pre-closure smoke. Do not change the product behavior those
historical workflows describe.

This subtask lands after the shared helper but before the live-tree static leaf
TASK-545-01-L02. Each driver leaf first lands and passes its own synthetic behavior suite,
then migrates its disjoint scripts. Its final script gates use `node --check`, the helper
and both staged driver suites, targeted security scans, and explicit inventory checks;
the additive zero-violation repository scan is activated by TASK-545-01-L02.

## Leaves and disjoint script ownership

| ID | Title | Exclusive ownership | Status |
|---|---|---|---|
| TASK-545-02-L01 | Converge author and audit workflows | audit driver + staged synthetic driver test, then author/audit/preaudit/converge scripts | ⏳ To Do |
| TASK-545-02-L02 | Converge implement, fix, and post-audit workflows | post-audit driver + staged synthetic driver test, then implement/impl/full/fix/remediation scripts | ⏳ To Do |

No script or behavior-test file is edited by both leaves. Each driver and its synthetic
suite must pass before that leaf migrates live scripts. Classify combined `*-full.mjs` as
L02 and keep all phases in that one writer.

## Canonical rules

- Execute at least five complete sequential pre-implementation rounds even if an
  earlier round is clean. Each round includes all expected per-file audits and
  exactly one reconcile, then count/order/identity-complete result validation, then fixes.
- HIGH/MEDIUM and explicitly execution-weakening LOW findings are actionable, block a
  clean pre-audit result, and go to fixers. Other LOW findings remain visible.
- Any audited contract-byte, HEAD, or relevant dirty-context change during or after a
  pre/post-audit pass makes that pass obsolete and requires a fresh complete pass.
- Post-audit uses approximately five independent lenses appropriate to the task,
  validates every result, fingerprints before/after each pass and fix/validation,
  fixes HIGH/MEDIUM, reruns targeted gates, and repeats a fresh pass.
- Agents never commit. Prompts return file scope/gates; repository owner commits.
- Every changelog number is literal/pinned from the owning task contract. No
  directory grep, highest+1, likely value, or collision-time renumbering.
- UI workflows complete live smoke and durable evidence before closure; they do
  not return deferred placeholders. After immediate manifest/hash validation they pause
  for owner review/staging, then resume and require tracked-file parity; agents never
  stage evidence.
- The prompt-only strict-Semgrep finding in `task-522-author.mjs` is rewritten as
  a bounded structured finding payload and verified without an ignore/suppression.

## Security Contract

Read-only audit prompts state repo, HEAD, dirty context, task IDs, no edits, and
redaction policy. No secret/log/user-data egress. No scanner configuration or
product source is changed.
