# TASK-545-01: All-Results Guard and Static Workflow Contract

# FileName: TASK-545-01-All-Results-Guard-And-Static-Workflow-Contract.md

**Parent Task:** TASK-545
**Priority:** High
**Category:** Workflow Infrastructure / False-Clean Prevention / Static Tests
**Estimated Effort:** Medium
**Dependencies:** TASK-536–544 complete
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Scope

Create one pure all-results/identity guard and a static enforcement suite for every active
workflow. Missing/null results, count mismatches, and wrong/duplicate/reordered job
identities must abort before findings
are flattened, logged as clean, or passed to fixers. Static policy also provides
the gate used by TASK-545-02/03 for round, reconcile, post-audit, commit, pin, and
smoke rules.

## Leaves and program order

| ID | Title | Exclusive ownership | Status |
|---|---|---|---|
| TASK-545-01-L01 | Add `requireAllResults` helper | identity-aware helper plus focused unit test | ⏳ To Do |
| TASK-545-01-L02 | Statically enforce workflow contracts | additive whole-inventory live-tree static test after the two driver behavior suites and TASK-545-02 migrations | ⏳ To Do |

The executable order deliberately interleaves technical subtasks without concurrent
writers: `545-01-L01 → 545-02-L01 → 545-02-L02 → 545-01-L02`. The live-tree
static test cannot land before the violations it asserts are removed. TASK-545-01
remains open until L02 passes; TASK-545-02 depends only on the landed helper L01,
not on the unfinished TASK-545-01 parent. TASK-545-02-L01/L02 each lands its own
synthetic driver suite before migrating scripts; the final static leaf reruns those suites
read-only and owns only additive live-tree enforcement.

## Current baseline

The audit identified 58 unsafe agent-result `.filter(Boolean)` consumers. Fresh
HEAD inspection finds the literal in 61 active `.mjs` files because three
additional helper/non-result uses also remain. The completion invariant is zero
literal `.filter(Boolean)` in all active workflow scripts, thereby covering the
58 findings without preserving incidental exceptions.

## Security Contract

No product/API surface. Helpers accept in-memory structured agent results only
and never log prompts, credentials, `.env`, private keys, raw logs, or user data.
No scanner allowlist or exception.
