# TASK-414-07-L01: Designer Workspace Graph Service, State Machine, and Retention
# FileName: TASK-414-07-L01-Designer-Workspace-Graph-Service-State-Machine-And-Retention.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-07
**Priority:** Critical
**Category:** Designer / Domain Service / Persistence
**Estimated Effort:** Large
**Dependencies:** TASK-414-03-L02 terminal; TASK-551-03-L01 and
TASK-551-06-L01 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Implement the pure workspace contract, centralized Designer state policy,
immutable revision service, bounded read policy, and retention eligibility for
the separate Designer aggregate. All persistence goes through the terminal
TASK-414-03-L02 repository/tables/constraints; this leaf creates no duplicate
repository or schema and never writes canonical CMS tables.


## Sub-Tasks

None; this is an executable leaf.
## Exact Ownership

This leaf is the sole writer for these new modules:

- `core/services/designer/workspaceContract.ts`
- `core/services/designer/workspaceStateMachine.ts`
- `core/services/designer/workspaceService.ts`
- `core/services/designer/workspaceRetention.ts`
- `tests/vitest/designer/workspace-contract.test.ts`
- `tests/vitest/designer/workspace-state-machine.test.ts`
- `tests/integration/designer/workspace-service.test.ts`
- `tests/integration/designer/workspace-retention.test.ts`

It may import, but must not edit, TASK-414-03-L02 Designer table/repository/CAS
exports and TASK-551 shared keyset/retention helpers. It must not edit
`FullSitePackageV1`, `DesignerSiteBundleV1`,
canonical resource services/tables, route modules, Admin UI, backup modules,
cache integration, task indexes, or changelog files.

Before implementation, re-read the terminal TASK-414-03-L02 names and adapt
imports to that landed contract. Its persistence state/CAS primitives are
consumed here; this leaf owns the Designer business transition matrix. Any
missing invariant is task drift to fix in the persistence owner, not permission
to invent parallel tables or repositories here.

## Domain Contract

```ts
import {
  DESIGNER_WORKSPACE_STATES_V1,
  type DesignerWorkspaceStateV1,
} from "../assistant/persistence/assistantProductLifecycleContract";

// This leaf owns only the legal transition matrix over the L02-owned values.
assertExactDesignerWorkspaceStateSet(DESIGNER_WORKSPACE_STATES_V1);

export interface WorkspaceMutationGuard {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly expectedVersion: number;
  readonly expectedState: DesignerWorkspaceStateV1;
}

export interface DesignerRevisionBinding {
  readonly revisionId: string;
  readonly revisionNumber: number;
  readonly workspaceVersion: number;
  readonly briefDigest: string;
  readonly corePackageDigest: string | null;
  readonly sidecarSetDigest: string | null;
  readonly designerSiteBundleDigest: string | null;
  readonly stageGraphDigest: string | null;
  readonly validationReceiptDigest: string | null;
  readonly previewDigest: string | null;
}
```

All digest fields use one explicit algorithm/version envelope and lowercase
hex encoding. A digest is evidence of byte identity, not authorization. The
canonical hash input is length-delimited and domain-separated; ambiguous JSON
concatenation is forbidden.

### Legal transition matrix

| From | To | Owner/reason |
|---|---|---|
| `draft` | `draft` | Save a new immutable draft revision; version still advances exactly once. |
| `draft` | `generating` | Generation begins against an immutable input revision. |
| `draft` | `rejected`, `expired` | Explicit discard or retention claim. |
| `generating` | `ready`, `failed` | Compiler/materializer success or bounded failure. |
| `generating` | `expired` | Only after a terminally abandoned run has no live lease/worker claim. |
| `failed` | `generating`, `rejected`, `expired` | Explicit retry, discard, or retention. |
| `ready` | `generating` | A requested revision creates new immutable inputs before generation. |
| `ready` | `promotion_pending`, `rejected`, `expired` | Approval lease, discard, or retention. |
| `promotion_pending` | `promoted` | Atomic promotion commit. |
| `promotion_pending` | `ready`, `failed`, `reconciliation_required` | TASK-414-09 recovery/reconciliation only. |
| `restoring` | `draft`, `ready`, `failed` | Exact restored safe review state after private-object finalization. |
| `restoring` | `reconciliation_required` | Imported generation/promotion needs explicit review; no auto-resume. |
| `restoring` | `promoted` | Only when canonical ledger/resource/active-generation parity is exact. |
| `restoring` | `rejected`, `expired` | Restore retained terminal policy evidence only. |
| `restoring` | `deleting` | Authorized cleanup of an abandoned/invalid hidden restore. |
| `reconciliation_required` | `ready`, `deleting` | Authorized manual repair/reject path only. |
| `draft`, `failed`, `ready`, `rejected`, `expired`, `reconciliation_required` | `deleting` | Owner/lifecycle purge claim when no live lease/claim. |
| `deleting` | `deleted` | Idempotent private cleanup completed. |
| `promoted`, `deleted` | none | Terminal. Rejected/expired cannot reopen but may enter cleanup. |

A generic state setter is forbidden. Export named transition methods backed by
one pure `assertDesignerTransition()` matrix. State, version, active revision,
and transition audit event change in one transaction.

## Query and Persistence Contract

- `listDesignerWorkspaces()` selects only ID, title, state, version, owner ID,
  active revision number, timestamps, and a bounded safe failure summary.
  It never selects briefs, packages, graphs, artifacts, receipts, provider
  bodies, or asset metadata.
- The list uses TASK-551-03-L01's strict keyset cursor with
  `ORDER BY updated_at DESC, id DESC`, a default page size of 25, and a hard
  maximum of 100. Scope by authorized owner before ordering.
- Detail and revision reads are bounded point reads. Revision history uses
  `ORDER BY revision_number DESC, id DESC` and keyset pagination.
- A revision number is allocated under the workspace row lock or through the
  terminal schema's concurrency-safe counter; `max + 1` is forbidden.
- All writes use an explicit transaction handle. Repository methods called by
  a transaction never fall back to the global database client.
- Reject unknown persistence documents and normalize before insert. No browser
  or provider payload reaches repository methods as `unknown`.
- Workspace detail is server-cache-ineligible. Staging rows must not register
  normal CMS cache tags or enter search/indexing pipelines.

Retention policy returns eligibility and a claim token; it does not delete
rows or assets. TASK-414-09-L02 owns purge. Eligibility excludes `promoted`,
workspaces with a nonexpired generation claim, and any workspace with a
live promotion lease. Claiming expiry uses the same lock order as promotion
(`cms_content_activation_pointer` singleton/global lock, then workspace) and
CAS-transitions to `expired` before purge is enqueued.

## Implementation Pseudocode

```ts
export async function saveWorkspaceDraft(
  input: NormalizedDraftMutation,
  deps: WorkspaceWriteDeps
): Promise<WorkspaceRevisionView> {
  return deps.db.transaction(async (tx) => {
    const row = await deps.repository.lockOwnedWorkspaceTx(tx, input.workspaceId, input.actor);
    assertCas(row, input.expectedState, input.expectedVersion);
    assertDesignerTransition(row.state, "draft", "save_draft");
    const revision = await deps.repository.insertImmutableRevisionTx(tx, {
      workspaceId: row.id,
      revisionNumber: await deps.repository.allocateRevisionNumberTx(tx, row.id),
      normalizedBrief: input.brief,
      briefDigest: digestBrief(input.brief),
      createdBy: input.actor.id,
    });
    const next = await deps.repository.casWorkspaceTx(tx, {
      id: row.id,
      expectedState: row.state,
      expectedVersion: row.version,
      nextState: "draft",
      activeRevisionId: revision.id,
    });
    if (next === null) throw workspaceError("designer_workspace_conflict");
    await deps.repository.insertWorkspaceEventTx(tx, eventFor(next, "draft_saved", input.actor));
    return projectRevision(next, revision);
  });
}

export async function consumeAgentHandoffIntoWorkspace(
  input: ConsumeAgentHandoffCommand,
  deps: WorkspaceWriteDeps,
): Promise<WorkspaceView> {
  return deps.db.transaction(async (tx) => {
    const handoff = await deps.handoffs.lockOwnedTx(tx, {
      actorId: input.actor.id,
      handoffId: input.handoffId,
    });
    assertHandoffVersionDigestAndExpiry(handoff, input);
    const consumptionDigest = digestHandoffConsumptionRequest(input);
    if (handoff.status === "consumed") {
      assertExactConsumptionReplay(handoff, {
        idempotencyKey: input.idempotencyKey,
        consumptionDigest,
      });
      return deps.repository.readWorkspaceCreatedFromHandoffTx(tx, {
        actorId: input.actor.id,
        handoffId: handoff.id,
        workspaceId: requireConsumedWorkspaceId(handoff),
      });
    }
    assertPendingConsumableHandoff(handoff);
    const workspace = await deps.repository.insertWorkspaceFromHandoffTx(tx, {
      actorId: input.actor.id,
      sourceHandoffId: handoff.id,
      title: deriveBoundedWorkspaceTitle(handoff),
    });
    const revision = await deps.repository.insertImmutableRevisionTx(tx, {
      workspaceId: workspace.id,
      revisionNumber: 1,
      normalizedBrief: await deps.handoffs.loadStrictBriefTx(tx, handoff),
      briefDigest: handoff.briefDigest,
      createdBy: input.actor.id,
    });
    const consumed = await deps.handoffs.consumeExactTx(tx, {
      handoffId: handoff.id,
      expectedVersion: handoff.version,
      workspaceId: workspace.id,
      idempotencyKey: input.idempotencyKey,
      consumptionDigest,
    });
    if (consumed === null) throw workspaceError("designer_handoff_conflict");
    await deps.repository.activateInitialRevisionTx(tx, workspace, revision);
    await deps.repository.insertWorkspaceEventTx(
      tx,
      eventFor(workspace, "agent_handoff_consumed", input.actor),
    );
    return projectWorkspace(workspace, revision);
  });
}

export async function claimWorkspaceExpiry(
  candidate: RetentionCandidate,
  deps: RetentionDeps
): Promise<ExpiryClaim | null> {
  return deps.db.transaction(async (tx) => {
    await deps.contentActivationLock.lockSingletonTx(tx);
    const row = await deps.repository.lockWorkspaceTx(tx, candidate.workspaceId);
    if (!isExpiredAt(row, deps.clock.now())) return null;
    if (await deps.promotionLeases.hasLiveLeaseTx(tx, row.id)) return null;
    return deps.repository.casToExpiredTx(tx, row.id, row.version, row.state);
  });
}
```

Named operations also cover direct create, metadata rename, start generation,
complete generation, fail generation, restore-as-new-revision, enter promotion
pending, mark promoted, reject, and recovery-only return-to-review. Recovery
methods require a narrow capability object unavailable to ordinary callers.

## Data Flow

```text
normalized internal command
  -> owner lookup in the current installation
  -> transaction + row lock
  -> expected state/version CAS
  -> immutable revision/event insert
  -> workspace pointer/version update
  -> bounded Designer projection
```

List reads flow from a strict cursor through an owner-scoped summary query
to a next-cursor projection. No staging body crosses the list boundary.
Retention flows from a bounded candidate batch through global/workspace lock and
lease exclusion to an expiry claim consumed later by TASK-414-09-L02.
Agent handoff consumption locks the owner-scoped handoff first, then creates the
unique source-bound workspace/revision and marks the handoff consumed in that
same transaction. It never exposes an intermediate workspace.

## Machine-Readable Errors

The service exposes safe domain errors only:

- `designer_workspace_invalid`
- `designer_workspace_not_found`
- `designer_workspace_forbidden`
- `designer_workspace_conflict`
- `designer_workspace_state_invalid`
- `designer_workspace_terminal`
- `designer_revision_not_found`
- `designer_revision_conflict`
- `designer_revision_limit_exceeded`
- `designer_retention_not_eligible`
- `designer_promotion_lease_active`
- `designer_handoff_not_found`
- `designer_handoff_expired`
- `designer_handoff_conflict`

Errors may include a bounded field/path or current safe state/version, but no
SQL, bind values, internal storage keys, prompt bodies, digests not already
authorized for the response, or driver messages.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Pure/domain and persistence modules; no endpoint is owned here. Callers are restricted to internal Designer APIs and workers. |
| Authentication | The service requires a trusted actor created from a valid Admin session or an explicit bounded system-worker identity. It never accepts actor identity from request JSON. |
| RBAC | Route callers must prove `designer:read`, `designer:write`, or `designer:promote` before dispatch; repository ownership predicates remain mandatory defense in depth. |
| CSRF | Not applicable inside the service. Every Admin mutation caller must have passed shared CSRF before creating the normalized command. |
| Rate limits | Not applied in this module; route callers use `admin_read`, `admin_write`, `designer-generation`, `designer-preview`, or `designer-promotion` exactly as defined by TASK-414-07-L02. Retention uses bounded scheduler batches. |
| Validation | Only normalized typed commands enter the service. Strict schemas reject unknown fields and all cursor, string, revision, page-size, state, and digest bounds are reasserted at trust boundaries. |
| Anti-abuse | Ownership predicates, CAS, bounded pagination, immutable revisions, scheduler batch limits, and promotion-lease exclusion apply. No public write, nonce/HMAC, or reCAPTCHA surface exists. |

## Regression-Test Shape

Vitest pure tests must cover:

- the complete legal transition table and every illegal edge;
- terminal-state immutability and recovery-capability isolation;
- canonical digest determinism/domain separation;
- cursor/page-size/retention bounds and unknown-key rejection;
- projection functions excluding sensitive and large fields.

Bun integration tests with real PostgreSQL fixtures must cover:

- two concurrent saves with the same version: one success, one conflict;
- owner isolation returning not-found semantics without existence leaks;
- immutable restore creating a higher revision without mutating history;
- stable keyset traversal with equal timestamps and no gaps/duplicates;
- a list-query selected-column assertion and fixed query-count budget;
- transaction rollback leaving state, revision, and event unchanged;
- concurrent consumption of one handoff produces one workspace/revision/event;
  exact actor/key/digest replay returns it, while changed key/digest, expired
  handoff, stale version, and cross-owner access fail without an orphan;
- expiry versus promotion-lease interleavings under the canonical lock order;
- no canonical CMS table writes and no search/cache publication.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/designer/workspace-contract.test.ts \
  tests/vitest/designer/workspace-state-machine.test.ts
set -a && source .env && set +a && bun test \
  tests/integration/designer/workspace-service.test.ts \
  tests/integration/designer/workspace-retention.test.ts
git diff --check
wc -l core/services/designer/workspaceContract.ts \
  core/services/designer/workspaceStateMachine.ts \
  core/services/designer/workspaceService.ts \
  core/services/designer/workspaceRetention.ts \
  tests/vitest/designer/workspace-contract.test.ts \
  tests/vitest/designer/workspace-state-machine.test.ts \
  tests/integration/designer/workspace-service.test.ts \
  tests/integration/designer/workspace-retention.test.ts
```

Every touched human-authored production/test file must remain at or below 1,000
physical lines.

## Documentation Updates Required

Record for the closure leaf: the final state-transition table, default and
maximum list limits, retention windows/worker batch size, immutable revision
semantics, and the fact that Designer drafts are excluded from CMS/public
reads. Do not edit user docs, task indexes, or changelog 1266 in this leaf.
