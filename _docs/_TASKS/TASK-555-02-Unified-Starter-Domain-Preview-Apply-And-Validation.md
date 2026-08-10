# TASK-555-02: Unified Starter Domain Preview Apply and Validation
# FileName: TASK-555-02-Unified-Starter-Domain-Preview-Apply-And-Validation.md

**Parent Task:** TASK-555
**Priority:** High
**Category:** Domain / Installer / Reliability / Security
**Estimated Effort:** Very Large
**Dependencies:** landed TASK-555-01-L03 receipt; terminal TASK-551-03-L03,
TASK-551-05-L01, TASK-551-06-L01 base TASK-489 retention, TASK-551-08, and
TASK-551-09-L04 receipts for affected installer/cache/query seams; landed
TASK-555-06-L01 lineage-retention successor receipt before L02
**Status:** ⏳ To Do

---

## Overview

Create one provider-free curated-starter domain over the strict registry. Own the
shared bounded DTOs and provider union, actor-bound preview proof, live-baseline
fingerprints, apply replan/takeover/idempotency, post-commit behavior, and provider
delegation. Legacy catalog kits retain their native resource/template owners behind
one crash-safe curated coordinator; FormaDom retains the TASK-547 full-site executor.
Both write provenance to the existing run ledger, reserve lineage through L06's typed
table owner, and expose rollback through one server-verified composite that classifies
curated lineage before it may call TASK-489's engine-only dispatcher.
Full-site requested ownership also carries transaction-scoped terminal success and
proven-zero-net failure callbacks, so run terminalization, lineage settlement, and the
backend-specific invalidation receipt cannot commit as separate facts.

## Sub-Tasks

| Order | Leaf | Scope | Status |
|---|---|---|---|
| 1 | TASK-555-02-L01 | shared DTO/provider union/strict normalizer | ⏳ To Do |
| 2 | TASK-555-02-L02 | preview reservation, fingerprints, stale baseline, takeover, idempotency | ⏳ To Do |
| 3 | TASK-555-02-L03 | apply, effective settings, validation handoff, invalidation/audit, rollback handoff | ⏳ To Do |

Land `L01`, then wait for `TASK-555-06-L01 -> TASK-555-06-L02`, then land
`L02 -> L03`. L06-L01 owns the additive lineage DDL/repository first. L02 owns
deterministic requested-run identity, the one-transaction preview/run/reservation
claim through extracted `legacyInstallRunPersistence/packageLockReservation.ts`, and
the requested-owner terminal settlement callbacks plus mandatory cohesive legacy
coordinator split. It must serialize exact persistence/
query files with terminal TASK-551, extract package-lock behavior only from terminal
`legacyInstallRunPersistence/lockLifecycle.ts`, and keep that module plus the new
extraction below 1,000 lines. The terminal root barrel and TASK-489-owned
`ledgerAdapter.ts` remain byte-identical.

## Domain Invariants

- Request callers provide only a registered starter ID; the registry selects the
  provider/release/artifact.
- Preview is a same-actor successful dry-run with a ten-minute expiry and exact
  provider-discriminated release/source/plan/live-baseline/takeover proof plus
  terminal whole-resource managed-evidence policy.
- Apply requires preview ID, idempotency key, and explicit takeover boolean. It
  replans and compares all proof fields before writes.
- Raw idempotency keys never persist. Strict preview claim evidence lives in existing
  run-options JSONB, uses same-actor `600000` ms TTL and CAS, while L06's typed row is
  authoritative for active head and pending apply/rollback ownership.
- Preview performs a bounded resulting-chain check; the apply claim transaction locks
  all seven lineage rows and enforces resulting depth `<=512` and aggregate `<=3_584`
  before CAS/run/reservation writes. Overflow uses
  `curated_starter_lineage_limit_exceeded` and writes nothing.
- Provider execution is selected from the registry union, never inferred from run
  text, URL, package body, or client provider kind.
- Legacy execution must hold the landed native writer fence, force
  `continueOnError:false`, keep the source run nonterminal through resources,
  templates, and shell CAS, and pass managed-evidence safety before product exposure.
  Both generic and curated rollback routes enter the same server-verified composite;
  it reserves only the exact active curated head before consuming TASK-489's
  engine-only source-run dispatcher and rejects every older lineage member.
- TASK-489 rollback results remain exactly `success|failed|recovery_required`.
  Terminal failed preserves code/counters, proves zero net rollback mutation, clears
  the TASK-555 pending reservation atomically while keeping the active head, and permits
  a fresh exact retry. Recovery preserves the same reservation/engine owner, code, and
  `summary:null`. Both keep null effective settings and have no second restore,
  resource/history invalidation, or audit; recovery has no second dispatch.
- Apply failure clears its pending reservation only through a terminal callback that
  proves exact zero net mutation while leaving the predecessor head unchanged. Partial,
  ambiguous, or fence-lost settlement retains the same reservation and returns
  `curated_starter_reconciliation_required`.
- Committed run success remains success when cache publication or audit recording
  fails. Full validation plus deterministic audit/backend-specific invalidation
  receipts support recovery without repeating provider/resource mutation.
- Apply and successful rollback return effective name/locale from authoritative
  settings. Terminal `failed` and nonterminal `recovery_required` rollback return
  `effectiveSettings:null` exactly as the shared status-discriminated union requires.
- No browser DTO contains package documents or snapshots.

## Security Contract

- **Endpoint visibility:** no route is implemented here; TASK-555-03 owns internal
  mounts.
- **Auth:** service requires a validated actor UUID supplied by the authenticated
  route; cross-actor previews fail as not found.
- **RBAC/CSRF/rate limit:** route-owned; service accepts no authorization claim from
  payload data.
- **Validation:** strict DTOs, registry IDs, release manifest/package checks,
  ten-minute expiry, exact fingerprints, bounded operations, and explicit takeover.
- **Anti-abuse:** no public write/nonce/CAPTCHA; internal action limits and unique
  idempotency scope prevent repeat install amplification.
- **Secrets:** no raw key, snapshot, package, provider secret, form payload, or
  arbitrary driver error enters result/audit/log data.

## Collision Guard

TASK-551 query/persistence work and TASK-555-02-L02 cannot overlap on an exact file.
TASK-554 must be terminal before shared security seams are edited. All TASK-414/489/
545/547/548/551/554 task files and foreign changelogs are forbidden. L02 consumes the landed
TASK-551 split files and is the serialized successor writer for the exact package-lock
region in `legacyInstallRunPersistence/lockLifecycle.ts`; it must not edit the terminal
root barrel or `ledgerAdapter.ts`, duplicate lock code, or add requested-owner behavior
before the cohesive `packageLockReservation.ts` extraction is green.

## Testing Requirements

- Vitest for pure contracts/fingerprints/read models/drift-free provider dispatch.
- Bun DB tests for preview/apply/idempotency, fenced lineage reservation, stale
  baseline, takeover, crash-safe legacy phases, run options, backend-specific
  post-commit recovery, requested-owner success/zero-net-failure atomic settlement,
  exact TASK-489 engine-relation resume versus fresh retry after terminal failure, and
  lossless `success|failed|recovery_required` projection without a second side effect.
- Existing-primary-key collision/replay and bounded ledger/lineage point-read/query-
  count evidence for the exact idempotency path; migration artifacts are owned and
  validated by TASK-555-06-L01.
- Core/repo lint and types, focused suites, <=1000 line gate, `git diff --check`.

## Documentation Updates Required

Closure updates Solution Kits, API, data model, security, and full-site package docs.
No leaf in this child edits task/changelog indexes.
