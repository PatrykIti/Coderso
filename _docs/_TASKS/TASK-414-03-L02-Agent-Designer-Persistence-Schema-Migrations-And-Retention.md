# TASK-414-03-L02: Agent and Designer Persistence, Migrations, and Retention
# FileName: TASK-414-03-L02-Agent-Designer-Persistence-Schema-Migrations-And-Retention.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-03
**Priority:** Critical
**Category:** PostgreSQL / Persistence / Concurrency / Retention
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-03-L01; terminal TASK-551-03-L01,
TASK-551-05-L01, TASK-551-06-L01, and TASK-551-06-L02
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Create the complete PostgreSQL persistence foundation required by durable Agent
sessions, private multimodal inputs, Designer staging, resumable generation,
digest-bound preview, reviewed promotion, and whole-site generation cutover.
This leaf is the sole TASK-414 schema/migration writer for the 41-table
Agent/Designer persistence migration and exposes bounded, transaction-aware
repositories; later leaves own product behavior and route orchestration. The
separate 8-table plugin/CMS-capability runtime overlay is owned by
TASK-414-02-L03 in its own migration and is not part of this leaf's contract.

- **Owning modules:** cohesive Assistant/Designer table modules, their schema
  facade, strict lifecycle contracts, and focused repositories.
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/ORM_SPEC.md`,
  `_docs/ARCHITECTURE.md`, `_docs/SECURITY_SPEC.md`, `_docs/AUDIT_SPEC.md`,
  `_docs/SEARCH_SPEC.md`, and terminal TASK-551 persistence/lifecycle contracts.
- **Out of scope:** provider/search/file I/O, route/UI code, native CMS mutation,
  promotion policy, cache publication, backup serialization, and cleanup worker
  lifecycle. This leaf supplies primitives to those owners.

## Security Contract

- **Endpoint visibility:** no endpoints; server-only schema/repositories.
- **Auth model:** repositories require a server-derived actor/owner scope or a
  privileged bounded lifecycle scope. No repository accepts a browser-asserted
  owner.
- **RBAC:** enforced by route/service owners before repository calls and again
  before every delayed execution. Persistence constraints provide owner/FK
  isolation but do not replace RBAC.
- **CSRF / rate-limit / anti-abuse:** n/a here; internal route owners apply them.
- **Validation:** lifecycle/type/payload-reference inputs use strict schemas and
  reject unknown fields before persistence. JSONB is allowed only for bounded,
  versioned, normalized authored/read-model payloads; relational identities,
  statuses, ownership, cursors, digests, fences, and expiries are typed columns.
- **Secret handling:** no provider key, OAuth token, raw preview bind secret, raw
  lease token, raw search/page body, malware detail, private signed URL, or raw
  attachment bytes enter these tables. Store hashes/encrypted object refs and
  bounded safe diagnostics only.

## Sub-Tasks

None; this is one executable migration leaf. Implement in dependency order:

1. pure lifecycle/table contracts and cohesive schema modules;
2. one atomic SQL migration plus snapshot and journal;
3. transaction-aware repositories and bounded read models;
4. retention selectors, query-plan evidence, integration/concurrency tests.

## Exact Exclusive Ownership

Immediately before implementation, re-read the live schema exports and
`core/db/migrations/meta/_journal.json`, allocate exactly the next free migration
ID, and amend this contract if terminal TASK-551 moved an owned seam.

This leaf is the sole writer of:

- new cohesive table modules (names may be adjusted only by contract amendment):
  `core/db/tables/assistantAgent.ts`,
  `core/db/tables/assistantInputs.ts`,
  `core/db/tables/assistantDesigner.ts`,
  `core/db/tables/assistantDesignerPromotion.ts`, and
  `core/db/tables/contentActivation.ts`;
- a thin `core/db/tables/assistantProducts.ts` re-export facade and the bounded
  additions to the terminal schema export owner;
- one SQL migration, matching `meta/*_snapshot.json`, and one `_journal.json`
  update containing all 41 new tables below plus the scoped existing action-
  execution ledger alteration; this migration is exclusively this leaf's —
  TASK-414-02-L03 ships the separate 8-table plugin/CMS-capability extension
  overlay in its own SQL/snapshot/journal migration;
- new `core/services/assistant/persistence/assistantProductLifecycleContract.ts`;
- new focused repositories under
  `core/services/assistant/persistence/agent/`,
  `.../inputs/`, `.../designer/`, `.../promotion/`, and
  `.../contentActivation/`;
- new `core/services/assistant/persistence/assistantRetentionQueries.ts`;
- focused schema/repository/migration/concurrency/retention tests and sanitized
  representative query-plan fixtures.

No human-authored production/test file may exceed 1,000 physical lines. Do not
collapse all tables or fixtures into one dumping-ground module.

This leaf must not edit L01 provider/runtime code, routes, Admin UI/cache,
TASK-547 adapters, TASK-548 docs/Guide, TASK-511 backup code, TASK-551 lifecycle
internals, native resource services, generated capability artifacts, task board,
or changelog. It does not perform canonical promotion or invalidation.

## Shared Storage Conventions

- Use the repository's existing ID/timestamp/foreign-key conventions. Every
  user-owned root has `owner_id`; every descendant uses a composite FK including
  the owner/root key so cross-owner edges fail at the DB boundary.
- Mutable aggregates have positive `version`, `created_at`, and `updated_at`.
  Immutable facts use canonical bytes/digest and never update in place.
- Idempotency uniqueness is scoped to actor + operation family; replay returns
  the original digest-identical result, while reuse with different bytes is a
  machine-readable conflict.
- Payload columns are selected only by bounded detail reads. List/read-model
  queries select summaries and never load transcript bodies, staged documents,
  provider payload refs, or encrypted object refs.
- Lifecycle statuses are exported once by
  `assistantProductLifecycleContract.ts`. TASK-414-07 imports the Designer
  values and owns legal transition policy; it must not redefine enums.

```ts
export const DESIGNER_WORKSPACE_STATES_V1 = [
  "draft", "generating", "ready", "promotion_pending", "promoted",
  "failed", "rejected", "expired", "restoring",
  "reconciliation_required", "deleting", "deleted",
] as const;
export type DesignerWorkspaceStateV1 =
  (typeof DESIGNER_WORKSPACE_STATES_V1)[number];
```

The same owner exports exact arrays/types for Agent session/run, attachment/
projection, generation claim/run, preview, approval, promotion, adoption, and
activation states. Downstream services import them and own allowed transitions,
not duplicate literal unions.
- Cleanup timestamps are uniformly named `purge_after`; there is no mixed
  `delete_after` index. Explicit delete transitions set `purge_after`.
- Promotion lease tokens and one-time preview bind secrets are stored only as
  hashes with actor/Admin-session/workspace/version/digest scope and expiry.
  Browser DTOs receive a nonauthorizing preview-session ID plus the raw bind
  secret exactly once; the secret is accepted only by the CSRF-protected bind
  POST body, consumed into the current Admin-session binding, and never stored,
  logged, cached, or placed in a URL. No DTO receives a raw lease/fence secret.

## Complete 41-Table Contract Plus Existing Ledger Repair

Every table below and the existing-ledger alteration land in the same schema/
migration/snapshot/journal change.
Removing, merging, or adding a table requires a fresh contract audit because
downstream leaves depend on these exact durable facts.

### Agent sessions, runs, evidence, actions, and handoff (12)

1. **`assistant_agent_user_states`** — unique `owner_id`; nullable selected
   `session_id`; positive `version`; timestamps. The selected-session FK is
   owner-scoped and may reference only a selectable session.
2. **`assistant_agent_sessions`** — `id`, `owner_id`, bounded label, status,
   positive `version`, next message ordinal, timestamps, archive and
   `purge_after`; indexes `(owner_id, updated_at DESC, id DESC)` and bounded
   cleanup `(status, purge_after, id)`.
3. **`assistant_agent_messages`** — owner/session composite FK, immutable
   ordinal, role, normalized content ref/digest/byte count, safe status, run ID
   when applicable, timestamps; unique `(session_id, ordinal)` and keyset index.
4. **`assistant_agent_runs`** — owner/session FK, operation ID, exact status/
   version (`queued | running | cancellation_requested | succeeded | failed |
   cancelled | reconciliation_required`), strict provider-execution-binding
   schema plus typed provider ID, model ID, adapter version, non-secret config
   generation, capability-evidence digest, and effective-input-policy digest;
   manifest digest, idempotency key, budget
   reservation/usage summary, request/result refs and digests, safe terminal
   code, attempt count, monotonic worker fence, nullable worker ID hash, claim/
   heartbeat/lease-expiry/next-attempt/cancel-request timestamps, and ordinary
   timestamps; unique owner/operation idempotency plus bounded runnable/expired-
   lease indexes. A committed intent is durable before dispatch.
5. **`assistant_agent_tool_calls`** — owner/session/run FK, ordinal, exact tool
   and schema IDs, input/output digests and bounded encrypted refs, status,
   call idempotency key, checkpoint/effect-reconciliation state, native action/
   execution references, safe error, budget usage, timestamps; unique
   `(run_id, ordinal)` and scoped call idempotency. A timed-out or crashed
   external/native effect is never blindly replayed when its outcome is
   ambiguous.
6. **`assistant_agent_citations`** — owner/session/run FK, stable citation ID,
   research result/source identity, normalized canonical URL hash + bounded
   display URL/title/publisher, retrieval time, content digest, bounded excerpt
   digest/provenance, terms-policy version; no raw result/page body; unique
   `(run_id, citation_id)`.
7. **`assistant_agent_resource_bindings`** — owner/session FK, opaque binding
   ID, closed resource kind, native resource ID, source run/tool/action/execution
   IDs, expected version/digest, status, `last_authorized_at`, expiry, timestamps;
   exact indexes for owner/session and owner/resource. A binding grants nothing.
8. **`assistant_agent_designer_handoffs`** — owner/session/run FK, opaque handoff
   ID, non-null source message ID, immutable sanitized brief ref/digest, source
   binding IDs, target Designer capability digest, actor-scoped idempotency key
   and request-binding digest, positive version, status, optional workspace ID
   and consumption idempotency key/digest after accepted consumption,
   single-use `consumed_at`, immutable `issued_at`, hard `expires_at`, nullable
   `purge_after`, and timestamps. Add the bounded cleanup index
   `(status, purge_after, id)`. Named uniqueness on
   `(owner_id, session_id, source_message_id)` prevents duplicate handoffs for
   one classified user message; named `(owner_id, idempotency_key)` uniqueness
   returns an exact replay or binding conflict. Workspace persistence has a
   nullable owner-scoped `source_handoff_id` with a named unique constraint so
   one handoff can create at most one workspace under concurrency; the composite
   owner/handoff FK forbids cross-owner consumption.
9. **`assistant_agent_action_approvals`** — owner/session/run FK, immutable plan
   ID/hash, action ID/hash, native target/version, required permission digest,
   approver ID, approval purpose, issued/expiry/claimed timestamps, claim
   execution ID, status, and nullable terminal execution-result ref/digest/code
   written atomically with the approved native effect. Unique action approval;
   claim is transactional and single-use. This includes Post publication
   approval and supports exact committed replay after process loss.
10. **`assistant_agent_research_batches`** — owner/session/run FK, provider
    adapter/version, normalized query digest, status/version, result count,
    bounded policy/usage facts, timestamps and expiry; raw provider response is
    transient.
11. **`assistant_agent_research_results`** — owner/batch FK, stable ordinal and
    result ID, normalized URL hash/display URL/title/publisher, provider rank,
    source digest, safe metadata, expiry; unique `(batch_id, ordinal)`.
12. **`assistant_agent_research_selection_grants`** — owner/session/run/batch/
    result FK, opaque random-token hash, URL/source digest binding, issued/
    expiry/consumed timestamps, exact purpose (`fetch | render`), status. One
    selected-result token authorizes exactly one matching server operation and
    cannot be constructed by a model/client; fetch and render require distinct
    purpose-bound rows/tokens.

### Shared private input and normalized projection records (2)

13. **`assistant_private_attachments`** — owner ID, status/version, exact
    `context_kind: agent_session | designer_workspace`, nullable
    `agent_session_id` and `designer_workspace_id`, plus a named CHECK requiring
    exactly the matching one to be non-null. Both roots use owner-scoped FKs.
    The row also stores claimed and verified MIME/extension/magic class,
    filename projection, expected/actual byte count and SHA-256, private
    quarantine object ref, scanner/version/safe result, retention class,
    timestamps and `purge_after`; owner/root quota and cleanup indexes. It is a
    shared private-input primitive, not an Agent session prerequisite.
14. **`assistant_private_attachment_projections`** — owner/attachment/root FK,
    projection kind/version, source digest, normalized MIME, page/sheet/slide
    counts, output bytes/token estimate, bounded encrypted/object ref + digest,
    provider upload safe ID/cleanup status when applicable, status/version,
    timestamps and `purge_after`. It contains no public Media ID/URL and cannot
    be rebound across owners or roots merely by knowing its ID.

### Designer workspace, revision, generation, and preview records (14)

15. **`assistant_designer_workspaces`** — owner ID, label, status/version,
    positive `next_revision_number`, active revision ID, base activation
    generation/pointer-version/digest, manifest digest, terminal/safe failure
    code, timestamps, expiry and `purge_after`; owner list and cleanup indexes.
16. **`assistant_designer_revisions`** — owner/workspace FK, immutable positive
    revision number allocated under workspace row lock, parent revision,
    Designer brief digest, `DesignerSiteBundleV1` bytes ref/digest, staged graph
    digest, validation/preview digests, status, creator, timestamps; unique
    `(workspace_id, revision_number)` and immutable after ready.
17. **`assistant_designer_staged_resources`** — owner/workspace/revision FK,
    stable resource key, strict resource/sidecar kind and adapter/version,
    normalized document ref/digest/bytes, desired slug/path, native baseline ref,
    status; unique `(revision_id, resource_key)` and bounded kind/keyset index.
18. **`assistant_designer_resource_edges`** — same owner/workspace/revision,
    source/target resource composite FKs, exact edge kind/slot/ordinal, digest;
    unique source edge identity and acyclic/semantic validation by service.
19. **`assistant_designer_input_bindings`** — owner/workspace/revision FK,
    input kind (`attachment_projection | agent_handoff | figma_ir`), source ID
    and digest, capability profile digest, role/ordinal, last authorization and
    expiry; unique input per revision/role/ordinal. Binding grants nothing.
20. **`assistant_designer_assets`** — owner/workspace/revision FK, stable asset
    key, source input/staged resource, private object ref + digest/bytes/MIME,
    adoption state, eventual native Media ID only after promotion, timestamps
    and `purge_after`; no public URL before cutover.
21. **`assistant_designer_asset_adoption_attempts`** — owner/asset/revision FK,
    attempt/idempotency key, source/target digests, private prepare receipt,
    native adoption result ref, status, safe error, timestamps. Supports durable
    cleanup/retry after DB/object-store failure.
22. **`assistant_designer_validation_receipts`** — owner/workspace/revision and
    generation-run FK, immutable receipt schema/version,
    bundle/graph/manifest/baseline/capability
    digests, validator versions, bounded findings digest/count, pass/fail,
    creator and timestamp. At most one receipt per exact validation tuple.
23. **`assistant_designer_generation_runs`** — owner/workspace/revision FK,
    source kind `prompt_ai | figma`; for `prompt_ai`, the same strict provider-
    execution-binding schema and six non-null typed binding fields owned by L01;
    for `figma`, all provider fields are null and the opaque source-grant ID plus
    exact normalized selection digest are non-null. Named CHECK constraints
    enforce the exclusive shape and forbid a mixed/fake-provider branch. It also owns
    manifest/input digests, status/version, idempotency,
    budget/usage summary, output ref/digest, safe error, timestamps; unique
    scoped idempotency key.
24. **`assistant_designer_generation_claims`** — generation-run FK, owner/
    workspace/revision, worker ID hash, monotonic fence, lease expiry, heartbeat,
    released time/status, prepared-source bind status `pending | bound`, source-
    execution binding schema/digest, and nullable source lease ID/fence. Prompt
    AI claims are born `bound` to their exact provider execution binding; Figma
    claims are born `pending` and become `bound` only by CAS after exact grant/
    selection matching and import-lease claim. Only the highest live generation
    fence plus current bound source execution may perform I/O or materialize.

The terminal migration names and exports the generation-run source-kind enum,
`assistant_designer_generation_source_shape_ck`, and its pure truth-table
normalizer as an explicit successor seam. A later code-owned static source may
replace that enum/CHECK in one atomic migration only when it preserves every
`prompt_ai`/`figma` positive and negative row byte-for-byte and adds focused
clean/upgrade tests. A run-row CHECK never claims to inspect
`assistant_designer_generation_claims`; claim `pending | bound`, lease, and
fence invariants remain claim-row constraints plus the transaction service.
TASK-556 is the first reserved consumer of this seam and may add only the
literal `code_owned_static` branch, not a plugin/dynamic source escape.
25. **`assistant_designer_workspace_events`** — owner/workspace FK, monotonic
    ordinal, event kind, revision/run/decision/promotion refs, actor/safe payload
    digest, timestamp; append-only and bounded by keyset.
26. **`assistant_designer_preview_sessions`** — owner/workspace/revision FK,
    nonauthorizing opaque preview-session ID, preview digest + validation/bundle
    digests, nullable authenticated Admin-session binding digest, one-time bind-
    secret hash, bind state/consumed timestamp, issued/expiry/revoked timestamps
    and reason, status. Exact digest/version, failed/replayed bind, Admin-session
    loss, or lifecycle changes revoke prior sessions; the raw bind secret is
    never stored and the path ID cannot authorize the internal reader.
27. **`assistant_designer_decisions`** — owner/workspace/revision/receipt FK,
    append-only `approved | rejected | changes_requested`, actor, exact bundle/
    graph/preview/baseline/permission digests, safe note ref/digest, timestamp.
28. **`assistant_designer_approval_intents`** — owner/workspace/revision/
    decision/receipt FK, immutable approval tuple hash, required permission
    digest, live baseline generation/digest, idempotency, issued/expiry/claimed
    timestamps, promotion run, status. Claim is single-use and transactional.

### Promotion, recovery, cleanup, restore finalization, and activation (11)

29. **`assistant_designer_promotion_runs`** — owner/workspace/revision/approval
    FK, status/version, immutable approval tuple and plan digests, opaque browser
    handle hash, current checkpoint, activation generation ID, idempotency,
    started/committed/completed timestamps and safe error.
30. **`assistant_designer_promotion_items`** — promotion/run/revision FK,
    stable resource key, adapter/version, operation, native target/result IDs,
    input/result digests, status, ordinal; unique `(promotion_id, resource_key)`.
31. **`assistant_designer_promotion_checkpoints`** — promotion FK, monotonic
    ordinal, checkpoint kind, fence, approval/plan/activation digests, evidence
    ref/digest, timestamp; append-only and unique checkpoint transition.
32. **`assistant_designer_promotion_leases`** — one row per promotion/workspace,
    token hash, monotonic fence, holder hash, acquired/heartbeat/expiry/released
    timestamps and status. Raw lease token remains process memory only.
33. **`assistant_designer_promotion_ledgers`** — promotion/activation FK,
    immutable transaction result digest, canonical resource mapping digest,
    committed invalidation/outbox plan digest, result ref, committed timestamp;
    unique promotion and idempotency tuple. Absence vs complete is the recovery
    boundary; partial ledger state is invalid.
34. **`cms_content_activation_generations`** — immutable generation identity,
    parent generation, source (`legacy | designer`), promotion ID when
    applicable, initial complete canonical mapping/search/cache artifact
    digests, final sealed epoch/digest when retired, status, created/activated/
    retired timestamps. Only `complete` may become active. The currently active
    generation may evolve only through the mutation guard below; inactive and
    retired generations are sealed.
35. **`cms_content_activation_pointer`** — singleton row pointing to one complete
    active generation, positive CAS version, monotonic content epoch, and an
    activation-chain digest derived from the previous digest plus the exact
    normalized mutation/cutover receipt, with updated timestamp. Every public/
    Admin/search/cache request captures this tuple once and resolves against it.
36. **`cms_content_activation_resources`** — generation ID, closed resource kind,
    stable resource key, canonical resource ID/version/digest, public path when
    applicable; unique generation/key and generation/kind/native ID. Rows in
    the active generation are changed only in the same transaction as ordinary
    canonical writes and the pointer epoch/digest update. Rows in inactive or
    retired generations are immutable. This lets old and new request snapshots
    observe complete non-mixed states without copying a whole generation for
    every ordinary edit.
37. **`cms_content_activation_artifacts`** — generation ID, exact
    `search | cache | route` artifact kind/version, canonical bytes/object ref
    where private, digest, readiness, bounded metadata, created timestamp;
    unique generation/kind/version. Every required artifact is ready before the
    pointer switch; old generation artifacts retire asynchronously.
38. **`assistant_designer_cleanup_jobs`** — owner/workspace/revision root,
    exact reason (`reject | expire | delete | adoption_compensation`), immutable
    normalized cleanup-plan ref/digest, status/version, bounded item cursor,
    attempts/next-attempt, worker hash, monotonic fence, lease/heartbeat,
    terminal safe code and timestamps; unique root/reason/idempotency and
    runnable/expired-lease indexes. It is the domain cleanup outbox; TASK-551's
    cache outbox is not reused for private deletion payloads.
39. **`assistant_designer_restore_finalizations`** — backup import run/section
    identity, owner/workspace, immutable restore-plan and prepared-object refs/
    digests, activation rebuild/parity digest, outer-transaction commit evidence,
    status/version, attempts/next-attempt, worker hash/fence/lease/heartbeat,
    terminal result/safe code and timestamps; unique import-section/idempotency
    and bounded runnable indexes. It records post-outer-commit object
    finalization/reconciliation without opening a competing canonical DB
    transaction.

### Figma source authorization and abortable import execution (2)

40. **`assistant_figma_source_grants`** — opaque grant ID, authenticated actor,
    workspace owner/workspace ID, exact purpose `designer_import`, credential
    generation, encrypted exact file-key + provider-node/depth selection
    envelope, source-identity digest, exact selection digest and bounded counts,
    issued/
    expiry/consumed/revoked timestamps, status/version, and `purge_after`.
    Creation requires Settings authorization and binds one exact file identity;
    import receives only the opaque grant plus a subset of the bounded node
    envelope. The encrypted source reference is purged immediately on consume,
    revoke, or expiry; a hash-only audit projection may remain under policy.
41. **`assistant_figma_import_leases`** — owner/workspace/grant/generation-run
    binding, credential generation, monotonic fence, holder hash, encrypted
    attempt-scoped source-selection envelope transferred atomically from the consumed
    grant, abort status and reason, acquired/heartbeat/expiry/released
    timestamps, status/version, and `purge_after`. The grant's encrypted source
    envelope is erased in that same claim transaction; the lease copy is erased
    on release/abort. The current live lease is rechecked before every Figma
    REST/raster request and before asset or staged-graph materialization.
    Disconnect/new authorization increments credential generation and atomically
    aborts every older active lease so stale imports cannot continue.

### Existing `assistant_action_executions` ledger alteration

In the same migration, replace the installation-wide unique
`idempotency_key` index with a named `(actor_id, idempotency_key)` uniqueness
contract for non-null actors, retain exact plan ID/hash conflict checks, and add
the indexes needed by actor-scoped lookup. Add the immutable opaque execution
ID, cache `event_key`, strict canonical postcommit-plan JSON/version/digest,
postcommit observation state/outcome, approval reference, bounded undo/audit
result references, and the TASK-414-05-L04 preparation-attempt state
(`preparing | prepared | consumed | compensating | compensated |
reconciliation_required`), opaque attempt ID, immutable binding digest,
monotonic fence, worker hash/lease timestamps, private prepared-reference
digest, and safe compensation outcome required by TASK-414-05-L04. Private
prepared references remain encrypted/backend-only and are excluded from list,
browser, log, audit, and error projections. The plan columns are non-null for
the new `transaction_owned_single` mode and constrained to L04's exact schema;
legacy rows remain readable through an explicit versioned adapter and cannot be
misrepresented as recoverable transaction-owned evidence. The schema owner
exports a tx-aware repository interface so a transaction-owned action can
persist its complete sanitized execution result/output digest and exact
postcommit recovery plan in the same native transaction. The
legacy global-client wrapper delegates to that interface outside transactions;
no caller may claim actor-scoped idempotency while querying only by key.
The unique actor/key ledger row is allocated or claimed in a short transaction
before any external preparation. A complete matching row replays without new
preparation; an active attempt returns busy; an expired attempt is reclaimed
only with a higher fence. The native-effect transaction marks the exact
prepared attempt `consumed` atomically with the complete execution. A replay or
retry reuses that one row/reference and cannot allocate a second external
attempt.

The activation tables are a single-installation CMS contract and do not invent
a nonexistent `sites` table. If terminal architecture introduces an explicit
site identity before implementation, amend the schema and every composite key
consistently rather than adding an ad hoc nullable site column.

## Transactions and Concurrency

- New Agent session + selected user-state update is one transaction locked on
  `assistant_agent_user_states`; idempotent replay returns the same session.
- Message ordinal/run-intent creation locks the session and writes message + run
  atomically in `queued`. Dispatch happens only after commit. A shared-lifecycle
  worker claims with a monotonic fence and bounded lease/heartbeat, re-resolves
  the current exact provider/model profile plus all permissions immediately
  before I/O, checkpoints every tool call, and settles by CAS. Expired claims
  are reclaimed; ambiguous effects enter `reconciliation_required`, not blind
  replay. Cancellation is a durable request and never undoes a committed CMS
  effect.
- Research selection and action approval use hashed, expiring, single-use
  claims. Claim and durable consuming run/execution reference commit together.
- Designer revision numbers are allocated under the workspace row lock (or an
  equivalent counter/unique bounded retry). Do not use unlocked
  `max(revision_number)+1` and do not invent a TASK-551 `RevisionFamily`.
- Generation claims use monotonic fences. Result materialization is insert-once
  under the current fence: an identical digest replay returns the prior result;
  changed bytes require a new child revision and never overwrite reviewed data.
- A Figma generation claim starts pending with exact grant ID and normalized
  selection digest. Grant consumption, encrypted-source transfer, and import-
  lease creation commit atomically; the exact resulting binding is then attached
  to the still-current generation claim by CAS before provider/raster/scanner/
  storage-attempt I/O. Any stale or mismatched claim releases the lease and
  performs no external I/O. Materialization locks both the generation claim and
  source-owned lease/generation facts in canonical order before its first write.
- L02 exposes tx-aware repository/adopter interfaces. It does not implement the
  promotion algorithm. TASK-414-09-L01 owns approval/lease/promotion use;
  TASK-414-09-L04 owns generation prepare + atomic pointer cutover.
- Promotion item results, complete ledger, generation/resource/artifact rows,
  canonical graph writes, invalidation/outbox plan, and active-pointer switch
  commit in the one product transaction defined by L04. External object bytes
  are prepared privately before it; post-commit publication/cleanup follows it.
- After activation bootstrap, every ordinary canonical create/update/delete
  uses L04's `ContentActivationMutationGuard`: lock the pointer in canonical
  order, apply the native mutation through the supplied transaction, update the
  active generation membership/version/digest delta, increment pointer version
  and content epoch/chain digest, and persist the finite TASK-551 invalidation/
  artifact outbox before one commit. A path that cannot participate keeps
  activation readiness and Designer promotion disabled.
- The active generation is captured once per request/read model. No resolver may
  re-read the pointer midway and mix generations.
- Expected constraint/deadlock/timeout/version errors map to closed domain codes;
  no driver message, SQL, binds, owner IDs, or private refs escape.

## Bounded Read Models and Indexes

Named callers and required ordering:

- Agent session list: owner summaries ordered `(updated_at DESC, id DESC)`, max
  100; detail separately pages messages `(ordinal ASC, id ASC)` and runs
  `(created_at DESC, id DESC)`.
- Agent bindings/citations/tool calls: owner + root scoped, max 100 per page,
  exact deterministic ordinal/timestamp + ID tiebreaker.
- Designer workspace list: owner summaries `(updated_at DESC, id DESC)`, max
  100; revisions `(revision_number DESC, id DESC)`; staged resources/assets/
  events/promotion items max 200 per page.
- Reconciler/cleanup: status + `purge_after` or lease expiry + ID, bounded claim
  pages with skip-locked semantics documented by terminal scheduler owner.
- Activation resolution: one point read of pointer followed by generation-
  scoped point/bounded reads; no unbounded generation scan in request paths.

Every query selects only consumed columns and has a matching composite index
ending in its stable tiebreaker. Related summaries use bounded joins/aggregates,
not N+1 reads. Before landing, capture sanitized `EXPLAIN (ANALYZE, BUFFERS)`
for representative small and large fixtures covering session list, transcript,
workspace list, staged graph, reconciler, and generation-scoped route/resource
resolution. Pin result shape, stable pagination, query count, row-scan budget,
and zero gaps/duplicates under concurrent insert fixtures.

## Retention and Deletion Matrix

`assistantProductLifecycleContract.ts` owns and deep-freezes the exact named
`ASSISTANT_RETENTION_POLICY_V1`; every later leaf imports it rather than writing
another TTL. All clocks use PostgreSQL UTC transaction time. `purge_after` is
set from the named origin at state transition and never recalculated by GET,
list, preview read, polling, cache hit, worker retry, or backup. Only the one
explicit `authorized_binding_use` event below may refresh a rolling deadline,
and it can never move an absolute deadline.

| Policy ID | Exact v1 clock/default/hard maximum | Refresh and purge contract |
| --- | --- | --- |
| `agent-session-owner-retained` | active/archived sessions have no automatic expiry; explicit delete starts at DB `deleted_at` | bounded descendant purge starts immediately; safe root tombstone 30 days; native execution/audit facts follow their own policy and are never deleted as a side effect |
| `research-session-evidence` | result identities, selection grants and non-native citations expire 7 days after run terminal or earlier with owning-session delete | no refresh; raw search/page/provider bodies are never persisted; consumed grant token hash purges immediately, safe citation provenance may remain only with a native audit receipt |
| `agent-designer-handoff` | hard 30 minutes from immutable `issued_at` | no refresh from GET, retry, cache, tab activity, or workspace navigation. Consume/revoke/expiry immediately removes the sanitized brief reference and source binding IDs; a hash-only status/workspace/idempotency tombstone remains 30 days, then bounded prune removes it unless held by an unresolved recovery/legal-hold edge |
| `private-input-inflight` | uploading/quarantined/scanning/rejected attachment and projection bytes: 24 hours from `created_at` or earlier terminal transition | no refresh; object then row purge is idempotent and retryable |
| `private-input-ready` | rolling 7 days from `ready_at`/last authorized binding use, absolute 30 days from `ready_at` | only a successful server-authorized Agent/Designer binding use may refresh the rolling clock; reads/polls do not; earliest rolling/absolute deadline wins |
| `designer-workspace-owner-retained` | active or explicitly saved drafts have no automatic expiry; rejected/expired/deleted workspaces set `purge_after = transition_at` | cleanup begins immediately in dependency order; safe workspace/cleanup tombstone 30 days; canonical promoted resources are never touched |
| `designer-static-seed-alias` | reserved built-in-source policy: 30 days from immutable generation-run terminal time | no refresh; a live/nonterminal generation claim is ineligible; the later static source stores only key/request digests and bounded refs, prunes aliases by keyset through the shared lifecycle owner, and never deletes binding/run/receipt/canonical state |
| `designer-preview-session` | default 15 minutes from `issued_at`, request clamp 1–30 minutes, absolute maximum 30 minutes | no refresh; revision change/reject/expiry/promotion/session loss revokes immediately; bind-secret hash purges on consume/revoke/expiry; safe revocation fact 30 days |
| `assistant-approval-intent` | 5 minutes from `issued_at`, hard and non-configurable | no refresh; claim is single-use; token/claim material purges immediately at terminal state, while safe decision/execution evidence follows `assistant-safe-audit-evidence` |
| `worker-and-promotion-lease` | 120 seconds from claim/acquire; heartbeat interval at most 30 seconds | only a current-fence worker heartbeat extends to `heartbeat_at + 120s`; browser/API reads never refresh; terminal/revoked raw token hashes purge immediately, safe terminal row 30 days |
| `figma-source-grant` | 10 minutes from `issued_at`, hard, single-use | no refresh; encrypted file reference purges immediately on consume/revoke/expiry; hash-only safe grant fact 30 days |
| `figma-import-lease` | 120 seconds from acquire; heartbeat at most 30 seconds and always bounded by current credential generation | disconnect/new authorization aborts immediately; no refresh after abort; token/holder material purges at release, safe terminal fact 30 days |
| `figma-and-designer-temporary-assets` | hard 24 hours from attempt/object creation | no refresh; any reject/fail/abort triggers immediate object+row cleanup; adopted assets leave this class atomically and follow the workspace/canonical owner |
| `assistant-safe-audit-evidence` | decisions, successful promotion ledger, immutable action result and safe generation receipt: 365 days from terminal commit | no private bytes, tokens, source keys, prompts or provider payloads; no read refresh; legal hold may extend this safe evidence only |
| `designer-cleanup-and-restore-finalization` | completed jobs/finalizations 30 days from terminal state; unresolved/retryable rows have no automatic purge | no refresh; unresolved rows alert operators after attempt ceiling and remain resumable without private payload leakage |
| `inactive-activation-generation` | rollback eligible exactly 24 hours after retirement; normal purge eligibility at 24 hours; hard retention target 7 days | prune only when no captured-request lease, rollback pin, active pointer, backup/restore reference, pending artifact/cache/search reconciliation, or legal hold exists. A blocker at day 7 defers and alerts; it never permits unsafe deletion |

Cleanup claims, including handoff sensitive-reference erasure followed by
hash-only tombstone pruning, use stable `(purge_after ASC, id ASC)` keyset pages of at most
100 rows with `FOR UPDATE SKIP LOCKED`, one transaction per dependency-safe
batch, and set-based object identifiers. Retry uses bounded exponential backoff
from 5 seconds through 1 hour, at most 20 attempts before explicit operator-
visible quarantine; quarantine remains resumable and is not auto-purged.
Every successful private deletion leaves only the policy's bounded safe
tombstone and a sanitized aggregate audit event. A legal hold is an explicit
server-side audit/backup policy decision with actor, reason, scope and expiry;
it blocks eligible safe evidence or authored data but cannot retain/recreate raw
provider/search bodies, plaintext secrets, consumed source references, raw
lease tokens, or unscanned temporary bytes.

Retention workers consume terminal TASK-551's one scheduler/lifecycle owner.
This leaf provides pure selectors/claim/update helpers and dry-run metrics; it
does not create timers, signals, process hooks, or one-query-per-row loops.

## Migration Contract

- One migration creates all 41 new tables, alters the existing action-execution
  uniqueness/index contract, and adds named FK/unique/check constraints plus
  query-shaped indexes. The schema modules, SQL, snapshot, and journal land
  atomically under this leaf.
- Aggregate across TASK-414: exactly 50 new tables across three disjoint
  migrations (41 Agent/Designer persistence + 8 plugin/CMS-capability overlay
  + 1 action-execution lease), three writers, zero overlap; every "41" in this
  contract refers only to this leaf's migration.
- Re-read the live journal immediately before allocation. Never assume a number
  from this task text and never collide with another worktree.
- Document lock level, expected duration, forward recovery, deploy order, and
  rollback limitations. New empty tables require no data backfill; activation
  bootstrap creates one legacy generation/pointer from existing canonical rows
  in a bounded, restart-safe migration/operations step defined and tested here.
- If representative data makes bootstrap too large for one transaction, use a
  versioned resumable pre-deploy backfill plus a short verified pointer-finalize
  phase. Do not expose a pointer until the complete mapping/artifact digest is
  verified.
- No `CREATE INDEX CONCURRENTLY` inside a transactional migration. If measured
  evidence requires it, split an explicit operations phase while preserving
  atomic schema metadata and document the deploy barrier.

## Implementation Pseudocode

```ts
export async function createAndSelectAgentSession(
  input: CreateAgentSessionInput,
  deps: AgentPersistenceDeps,
): Promise<AgentSessionView> {
  return deps.db.transaction(async (tx) => {
    const state = await deps.userStates.lockOwner(tx, input.ownerId);
    assertVersion(state.version, input.expectedUserStateVersion);
    const replay = await deps.sessions.findIdempotent(tx, input);
    if (replay) return assertSameRequestDigest(replay, input);
    const session = await deps.sessions.insert(tx, input);
    await deps.userStates.select(tx, session.id, state.version);
    return deps.sessions.readSafeView(tx, input.ownerId, session.id);
  });
}

export async function claimApprovalOnceTx(
  tx: DbTransaction,
  input: ClaimApprovalInput,
): Promise<ClaimedApproval> {
  const approval = await approvalRepo.lockByOwnerAndHash(tx, input);
  assertUnexpiredUnclaimedAndExact(approval, input);
  return approvalRepo.markClaimed(tx, approval, input.executionId);
}

export async function allocateDesignerRevisionTx(
  tx: DbTransaction,
  input: AllocateRevisionInput,
): Promise<DesignerRevision> {
  const workspace = await workspaceRepo.lockOwned(tx, input);
  assertWorkspaceVersion(workspace, input.expectedVersion);
  const next = workspace.nextRevisionNumber;
  await workspaceRepo.advanceRevisionCounter(tx, workspace, next + 1);
  return revisionRepo.insertImmutable(tx, { ...input, revisionNumber: next });
}

export async function switchCompleteContentGenerationTx(
  tx: DbTransaction,
  prepared: PreparedContentGeneration,
): Promise<ActivationPointer> {
  await activationRepo.assertCompleteArtifacts(tx, prepared);
  await activationRepo.insertMappingsAndLedger(tx, prepared);
  return activationRepo.compareAndSwapPointer(tx, {
    expectedGenerationId: prepared.baseGenerationId,
    nextGenerationId: prepared.generationId,
  });
}
```

**Data flow:** strict normalized input -> owner/root point read -> lock/CAS ->
bounded relational writes -> commit -> external/provider/object/cache work only
outside the transaction or through the owning transactional outbox.

**Error handling:** expected domain codes include
`assistant_session_conflict`, `assistant_idempotency_conflict`,
`assistant_approval_expired`, `assistant_approval_consumed`,
`designer_revision_conflict`, `designer_generation_fence_stale`,
`designer_lease_conflict`, `designer_promotion_evidence_ambiguous`, and
`content_activation_conflict`. Constraint/driver errors are centrally mapped.

**Regression-test shape:** schema/snapshot/journal parity; composite owner/FK
isolation; concurrent session/revision/claim/idempotency writers; bounded cursor
stability; retention claim/retry; generation pointer capture and atomic cutover;
prompt-AI versus Figma generation-run CHECK truth table and atomic successor
replacement preserving that complete matrix; pending-to-bound Figma
claim CAS; atomic grant-source transfer into the lease; stale generation/
selection/credential/lease-fence races with zero external-I/O eligibility;
action-ledger round trips pin event key plus byte-equivalent canonical plan body/
version/digest/outbox identity and reject malformed/mismatched recovery evidence;
rollback/crash fixtures prove no partial ledger/pointer visibility.

## Testing Requirements

- terminal migration/schema parity command and clean-database migration lane
- targeted Bun DB integration tests for all repositories and transaction paths
- concurrent writer tests for session creation, message ordinals, revision
  allocation, generation fences, approvals, leases, and activation CAS
- keyset pagination/query-count tests and sanitized representative
  `EXPLAIN (ANALYZE, BUFFERS)` receipts
- retention/cleanup selector and idempotent retry tests
- handoff clock tests freeze PostgreSQL time at 29:59/30:00, prove no read/retry/
  tab activity refresh, race consume with expiry, erase sensitive refs exactly
  once on consume/revoke/expiry, retain only the safe 30-day tombstone, and
  traverse bounded indexed prune pages without gaps/duplicates or N+1 writes
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run scan:security:strict`
- `git diff --check`
- physical line count for every touched production/test file (<=1,000)

Run commands exactly as documented by the terminal migration/test owners; do
not guess stale lane names. Test migration from both a clean DB and a
representative pre-task schema, including activation bootstrap/restart.

## Documentation Updates Required

Provide TASK-414-11-L01 a bounded closeout receipt covering all 41 new tables,
the existing action-ledger repair, constraints/indexes, named read models,
transactions, activation bootstrap,
retention, recovery, query-plan evidence, and migration deploy order for
`_docs/DATA_MODEL.md`, `_docs/ORM_SPEC.md`, `_docs/ARCHITECTURE.md`,
`_docs/SECURITY_SPEC.md`, `_docs/AUDIT_SPEC.md`, and `_docs/SEARCH_SPEC.md`.
The receipt covers this leaf's 41-table migration only; TASK-414-02-L03's
separate 8-table extension overlay migration is reported by that leaf's own
handoff and TASK-414-05-L04's separate 1-table action-execution lease
migration is reported by its own handoff, so the aggregate across TASK-414 is
exactly 50 new tables across three disjoint migrations with zero overlap.
This leaf does not edit shared docs/tasks/board/changelog.

## Done Criteria

- Exactly the 41 contracted new tables, the scoped existing-ledger alteration,
  and all matching schema/migration/snapshot/journal artifacts land atomically
  under one writer. The 8-table plugin/CMS-capability extension overlay belongs
  exclusively to TASK-414-02-L03's separate migration, and the 1-table
  action-execution lease belongs exclusively to TASK-414-05-L04's separate
  migration; the TASK-414 aggregate of exactly 50 new tables (41 + 8 + 1)
  spans the three disjoint migrations with zero overlap.
- Agent/attachment/Designer/promotion/activation state has DB-enforced owner,
  lifecycle, idempotency, fence, digest, FK, index, and retention contracts.
- Revision allocation is concurrency-safe without a fabricated TASK-551 family.
- Raw lease/preview-bind/selection secrets are never persisted or exposed beyond
  the one no-store creation response and immediate CSRF bind request body.
- Whole-site activation has generation-scoped mapping/artifact records and one
  CAS pointer needed for non-mixed visibility.
- Focused gates, query plans, migration tests, and line-count gate pass.
