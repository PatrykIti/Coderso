# TASK-414-05: Agent Post Workflow And Bounded CMS Resource Actions
# FileName: TASK-414-05-Agent-Post-Workflow-And-Bounded-CMS-Resource-Actions.md

**Parent Task:** TASK-414
**Priority:** Critical
**Category:** Agent / Posts / CMS Actions / Designer Handoff
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-04 terminal; TASK-414-03 terminal; TASK-548 terminal; TASK-551-09-L02 terminal; TASK-554 terminal
**Related Tasks:** TASK-414-06, TASK-547, TASK-551-06-L02
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Add the first complete Agent workflow for a native editorial resource: Post
draft creation, conflict-safe draft update, canonical editor handoff, and a
separately reviewed publish action. Agent remains a bounded resource assistant;
whole-site intent becomes an explicit Designer handoff with zero Agent
`site-kit.*` actions.

The action families are exactly:

- `post.draft.create` — reviewed creation that can only persist `draft`;
- `post.draft.update` — reviewed optimistic update that cannot change publish
  state; and
- `post.publish` — a separate review and fresh explicit approval requiring
  both `content:write` and `content:publish`.

All provider output remains an untrusted operation draft. Backend-owned action
schemas, target resolution, conflict tokens, native Post normalizers/services,
RBAC, dry-run, explicit approval, idempotency, revision allocation, and audit
remain authoritative.

TASK-551-09-L02 must first land its cohesive split of the 1,010-line
`postsService.ts` into singular `postMutationService.ts`,
`postRevisionService.ts`, and `postDocumentContract.ts`, adopt the shared
concurrency-safe allocator/retention contract, and leave every touched file
below 1,000 lines. If that terminal state is absent or the facade still needs a
behavior edit, this child is blocked until the ownership contract is amended;
do not add Agent behavior to the oversized facade.

TASK-554 is a hard security dependency. Agent Post actions cannot dispatch
until metadata publication fields require `content:publish` and ordinary
metadata clients use present-only publication fields.

## Product Boundary

- Draft create/update always pass `status: "draft"` internally and reject any
  caller/provider `status`, `publishedAt`, `scheduledAt`, or publish flag.
- Publish never piggybacks on draft execution, metadata save, editor open,
  previous review, generic execute confirmation, or `content:write`.
- Every update/publish includes exact expected native version and `updatedAt`;
  publish also binds the reviewed draft digest. Conflict is 409 and causes a new
  read/diff/proposal path, never last-writer-wins.
- Revision allocation, current-row check, publish mutation, approval
  consumption, audit/outbox/invalidation persistence, and bounded retention
  bookkeeping are one transaction using its transaction handle.
- The canonical Post editor deep link contains opaque Agent session and
  resource-binding IDs. The server resolves actor ownership and the current Post
  target from that binding; the browser never supplies a trusted Post ID or
  arbitrary href through the link. The bridge keeps the same Agent session
  companion beside the native editor across reload/new tab for bound follow-up
  requests.
- An Agent/cache event cannot overwrite a dirty editor. The UI offers a visible
  compare/reload-after-save-or-discard choice.
- Agent acts on one explicit resource or an explicitly bounded same-kind batch
  declared by a capability. Full-site/aggregate package intent creates only a
  Designer handoff and never executes legacy `site-kit.*` actions.

## Sub-Tasks

| Order | ID | Exclusive responsibility | Status |
|---:|---|---|---|
| 1 | TASK-414-05-L05 | Cohesive closed action type/schema/family split and one strict static contribution registry | ⏳ To Do |
| 2 | TASK-414-05-L04 | Cohesive legacy executor split plus transaction-owned single-action executor and actor-scoped execution ledger | ⏳ To Do |
| 3 | TASK-414-05-L01 | Post action contracts/adapters, optimistic native mutations, revision/publish transaction, explicit publish approval | ⏳ To Do |
| 4 | TASK-414-05-L02 | Server-side session resource binding, canonical `adminPaths` deep link, Post editor bridge, dirty-state protection | ⏳ To Do |
| 5 | TASK-414-05-L03 | Generic bounded-resource proposal classifier and explicit Agent-to-Designer handoff with zero site-kit actions | ⏳ To Do |

Land strictly in the displayed order. L05 owns the closed-union split and
static contribution seam. L04 consumes that seam and owns the executor split
and strict transaction-owned lane. L01 owns native Post/action files and
consumes both terminal seams. L02 owns binding and Post editor bridge files.
L03 owns generic scope/handoff files. None edits
shared route/navigation mounts; TASK-414-09-L03 mounts their route and UI
contributions after all dependencies are terminal.

## Security Contract

- **Visibility:** Post action approval, resource-binding, and Designer-handoff
  routes are internal `/admin/api/assistant/*` endpoints. Existing Post routes
  remain internal. No public Agent/CMS write is added.
- **Auth:** authenticated Admin session. Actor/installation/session/resource binding,
  current Post state, provider/model capability, permissions, and target IDs are
  server-resolved. Opaque session/approval/handoff IDs are not credentials.
- **RBAC:** Agent use requires `assistant:use`. Draft plan/read needs
  `content:read`; draft execute needs `content:write`; publish approval and
  publish execution each independently require fresh `content:read`,
  `content:write`, and `content:publish`. Designer handoff creation/open additionally requires
  `designer:write`. No Agent permission widens native permissions.
- **CSRF:** required for every internal POST/PUT/PATCH/DELETE, including approval,
  execute, binding mutation, and handoff creation. GET binding/handoff reads are
  side-effect free.
- **Rate limits:** existing `assistant` plan/dry-run/execute bucket plus bounded
  `assistant` approval/binding/handoff policies; publish also remains subject to
  native content mutation limits. Replays still consume quota.
- **Validation:** recursive reject-unknown schemas; exact action type/input;
  present-only draft fields; opaque IDs; expected version/`updatedAt`/digest/
  plan hash/action ID/idempotency/approval checks; server-rehydrated targets;
  bounded revisions and proposal resources.
- **Anti-abuse:** no public write, so nonce, signature/HMAC, and reCAPTCHA are
  not applicable. Durable idempotency, single-use short-lived approvals,
  optimistic CAS, transaction locks, session ownership, and bounded retries
  prevent replay/concurrent overwrite.
- **Secrets/privacy:** no Post body, provider draft, approval secret, session/
  CSRF value, permission snapshot, private attachment text, DB/driver error, or
  unpublished content in browser storage, URL parameters other than opaque
  session/binding identities, logs, metrics, audits, screenshots, or error
  payloads.

## Error Contract

Machine-readable errors include:

- `assistant_post_action_invalid`, `assistant_post_target_invalid`,
  `assistant_post_target_not_found`;
- `assistant_post_version_conflict`, `assistant_post_updated_at_conflict`,
  `assistant_post_digest_conflict`, `assistant_post_publish_conflict`;
- `assistant_post_publish_approval_required`,
  `assistant_post_publish_approval_invalid`,
  `assistant_post_publish_approval_expired`,
  `assistant_post_publish_approval_replayed`;
- `assistant_resource_binding_not_found`,
  `assistant_resource_binding_forbidden`,
  `assistant_resource_binding_conflict`;
- `assistant_agent_scope_unbounded`, `assistant_designer_handoff_required`,
  `assistant_designer_unavailable`, `assistant_designer_handoff_invalid`;
- existing safe Post/revision/constraint/invalidation errors inherited from the
  native owners.

Unexpected driver/constraint/provider values are centrally redacted. A
conflict never degrades to a blind retry or overwrite.

## Acceptance Criteria

- The three exact Post families are strict, executable through the reviewed
  Agent contribution seam, and absent from Guide.
- Draft actions cannot publish through any own, unknown, nested, metadata, or
  stale field path.
- Publish requires a separate fresh, actor/action/version/digest-bound,
  single-use approval and both `content:write` and `content:publish` at approval
  and execution.
- Two concurrent writers cannot allocate duplicate revisions or overwrite a
  newer Post; history reads and retention are bounded.
- Deep links use canonical `adminPaths`, expose only opaque Agent session and
  resource-binding IDs, resolve target/authorization server-side, and preserve
  the same-session editor companion across reload/new tab.
- Existing dirty editor bytes are never replaced by Agent/cache/reconnect
  updates without an explicit safe user decision.
- Whole-site or aggregate graph intent yields one Designer handoff, zero Agent
  actions, and specifically zero `site-kit.*` actions.
- Every touched production/test file is at most 1,000 physical lines.

## Testing Requirements

Each leaf runs its exact focused commands. Child integration also requires:

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
bun run check:admin-boundary
git diff --check
```

Runtime smoke, after the later mount owner lands, covers at least: create draft
→ editor, clean update → visible reload, dirty editor conflict banner, stale
version 409/new proposal, separate publish approval/success, publish denial,
approval replay, and whole-site Designer handoff with zero Agent actions.

## Documentation Updates Required

TASK-414-11-L01 owns shared architecture/API/RBAC/security/Agent/Post/Designer
handoff docs, acceptance evidence, task/status board, and changelog 1266. This
child only produces implementation and validation receipts for that closure.
