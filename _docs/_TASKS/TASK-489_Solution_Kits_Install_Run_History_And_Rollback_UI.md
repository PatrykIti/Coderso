# TASK-489: Safe Solution Kit and Full-Site Install Run History, Sanitized Detail, and Exact Engine-Aware Rollback
# FileName: TASK-489_Solution_Kits_Install_Run_History_And_Rollback_UI.md

**Priority:** High
**Category:** Solution Kits / Full-Site Installer / Admin Operations / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-547 is ✅ Done. Before any TASK-489 leaf starts, TASK-414-03-L03 must be terminal, TASK-545 must be ✅ Done with its canonical workflow/evidence contract, TASK-548 must be ✅ Done with its terminal source/generator receipt, and TASK-551 must be ✅ Done with the complete terminal receipt below. Every future symbol/path below is a handoff to re-read, not authority from an unmerged task draft.
**Blocks:** TASK-555
**Status:** ⏳ To Do
**Changelog:** 1268 (pinned; TASK-489-03-L02 closure only)

---

## Overview

Give authorized administrators a bounded operational history for both legacy
Solution Kit runs and TASK-547 full-site package runs without exposing the
ledger's recovery payload. A selected source run can be rolled back only by its
own engine: legacy runs use the legacy exact-source path, while full-site runs
delegate to the existing fenced `rollbackFullSiteInstall` lifecycle. There is no
"latest" fallback and this family does not restore apply, dry-run, rerun, or
package-upload UI.

## Parent-Level Start Gates

These gates apply to every one of the six leaves, including L01; they are not a
route-only dependency:

- Re-read terminal TASK-414-03-L03 and consume its shared route transport without
  reconstructing request ordering or response policy.
- Re-read terminal TASK-545 and require the tracked, regular, non-symlink,
  HEAD-identical canonical owner
  `_docs/_workflows/task-489-implement.mjs` plus its static/import gates.
  All author/audit, implementation, post-audit, smoke-manifest, checkpoint, owner-
  review, and closure-resume behavior uses that terminal contract.
- This workflow is an orchestrator bootstrap prerequisite, not a hidden L01
  implementation step. After TASK-545 is terminal, the orchestrator authors the
  file against that landed API, runs its exact static/import checks, and stops for
  the owner to track and commit the ignored path explicitly. A fresh read-only
  TASK-489 contract audit must pass on that new HEAD before L01 dispatch. An
  untracked/ignored local copy, force-added but uncommitted file, generated
  substitute, or task-leaf-authored workflow never satisfies the gate.
- Re-read terminal TASK-548 and require its exact landed Guide source inventory,
  generated-output transaction/recovery API, ordered write/check argv, and terminal
  receipt before any TASK-489 product leaf dispatches. TASK-489 may later append only
  its records through that landed owner; a nonterminal TASK-548, provisional helper,
  renamed source, or guessed compiler alias blocks implementation.
- TASK-551 must be completely terminal. Its closure receipt must explicitly prove
  retention preserves an active rollback owner, its exact source run, every exact
  source item, source options needed for strict engine/lifecycle classification,
  every running or terminal unreleased normalized Setup owner plus its strictly
  mirrored `active:true` lifecycle envelope, every normalized
  `solution_kit_legacy_template_evidence` row including strict `after_snapshot`
  and rollback action, and every newer same-package successful legacy apply plus its
  successful terminal rollback relation needed for the `(createdAt,id)` effective-
  supersession decision. This includes all-noop applies and byte-equal snapshots;
  pruning either side of an apply/rollback relation while it can affect an active
  owner or restored predecessor is forbidden.
- The same receipt must prove normalized relational authority, not a JSON
  predicate: `solution_kit_starter_apply_owners` owns package/actor/source/phase/
  envelope-digest/release state, `solution_kit_legacy_template_evidence` owns each
  new apply-side template source identity/snapshot/action,
  `solution_kit_legacy_rollback_progress` owns each rollback transition and
  invalidation receipt identity, and terminal rollback proof kind/digest are typed
  columns on `solution_kit_install_runs`; the same run carries typed high-level
  legacy-template plan version/count/digest before mutation. Composite FKs bind owner source/package/
  actor, progress rollback/source relation, and progress source evidence;
  `rollback_of_run_id` is `ON DELETE RESTRICT`. The strict table/check/FK/index
  contract is owned by TASK-551-05-L03 and landed by TASK-551-05-L01. TASK-489 may keep the bounded versioned
  envelope in JSON as a strict mirror, but may not use `options` JSON as active-
  owner, source-evidence, retry, terminal-proof, or progress query authority.
  TASK-551 supplies and tests this empty-capable schema/retention authority; it
  does not own the future `kitInstaller.ts`/`templateInstaller.ts` producers.
- TASK-551-06-L01 must additionally own and test the Bun-free canonical legacy
  install-item, template-state, template source-evidence, template rollback-progress, and
  combined-progress digest helpers, canonical combined position-map builder, plus
  shared byte/count constants. Its retention pruner
  independently rebuilds the typed rollback proof from persisted core items plus
  normalized template evidence/progress, and TASK-489 consumes the same helper
  read-only during locked finalization. A caller-supplied or merely well-formed
  64-hex value is never proof authority.
- The same TASK-551 receipt must name migration-backed, measured indexes equivalent
  to exact partial indexes
  `solution_kit_runs_successful_apply_order_idx(kit_id,created_at DESC,id DESC)
  WHERE mode='apply' AND status='success' AND finished_at IS NOT NULL` and
  `solution_kit_runs_successful_rollback_relation_idx(kit_id,rollback_of_run_id,id)
  WHERE mode='rollback' AND status='success' AND finished_at IS NOT NULL`. It must
  also prove the indexed, bounded 512-relation-plus-sentinel classifier on the
  10,000- and 1,000,000-run fixtures without a sequential scan, including one
  101-row history page where every candidate exercises up to the full relation
  bound. Its safe-detail receipt covers the run point read and item `LIMIT 513`
  statement separately. A broad kit/date index or the legacy rollback foreign-key
  index alone is not that receipt.
- TASK-551 must additionally provide and measure the package/actor-scoped unique
  partial `solution_kit_starter_apply_owners_active_idx` on normalized owner rows,
  plus the one-running-rollback-per-source constraint consumed below, and
  prove that both legacy and full-site
  mutation/compensation adapters collect finite tags, persist the backend-specific
  invalidation receipt in the same resource transaction, and await the one public
  `applyAfterCommit` boundary after commit. Naming the generic cache API without
  measured full-site adoption tests is insufficient.
- If any gate, exact landed path/export, retention evidence member, or canonical
  workflow receipt is absent or contradictory, implementation stops for amendment
  of the owning predecessor. TASK-489 does not add a fallback or manufacture a
  receipt.

## Non-Negotiable Contract

- TASK-489-L01/L02 introduce the first normalized template-evidence producers.
  Both generic high-level and Setup legacy apply paths persist every template
  create/update/noop/failed/skipped attempt under the typed source plan before
  source terminalization. Existing aggregate/changed-only option rows are not
  repaired by invention and fail closed for template rollback when complete per-
  position after-state is absent.
- History and detail are safe read models, not serialized ledger rows.
- TASK-489 history/detail/rollback browser DTOs, cache values, hook state, and UI
  never contain `actorId`, `options`, before/after snapshots, rollback actions,
  raw error text, SQL/driver details, settings values, or arbitrary operational
  JSON. This family does not make a broader claim about retained apply/Assistant/
  Setup response DTOs whose payload contracts it does not own.
- All ten TASK-547 kinds are represented exactly:
  `content_type`, `form`, `page_template`, `listing_template`, `content_entry`,
  `listing_query`, `detail_page`, `page`, `menu`, and `setting`.
- Exact rollback is `POST /solution-kits/runs/:runId/rollback` with body exactly
  `{}`. The path run is the only source. No kit ID, `sourceRunId`,
  `continueOnError`, latest-run lookup, or alternate engine hint is accepted.
- Full-site rollback reuses its existing exclusive fence, durable ownership,
  compensation, exact preflight, and finalization. TASK-489 must not copy or
  weaken that lifecycle.
- Unknown, contradictory, or mixed engine evidence fails closed before a
  rollback run or domain mutation is created.
- Legacy exact rollback durably claims the source under a source-scoped database
  transaction lock before template or core mutation. The old kit-key/latest
  rollback route is removed; exported legacy rollback requires an exact source.
- Under the same canonical legacy package/source claim lock, a successful legacy
  apply for the same package with `(createdAt,id)` newer than the requested source
  supersedes it only while that newer apply has no terminal successful rollback
  whose `rollbackOfRunId` is that exact apply. All-noop and byte-equal active applies
  still supersede. Successfully rolled-back applies no longer do, so an exact
  `C -> B -> A -> null` rollback sequence restores and permits each predecessor in
  order. The stable active-superseder code is
  `solution_kit_rollback_source_superseded`; advisory projection and the locked
  write recheck use the same indexed classifier, scan at most 513 newer apply
  relations, and fail closed with
  `solution_kit_rollback_relation_limit_exceeded` when all 513 are successfully
  rolled back and eligibility would otherwise require an unbounded walk.
- Every legacy delete/restore compares the current canonical resource snapshot
  with the source item's persisted `afterSnapshot` inside the same mutation
  transaction. Changed or unverifiable resources fail closed; a historical
  template action without a persisted after-state is never replayed blindly.
- Before any legacy apply or rollback owner/resource write, one strict preflight
  validates the complete core-plus-template operation set. Core and template
  operations together are limited to 512, templates are additionally limited to
  100, and the normalized plan, template seed/action, snapshot, and lifecycle-
  envelope byte caps are the exact constants owned by L01/L02. Counts of 511 and
  512 are valid; 513, template count 101, or any byte overflow rejects before a
  run claim or domain mutation. The browser-safe DTO/summary ceiling remains 512
  and is never widened to accommodate invalid persistence.
- Setup apply recovery is server-only and adds no browser run/idempotency identity.
  Under the canonical package lock, one package/actor-scoped active marker owns a
  precreated source run and strict run-option phase CAS. Core operation receipts,
  template mutations plus exact `afterSnapshot` evidence, shell prepare/apply, and
  terminalization resume from that run. A template mutation and its rollback
  evidence share one transaction; shell ambiguity resolves only when current state
  equals exact before or intended after state. The marker remains active through a
  terminal response so a response-loss retry returns the same result; only exact
  successful rollback clears it. Setup applies persist one strict
  versioned, presence-aware rollback envelope for only changed members of
  `site.homepageId`, `site.navigationMenuId`, and `site.footerTemplateId`.
  Historical partial metadata is not rollbackable and administrator drift is never
  overwritten.
- Setup apply terminalization owns its deterministic audit atomically with the
  source run. `setupRoutes.ts` performs no second apply audit or other throwing
  post-service work: once the service reports committed success, the route returns
  that result directly, so an audit/cache follow-up cannot turn the committed
  apply into an apparent HTTP failure.
- A claimed rollback returns a strict `success|failed|recovery_required` result.
  Success is terminal and carries a truthful summary. Failed is terminal only
  when a locked finalization proves either that zero rollback mutations committed
  or that every committed rollback mutation was fully compensated back to the
  exact source state. That failed owner releases its claim but does not mark the
  source rolled back and does not clear an active Setup apply marker; a later exact
  request claims a new rollback owner rather than reopening the terminal failed
  row. Any partial/unresolved mutation, failed compensation, fence loss, or
  uncertain terminal/audit proof is `recovery_required` with the same durable
  still-running owner, one safe code, and `summary:null`. Pre-write rejection
  creates no rollback run.
- A safe history row is discriminated too: `running` always has `summary:null`,
  `safeErrorCode:null`, and `finishedAt:null`; only terminal success/failed rows have
  counters. No projection manufactures zero counters for an unfinished run.
- Every committed resource mutation persists its terminal TASK-551 post-commit
  invalidation plan in the same transaction and applies it after commit. A
  terminal failed result has zero net committed rollback effects; any mutation not
  proven compensated keeps the owner in recovery. Run creation/finalization
  invalidates safe history/detail families, and cache failure never turns
  committed work into an apparent API failure.
- Exactly one centralized deterministic safe audit event is inserted in the same
  transaction that terminalizes either engine's rollback owner. If that atomic
  write cannot be proven, the owner stays nonterminal and the result is
  `recovery_required`; there is no terminal-status/audit crash gap. Legacy lower-
  layer rollback audit emission is suppressed on this path, and no audit is emitted
  for a still-nonterminal recovery result.
- TASK-489 owns a bounded successor region in `fullSiteInstall/rollback.ts` and its
  existing unit suite: an owned compensation failure terminalizes as failed only
  after the locked engine evidence proves no rollback mutation committed or full
  compensation restored every touched resource to source state. Otherwise the
  same owner remains running and returns `recovery_required`; fence loss or an
  unprovable finalization follows the same recovery branch. Fence/compensation
  algorithms remain otherwise unchanged.
- Safe terminal detail reconciliation exposes only strict
  `itemTrace: "complete"|"legacy_template_summary_only"` and bounded numeric
  `omittedItemCount`; running detail is exactly
  `itemTrace:"nonterminal", omittedItemCount:null`. Values derive from safe
  status/summary/item counts and never expose options or snapshots.
- Retention cannot prune any active-owner evidence enumerated in the parent-level
  start gate. The terminal TASK-551 receipt must prove the complete overlap
  contract before implementation starts.
- Reads require `solution-kits:read`. Rollback requires session auth, CSRF, the
  `admin_write` bucket, and one authorization snapshot containing both
  `solution-kits:write` and `settings:write`. There is no public route or API-key
  mode.
- TASK-551-06 owns retention policy and pruning. This family only documents and
  preserves that handoff; history pagination never reconstructs pruned data.
- TASK-551-09-L04 terminal authority owns identity-scoped browser cache
  installation. TASK-489 consumes that seam and stores only validated safe DTOs.

## API Contract

- `GET /solution-kits/runs`: strict query with only `packageKey`, `cursor`,
  `limit`; default `limit=25`, maximum `100`. Omitting `packageKey` is the
  first-class all-runs view and keeps pre-TASK-555 full-site runs reachable.
- Ordering is `createdAt DESC, id DESC`; response is
  `{ items: SafeSolutionKitRunSummaryDto[], nextCursor: string | null, hasMore: boolean }`.
- `GET /solution-kits/runs/:runId`: no query; returns
  `SafeSolutionKitRunDetailDto` with bounded sanitized item summaries.
- `POST /solution-kits/runs/:runId/rollback`: exact empty JSON object; returns strict
  `SafeSolutionKitRollbackResultDto` containing only source/rollback run IDs,
  package key, engine, `success|failed|recovery_required`, safe code, and a terminal
  safe summary or recovery `null`. Success/failed return HTTP 200; a claimed but
  unproven-terminal recovery result returns HTTP 202. All three use no-store. Pre-write
  validation/conflict errors use the mapped error response and create no run.
- Stable cursor scope is
  `admin:solution-kit-runs:v1:<sha256(canonicalJson({packageKey: normalizedPackageKeyOrNull}))>`
  and uses
  terminal TASK-551's exact signed `KeysetSpec`/keyring/wire contract for
  `createdAt DESC,id DESC`; TASK-489 defines no second cursor envelope.

## Family And Land Order

| Order | ID | Responsibility | Status |
|---:|---|---|---|
| 1 | TASK-489-01-L01 | Safe read model plus exact owner/evidence/progress/finalization APIs | ⏳ To Do |
| 2 | TASK-489-01-L02 | Claimed-run apply and exact engine-aware rollback coordinators | ⏳ To Do |
| 3 | TASK-489-02-L01 | Strict run routes plus Setup route/audit/error repair | ⏳ To Do |
| 4 | TASK-489-02-L02 | Strict client/cache and race-safe hook | ⏳ To Do |
| 5 | TASK-489-03-L01 | One-writer operational UI composition | ⏳ To Do |
| 6 | TASK-489-03-L02 | Tests, six-flow runtime smoke, docs, changelog, closure | ⏳ To Do |

Exactly three physical children and six leaves exist. Implement sequentially;
each source file has one writer leaf.

## Sub-Tasks

| Child | Title | Status |
|---|---|---|
| TASK-489-01 | Safe read model and exact engine-aware rollback service | ⏳ To Do |
| TASK-489-02 | Internal API and identity-safe browser state | ⏳ To Do |
| TASK-489-03 | Operational UI, validation, smoke, docs, and closure | ⏳ To Do |

## Shared Budgets

- History: one SQL statement, `LIMIT + 1`, at most 101 decoded rows. The default
  page p95 is <=75 ms on the 10,000-run fixture and <=200 ms on the 1,000,000-run
  fixture; the mandatory relation-heavy 101-candidate page p95 is <=250/750 ms on
  those same fixtures. Base traversal visits <= 4 * (`limit + 1`) index rows for both
  unfiltered created/id and exact package-key paths, in addition to the separately
  bounded relation probes below, using terminal TASK-551 indexes.
- Detail: at most two SQL statements, one run row and at most 513 item-summary
  rows (512 contract limit plus sentinel); p95 <= 100 ms on the small fixture and
  <= 250 ms on the large fixture; no ledger JSON column is selected or transferred.
- Rollback dispatch adds at most two classification statements before delegating
  to the selected existing engine lifecycle; the effective-superseder recheck is one
  indexed statement over at most 512 newer applies plus one sentinel, returning one
  `active|clear|overflow` state and adding no per-item discovery query. Its small/
  large p95 ceilings are 75/200 ms; sanitized plans must use both TASK-551 relation
  indexes, visit at most 513 apply rows plus 513 rollback-relation point probes, and
  perform no sequential scan.
- Sanitized string fields are NFC, control-free, and bounded: package/resource
  key 128 UTF-8 bytes and safe code 96 ASCII bytes. Cursor decoded canonical JSON
  is at most 1,024 UTF-8 bytes and the complete encoded wire is at most 2,048
  ASCII bytes, exactly matching terminal TASK-551.
- Legacy combined-plan bounds are one pre-mutation contract: <=512 total core plus
  template operations, <=100 template operations, <=4 MiB canonical template
  seeds, <=512 KiB per template before/after snapshot, <=1,049,600 canonical bytes
  per strict template action, <=12 MiB for the action vector, <=16 MiB for the
  complete Setup lifecycle envelope, and <=8 MiB for the normalized combined
  definition/plan digest input. UTF-8 byte length is measured after canonical JSON
  normalization, before owner creation or mutation.

## Security Contract

- **Visibility:** internal Admin only; route modules register prefixless paths and
  the shared router supplies `/admin/api`.
- **Auth/RBAC:** session only; reads `solution-kits:read`; rollback require-all
  `solution-kits:write` and `settings:write`.
- **CSRF/rate limit:** GET has no CSRF; rollback requires shared CSRF and
  `admin_write`.
- **Validation:** strict reject-unknown query/path/body and strict response DTOs.
- **Anti-abuse:** no public endpoint, API key, nonce, HMAC, or CAPTCHA mode.
- **Data handling:** TASK-489 history/detail/rollback projections never move raw
  ledger recovery data into their browser cache/UI; logs/audit use IDs, engine,
  safe code, and terminal counters only. Retained apply response ownership is out
  of scope.

## Testing Requirements

- Every executable leaf passes its targeted Vitest or Bun lane plus
  `bun --cwd core lint:types`, `bun --cwd core lint`, touched-file line counts,
  and `git diff --check` before the next leaf lands.
- TASK-489-03-L02 owns the combined route, security, DB race, performance,
  client/cache, UI, full mandatory gate, and shared fast/certification runtime
  smoke validation. Fast is operational non-checkpoint evidence. Every
  non-metadata write, gate, line count, diff check, and post-audit finishes before
  the final certification run; only certification enters TASK-545 phase 1.
- DB-backed lanes load `.env` first and report a missing or unreachable
  `DATABASE_URL` as blocked rather than silently skipped.
- Runtime smoke additionally requires `CODERSO_RUNTIME_SMOKE_DATABASE_URL`. Its
  canonical host/port/database identity must differ from the ordinary
  `DATABASE_URL`; the dedicated value is projected to both server and worker as
  their `DATABASE_URL`. The fixed Setup apply flow is forbidden against the
  ordinary/shared database.
- Before capturing any baseline, each profile must acquire the shared runtime-
  smoke exclusive lease for the canonical dedicated database and retain the same
  direct session through cleanup and baseline proof. Contention fails boundedly
  with `smoke_database_busy` before fixture mutation. This lease is mandatory for
  fixed Setup fixture C and serializes all TASK-489 mutation of database-global
  settings; session prefixes alone are insufficient.

## Documentation Updates Required

TASK-489-03-L02 owns synchronized updates to `_docs/CMS_API.md`,
`_docs/SOLUTION_KITS.md`, `_docs/SECURITY_SPEC.md`, `_docs/ADMIN_CACHE.md`,
`_docs/ADMIN_CACHE_MAP.md`, `_docs/AUDIT_SPEC.md`, the runtime-smoke cookbook,
the exact terminal TASK-548 Guide composition sources/generated-doc transaction,
changelog 1268, and the task board/status statistics. All product/runtime/Guide/
  generated documentation is frozen before certification. The exact changelog path is
  `_docs/_CHANGELOG/1268-YYYY-MM-DD-task-489-safe-solution-kit-run-history-and-exact-rollback.md`;
  closure substitutes only the actual date and never reallocates the number or slug.
  After its checkpoint
only changelog/index and TASK-489 status/board metadata may change. It must not
compile or edit the final CMS capability JSON.

## Serialized Successor Handoff

The serialized successor segment is exactly
`TASK-548 -> TASK-489 -> TASK-555 -> remaining TASK-414 -> TASK-556`.
Terminal TASK-414-03-L03 is already a TASK-489 prerequisite, and terminal
TASK-414-02-L01 is a TASK-555 prerequisite; neither prerequisite leaf is part of
the `remaining TASK-414` segment.
TASK-489 contributes one pure route/control source fact and leaves terminal
TASK-548 Guide/generated bytes current. It exports an engine-only
`rollbackExactInstallRunEngineOnly` entry point. Before TASK-555 there is no curated
lineage owner, so the TASK-489 route dependency calls that entry point directly.
TASK-555 must then install one server-only route composite which first performs its
bounded authoritative membership classification for the exact path source across
the seven lineage roots and their strict capped managed-lineage/run evidence. An
active head, pending relation, historically reconciled head, or predecessor-chain
member stays on the curated branch; ambiguity, gap, cycle, overflow, or parity
mismatch fails closed without engine dispatch. An older curated non-head rejects
inside that branch. Only proof of zero curated evidence permits the engine-only
TASK-489 entry point. No browser starter hint participates. The TASK-555
coordinator itself also calls only the engine-only entry point, never the route
composite, so recursion is impossible.

The composite must make direct generic-route rollback of curated `C`, then restored
`B`, then restored `A`, advance the TASK-555 active head `C -> B -> A -> null` under
its lineage CAS on every successful result. It resumes an existing pending source/
engine relation before dispatch and cannot bypass lineage by calling TASK-489
blindly. It projects the generic route's TASK-489 DTO after TASK-555 finalization.

TASK-555 must preserve all three TASK-489 result branches. Success has
`safeErrorCode:null` and a summary and advances lineage. Failed has a safe code
and truthful zero-net/full-compensation summary, leaves the curated head on the
source, and releases the terminal failed engine/lineage reservation so a later
exact request can claim a new owner. `recovery_required` has the same durable
still-running rollback run ID, a safe code, `summary:null`, HTTP 202/no-store,
and alone leaves the curated reservation pending for exact resume.
TASK-555 may not fabricate this TASK-489 branch for a terminal engine whose later
lineage/status receipt is uncertain; that remains TASK-555's own mapped recovery
contract and cannot report generic-route success until its lineage CAS completes.
TASK-555 treats Setup settings restoration as dispatcher-owned and adds no second
settings phase. If its task contract still accepts only `success|failed`, rejects
`recovery_required`, omits the generic-route composite/engine-only split, describes
`running`, or adds another settings restore, TASK-555 remains blocked for contract
amendment before implementation.

## Closure Authority

TASK-489-03-L02 must enumerate all ten family IDs in changelog 1268, synchronize
their terminal statuses and board statistics, record dependency receipts and
validation output, and prove all modified production/test files are <= 1,000
physical lines. TASK-489 may close only after both runtime-smoke profiles pass
the exact same six scenario IDs with zero console errors and exact cleanup in the
explicitly dedicated runtime-smoke database. Fast creates no checkpoint or
closure inventory. Only the final certification session creates one immutable
TASK-545 checkpoint; its emitted resume performs the metadata-only closure above.

## Global Forbidden Paths

No leaf may edit `AGENTS.md`, `.gitignore`, `opencode.json`, TASK-555/TASK-556,
TMP files, the parallel worktree, unrelated task/changelog files, DB schema/migrations,
TASK-551 retention/cache-authority owners, apply or dry-run routes, or public/API-key
routing. Full-site fence/compensation internals remain read-only except the exact L02
rollback/finalization/audit successor regions and existing tests named by that leaf;
per-leaf ownership narrows this list.
