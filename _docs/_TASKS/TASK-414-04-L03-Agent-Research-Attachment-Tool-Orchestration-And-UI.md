# TASK-414-04-L03: Agent Research Attachment Tool Orchestration And UI
# FileName: TASK-414-04-L03-Agent-Research-Attachment-Tool-Orchestration-And-UI.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-04
**Priority:** High
**Category:** Agent / Tools / Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-04-L01; TASK-414-04-L02; TASK-414-03 terminal; TASK-548 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Compose web research and scanned attachments into one server-owned Agent run
with a hard two-phase egress fence. Network research finishes before any
private attachment/CMS evidence enters model context; all egress tools and
transports are then removed before private synthesis. The orchestrator consumes
TASK-414-03's exact provider/model capability
profile, permission-filtered tool registry, durable session/run/message APIs,
and smallest-ceiling budget evaluator. It does not infer model support from a
name, SDK, provider family, successful past call, or UI selection.

The Admin UI appears only in Agent. It uploads into the private lifecycle,
shows scan/extraction state, explicitly enables web research, renders bounded
citations, and never stores transcript, extracted text, raw search evidence, or
private attachment bytes in `localStorage`/browser cache.

This leaf exports route and UI contribution modules for the later
TASK-414-09-L03 shared mount owner. It does not reopen TASK-548's Guide/Agent
separation or shared route/navigation files.


## Sub-Tasks

None; this is an executable leaf.
## Exact File Ownership

This leaf is the sole writer for:

- new `core/services/assistant/tools/researchAttachmentToolContracts.ts`;
- new `core/services/assistant/tools/researchAttachmentToolOrchestrator.ts`;
- new `core/services/assistant/tools/researchAttachmentCapability.ts`;
- new `core/server/validation/assistantResearchSchemas.ts`;
- new `core/server/routes/assistantResearchRoutes.ts`;
- new `core/admin/services/assistantResearchClient.ts`;
- new `core/admin/ui/assistant/agent/AgentResearchAttachmentWorkspace.tsx`;
- new `core/admin/ui/assistant/agent/AgentAttachmentTray.tsx`;
- new `core/admin/ui/assistant/agent/AgentResearchControls.tsx`;
- new `core/admin/ui/assistant/agent/AgentCitationList.tsx`;
- new `core/admin/ui/assistant/agent/useAgentResearchRun.ts`;
- new `tests/vitest/assistant/researchAttachmentCapability.test.ts`;
- new `tests/vitest/assistant/researchAttachmentToolOrchestrator.test.ts`;
- new `tests/vitest/admin/assistantResearchClient.test.ts`;
- new `tests/vitest/ui/agent-research-attachments.test.tsx`;
- new `tests/integration/routes/assistantResearchRuns.test.ts`;
- new `tests/integration/server/assistantResearchPersistence.test.ts`;
- new `tests/security/assistantResearchBudgets.test.ts`.

Forbidden: TASK-414-03 tables/migrations/capability/tool/session owners,
`modelCapabilities.ts`, L01/L02 files, AI provider adapters, `AssistantPanel.tsx`,
TASK-548 terminal files, `assistantClient.ts`, `assistantRoutes.ts`, shared route
index/Admin route registry/navigation, Media, CMS actions, shared docs/tasks/
changelog, and later leaf files. The terminal TASK-414-03 and TASK-548 exports
must be re-read immediately before implementation. If they do not expose the
promised contribution slots, stop and amend ownership; do not create a parallel
session, tool registry, or Agent shell.

The exact pure integration exports are:

```ts
export function registerAssistantResearchRoutes(
  router: Router,
  deps: AssistantResearchRouteDeps,
): void;
export const assistantResearchToolContribution: AgentToolContributionV1;
export const assistantResearchAgentUiContribution: Task414AgentUiContributionV1;
```

Both constants satisfy the exact TASK-414-02-L01 declarations
(`AgentToolContributionV1` and `Task414AgentUiContributionV1`) and import them
by name from the terminal `cmsCapabilitySourceAdapters.ts` exports; no parallel
shape is redefined.

They perform no registration at import time. The durable Agent run lifecycle
from TASK-414-03-L03 executes the tool; this leaf creates no competing worker.

## Tool And Capability Contract

```ts
export type ResearchAttachmentToolRequestBodyV1 = Readonly<{
  prompt: string;
  web: Readonly<{
    enabled: boolean;
    freshness: "day" | "week" | "month" | "year" | null;
    approvedQueries: readonly string[];
  }>;
  attachmentIds: readonly string[];
  idempotencyKey: string;
}>;

export type ResearchAttachmentToolCommandV1 =
  ResearchAttachmentToolRequestBodyV1 & Readonly<{
    sessionId: string; // path-derived by the route
    actorId: string; // authenticated server context
  }>;

export type AttachmentDeliveryV1 =
  | { mode: "native"; attachmentId: string; mime: string; bytes: number }
  | { mode: "projection"; attachmentId: string; projection: BoundedAttachmentProjectionV1 }
  | { mode: "unsupported"; attachmentId: string; code: string };

export function resolveAttachmentDeliveryV1(input: {
  attachment: ReadyAttachmentDescriptorV1;
  model: ExactModelCapabilityProfileV1;
  limits: EffectiveAgentRunLimitsV1;
}): AttachmentDeliveryV1;
```

Native delivery requires all of: `ready` state, clean scan receipt bound to the
same content hash, nonexpired owner/session binding, exact provider/model profile
freshness, explicit native-file or image modality, accepted exact MIME, provider
byte/count support, and effective run budget. Unknown/missing/stale capability,
model-name inference, prompt-only structured output, or a generic provider
“files” flag cannot authorize it.

Native bytes stream server-to-provider through the AI adapter's ephemeral
delivery seam after all checks. No public URL or browser upload handle is used.
Provider file IDs are deleted/released when supported and never persisted beyond
the bounded run cleanup. If native delivery is not exact, use L02's bounded
projection. If the projection cannot represent the requested visual/tabular
semantics, return `assistant_attachment_projection_unavailable` and ask the user
to choose a capable model; do not silently pretend the content was read.

The permission-filtered tool contribution declares:

- `web.search`: requires `assistant:research` and configured Brave;
- `web.fetch-selected`: callable only with an L01-issued purpose=`fetch`
  selected-result token;
- `web.render-selected`: optional, requires its own purpose=`render` token for
  the same selected result, one URL, and a healthy sandbox; neither grant can
  consume or authorize the other;
- `attachment.read`: requires `assistant:use`, owner/session binding, `ready`;
- no URL fetch, file upload, code execution, shell, arbitrary browser, Media
  promotion, or CMS mutation tool.

Unknown tools are rejected before permission collection. Every run uses at most
  three tool rounds/eight calls, one concurrent run per actor/two
installation-wide, 20
search results, four selected fetches, one optional rendered page, eight
attachments/64 MiB, 500,000 extracted characters, 12 citations, and the exact
TASK-414-03 token/time ceilings. All configured/provider/context/tool limits are
ceilings; use the minimum.

### Private-Evidence Egress Fence

`web.enabled=true` requires one to three exact user-reviewed
`approvedQueries`; false requires `approvedQueries: []`. The UI displays the
literal normalized strings and requires explicit confirmation before POST.
Only those strings—not the prompt, attachment text, CMS records, provider
output, or model-generated text—may reach Brave. A deterministic secret/DLP
gate rejects credential/token/private-key patterns, control characters, hidden
Unicode, URLs with user-info, and values matching a server-known secret. It
never logs the rejected value.

Execution state is exact `egress_pending -> egress_complete ->
private_synthesis -> terminal`. During `egress_pending`, the worker has no
attachment projection/native bytes or private CMS context and may use only
purpose-bound web tools for the approved queries. It durably checkpoints the
phase transition and grant revocation, then irrevocably closes/revokes research grants and
constructs a new provider call whose tool registry contains zero network/
fetch/render/search tools. Only then does it resolve/deliver private attachments
for synthesis. Hostile web content can remain untrusted evidence but cannot
trigger later egress. Another search after private evidence requires a new
user-reviewed run starting without private context; there is no transition back
to egress.

The durable egress checkpoint contains only the run/lease phase, grant IDs and
revoked state, safe provider/result/citation IDs, bounded counts, nonreversible
source/content digests, selected-result rank set, and completion timestamp. It
cannot contain or reconstruct queries beyond the already-authorized run request,
snippets, titles/URLs not admitted to the final citation projection, fetched or
rendered body/DOM, model context, cookies/headers, private evidence, or provider
raw payload. `RawResearchEvidenceV1` and the exact normalized context passed to
the synthesizing model remain process-memory-only and are zero-referenced during
`finally` cleanup; no repository/checkpoint DTO accepts their type.

Because those bytes are deliberately not durable, process loss or lease expiry
at `egress_pending`, after any external attempt, at `egress_complete`, or during
`private_synthesis` never reruns egress and never reconstructs private synthesis.
The reconciler revokes any remaining grant, deletes transient renderer/provider
handles, and settles `assistant_research_retry_required`. The user must create a
new run and review the exact query list again. This is an intentional fail-closed
non-resumable boundary, not a missing worker retry.

## Route Contract

- `POST /admin/api/assistant/agent/sessions/:sessionId/research-runs` accepts one
  strict `ResearchAttachmentToolRequestBodyV1`; the body has no `sessionId` and
  path identity is canonical. It returns 202 with safe run ID, session revision,
  state, and poll URL.
- `GET /admin/api/assistant/agent/sessions/:sessionId/research-runs/:runId` returns the
  owner-authorized strict run projection, synthesized message when terminal,
  bounded citations, attachment safe states, counts, and safe error code.
- `DELETE /admin/api/assistant/agent/sessions/:sessionId/research-runs/:runId` requests
  owner-authorized idempotent cancellation. External calls are aborted where
  possible; already committed message/action evidence is not deleted by a race.

The POST route copies fields individually after schema validation, resolves the
actor's session and current optimistic revision, resolves canonical permissions,
loads the exact fresh model profile server-side, validates all attachment IDs in
one bounded owner/session query, creates the durable run, and dispatches only
after commit. GET never extends attachment TTL. Successful orchestration appends
one synthesized assistant message and bounded citations atomically with the run
terminal state/session revision. Raw evidence is excluded by type.

## UI Contract

- Render only inside the terminal TASK-548 Agent product contribution slot;
  Guide has no research toggle, attachment picker, statuses, or citations.
- `Web research` is explicit per run, defaults off unless product UX decides a
  visible user preference, and is disabled with a clear reason when permission,
  integration, or budget is unavailable.
- When enabled, the UI requires and previews the exact approved query list,
  explains that it is sent to Brave, and never derives it from an attachment.
- File input `accept` mirrors the server tuple list only as convenience. The
  server remains authoritative. Show uploading/scanning/extracting/ready/
  rejected/expired states and safe error copy.
- Removing a chip removes it from the pending run only. Explicit Delete invokes
  the private purge route and never Media delete.
- Submission is blocked while selected attachments are not ready. A projection-
  insufficient/model-incompatible result is actionable and never auto-switches
  provider/model.
- Citation cards show bounded title/publisher/retrieved time and canonical HTTPS/
  HTTP source link with `target="_blank" rel="noopener noreferrer"`; no raw
  snippet/body/HTML is rendered.
- Browser state contains only current opaque session/run/attachment IDs and
  transient progress. Focus/reconnect reloads server state. It stores no file,
  extracted text, citation body, provider payload, private URL, or credential.
- Preserve TASK-548 Agent review/action state, keyboard/focus behavior, narrow
  viewport geometry, reduced motion, and independent Guide state.

## Security Contract

- **Visibility:** all three routes are internal Admin routes; UI is authenticated
  Agent-only. No public research/run/file endpoint is added.
- **Auth:** authenticated Admin session. Actor/installation/session, AI/Brave providers,
  model capability, and attachment ownership are server-resolved. Opaque IDs do
  not authorize access.
- **RBAC:** all routes require `assistant:use`; a request with `web.enabled=true`
  additionally requires `assistant:research` before provider resolution. Native
  CMS permissions are irrelevant here because this tool does not mutate CMS.
- **CSRF:** required on POST and DELETE. GET is side-effect free and cannot
  refresh TTL, claim a lease, or trigger provider/tool work.
- **Rate limit:** `assistant-research` charges attempts, provider/tool calls,
  fetched/rendered bytes, attachment bytes, and cancellation churn against
  actor and installation-wide concurrency and daily budgets.
- **Validation:** strict reject-unknown path/body/response schemas; path/body
  identity cannot disagree; bounded prompt/IDs/counts/enums; exact capability/
  attachment state/hash/profile checks; optimistic session/run revisions.
- **Egress privacy:** approved-query DLP and the one-way phase transition are
  enforced server-side. Private evidence and egress tools are never present in
  the same provider invocation or dependency object.
- **Anti-abuse:** no public write, so nonce/HMAC/reCAPTCHA do not apply.
  Idempotency key, leases, cancellation token, smallest-ceiling budgets, TTL,
  and bounded retries prevent replay/resource exhaustion.
- **Secrets/privacy:** no raw web/provider/parser/file evidence, credentials,
  cookies, private URLs/keys, extracted text, capability internals, or provider
  handles in browser storage/cache, route DTOs, logs, metrics, audits, errors,
  screenshots, or task evidence.

## Implementation Pseudocode

```ts
export async function startResearchAttachmentRun(
  rawBody: unknown,
  rawSessionId: unknown,
  ctx: AuthorizedAgentContext,
  deps: ResearchAttachmentOrchestratorDeps
): Promise<SafeAgentRunV1> {
  const body = normalizeResearchAttachmentToolRequestBodyV1(rawBody);
  const sessionId = normalizeOpaqueAgentSessionId(rawSessionId);
  const session = await deps.sessions.requireOwned(sessionId, ctx.actorId);
  const permissions = await deps.permissions.resolve(ctx.actorId);
  assertPermission(permissions, "assistant:use");
  if (body.web.enabled) assertPermission(permissions, "assistant:research");
  const model = await deps.capabilities.requireFreshExactProfile({
    operationId: "agent.research-attachment",
    // provider/model are resolved from current encrypted server settings;
    // no session/body model reference is accepted as truth.
  });
  const attachments = await deps.attachments.requireReadyOwnedBatch({
    actorId: ctx.actorId,
    sessionId: session.id,
    ids: body.attachmentIds,
    limit: 8,
  });
  const command = { ...body, sessionId, actorId: ctx.actorId };
  const limits = resolveSmallestEffectiveRunLimits({ model, request: command, policy: deps.policy });
  const run = await deps.runs.createAfterValidation({
    session,
    command,
    providerExecutionBinding: model.executionBinding,
    limits,
  });
  deps.dispatcher.dispatchAfterCommit(run.id);
  return projectSafeAgentRunV1(run);
}

export async function executeResearchAttachmentTool(
  claim: FencedAgentRunClaim,
  authorization: CurrentAgentRunAuthorization,
  deps: ResearchAttachmentOrchestratorDeps
): Promise<ResearchAttachmentToolResultV1> {
  requireAlreadyFencedReauthorizedAgentClaim(claim, authorization, {
    operationId: "agent.research-attachment",
    requireExactProviderExecutionBinding: true,
    requirePermissions: claim.request.web.enabled
      ? ["assistant:use", "assistant:research"]
      : ["assistant:use"],
    requireCurrentAttachmentOwnershipStateAndDigests: true,
  });
  try {
    const webEvidence = claim.request.web.enabled
      ? await runApprovedQueryEgressPhase({
          approvedQueries: claim.request.web.approvedQueries,
          freshness: claim.request.web.freshness,
          limits: authorization.limits,
          webOnlyDeps: deps.webOnly(),
        })
      : [];
    await deps.runs.checkpointEgressCompleteAndRevokeGrants(
      claim,
      projectSafeEgressCheckpointV1(webEvidence),
    );
    const privateLease = await deps.runs.enterPrivateSynthesis(
      claim,
      authorization,
    );
    const deliveries = privateLease.attachments.map((attachment) =>
      resolveAttachmentDeliveryV1({
        attachment,
        model: privateLease.model,
        limits: privateLease.limits,
      })
    );
    assertNoUnsupportedRequiredEvidence(deliveries);
    const answer = await deps.ai.synthesize({
      prompt: privateLease.request.prompt,
      webEvidence,
      attachments: deliveries,
      toolContract: NO_EGRESS_TOOLS_V1,
    });
    const durable = persistableResearchAnswerAndCitations(answer, webEvidence);
    return durable;
  } finally {
    await deps.ephemeral.cleanup(claim.runId);
  }
}
```

Only the generic fenced Agent worker from TASK-414-03-L03 claims and settles the
run. It resolves current provider binding, RBAC, ownership, and attachment input
state inside its settlement `try`, then passes the branded claim and
authorization to this handler. This leaf never calls `claim`, performs a second
provider/profile admission, or writes an independent terminal state. Its
operation-specific checkpoints stay under the same fence; the generic worker
atomically appends the returned message/citations and settles success, or maps
the thrown safe research error and settles failure. Loss of the fence between
checkpoints aborts with zero later I/O.

## Data Flow

Agent UI → literal user-approved query confirmation + strict run request →
authenticated owner/session and canonical permissions → fresh exact model
profile → bounded attachment identity/state check without content → committed
run → approved-query-only egress with zero private evidence → safe phase/digest/
count checkpoint plus grant revocation while raw evidence stays only in memory →
private attachment resolution → synthesis with
zero network tools → strict message/citation projection → atomic terminal run/
message/session revision. UI polls only safe server projections.

## Machine-Readable Errors

- `assistant_research_invalid`, `assistant_research_forbidden`,
  `assistant_research_unavailable`, `assistant_research_budget_exceeded`,
  `assistant_research_retry_required`;
- `assistant_model_capability_unknown`, `assistant_model_capability_stale`,
  `assistant_model_modality_unsupported`;
- `assistant_attachment_not_found`, `assistant_attachment_not_ready`,
  `assistant_attachment_expired`,
  `assistant_attachment_projection_unavailable`;
- L01 safe web/provider errors and L02 safe attachment errors;
- `assistant_session_not_found`, `assistant_session_conflict`,
  `assistant_tool_run_conflict`, `assistant_tool_run_cancelled`,
  `assistant_tool_run_failed`.

Route mapping is centralized in `assistantResearchRoutes.ts`; unexpected
provider/tool/storage/DB errors become one redacted 500/502/503 without details.

## Regression-Test Shape

- Capability matrix covers exact OpenAI/OpenRouter model profiles with each
  modality/MIME/byte/count combination; unknown, stale, malformed, family-name
  guess, prompt-only output, and UI capability claims always choose projection
  or fail closed, never native.
- Native delivery tests require clean hash-bound scan receipt and owner/session/
  TTL checks, stream no URL, release provider file handles, and prove provider
  failure leaves no persisted raw handle/bytes.
- Orchestrator tests exhaust tool rounds/calls/tokens/time/bytes/sources/files,
  select the smallest limit, reject unknown tools before permission collection,
  and perform no external I/O inside a transaction.
- Egress-fence tests require exact explicit query confirmation, reject
  disabled/nonempty and enabled/empty query states plus every DLP/secret-like
  fixture, and instrument dependencies/provider calls to prove attachment/CMS
  evidence is absent during egress and every network tool/transport is absent
  during private synthesis. Malicious attachment/web instructions requesting a
  Brave query, URL fetch, DNS probe, or encoded exfiltration produce zero
  network calls after `egress_complete`; retry requires a new clean run.
- Persistence tests recursively inject raw Brave results, snippets, page bodies,
  extracted text, parser metadata, provider payloads, private keys/URLs, and DOM
  into durable projections and require rejection. Only message/citations/counts/
  digests persist.
- Crash/reclaim tests interrupt before/after each egress call, immediately before
  and after `egress_complete`, and during private synthesis; every case revokes
  grants, purges transient handles, performs zero automatic re-search/provider/
  attachment/CMS I/O, settles `assistant_research_retry_required`, and requires a
  newly confirmed run. The durable checkpoint schema rejects every raw/context
  field and cannot be used to reconstruct synthesis input.
- Route tests cover auth, both RBAC permissions, CSRF, rate limit, strict body/
  path, cross-user/session/run IDs, optimistic conflict, cancellation races, and
  zero provider calls after denial.
- Worker reauthorization tests prove an attachment-only run succeeds with
  `assistant:use` and no `assistant:research`, while the same actor is denied
  before any web/provider call when the persisted claim has
  `request.web.enabled=true`; toggling a transient client value cannot alter the
  persisted permission decision.
- UI tests prove Guide has no affordances; Agent states/disabled reasons,
  explicit web toggle/query review/confirmation, scan progress, blocked submit, delete semantics,
  citations, keyboard/focus, and no localStorage/cache private data.
- Five real-flow smokes assert visible progress/evidence/error effects in light/
  dark and narrow/wide with zero console errors.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/assistant/researchAttachmentCapability.test.ts \
  tests/vitest/assistant/researchAttachmentToolOrchestrator.test.ts \
  tests/vitest/admin/assistantResearchClient.test.ts \
  tests/vitest/ui/agent-research-attachments.test.tsx
set -a && source .env && set +a && bun test \
  tests/integration/routes/assistantResearchRuns.test.ts \
  tests/integration/server/assistantResearchPersistence.test.ts \
  tests/security/assistantResearchBudgets.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun run scan:security:strict
git diff --check
find core/services/assistant/tools core/admin/ui/assistant/agent -type f \
  \( -name '*.ts' -o -name '*.tsx' \) -exec wc -l {} +
wc -l core/server/routes/assistantResearchRoutes.ts \
  core/server/validation/assistantResearchSchemas.ts \
  core/admin/services/assistantResearchClient.ts \
  tests/vitest/assistant/{researchAttachmentCapability,researchAttachmentToolOrchestrator}.test.ts \
  tests/vitest/admin/assistantResearchClient.test.ts \
  tests/vitest/ui/agent-research-attachments.test.tsx \
  tests/integration/routes/assistantResearchRuns.test.ts \
  tests/integration/server/assistantResearchPersistence.test.ts \
  tests/security/assistantResearchBudgets.test.ts
```

Hand the five-plus product scenario/action contracts to TASK-414-11-L01 after
the later integration owner mounts these contributions. L01 alone registers
and runs the shared `task-414` fast/certification adapter. This leaf does not
create a task-local wrapper/helper/worker, lifecycle/browser harness, DB cleanup,
checkpoint, or report loop.

## Documentation Updates Required

Hand exact capability/native-projection behavior, tool budgets, route/UI states,
privacy, citations, and runtime evidence to TASK-414-11-L01. This leaf edits no
shared docs, task board/status, route mount, or changelog.
