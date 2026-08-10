# TASK-556-01: Code-Owned Static Source Persistence and Registry
# FileName: TASK-556-01-Code-Owned-Static-Source-Persistence-And-Registry.md

**Parent Task:** TASK-556
**Priority:** High
**Category:** Designer / Persistence / Source Registry
**Estimated Effort:** Large
**Dependencies:** External gate from TASK-556; prior-leaf progress is accepted only by validated landed implementation receipt
**Status:** ⏳ To Do
**Changelog:** 1270 pinned

---

## Overview

Add database-enforceable `code_owned_static` generation subtype columns, one
current-root binding pointer, exact claim-local static identity columns, and the
frozen source registry/identity contract. Run/claim CHECKs remain row-local;
cross-row binding/claim relations are enforced through named composite FKs and
constraint triggers rather than false cross-table CHECK claims.

## Sub-Tasks

| Order | ID | Scope | Status |
|---:|---|---|---|
| 1 | TASK-556-01-L01 | Generation subtype migration, constraints, repository, retention | ⏳ To Do |
| 2 | TASK-556-01-L02 | Frozen registry, six digest domains, idempotency/claim policy | ⏳ To Do |

L02 starts from L01's reviewed landed file/command/line-count receipt.

## Locked Contract

- Add immutable nullable static subtype columns to the terminal generation-run
  row and terminal generation-claim row, one owner/source/release current-root
  binding table, and one binding/run-owned idempotency-alias table. Named row-
  local CHECKs enforce all-static-or-all-null and forbid provider/import/source-
  lease facts for `code_owned_static`; neither CHECK inspects another table. A
  named run/claim constraint-trigger pair and exact composite identity FK enforce
  a born-`bound` static claim whose binding, brief, and request digests match its
  run; binding-to-run identity also pins contribution/registry/compiler versions.
  The run additionally owns strict normalized `static_brief` JSONB only for
  `code_owned_static`, with canonical UTF-8 size <=512 KiB and immutable bytes
  after dispatch. Every other source keeps it null. Nonstatic claims keep every
  static field null.
- The binding uses exact owner/workspace/revision/run composite FKs. Alias
  `(owner, binding, generation run, seedRequestDigest)` identity is enforced by
  a named composite FK to one named generation-run unique target; cross-owner,
  cross-binding, and mismatched-run rows fail at the DB boundary.
- The unique binding row and alias owner/key digest are concurrency authority; a
  bounded savepoint rolls back the complete losing multi-row insert before the
  outer transaction re-reads the owner/key alias first and its immutable run,
  consulting the binding only when the alias is absent. Historical promoted runs
  are not subject to a false permanent one-run uniqueness rule.
- The initial dispatch winner and each expired-lease takeover own one durable
  dispatch alias. A fresh key that loses against a live fence inserts no alias,
  consumes no cap, and receives in-progress. Same-key live is in-progress;
  same-key expired remains an idempotency conflict with fresh-key guidance. A
  fresh key after expiry atomically inserts its dispatch alias and rotates the
  fence. `MAX_STATIC_DISPATCH_ATTEMPTS_PER_RUN` is exactly 8: each run's creation
  dispatch and each successful takeover count under the locked run, collision losers do
  not, and a ninth attempt returns `designer_reconciliation_required` with no
  alias/fence/dispatch. Terminal reopen aliases retain a separate locked cap of 32.
- Upstream `artifactSha256`, `packageFingerprint`, and
  `releaseDescriptorDigest` remain distinct from Designer
  `designerBriefDigest`, `bindingDigest`, and `seedRequestDigest`.
- Takeover and the sole retry use the persisted normalized generation-run
  `static_brief`, brief digest, contribution/registry/compiler versions, and full
  binding identity. The retry copies the locked failed run's brief into its new
  run; neither path reads current registry brief bytes.
  Current frozen registry/compiler facts are selected only for `new` and
  `fork_promoted` roots.
- Static rows use terminal generation retention/pruning; no independent cleanup.
  Alias `purgeAfter` is null while its referenced run is live and is set only
  when that run is terminal, always to the referenced run's terminal timestamp
  plus 30 days. Late insertion, replay, restore, or refresh never derives from
  current/insertion time or extends it. The exact additive successor region in
  terminal `workspacePurgeService.ts` owns alias-first deletion. Global pruning
  keysets by `(purge_after, id)` through the matching partial index. Historical
  runs keep their binding until every reference is terminal-pruned.
- A bounded claim lease allows fenced takeover after process/browser loss. A
  live original static claim returns in-progress with no second dispatch; a
  fresh key may rotate an expired static fence. Successful seeds in the exact
  active navigable subset reopen under current authoritative workspace state and
  recorded seed/compiler evidence; a fresh key on a terminal promoted root
  forks one new private root. A fresh key may create exactly one retry run for
  the original deterministic static failure. Terminal/hiding/inconsistent states
  use terminal Designer errors, and later provider claims are never mistaken for
  the static seed claim.
- Registry is literal, server-only, frozen, duplicate rejecting, and consumes no
  HTTP/provider/plugin/filesystem-selected contribution.

## Security Contract

- **Visibility:** server persistence/pure registry only; no route.
- **Auth/RBAC:** caller supplies server actor/fenced claim; this child grants none.
- **CSRF/rate:** route-owned later; no public write or anti-abuse token here.
- **Validation:** strict schemas plus named CHECK/unique/FK constraints and bounded projections.
- **Privacy:** no package body/path, prompt, provider, preview secret, or driver detail.

## Testing Requirements

Run both leaf lanes, migration clean/upgrade/concurrency tests, exact
`pg_catalog` identifier/no-truncation assertions, live-collision race-to-cap then
expiry-recovery, exact 8/9 dispatch-attempt and terminal-alias-cap tests,
unique-race alias-first replay, strict 512 KiB `static_brief` persistence/backup,
and global alias-prune successor/EXPLAIN/budget tests, the focused
`tests/perf/designerStaticStarterPersistence.test.ts` lane without competing
load, lint/types, strict scan, `git diff --check`, and the <=1000 physical-line
gate.

## Documentation Updates Required

Provide final migration/constraint/index/query/retention and identity receipts to
TASK-556-04-L02; do not edit shared docs/metadata here.
