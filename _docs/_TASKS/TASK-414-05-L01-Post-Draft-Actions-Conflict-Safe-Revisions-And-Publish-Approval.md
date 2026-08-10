# TASK-414-05-L01: Post Draft Actions Conflict-Safe Revisions And Publish Approval
# FileName: TASK-414-05-L01-Post-Draft-Actions-Conflict-Safe-Revisions-And-Publish-Approval.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-05
**Priority:** Critical
**Category:** Agent / Posts / Transactions / RBAC
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-03 terminal; TASK-414-04 terminal;
TASK-414-05-L05 and TASK-414-05-L04 terminal; TASK-551-09-L02 terminal;
TASK-554 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Implement strict `post.draft.create`, `post.draft.update`, and `post.publish`
Agent action contributions over the terminal native Post service split. Draft
actions use the normal plan → dry-run → review → idempotent execute flow but
can never publish. Publish is a distinct action whose execute input must carry
a fresh single-use approval receipt bound to the exact reviewed action and
current draft bytes.

Do not edit the legacy `core/services/content/postsService.ts`. At dispatch,
verify TASK-551-09-L02 has split that 1,010-line facade, adopted
`withRevisionParentLock`/`allocateRevision`, bounded revision reads/retention,
and cache invalidation. If not, stop. No “temporary” Agent method or duplicate
revision allocator may be added to the facade.


## Sub-Tasks

None; this is an executable leaf.
## Exact File Ownership

This leaf is the sole TASK-414 writer for:

- existing terminal `core/services/content/postMutationService.ts`;
- existing terminal `core/services/content/postRevisionService.ts`, only for
  the exact bounded publish/revision handoff described here;
- new `core/services/content/postOptimisticContract.ts`;
- new `core/services/assistant/actions/post/postActionContracts.ts`;
- new `core/services/assistant/actions/post/postActionContribution.ts`;
- new `core/services/assistant/actions/post/postActionAdapter.ts`;
- new `core/services/assistant/actions/post/postPublishApprovalService.ts`;
- new `core/services/assistant/actions/post/postActionErrors.ts`;
- new `core/server/validation/assistantPostActionSchemas.ts`;
- new `core/server/routes/assistantPostActionRoutes.ts`;
- new `tests/vitest/assistant/postActionContracts.test.ts`;
- new `tests/vitest/assistant/postActionContribution.test.ts`;
- new `tests/vitest/content/postOptimisticContract.test.ts`;
- new `tests/unit/assistant/postActionAdapter.test.ts`;
- new `tests/unit/assistant/postPublishApprovalService.test.ts`;
- new `tests/integration/posts/assistantPostActions.test.ts`;
- new `tests/integration/posts/assistantPostPublishConcurrency.test.ts`;
- new `tests/integration/routes/assistantPostPublishApproval.test.ts`;
- existing terminal `tests/unit/content/postsService.test.ts`, only for focused
  facade/native compatibility assertions if it remains at most 1,000 lines;
  otherwise add those assertions to new focused suites above.

Forbidden: `core/services/content/postsService.ts`, Post route/schema/client/UI,
  TASK-554 files, DB tables/migrations, TASK-414-03 repositories/capability/tool
owners, L05-owned action type/schema/family/registry modules, existing planner/
mapper modules, the L04-owned action executor/store/split modules, shared route index/
`assistantRoutes.ts`, Media, Designer, shared docs/
tasks/changelog, and every other leaf file.

Consume TASK-414-02-L01's terminal pure capability source types/registries,
L05's static action-contribution registry, and L04's transaction-owned execution
lane through `postActionContribution.ts`. Register all three Post descriptors as
`transaction_owned_single`; do not reopen either registry owner or create a
second executor. If the terminal seam cannot register one leaf-owned strict
contribution without editing an oversized legacy module, stop and amend the
contract before implementation.

## Exact Action Contracts

```ts
export type PostDraftCreateActionV1 = Readonly<{
  type: "post.draft.create";
  input: Readonly<{
    title: string;
    slug: string | null;
    document: PostDocumentV2;
    tags: readonly string[];
    taxonomy: PostTaxonomyInputV1 | null;
    seo: PostSeoInputV1 | null;
  }>;
}>;

export type PostDraftUpdateActionV1 = Readonly<{
  type: "post.draft.update";
  input: Readonly<{
    postId: string;
    expectedVersion: number;
    expectedUpdatedAt: string;
    expectedDraftDigest: string;
    patch: StrictPostDraftPatchV1;
  }>;
}>;

export type PostPublishActionV1 = Readonly<{
  type: "post.publish";
  input: Readonly<{
    postId: string;
    expectedVersion: number;
    expectedUpdatedAt: string;
    expectedDraftDigest: string;
  }>;
}>;

export type ExecuteApprovedPostPublishV1 = Readonly<{
  planId: string;
  planHash: string;
  actionId: string;
  approvalId: string;
  idempotencyKey: string;
}>;
```

All schemas recursively reject unknowns. Draft create/update contain no
`status`, `scheduledAt`, `publishedAt`, approval, publish boolean, metadata bag,
arbitrary JSON/HTML/CSS, approval ID, or provider target ID. `post.draft.create` forces native
status `draft`. `post.draft.update` changes only explicitly present draft fields
through `PostDocumentV2` and native taxonomy/SEO normalizers. Empty patches
fail. Publish contains no draft body/patch/approval. The immutable provider-
backed action exists before review; only the separate server-issued execute
envelope may add a single-use approval and publish exactly the reviewed digest
that still exists. Provider output can never manufacture an approval ID.
`post.draft.update` additionally requires the locked current native status to
be exactly `draft`. A current `published`, `scheduled`, or `archived` Post is a
typed conflict and requires a separately authorized native transition; the
Agent never implicitly unpublishes or revives it by applying a draft patch.

The dry-run response rehydrates the Post by server-resolved ID, recomputes
version/`updatedAt`/canonical draft digest, shows a bounded field/block/taxonomy/
SEO diff, required permissions, revision impact, and publish visibility. It
contains no unpublished body outside the already authorized review surface.

## Native Optimistic And Revision Contract

`postOptimisticContract.ts` owns canonical UTC timestamp comparison and
SHA-256 over the native normalizer's canonical current-draft bytes. The version
is the current native content revision/version handed off by TASK-551; it is not
an Agent counter. Every update/publish checks all supplied values under the
parent lock inside the transaction. A mismatch reports which safe token class
conflicted but returns no current body.

Create/update uses L04's transaction handle for every related native read/write/
revision call. Update locks/compares current state and exact
`draft` status, applies the strict
patch, normalizes, allocates/reuses one bounded revision according to the native
contract, and returns a strict L04 native receipt containing only the result plus
finite before/after cache, audit, undo, and optional approval-settlement facts.
This leaf never allocates an event key or persists/applies audit, approval
settlement, undo, invalidation, outbox, execution ledger, or postcommit state.
L04 alone turns those facts into one plan and commits all cross-cutting rows.

Publish performs inside L04's one transaction-owned execution:

1. claim/check the single-use approval row with actor/session/plan hash/action
   ID/Post ID/version/`updatedAt`/draft digest/expiry/idempotency binding;
2. acquire the native revision parent lock and re-read the narrow current row;
3. compare all conflict tokens and ensure the draft is publishable;
4. allocate or reuse the exact reviewed revision through
   `allocateRevision(input, tx)` and apply bounded retention bookkeeping;
5. update status/`publishedAt`/`updatedAt` transactionally;
6. return the normalized native result plus finite cache/audit/undo and exact
   approval-settlement facts to L04; and
7. let L04 validate those facts and atomically persist approval settlement,
   audit, TASK-551 outbox plan, undo, and complete execution ledger.

No global DB client is used inside the transaction. No cache/provider/external
I/O or cross-cutting persistence occurs in the Post handler. L04 owns event-key/
plan construction, outbox persistence, commit classification, and at-least-once
postcommit observation. A rollback consumes neither approval nor idempotency
result and exposes no partial publication; an ambiguous commit never reruns the
publish adapter.

## Explicit Publish Approval

`POST /admin/api/assistant/agent/sessions/:sessionId/post-publish-approvals`
accepts:

```ts
type CreatePostPublishApprovalV1 = Readonly<{
  planId: string;
  planHash: string;
  actionId: string;
  postId: string;
  expectedVersion: number;
  expectedUpdatedAt: string;
  expectedDraftDigest: string;
  idempotencyKey: string;
}>;
```

The route requires `assistant:use`, `content:read`, `content:write`, and
`content:publish`,
rehydrates the owner session/plan/action/Post, verifies the action is exactly
`post.publish`, verifies a completed current dry-run/review digest, and creates
an opaque random approval importing the exact
`ASSISTANT_RETENTION_POLICY_V1["assistant-approval-intent"]` five-minute,
non-refreshable hard TTL. It returns approval ID,
expiry, and safe binding summary only. The ID is stored only in in-memory Agent
review state until execute; it is not in localStorage, URL, logs, or screenshots.

Approval does not publish. Execute accepts only
`ExecuteApprovedPostPublishV1`, rehydrates its immutable plan/action, and
rechecks the same permissions and all bindings. L04 locks the generic L02
approval row before invoking the Post handler; the handler validates its binding
against the locked native draft and returns only a settlement fact. L04 is the
sole writer that consumes/settles that approval together with the native effect
and execution ledger. Approval is single-use; a successful duplicate idempotency replay may
return the original execution result, while a different execution/idempotency
key fails `assistant_post_publish_approval_replayed`.

`registerAssistantPostActionRoutes(router, deps)` is this leaf's exact route
contribution export. It registers only the approval route above and the strict
Post action adapters; TASK-414-09-L03 mounts it once into the shared Assistant
route tree. This leaf does not edit the shared route index.

## Security Contract

- **Visibility:** one new internal approval route plus internal action
  contribution; no public Post/Agent route and no change to front reads.
- **Auth:** authenticated Admin session; actor/session/plan/action/Post and
  current conflict tokens are resolved server-side. Approval ID is not auth.
- **RBAC:** plan/dry-run require `assistant:use` + `content:read`; draft execute
  additionally requires `content:write`; approval and publish execute each
  require `content:read`, `content:write`, and `content:publish`. TASK-554 must already prevent
  metadata publication using only `content:write`.
- **CSRF:** required on approval creation and all dry-run/execute POSTs.
- **Rate limit:** existing `assistant` plan/dry-run/execute and approval budget;
  publish also consumes content mutation quota. Denied/replayed attempts count.
- **Validation:** recursive reject-unknown action/approval schemas; copied
  fields only; UUID/opaque IDs; canonical expected version/time/digest/plan
  hash/action/idempotency binding; native normalizers; bounded revisions.
- **Anti-abuse:** no public write, so nonce/HMAC/reCAPTCHA are not applicable.
  Durable execution idempotency, five-minute single-use approval, row lock/CAS,
  unique revision constraint/retry, and transaction boundaries are mandatory.
- **Secrets/privacy:** no approval ID, full Post body, provider draft, actor
  permissions, session/CSRF value, SQL/driver error, or unpublished content in
  URLs, browser persistence, cache, logs, audit payloads, screenshots, or errors.

## Implementation Pseudocode

```ts
export async function updatePostDraftIfCurrent(
  tx: ProductTransaction,
  input: StrictPostDraftUpdateV1,
  actorId: string,
  deps: PostMutationDeps
): Promise<TransactionOwnedNativeReceipt<PostMutationResultV1>> {
  return deps.revisions.withRevisionParentLock(
    { kind: "post", id: input.postId }, tx, async () => {
    const current = await deps.posts.getCurrentForUpdate(input.postId, tx);
    assertExpectedPostState(current, input);
    assertCurrentPostStatus(current, "draft");
    const next = normalizePostDraft(applyStrictPostDraftPatch(current, input.patch));
    const revision = await deps.revisions.allocateOrReusePostRevision(
      current, next, actorId, tx,
    );
    const post = await deps.posts.writeDraft(next, tx);
    return buildPostNativeReceipt({
      value: { post, revision },
      before: current,
      after: post,
      approvalSettlement: null,
    });
  });
}

export async function executeApprovedPostPublishTx(
  tx: ProductTransaction,
  input: TransactionOwnedPostPublishInputV1,
  deps: PostActionDeps,
): Promise<TransactionOwnedNativeReceipt<PostMutationResultV1>> {
  const approval = input.approval;
  assertApprovalMatchesImmutableActionEnvelope(approval, input);
  return deps.revisions.withRevisionParentLock(
    { kind: "post", id: approval.postId }, tx, async () => {
    const current = await deps.posts.getCurrentForUpdate(approval.postId, tx);
    assertCurrentPostStatus(current, "draft");
    assertApprovalMatchesCurrentPost(approval, current, input);
    const revision = await deps.revisions.allocateOrReusePostRevision(
      current, current.draft, input.actorId, tx,
    );
    const post = await deps.posts.publishCurrentDraft(current, input.actorId, tx);
    return buildPostNativeReceipt({
      value: { post, revision },
      before: current,
      after: post,
      approvalSettlement: { approvalId: approval.id, state: "consumed" },
    });
  });
}
```

## Data Flow

Provider operation draft → strict backend Post action proposal → canonical
target rehydration → current version/time/digest → dry-run/review. Draft execute
→ optimistic native mutation/revision facts → L04-owned atomic ledger/outbox →
safe result and L02 resource binding. Publish review → explicit
`content:publish` approval → publish execute reauthorization → one locked
transaction → L04-owned approval/audit/undo/outbox/ledger → post-commit observation →
safe result. No provider output or browser target becomes native input directly.

## Machine-Readable Errors

- `assistant_post_action_invalid`, `assistant_post_target_invalid`,
  `assistant_post_target_not_found`, `assistant_post_patch_empty`;
- `assistant_post_version_conflict`, `assistant_post_updated_at_conflict`,
  `assistant_post_digest_conflict`, `assistant_post_publish_conflict`;
- `assistant_post_publish_approval_required`,
  `assistant_post_publish_approval_invalid`,
  `assistant_post_publish_approval_expired`,
  `assistant_post_publish_approval_replayed`;
- `post_revision_conflict`, `post_revision_create_failed`, and other existing
  terminal native Post errors through one safe mapper.

Conflict is 409, invalid/unknown is 400/422, not found is 404, permission is
403, expired approval is 409/410 by the centralized contract, and unexpected
transaction/driver failures are redacted 500. No automatic overwrite retry.

## Regression-Test Shape

- Mutate every action/approval key and nested key; ensure recursive unknowns,
  status/schedule/publish fields, arbitrary metadata, provider action IDs, empty
  patches, invalid documents, and untrusted target IDs fail before service I/O.
- Prove create/update always remain draft, including malicious nested
  `status`, stale metadata, and a writer lacking `content:publish`; update of a
  currently published/scheduled/archived Post fails with zero implicit status
  transition.
- Dry-run rehydrates current Post and pins diff/version/time/digest; update after
  another writer returns 409 with zero write/revision/cache effect.
- Approval tests cover missing session/plan/action/review, wrong actor/Post/
  version/time/digest/plan hash/action/idempotency, expired/replayed approval,
  permission revoked between approval and execute, and same-key replay.
- Concurrent update/publish/autosave writers allocate unique monotonic revisions
  or return one typed conflict, never lost updates/duplicate versions.
- Crash/rollback injection at approval claim, revision, mutation, audit/outbox,
  and consume proves all-or-nothing publication and reusable approval only after
  rollback, not after commit.
- Revision list is bounded/stably ordered, retention is bounded, every tx call
  receives `tx`, and L04 atomically persists the returned complete native
  receipt with approval settlement/audit/outbox/undo/ledger. Postcommit replay
  of L04's one stable event key has one effective outcome.
- Import/dependency spies fail if the Post handler allocates an event key or
  imports/calls audit, approval-settlement, undo, outbox, invalidation persistence/
  application, execution-ledger, cache-runtime, or global-DB owners. Its receipt
  must round-trip through L04's strict facts schema and produce the same terminal
  Post cache tags as the native TASK-551 path.
- Existing native Post/editor/metadata behavior and TASK-554 writer-vs-publisher
  security tests remain green.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/postActionContracts.test.ts \
  tests/vitest/assistant/postActionContribution.test.ts \
  tests/vitest/content/postOptimisticContract.test.ts
set -a && source .env && set +a
bun test tests/unit/assistant/postActionAdapter.test.ts \
  tests/unit/assistant/postPublishApprovalService.test.ts \
  tests/integration/posts/assistantPostActions.test.ts \
  tests/integration/posts/assistantPostPublishConcurrency.test.ts \
  tests/integration/routes/assistantPostPublishApproval.test.ts \
  tests/unit/content/postsService.test.ts \
  tests/integration/posts/posts-revisions-flow.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
git diff --check
wc -l core/services/content/{postMutationService,postRevisionService,postOptimisticContract}.ts \
  core/services/assistant/actions/post/*.ts \
  core/server/routes/assistantPostActionRoutes.ts \
  core/server/validation/assistantPostActionSchemas.ts \
  tests/vitest/assistant/{postActionContracts,postActionContribution}.test.ts \
  tests/vitest/content/postOptimisticContract.test.ts \
  tests/unit/assistant/{postActionAdapter,postPublishApprovalService}.test.ts \
  tests/integration/posts/{assistantPostActions,assistantPostPublishConcurrency}.test.ts \
  tests/integration/routes/assistantPostPublishApproval.test.ts
```

Also rerun TASK-554's exact terminal route/schema/client security commands from
its final receipt; do not edit its files or weaken its assertions.

## Documentation Updates Required

Hand action inputs, review/approval, conflict/revision/transaction, RBAC, route,
and validation receipts to TASK-414-11-L01. This leaf edits no shared docs, task
board/status, TASK-554 contract, or changelog.
