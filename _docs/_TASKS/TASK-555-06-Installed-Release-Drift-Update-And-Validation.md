# TASK-555-06: Installed Release Drift Update and Validation
# FileName: TASK-555-06-Installed-Release-Drift-Update-And-Validation.md

**Parent Task:** TASK-555
**Priority:** High
**Category:** Reliability / Release Lifecycle / Admin Status
**Estimated Effort:** Large
**Dependencies:** TASK-555-02-L01; terminal TASK-551-03-L03, TASK-551-05-L01,
TASK-551-06-L01 base TASK-489 retention, and TASK-551-08 receipts; L03 additionally
depends on TASK-555-02-L03 and TASK-555-05-L03
**Status:** ⏳ To Do

---

## Overview

Own the additive curated lineage/reservation table and derive installed release state
from its active head joined to the authoritative install ledger, compare the
installed base/live state/current curated target without flattening documents, define
safe reapply/update behavior with no one-release downgrade surface, serialize a bounded
lineage-aware successor over TASK-551 retention, provide the explicit historical
FormaDom reconciliation command, and expose a bounded validation receipt and status/
checklist UI. The final leaf is the only writer that composes TASK-555 Admin
components with terminal TASK-489 history into `SolutionKitsPage.tsx`.

## Sub-Tasks

| Order | Leaf | Scope | Status |
|---|---|---|---|
| 1 | TASK-555-06-L01 | installed release read model and bounded validation service | ⏳ To Do |
| 2 | TASK-555-06-L02 | whole-resource three-way drift/reapply/update policy | ⏳ To Do |
| 3 | TASK-555-06-L03 | status/checklist UI and additive page composition | ⏳ To Do |

L01 and L02 land immediately after TASK-555-02-L01 so their installed evidence
and managed-write policy are mandatory inputs to preview/apply. L03 remains later
in the UI composition sequence.

## Lifecycle Invariants

- Browser selection, natural-key equality, and latest-three-event inference never
  establish installation ownership; the typed lineage row does.
- The active head source run must be successful, not rolled back,
  provider/release-bound, and carry matching managed snapshots. Pending reservations
  and table/run mismatches are explicit recovery/unknown states.
- Historical TASK-547 FormaDom evidence is read-only candidate data until the fixed
  internal reconciliation command holds the current writer fence, locks the null-head
  row, proves one exact terminal package-key/fingerprint candidate, and adopts it
  transactionally with one deterministic `logAuditOnceTx` event. Replay verifies head
  plus audit identity from existing fields; no lineage receipt column exists. Zero/two
  candidates or changed evidence fail closed; status GET never adopts.
- Before a preview is persisted and again inside the all-seven-row-locked apply claim,
  resulting predecessor depth must be `<=512` and deduplicated aggregate `<=3_584`.
  Overflow uses `curated_starter_lineage_limit_exceeded` before any claim/run/
  reservation write.
- Retention preserves every non-null active/pending lineage root plus its complete
  transitive predecessor chain, bounded to 512 links per starter/3,584 total. It
  composes TASK-551's base anchors, re-locks/rechecks all seven rows per delete batch,
  and deletes nothing on gaps, cycles, overflow, or writer conflict. Ownership never
  returns to TASK-551.
- Drift compares whole owner-normalized resource snapshots. It does not recursively
  merge arbitrary authored JSON.
- Same-release reapply/upgrades preserve user-only changes and block conflicts.
  Internal `preserve_live/releaseTargetDigest` maps explicitly to persisted
  `preserve/targetReleaseDigest` and provider/native `noop`; no native operation union
  accepts `"preserve"`.
- One release exists, so downgrade is not represented. Exact TASK-489 rollback is the
  only reversal surface; multi-release downgrade policy is future scope.
- Validation receipts expose bounded codes/counts/paths and no document/snapshot data.

## Security Contract

- **Visibility:** consumed through internal status/validate routes from TASK-555-03.
- **Auth/RBAC:** status `solution-kits:read`; explicit validation
  `solution-kits:write`; server remains authoritative.
- **CSRF/rate limit:** status GET `admin_read`; validate POST requires CSRF and
  `admin_write`.
- **Validation:** source run, registry release, fingerprints, resource limits, and
  exact normalized owner projections are strict.
- **Anti-abuse:** bounded queries/checks; no public nonce/CAPTCHA.
- **Privacy:** no snapshots/settings/form submissions/raw IDs beyond safe run/resource
  summary identity in browser responses.

## Collision Guard

TASK-489 history UI is terminal/read-only input. L03 alone edits
`SolutionKitsPage.tsx` and preserves its history/rollback composition. TASK-551 query
owners are serialized before any ledger query change. TASK-414/489/545/547/548/551/554 tasks,
foreign changelogs, and indexes are forbidden.

## Testing Requirements

- Vitest for pure installed-state projection, three-way classification, semver policy,
  receipt normalization, and UI.
- Bun DB tests for lineage constraints/reservations, bounded head/run/item reads,
  exact FormaDom reconciliation/no-candidate/ambiguous/idempotent races, bounded
  retention roots/chains/cycles/overflow/recheck, rollback exclusion, current resource
  checks, proactive 512/3,584 claim limits, and fixed query counts.
- Required sanitized small/large `EXPLAIN (ANALYZE, BUFFERS)` and large-cardinality
  fixture budgets from L01 for every new lineage/head/index query, exact historical
  candidate selection, and complete set-based owner validation.
- Migration tests pin expected locks, no rewrite/backfill, deploy order, and pre-use
  rollback versus post-use forward-fix recovery.
- Core lint/types, focused suites, line counts, diff check.

## Documentation Updates Required

Closure documents installed release/drift/update/validation behavior and the
post-install checklist. This child does not edit closure metadata.
