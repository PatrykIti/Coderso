# TASK-105-08: Final Per-File 100% Gap Closure
# FileName: TASK-105-08_Final_Per_File_100_Gap_Closure.md

**Parent Task:** TASK-105
**Priority:** High
**Category:** QA + Coverage
**Estimated Effort:** Large
**Dependencies:** TASK-105-01..07; active TASK-105-08 children below
**Status:** 🚧 In Progress
**Started:** 2026-08-21

---

## Overview

TASK-105-08 remains the coordination task for source-wide Vitest coverage. The 2026-08-21
5777-line inventory and the 2026-08-26 98.54%-line run are historical planning/evidence
snapshots, not proof that the program is closed. The L12 extraction still identifies
executable residuals; coverage may only be called final after a fresh artifact reconciles
every remaining line with a current source-backed disposition.

This wave is test-only except for separately contracted source repairs. No leaf may use a
coverage ignore, a private callback, invalid union data, or a production fallback merely to
make a line execute.

## Historical Baseline

The original 2026-08-21 planning baseline was 5,777 uncovered lines across 668 executable
files. The 2026-08-26 historical rebaseline reported 98.54% lines and 577 uncovered lines.
Its raw L12 extraction has 515 records: 148 UNREACHABLE / 367 REACHABLE-GAP. Those values
are not a current final total; active source audits may correct individual classifications.
See TASK-105-08-12 for the reconciliation protocol and bounded verified deltas.

## Remaining Child Order

The table is the current dependency order for unfinished work. It intentionally names the
new descendants so a historical terminal parent cannot hide an active child.

| Remaining order | Leaf | Exact active scope | Budget / disposition |
|---:|---|---|---:|
| 1 | TASK-105-08-03-L01 → L02 → L03 | content list/workspace; detail templates; field/schema | 48 reachable lines |
| 2 | TASK-105-08-04 | custom-screens owner audit/receipt | owner-defined |
| 3 | TASK-105-08-14 → 15 → 16 | TASK-540 runtime-smoke recovery sequence | runtime integrity |
| 4 | TASK-105-08-05 | menus/dashboard/kits declared descendants | owner-defined |
| 5 | TASK-105-08-06-L01 → L02 | L06 reconciliation plus exact commerce/media root-TypeScript test repair | 5 coverage-unreachable / 0 coverage-reachable; 13 named test files |
| 6 | TASK-105-08-07-L01 | boolean JSON-Schema property merger rejection | 1 reachable line |
| 7 | TASK-105-08-08 | pages/posts/entries/forms/listings/themes/booking/audit | owner-defined |
| 8 | TASK-105-08-09-L01 | users/roles reachable residuals | 11 raw reachable / 41 raw unreachable (current local reconciliation) |
| 9 | TASK-105-08-10 | custom-screens recovery seam | owner-defined |
| 10 | TASK-105-08-13 | inherited assistant-draft disposition | test integrity |
| 11 | TASK-105-08-12 | fresh canonical rebaseline after active owners report | final artifact, not pre-seeded |

The L09 disposition is local to that child and does not recompute or replace the historical L12
ledger above.

TASK-105-08-07 and TASK-105-08-09 are reopened because they now have open physical
children. TASK-105-08-12 is reopened because historical coverage evidence cannot close
while these dependencies remain active. TASK-105-08-06-L01/L02 are test-integrity-only
children: its five reviewed coverage records remain source-proven unreachable, and no
fabricated coverage test is allowed.

## Single-Writer File Ownership

- Every active child owns exactly its named source/test files; no directory glob grants
  ownership.
- The focused test-only children, including TASK-105-08-06-L01/L02 and
  TASK-105-08-08-L08/L09/L10, own only the exact suites in their child contracts and treat
  production source as read-only. A source change requires a fresh exact-writer contract
  and the 1,000-line gate.
- L12 owns only its reconciliation evidence; it never edits source/tests, task-board rows,
  changelog, coverage configuration, or artifacts.
- Existing dirty worktree changes belong to their current writers. A leaf rechecks the exact
  file diff before adopting an untracked test draft and must not reset, clean, stage, or
  commit it.

## Implementation Pseudocode

~~~ts
for (const leaf of remainingLeavesInDeclaredOrder) {
  await requireFreshContractAudit(leaf);
  await requirePreviousReceipt(leaf);
  await runExactOwnedValidation(leaf);
  await recordSourceAndV8Evidence(leaf);
}

await runFinalL12ArtifactOnlyAfterAllActiveLeaves();
~~~

Each UI test must assert a visible effect, DOM/ARIA state, exact client payload, or absent
side effect. Pure exports receive valid public-contract inputs. A line classified unreachable
must carry current source proof rather than an impossible mock.

## Testing Requirements

Each active child runs the named one-file-at-a-time Vitest command in its own contract,
followed by the scoped V8 receipt when its contract owns coverage evidence, bun --cwd core
lint:types, bun --cwd core lint, the relevant admin-boundary check, root TypeScript
attribution, git diff --check, and the line-count gate. The L06-L01/L02 and
TASK-105-08-08-L08/L09/L10 type-repair leaves return attribution receipts rather than V8 coverage
claims. L12 then runs:

~~~bash
bun scripts/run-vitest-coverage.ts
bun scripts/analyze-vitest-gaps.ts
~~~

## 1000-Line Rule

No touched production or test module may exceed 1,000 physical lines. In particular,
UsersRolesPage.tsx (1,026) and MediaLibraryPage.tsx (1,421) cannot receive a source
edit under their test-only descendants; a dedicated split-first contract is required.

## Security Contract

Coverage work preserves existing internal-admin auth/RBAC/CSRF, strict validation, cache,
and public-write protections. No child may create a route, bypass authorization, expose
credentials, or weaken anti-abuse controls in test setup.

## Sub-Tasks

The current physical child task set includes the existing TASK-105-08-01..16 documents plus:

- TASK-105-08-03-L01-content-list-workspace-residuals.md
- TASK-105-08-03-L02-detail-template-residuals.md
- TASK-105-08-03-L03-field-schema-residuals.md
- TASK-105-08-06-L01-commerce-test-type-repair.md
- TASK-105-08-06-L02-media-test-type-repair.md
- TASK-105-08-07-L01-blueprint-schema-boolean-property-recovery.md
- TASK-105-08-08-L08-audit-test-type-repair.md
- TASK-105-08-08-L09-entries-test-type-repair.md
- TASK-105-08-08-L10-forms-test-type-repair.md
- TASK-105-08-09-L01-users-roles-reachable-residuals.md

## Documentation Updates Required

Leaf implementers return targeted receipts only. The orchestrator alone updates board
statistics, changelog, status-board rows, and commits after L12's fresh artifact proves the
remaining disposition.

## Acceptance Criteria

1. Every active residual line has one current owner and source/test evidence.
2. No parent is marked terminal while an active physical child exists.
3. A final coverage claim uses only a fresh L12 artifact and exact reconciliation.
4. Every inherited root-TypeScript diagnostic has an exact test/source owner; test-only
   repairs do not claim a coverage delta.
