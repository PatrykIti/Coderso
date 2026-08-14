# TASK-545-02: Canonical Audit and Post-Audit Workflow

# FileName: TASK-545-02-Canonical-Audit-And-Post-Audit-Workflow.md

**Parent Task:** TASK-545
**Priority:** High
**Category:** Workflow Orchestration / Audit Integrity
**Estimated Effort:** Large
**Dependencies:** TASK-545-01-L01
**Status:** ✅ Done
**Completed:** 2026-08-14
**Changelog:** 1257 (pinned; closure only)

---

## Overview

Converge every tracked canonical author/audit and implement/fix/full workflow on complete
result checks, one complete initial audit pass with one reconcile, finding-driven
affected-scope reruns, exact declared independent post-audit lens identities,
literal task changelog pins, owner-only commits, and mandatory pre-closure smoke.
Do not change the product behavior those historical workflows describe.

This subtask lands after the shared helper but before the live-tree static leaf
TASK-545-01-L02. Each driver leaf first lands and passes its own synthetic behavior suite,
then migrates its disjoint scripts. Its final script gates use `node --check`, the helper
and both staged driver suites, targeted security scans, and explicit inventory checks;
the additive zero-violation repository scan is activated by TASK-545-01-L02.

## Sub-Tasks

| ID | Title | Exclusive ownership | Status |
|---|---|---|---|
| TASK-545-02-L01 | Converge author and audit workflows | audit driver + staged synthetic driver test, then author/audit/preaudit/converge scripts | ⏳ To Do |
| TASK-545-02-L02 | Converge implement, fix, and post-audit workflows | post-audit driver + staged synthetic driver test, then implement/impl/full/fix/remediation scripts | ⏳ To Do |

No script or behavior-test file is edited by both leaves. Each driver and its synthetic
suite must pass before that leaf migrates live scripts. The initial post-TASK-554
inventory is exactly six tracked entries: L01 owns TASK-522 author plus TASK-554
author-audit; L02 owns TASK-543 implement plus TASK-554
`task-554-closeout.mjs`, implement, and fix.
Unexpected tracked entries require a contract update and fresh affected audit.
Ignored local/deleted historical scripts are never wildcard-migrated.

## Canonical rules

- Execute one complete pre-implementation pass containing every expected per-file
  audit and exactly one reconcile, then count/order/identity-complete result
  validation. If it has zero HIGH/MEDIUM findings, it is clean immediately.
- Evidence-backed HIGH/MEDIUM findings are actionable and go to fixers. After a
  verified fix, rerun only affected per-file scopes and one fresh reconcile over
  their changed/shared contracts. LOW findings remain visible and follow the
  repository's normal disposition rules; they never justify ceremonial replay.
- Any unexpected, unscoped, concurrent, HEAD, or relevant dirty-context change
  during or after a pre/post-audit pass makes that pass obsolete and requires a
  fresh complete pass. A verified fixer-owned change declared by the driver is
  the sole exception: it invalidates only its affected scopes/lenses plus the
  cross-file reconcile, exactly as specified above.
- Post-audit declares the exact independent lens IDs appropriate to the touched
  contract, validates every result, fingerprints before/after each pass and
  fix/validation, fixes HIGH/MEDIUM, reruns targeted gates, and repeats only the
  affected lenses when their audited inputs changed.
- Agents never commit. Prompts return file scope/gates; repository owner commits.
- Every changelog number is literal/pinned from the owning task contract. No
  directory grep, highest+1, likely value, or collision-time renumbering.
- UI workflows complete live smoke and durable evidence before closure; they do
  not return deferred placeholders. After immediate manifest/hash validation they pause
  for owner review/staging, then resume and require tracked-file parity; agents never
  stage evidence.
- TASK-546/changelog 1259 already replaced TASK-522's unsafe prompt interpolation
  with the tracked bounded structured formatter and focused regression test.
  TASK-545 treats that formatter/test as read-only evidence and reruns the
  focused test plus strict scan; it does not claim or repeat the completed repair.
- Since `_docs/_workflows/` is globally ignored, new drivers and TASK-554 entries
  are consumed only after owner review, explicit tracking, and committed
  `git ls-files`/`git show HEAD` byte parity. Agents never stage them.

## Security Contract

Read-only audit prompts state repo, HEAD, dirty context, task IDs, no edits, and
redaction policy. No secret/log/user-data egress. No scanner configuration or
product source is changed.

## Testing Requirements

- Land and pass each leaf's synthetic driver suite before migrating its live
  workflow inventory.
- Parse every touched tracked workflow with `node --check` and run the focused helper,
  audit-round, and post-audit suites.
- Require exact result identities, affected-scope reruns, pinned changelog
  ownership, owner-only commits, and no deferred required smoke in static gates.
- Run the targeted strict security scan and `git diff --check`.

## Documentation Updates Required

- Keep the child table and disjoint tracked script inventories synchronized with
  the physical leaves and `git ls-files` registry.
- Defer board, status, and changelog 1257 closure edits to TASK-545-04-L03.
