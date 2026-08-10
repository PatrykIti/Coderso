# TASK-489-01: Safe Read Model and Exact Engine-Aware Rollback Service
# FileName: TASK-489-01-Install-Run-History-And-Run-Item-Detail.md

**Parent Task:** TASK-489
**Priority:** High
**Category:** Solution Kits / Domain / Persistence / Reliability
**Estimated Effort:** Very Large
**Dependencies:** All TASK-489 parent-level start gates; TASK-547 done; complete terminal TASK-551 with every cursor/repository/cache/active-owner evidence receipt required by the parent
**Status:** ⏳ To Do
**Changelog:** 1268 (pinned; closure only)

---

## Overview

Own the server-side contract that turns the shared legacy/full-site ledger into
safe bounded history/detail DTOs, durably claims an exact legacy rollback source,
rejects an effectively superseded source under the shared package/source claim
lock, and dispatches the selected source to the correct existing engine. A newer
successful apply ceases to supersede after its own terminal successful rollback,
so restored predecessor chains remain executable. This child does not own routes,
browser code, UI, retention, schema, or migrations. Its only full-site lifecycle
ownership is L02's named rollback/finalization/audit successor region.

## Sub-Tasks

| Order | ID | File | Status |
|---:|---|---|---|
| 1 | TASK-489-01-L01 | `TASK-489-01-L01-Run-History-List-Panel.md` | ⏳ To Do |
| 2 | TASK-489-01-L02 | `TASK-489-01-L02-Run-Item-Detail-Drilldown.md` | ⏳ To Do |

## Shared Service Boundary

- Pure strict contracts belong in
  `core/services/kits/solutionKitInstallHistoryTypes.ts`.
- Bounded SQL/read projection and the no-mutation legacy claim primitive belong
  in `core/services/kits/solutionKitInstallHistoryService.ts` and terminal
  TASK-551 `solutionKitInstallRunRepository.ts`.
- Exact dispatch belongs in
  `core/services/kits/solutionKitInstallRollbackDispatcher.ts`.
- L01 exposes the exact package-locked Setup active-owner and run-option phase-CAS
  repository APIs, strict combined-plan/progress types, transaction-aware
  `logAuditOnceTx`, and the named rollback replay/receipt/summary/marker/finalizer
  APIs in its leaf; there is no generic or loosely typed metadata patch handoff.
- L01 owns the pure strict Setup lifecycle-envelope parser/types; L02 owns its
  apply/rollback coordinator consumption, transaction-aware template evidence
  seam, durable invalidation consumption, invocation of L01's atomic terminal-
  audit/finalization APIs, and bounded full-site failure-finalization adoption. It
  does not weaken terminal TASK-551 cache/outbox/settings owners.
- L01 alone writes the terminal run repository and audit primitive. L02 alone
  writes the landed install-operation/facade claimed-run regions and consumes the
  exact L01 exports; no production file has two TASK-489 writers.
- Engine classification is server-owned. A UI/client engine value is never
  accepted as authority.

## Invariants

- Safe DTO projection happens at the SQL/service boundary, not by fetching raw
  rows and deleting fields afterward.
- Every query uses explicit columns and stable ordering; no `select *`.
- Detail supports all ten package kinds and at most 512 items plus one sentinel.
- Exact rollback never falls back to a latest run and never accepts a package
  key as a substitute for source identity.
- Legacy rollback creates one durable owner before template/core mutation; a
  concurrent or repeated request cannot create a second owner or mutate first.
- A newer same-package successful legacy apply ordered by `(createdAt,id)` makes
  the requested source ineligible only while no terminal successful rollback points
  to that exact newer apply. All-noop byte-equal active applies still supersede;
  successfully rolled-back newer applies do not. Projection is advisory; the
  package/source-locked indexed write recheck is authoritative and examines at
  most 512 newer relations plus one fail-closed sentinel.
- Every legacy resource/template mutation performs a same-transaction canonical
  current-state comparison with the persisted source after-state. Newer applies
  and administrator edits therefore conflict without being overwritten.
- One preflight validates the complete legacy core-plus-template operation set
  before an apply/rollback owner or resource write: <=512 combined, <=100
  templates, and every exact canonical byte cap from L01. The 512-safe DTO ceiling
  is unchanged.
- Retention remains TASK-551-owned; a pruned source returns stable not-found.
  Terminal retention must preserve the complete parent-enumerated active-owner
  evidence graph until rollback finalization or recovery reaches a terminal state.
- Running read rows carry `summary:null`; no unfinished row is projected with fake
  zero counters.
- Once a rollback run exists, terminal failure is allowed only after a locked
  zero-net proof: no rollback mutation committed, or every committed mutation was
  compensated exactly back to source state. It releases that owner while keeping
  the source and Setup marker active, so a later request claims a new owner. Any
  partial/unresolved mutation or uncertain proof remains `recovery_required` on
  the same running owner with `summary:null`.
- Terminal rollback status and its one deterministic safe audit insert are one
  transaction; a still-nonterminal recovery result has no terminal audit.

## Security Contract

- **Visibility/auth:** internal service consumed only by TASK-489 routes; routes
  enforce session and RBAC.
- **CSRF/rate limit:** route-owned; no service bypass.
- **Validation:** strict pure input/DTO parsers; canonical UUID and cursor checks
  occur before SQL.
- **Anti-abuse:** bounded filters, page size, cursor, rows, bytes, statements, and
  exact-source rollback.
- **Secrets:** snapshots/options/actors/raw errors never enter returned DTOs,
  telemetry, or audit metadata.

## Testing Requirements

Each leaf runs its exact targeted commands plus `bun --cwd core lint`,
`bun --cwd core lint:types`, touched-file physical line counts, and
`git diff --check`. L02 cannot land until L01 is green.

## Documentation Updates Required

TASK-489-03-L02 owns final API, Solution Kits, security, cache, changelog,
board, and closure documentation after both leaves land. This child hands off
its safe DTO, cursor, query-budget, exact-rollback, supersession, terminal-result,
audit, and invalidation contracts.

## Forbidden Paths

Routes/schemas, all Admin code, `SolutionKitsPage.tsx`, runtime-smoke files,
docs/changelog/board, DB schema/migrations, retention policy/pruners, cache
authority, apply/dry-run paths except L01's exact package-claim/Setup phase APIs
and L02's named Setup recovery/evidence regions,
and full-site fence/compensation modules except L02's explicitly named rollback/
atomic-finalization/audit successor regions and existing regression files.
