# TASK-414-05-L03: Bounded Resource Proposals And Agent-To-Designer Handoff
# FileName: TASK-414-05-L03-Bounded-Resource-Proposals-And-Agent-To-Designer-Handoff.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-05
**Priority:** Critical
**Category:** Agent / Scope Safety / Designer Handoff
**Estimated Effort:** Large
**Dependencies:** TASK-414-05-L02; TASK-414-02-L01; TASK-414-03 terminal; TASK-547 terminal; TASK-548 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Enforce the boundary between per-resource Agent proposals and aggregate
Designer work. Agent can inspect/propose/execute only an explicitly supported,
bounded native resource scope. A request to create/redesign/refine a complete
site, apply a multi-domain site graph, or invoke a solution/site kit returns an
explicit `DesignerHandoffV1` and an exact empty Agent action list.

This leaf does not generate, stage, preview, promote, install, or roll back a
site. TASK-547 remains the aggregate package/installer owner; TASK-414-07+
builds Designer. The handoff is a sanitized, provider-neutral intent envelope
that those later Designer tasks may consume. It cannot be adapted back into
Agent `site-kit.*` actions.


## Sub-Tasks

None; this is an executable leaf.
## Exact File Ownership

This leaf is the sole writer for:

- new `core/services/assistant/scope/agentWorkBoundary.ts`;
- new `core/services/assistant/scope/agentResourceProposalContracts.ts`;
- new `core/services/assistant/scope/agentResourceProposalRegistry.ts`;
- new `core/services/assistant/scope/designerHandoffContracts.ts`;
- new `core/services/assistant/scope/designerHandoffService.ts`;
- new `core/server/validation/assistantDesignerHandoffSchemas.ts`;
- new `core/server/routes/assistantDesignerHandoffRoutes.ts`;
- new `core/admin/services/assistantDesignerHandoffClient.ts`;
- new `core/admin/ui/assistant/agent/AgentDesignerHandoffCard.tsx`;
- new `tests/vitest/assistant/agentWorkBoundary.test.ts`;
- new `tests/vitest/assistant/agentResourceProposalRegistry.test.ts`;
- new `tests/vitest/assistant/designerHandoffContracts.test.ts`;
- new `tests/vitest/admin/assistantDesignerHandoffClient.test.ts`;
- new `tests/vitest/ui/agent-designer-handoff.test.tsx`;
- new `tests/integration/routes/assistantDesignerHandoffs.test.ts`;
- new `tests/integration/server/assistantDesignerHandoffPersistence.test.ts`.

Forbidden: existing action registry/types/schema/planner/executor/mapper,
`siteBuilder*`, solution-kit/TASK-547 package/install code, TASK-414-02/03
manifest/session/table/migration owners, Designer workspace/staging/promotion,
Guide/TASK-548 files, `AssistantPanel.tsx`, shared route/Admin mounts, Post/Media
domain code, shared docs/tasks/changelog, and other leaf files.

Consume TASK-414-02-L01's terminal pure native-feature/Agent contribution
registries, TASK-414-05-L05's frozen action registry, and TASK-414-03's
server intent/session/handoff repository seams. If either lacks the strict
contribution boundary needed below, stop and amend the owner; do not inspect a
browser-provided capability list or fork a registry.

The exact pure integration exports are:

```ts
export function registerAssistantDesignerHandoffRoutes(
  router: Router,
  deps: AssistantDesignerHandoffRouteDeps,
): void;
export const assistantDesignerHandoffAgentUiContribution:
  Task414AgentUiContributionV1;
```

`assistantDesignerHandoffAgentUiContribution` satisfies the exact
TASK-414-02-L01 `Task414AgentUiContributionV1` declaration and imports it by
name from the terminal `cmsCapabilitySourceAdapters.ts` exports; no parallel
shape is redefined.

They perform no import-time registration and never mount Designer routes.

## Bounded Agent Scope

```ts
export type AgentWorkClassificationV1 =
  | { kind: "bounded-resource"; scope: BoundedAgentResourceScopeV1 }
  | { kind: "designer-handoff"; handoffDraft: DesignerHandoffDraftV1; actions: readonly [] }
  | { kind: "needs-input"; code: string; questions: readonly BoundedQuestionV1[]; actions: readonly [] };

export interface AgentResourceProposalAdapterV1<TProposal> {
  readonly capabilityId: string;
  readonly resourceKind: CmsResourceKind;
  inspect(input: AuthorizedResourceTargetV1): Promise<BoundedResourceSnapshotV1>;
  propose(input: StrictResourceIntentV1): Promise<TProposal>;
  toReviewedActions(
    proposal: TProposal,
    registry: AssistantActionContractRegistryV1,
  ): readonly NormalizedRegisteredAssistantActionV1[];
}
```

An Agent scope is bounded only when one terminal capability record declares the
adapter and all of these hold:

- exactly one server-resolved primary native resource; or one explicitly
  requested same-kind batch under one server-resolved parent;
- at most eight directly owned child elements for a nested edit, or 20 records
  for a manifest-declared bulk operation;
- at most 24 actions after strict expansion, all in the same native permission
  and rollback family declared by that capability;
- no second top-level resource kind, site-wide theme/package graph, route/menu/
  page/form aggregate, install/reset/migration, or hidden broad selector;
- exact current resource/version tokens and native permissions are available;
  and
- every operation is supported by a per-resource Agent adapter, not merely by a
  TASK-547/Designer aggregate package adapter.

A missing target, ambiguous “all”, over-limit batch, unsupported operation, or
mixed resource graph returns `needs-input` or Designer handoff with zero actions.
It is never silently truncated to fit Agent limits.

## Designer Handoff Contract

```ts
export type DesignerHandoffV1 = Readonly<{
  schema: "coderso.designer-handoff@v1";
  handoffId: string;
  sourceSessionId: string;
  sourceMessageId: string;
  intent: Readonly<{
    goal: string;
    locale: string | null;
    requestedCapabilityIds: readonly string[];
    existingSiteMode: "new-site" | "refine-whole-site";
  }>;
  evidenceRefs: Readonly<{
    attachmentIds: readonly string[];
    citationIds: readonly string[];
  }>;
  state: "pending";
  createdAt: string;
  expiresAt: string;
}>;
```

The strict handoff contains a redacted/clamped user goal, stable capability
IDs from the L01 source registry, and owner-bound references only. It contains no
provider output, action plan, `site-kit.*` action, package bytes, CMS target ID,
permission snapshot, provider/model setting, raw web/attachment content,
credential, arbitrary route/URL, or staged resource.

`createdAt` is the repository's immutable PostgreSQL `issued_at`; `expiresAt`
is exactly `issued_at + 30 minutes`. Neither GET, idempotent replay, cache hit,
tab activity, Designer navigation, nor a failed consume refreshes that hard
deadline. Consumption locks the pending row, rechecks owner/session/status and
database time, creates or returns its uniquely linked workspace, and in the
same transaction marks the handoff consumed while erasing the sanitized brief
reference and source binding IDs. Expiry/revoke performs the same sensitive-ref
erasure with no workspace creation. Only the hash-only status/workspace/
idempotency tombstone remains for 30 days under TASK-414-03-L02's bounded
indexed pruner.

`POST /admin/api/assistant/agent/sessions/:sessionId/designer-handoffs` accepts only
`{ sourceMessageId, expectedSessionRevision, idempotencyKey }`. The server reloads the exact
normalized user message and prior classification, reauthorizes session owner,
`assistant:use`, and `designer:write`, verifies Designer capability availability,
projects the strict envelope, and persists one pending handoff under the named
owner/session/source-message and owner/idempotency uniqueness contracts. Exact
replay returns the original row; reuse of either identity with different
message/session-revision/classification bytes returns
`assistant_designer_handoff_conflict`. It
returns the safe DTO and a canonical future Designer href only when the terminal
Designer route contribution is available. Otherwise classification still says
Designer is required but creation returns `assistant_designer_unavailable` and
zero actions.

`GET /admin/api/assistant/agent/sessions/:sessionId/designer-handoffs/:handoffId`
returns only the owner-authorized safe pending/consumed/expired state. It does
not create a Designer workspace, refresh expiry, or expose staged data.

TASK-414-07 imports `DesignerHandoffV1` and consumes it through one
owner-scoped, concurrency-safe transaction that creates or returns exactly one
Designer workspace and applies the exact hard-expiry/sensitive-reference
erasure contract above. TASK-547 aggregate package
adapters are Designer-only. Agent's proposal registry type rejects them at
compile time and runtime.

## Site-Kit Exclusion

Before any Agent action mapping, `classifyAgentWorkV1` rejects:

- action or capability IDs beginning `site-kit.`;
- TASK-547 package/plan/install/rollback operations;
- complete-site/new-site/redesign-everything or multi-domain graph intent;
- any provider draft containing aggregate package/site-kit action suggestions;
  and
- any plan whose resolved top-level resource set exceeds the bounded rules.

The result is a typed Designer handoff or needs-input object with `actions: []`.
Legacy `site-kit.recommend/install/validate` may remain for historical Designer/
solution-kit paths, but the Agent registry view and Agent provider context omit
them. Tests inspect the final Agent proposal/action projection, not only prompt
heuristics.

## Security Contract

- **Visibility:** two internal Admin handoff routes and Agent-only UI card. No
  public Designer/Agent/site-kit write is added.
- **Auth:** authenticated Admin session. Actor/installation/session/message,
  capabilities, current targets, and Designer availability are server-resolved;
  handoff ID is not authorization.
- **RBAC:** classification/Agent proposal requires `assistant:use` plus native
  read permissions. Persist/open handoff additionally requires
  `designer:write`; later staging/promotion reauthorize their own permissions.
- **CSRF:** required for POST handoff creation. GET state is side-effect free
  and cannot refresh expiry/create workspace.
- **Rate limit:** bounded `assistant` intent/proposal and handoff creation/read
  policies per actor/session plus installation-wide ceilings. Replayed create
  uses idempotency and counts.
- **Validation:** recursive reject-unknown envelope/request/response; server
  message lookup; expected session revision; stable manifest capability IDs;
  exact resource/action/count bounds; no URL/action/package/provider fields.
- **Anti-abuse:** no public write, so nonce/HMAC/reCAPTCHA are not applicable.
  Session ownership, optimistic revision, idempotent handoff identity, TTL,
  bounded refs, and zero-action invariant prevent replay/escalation.
- **Secrets/privacy:** no provider draft, raw prompt before redaction, Post/CMS
  body, permissions, private evidence, package bytes, credentials, cookies,
  session/CSRF values, or arbitrary URL in browser storage/cache, logs, audits,
  metrics, screenshots, errors, or handoff DTO.

## Implementation Pseudocode

```ts
export function classifyAgentWorkV1(input: {
  intent: StrictServerResolvedIntentV1;
  manifest: AuthorizedCmsCapabilityProjectionV1;
  targets: readonly AuthorizedResourceTargetV1[];
}): AgentWorkClassificationV1 {
  if (containsSiteKitOrAggregatePackageIntent(input.intent)) {
    return { kind: "designer-handoff", handoffDraft: buildDesignerHandoffDraft(input), actions: [] };
  }
  const scope = resolveBoundedAgentScope(input.targets, input.intent);
  if (!scope.ok) return scope.requiresDesigner
    ? { kind: "designer-handoff", handoffDraft: buildDesignerHandoffDraft(input), actions: [] }
    : { kind: "needs-input", code: scope.code, questions: scope.questions, actions: [] };
  const capability = input.manifest.requireAgentProposalCapability(scope);
  if (!capability.supported) {
    return { kind: "needs-input", code: capability.reason, questions: [], actions: [] };
  }
  return { kind: "bounded-resource", scope };
}

export async function createDesignerHandoff(
  raw: unknown,
  ctx: AuthorizedAgentContext,
  deps: DesignerHandoffDeps
): Promise<DesignerHandoffV1> {
  const request = normalizeCreateDesignerHandoffRequestV1(raw);
  const session = await deps.sessions.requireOwned(ctx.sessionId, ctx.actorId);
  assertExpectedSessionRevision(session, request.expectedSessionRevision);
  await deps.permissions.require(ctx.actorId, "designer:write");
  const message = await deps.messages.requireUserMessage(session.id, request.sourceMessageId);
  const classification = await deps.classifier.recompute(message, session);
  if (classification.kind !== "designer-handoff" || classification.actions.length !== 0) {
    throw domainError("assistant_designer_handoff_invalid");
  }
  await deps.designerAvailability.requireAvailable();
  return deps.handoffs.createIdempotent({
    actorId: ctx.actorId,
    sessionId: session.id,
    sourceMessageId: message.id,
    idempotencyKey: request.idempotencyKey,
    requestBindingDigest: digestDesignerHandoffRequest({
      sessionVersion: session.version,
      sourceMessageId: message.id,
      classification,
    }),
    handoff: projectStrictDesignerHandoff(classification, session),
    issuedAt: deps.clock.requirePostgresTransactionTime(),
    hardTtlSeconds: 30 * 60,
  });
}
```

## Data Flow

Normalized user message + server-hydrated targets/pure capability registry → scope
classification. Bounded resource → leaf-owned per-resource proposal adapter →
reviewed typed actions. Aggregate/full-site/site-kit → exact zero actions →
explicit sanitized Designer handoff draft → fresh POST authorization → owner-
scoped pending envelope → future TASK-414-07 Designer workspace. No reverse
adaptation into Agent actions exists.

## Machine-Readable Errors

- `assistant_agent_scope_invalid`, `assistant_agent_scope_ambiguous`,
  `assistant_agent_scope_unbounded`, `assistant_agent_batch_limit`;
- `assistant_agent_capability_unsupported`,
  `assistant_agent_resource_not_found`,
  `assistant_agent_resource_conflict`;
- `assistant_designer_handoff_required`,
  `assistant_designer_handoff_invalid`,
  `assistant_designer_handoff_conflict`,
  `assistant_designer_handoff_not_found`,
  `assistant_designer_handoff_expired`,
  `assistant_designer_unavailable`;
- `assistant_session_conflict` and existing safe auth/permission errors.

Unbounded/unsupported work returns 409/422 with zero actions. Missing/forbidden
handoff IDs use a non-enumerating 404. No partial Agent plan is returned beside
a Designer requirement.

## Regression-Test Shape

- Boundary table covers one explicit page/Post/entry/menu/form, nested children,
  same-kind batch at 20/21, 24/25 actions, second top-level kind, broad `all`,
  missing/ambiguous target, mixed permission/rollback family, and unsupported
  manifest record.
- Cross-industry prompt/provider fixtures cover build a whole site, redesign
  everything, site-kit/package/install/reset, multi-page+menu+form+theme graphs,
  and whole installed-site refinement; every result has exact `actions: []`.
- Inject `site-kit.recommend/install/validate` at provider draft, operation
  mapping, manifest, proposal, and final action projection; Agent rejects/omits
  all without hiding them merely in UI.
- Compile/runtime tests prove `AgentResourceProposalAdapterV1` cannot accept a
  TASK-547 aggregate package adapter and per-resource adapters cannot emit
  package/site-kit actions.
- Handoff schema tests mutate every key/ref/count/state, inject provider/actions/
  permissions/package/body/URL/private evidence, and require rejection.
- Route tests cover auth, `assistant:use`, `designer:write`, CSRF, rate, strict
  body/path, cross-owner/session/message, stale revision, idempotent replay,
  same-key/different-binding conflict, concurrent same-message/different-key
  uniqueness, unavailable Designer, and zero workspace/canonical-installation
  mutation.
- PostgreSQL-clock tests cover 29:59/30:00, hard no-refresh reads/replays,
  consume-versus-expire concurrency, exactly-once workspace creation, immediate
  sensitive-reference erasure on consume/revoke/expiry, 30-day hash-only
  tombstone retention, and bounded indexed pruning with stable pages and no
  per-row write loop.
- UI tests show one explicit Designer card/no Agent review list, disabled reason
  without permission/availability, canonical link only after safe creation, and
  no auto-navigation or browser persistence.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/agentWorkBoundary.test.ts \
  tests/vitest/assistant/agentResourceProposalRegistry.test.ts \
  tests/vitest/assistant/designerHandoffContracts.test.ts \
  tests/vitest/admin/assistantDesignerHandoffClient.test.ts \
  tests/vitest/ui/agent-designer-handoff.test.tsx
set -a && source .env && set +a
bun test tests/integration/routes/assistantDesignerHandoffs.test.ts \
  tests/integration/server/assistantDesignerHandoffPersistence.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun run scan:security:strict
git diff --check
find core/services/assistant/scope -type f -name '*.ts' -exec wc -l {} +
wc -l core/server/routes/assistantDesignerHandoffRoutes.ts \
  core/server/validation/assistantDesignerHandoffSchemas.ts \
  core/admin/services/assistantDesignerHandoffClient.ts \
  core/admin/ui/assistant/agent/AgentDesignerHandoffCard.tsx \
  tests/vitest/assistant/{agentWorkBoundary,agentResourceProposalRegistry,designerHandoffContracts}.test.ts \
  tests/vitest/admin/assistantDesignerHandoffClient.test.ts \
  tests/vitest/ui/agent-designer-handoff.test.tsx \
  tests/integration/routes/assistantDesignerHandoffs.test.ts \
  tests/integration/server/assistantDesignerHandoffPersistence.test.ts
```

## Documentation Updates Required

Hand the bounded Agent scope, per-resource versus aggregate adapter boundary,
Designer handoff, zero-site-kit invariant, route/UI, and validation receipts to
TASK-414-11-L01. This leaf edits no shared docs, task board/status, TASK-547,
Designer implementation, route mount, or changelog.
