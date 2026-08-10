# TASK-414-09-L05: Activation Owner Inventory and Contract Freeze
# FileName: TASK-414-09-L05-Activation-Owner-Inventory-And-Contract-Freeze.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-09
**Priority:** Critical
**Category:** Designer / Contract Gate / Activation Ownership
**Estimated Effort:** Medium
**Dependencies:** TASK-545, TASK-547, TASK-548, and complete TASK-551 terminal;
all TASK-414 contracts authored; no TASK-414 product-source leaf dispatched
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Freeze the exact source ownership required for generation-consistent CMS reads
and mutations after TASK-547 and TASK-551 have landed. TASK-547 terminal source
commit `a13d186167a05901e644bf1a3a7aefee6f780471` is present through merge
`963733cae23456622bea1eef1b734723aaab2350`; TASK-551 must likewise be read from
its eventual terminal files rather than from planned task-contract symbols.
TASK-414-09-L04 must not be dispatched from guessed paths, broad directories,
or historical facades.

This is a mandatory initial AUTHOR/audit gate, executed after all named
external dependencies are terminal and before any TASK-414 product-source
writer. It inventories the terminal source, reconciles every manifest resource with all Admin/public/search/
cache read owners and canonical write owners, amends L04 with a single-writer
exact path/symbol matrix, and obtains a fresh clean read-only audit of that
amended contract. It adds no product behavior by itself.

Passing this gate emits a digest-bound implementation-readiness receipt. It
does not change this file's `**Status:**`, the task board, Statistics, or
changelog 1266; TASK-414-11-L01 performs those metadata transitions once at
family closure. Therefore L04 depends on the verified receipt, not a premature
terminal task status.

## Sub-Tasks

None; this is an executable contract-freeze leaf.

## Exact Ownership

During that initial AUTHOR phase, the task-414 orchestrator is the sole writer
for:

- `_docs/_workflows/lib/task-414-activation-owner-inventory.mjs`, imported and
  invoked only by the tracked `task-414-author-audit.mjs` role
- a bounded temporary structured inventory result (never runtime-smoke evidence)
- the `Exact Exclusive Ownership`, dependency, land-order, test, and inventory
  sections of
  `_docs/_TASKS/TASK-414-09-L04-Generation-Consistent-Activation-Cutover-And-Read-Model-Visibility.md`.

It never edits this leaf's status/completion fields; TASK-414-11-L01 remains
the sole task-status/board/changelog closure writer. The inventory result is
audit input, not a tracked JSON sidecar, and is discarded after the freshly
authored L04 bytes pass reconcile.

It may report drift in TASK-414-02-L01's source-contribution inventory, but the
finding returns to that owning initial AUTHOR scope; this leaf does not edit the
manifest task contract. Any correction makes both contracts stale and requires
a fresh reconcile audit before implementation. It must not edit
production source, tests, schema/migrations, TASK-547/TASK-551 files, board
statistics, changelog 1266, or unrelated task contracts.

## Inventory Contract

Read terminal source and enumerate exact exported symbols, not merely files,
for every resource reachable from `CmsCapabilityManifestV1`:

1. canonical create/update/delete plus bulk/import/restore write entry points;
2. transaction-aware native mutation seam or an explicit blocking gap;
3. normal Admin list/detail read entry points;
4. public route/render/read entry points when the resource is public;
5. search indexing/query and route-resolution entry points when applicable;
6. server-cache fill/key/invalidation entry points when applicable;
7. terminal TASK-547 canonical package/adapter owners, the distinct
   TASK-414 Designer private-stage/transactional-promote contribution for that
   resource, and TASK-551 postcommit integration owners;
8. current physical line count and required cohesive split for every source or
   test file already over 1,000 physical lines.

The inventory must include Pages/templates/shell, Posts/content types/entries/
listings, menus/forms/redirects/Media, booking/commerce, themes/settings, and
every plugin/native resource that is actually installable at the terminal HEAD.
Absence is a first-class result: an unsupported resource receives a stable
capability-unavailable reason and cannot enter a Designer approval plan.

Each exact source file has one TASK-414 writer leaf. If another active task or
worktree owns a path, stop the overlapping stream or split the activation seam
into a new focused facade before dispatch; do not allow concurrent writers.

## Frozen Evidence Shape

The workflow writes deterministic, secret-free evidence:

```ts
type ContentActivationOwnerInventoryV1 = Readonly<{
  head: string;
  task547HeadOrMerge: string;
  task551HeadOrMerge: string;
  manifestContractVersion: string;
  resources: readonly Readonly<{
    resourceKind: string;
    stageAdapter: SourceSymbolRef;
    mutationOwners: readonly SourceSymbolRef[];
    adminReadOwners: readonly SourceSymbolRef[];
    publicReadOwners: readonly SourceSymbolRef[];
    searchRouteOwners: readonly SourceSymbolRef[];
    cacheOwners: readonly SourceSymbolRef[];
    transactionAware: boolean;
    activationReady: boolean;
    unavailableReason?: string;
  }>[];
  oversizedFiles: readonly Readonly<{
    path: string;
    physicalLines: number;
    requiredSplitOwner: string;
  }>[];
  digest: string;
}>;
```

`SourceSymbolRef` contains an exact repository-relative path and exported
symbol. No glob, directory-only owner, unresolved task promise, line-number-
only anchor, dynamic runtime scan, database credential, private object key,
provider payload, or user content is accepted. Ordering is stable by resource
kind, path, and symbol before the digest is computed.

## Implementation Pseudocode

```ts
export async function freezeContentActivationOwners(
  repo: ReadOnlyRepository,
  deps: ActivationInventoryDeps,
): Promise<ContentActivationOwnerInventoryV1> {
  assertTerminalTaskFamily(repo, "TASK-547");
  assertTerminalTaskFamily(repo, "TASK-551");
  const manifestSources = await deps.manifest.readNativeSourceContributions(repo);
  const terminalAdapters = await deps.adapters.readTerminalContributions(repo);
  const sourceGraph = await deps.typescript.buildExportAndCallGraph(repo);

  const resources = manifestSources.map((resource) =>
    resolveExactActivationOwners(resource, terminalAdapters, sourceGraph),
  );
  assertNoMissingManifestResource(resources);
  assertSingleWriterPaths(resources);
  assertEveryCanonicalWriteIsInventoried(resources, sourceGraph);
  assertEveryNormalReadIsInventoried(resources, sourceGraph);
  assertNoGlobalDbUseInsideClaimedTxSeams(resources, sourceGraph);

  const inventory = normalizeAndDigestInventory({
    head: repo.head(),
    task547HeadOrMerge: deps.tasks.terminalEvidence("TASK-547"),
    task551HeadOrMerge: deps.tasks.terminalEvidence("TASK-551"),
    manifestContractVersion: deps.manifest.version,
    resources,
    oversizedFiles: findTouchedOwnerFilesAboveLimit(resources, 1_000),
  });
  return inventory;
}
```

The initial AUTHOR orchestrator then replaces every provisional L04 ownership seed with the
exact matrix, assigns cohesive >1,000-line facade splits to one writer, updates
the L04 pseudocode/tests to the real terminal interfaces, and runs a fresh
read-only reconcile audit. Any HIGH/MEDIUM finding or missing audit result keeps
the complete TASK-414 implementation blocked; there is no partial-ready state
and no mid-implementation task-contract rewrite.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Repository-only author/audit workflow; no HTTP endpoint or runtime feature. |
| Authentication | Local repository access only. It must not connect to a deployed CMS or production database. |
| RBAC | Not applicable to execution; the frozen matrix must preserve every native Admin/public RBAC boundary and cannot grant permissions. |
| CSRF | Not applicable because no HTTP write exists. |
| Rate limit | Not applicable; source traversal is local and bounded to tracked terminal source plus task contracts. |
| Validation | Exact schema above, reject unknown, stable sort/digest, terminal task-state proof, source-symbol resolution, single-writer and line-count checks. |
| Anti-abuse | No network egress, dynamic code execution, secret scanning of row data, or user payload collection. Generated evidence is path/symbol metadata only. |

## Regression-Test and Audit Shape

- Fixture graph detects a manifest resource missing its mutation, Admin read,
  public read, search/route, or cache owner and fails closed.
- Alias/re-export fixtures resolve to the terminal implementation symbol without
  assigning two writers to one file.
- Bulk/import/restore/direct-write fixtures prove hidden mutation paths cannot
  evade the inventory.
- A >1,000-line owner requires a cohesive facade split in L04 before dispatch.
- missing frozen TASK-547 evidence, TASK-551 not terminal, dirty overlapping
  path ownership, unresolved
  wildcard, or missing audit result all fail the gate.
- Re-running on byte-identical source emits byte-identical normalized evidence;
  any terminal source or contract change invalidates the prior digest/audit.
- Fresh independent audit compares L04, L01/L02/L03, TASK-547, TASK-551,
  TASK-414-02, current source/tests, board state, and git diff and reports zero
  unresolved HIGH/MEDIUM findings.

## Testing Requirements

```bash
node _docs/_workflows/task-414-author-audit.mjs \
  --activation-owner-inventory-check
git diff --check
# Resolve every frozen path/export against terminal source.
# Verify every newly assigned L04 production/test file is <=1,000 lines or has
# one named cohesive split owner before L04 implementation begins.
```

## Done Criteria

- Terminal TASK-547/TASK-551 source, not their pre-land contracts, is inventoried.
- Every active manifest resource has exact stage, mutation, normal-read, search/
  route, and cache owners or one explicit capability-unavailable reason.
- L04 contains exact file and exported-symbol ownership with no wildcard edit
  authorization or collision with another stream.
- Oversized legacy owners have a cohesive split assigned before behavior is
  added.
- Evidence is deterministic and a fresh full reconcile audit is clean.
- The tracked inventory implementation is one library below `lib/`; the exact
  top-level TASK-414 role set remains author-audit, implement, and fix.
- The readiness receipt is passed to the sequential implement workflow while
  L05 remains To Do on the board until family closure.
- Only then may TASK-414-09-L04 move to implementation.

## Documentation Updates Required

No user-facing documentation. Preserve the normalized inventory and clean audit
receipt as contract evidence for TASK-414-11-L01; that closure leaf records the
final activation architecture and operator diagnostics.
