# TASK-548-03-L03: Independent Guide and Optional Agent Tabs
# FileName: TASK-548-03-L03-Independent-Guide-And-Optional-Agent-Tabs.md

**Parent Task:** TASK-548
**Parent Subtask:** TASK-548-03
**Priority:** High
**Category:** Assistant Runtime / Admin Chat UX / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-03-L02
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Replace the single mode-bearing floating conversation with two explicit product
tabs:

- **Guide** — deterministic DB documentation Q&A, always independent of Agent
  enablement/provider availability; and
- **Agent** — optional provider-backed planning/action workflow using the
  existing plan → dry-run → reviewed execute contracts.

This is not the mode selector removed by TASK-182. Tabs own separate sessions,
readiness, errors, and responsibilities. Guide and Agent may cooperate only
through an explicit sanitized user-reviewed handoff.

## Exclusive Ownership

This leaf is the only writer for:

- `core/admin/ui/assistant/AssistantPanel.tsx` and cohesive new panel/tab/hook
  modules under `core/admin/ui/assistant/`;
- `core/admin/ui/assistant/AssistantMessage.tsx`;
- `core/admin/ui/assistant/AssistantModeSwitch.tsx` (retire/replace its legacy
  readiness role without restoring a selector);
- `core/admin/ui/assistant/assistantConversationState.ts`;
- `core/admin/ui/assistant/assistantRuntimeStateCache.ts`;
- `core/admin/ui/contexts/AdminAssistantConfigContext.tsx`;
- `core/admin/services/assistantClient.ts`;
- `core/admin/services/assistantStatusClient.ts`;
- `core/services/assistant/assistantService.ts`;
- `core/server/routes/assistantRoutes.ts`, including the one TASK-548
  `mapAssistantError` update after TASK-548-01-L03 lands;
- new `core/services/assistant/guideAnswerProjection.ts` and server-only
  `core/services/assistant/guideVisualAssetRegistry.ts`;
- `core/server/validation/assistantSchemas.ts` only if the existing strict chat
  context must be extended with stable document context;
- new `tests/integration/routes/assistant-guide-rbac.test.ts` and
  `tests/integration/routes/assistant-reindex-v2.test.ts`;
- new `tests/unit/assistant/guideVisualAssetRegistry.test.ts`;
- related Assistant Vitest/Bun route/service tests named below.

It must not edit TASK-548-03-L01 Admin route-registry/auth-client files, L02
Help/renderer files, provider secret storage, action executors, or
task/changelog metadata.

TASK-548-01-L03 lands first and owns only the pure DB ingest/retriever,
permission-snapshot normalizer/evaluator and five typed `assistant_docs_*`
errors. This leaf is then the sole TASK-548 writer of both
`assistantRoutes.ts` and `assistantService.ts`: it wires the inherited pure
contract, maps all five errors, and owns the route/service tests. No TASK-548
leaf may reopen either orchestration file after this leaf.

`core/services/assistant/docsAnswerComposer.ts` is currently 1,202 lines and is
not an owner file for this leaf: project cards from TASK-548-01-L03's complete
localized DB evidence in a separate helper. If verified implementation evidence
shows a composer edit is unavoidable, stop, amend ownership, and first extract
cohesive intent/section/follow-up modules so every resulting file is below 1,000
lines.

## Required Modular Split

`AssistantPanel.tsx` starts at 1,359 lines. Before behavior changes, split by
cohesive responsibility, for example:

- launcher geometry/drag/resize and shell;
- shared tab chrome and focus management;
- Guide controller/composer/transcript;
- Agent controller/planning/review/execution;
- pure readiness/current-tab/handoff helpers;
- storage schemas and migrations.

Do not move arbitrary line ranges or create a generic helper dumping ground.
Keep public exports stable where tests/consumers rely on them. Every new/existing
touched production and test file must remain independently reviewable and at
most 1,000 physical lines. If the 825-line
`assistant-panel-interaction.test.tsx` would cross the limit, extract whole
Guide, Agent, or handoff suites into the new focused test files before adding
assertions.

## Runtime Contract

### Guide

- Always sends explicit `mode: "docs-only"` to existing
  `POST /assistant/chat`.
- Requires a ready DB index but ignores `assistant.enabled`,
  `assistant.llm.enabled`, provider, model, and provider failure.
- Existing startup seed remains the normal readiness path. Authorized manual
  `POST /admin/api/assistant/reindex` remains available even when Agent is
  disabled.
- Server records are TASK-548-01-L03's strict
  `AssistantDocsLocalizedEvidenceV2` with one exact active identity, localized
  chunk owner and complete metadata. DB `sourcePath`/visual `assetPath` may be
  used only inside this trusted authorization/projection step; no path-bearing
  source type or `DocsVisualV1` is assignable to the browser response.
- The persisted document requirement is reauthorized before any source, card or
  action projection. Card eligibility requires `assistant`; `Open in Help`
  additionally requires `embedded-help`, while the versioned official link
  additionally requires `public-docs`. `Open in CMS` remains governed by the
  exact `permissionRequirement`.
- For card actions, null succeeds for an authenticated Admin even with an empty
  permission array; `allOf` requires every listed permission and `anyOf` at
  least one. Empty/partial snapshots deny only an unsatisfied non-null
  requirement, while the exact live ready snapshot `["*"]` grants full access.
  Authored requirements still forbid `*`; duplicate/mixed wildcard and other
  malformed snapshots fail closed.
- Card actions import L02's exact
  `resolvePermittedAdminAction`/`DocsAdminActionResolutionV1` exports from the
  Core-only `core/admin/ui/help/docsHelpHostAdapter.ts`; the renderer owns no
  RBAC evaluation and this leaf defines no parallel path or evaluator.
- The browser receives only recursively exact `GuideAnswerEvidenceV1`: a
  path-free source identity, explicitly copied example fields and visual cards
  backed by exact L02 `DocsLocalVisualAssetV1` records. Unknown nested keys and
  `path`/`sourcePath`/`assetPath` canaries fail before serialization/render.
- The server reads L02's already-normalized immutable embedded-Help receipt
  from process memory by exact active `sourceHash`; it never opens the bundle,
  Markdown, image or filesystem per question. A visual is returned only when
  its derived output key, media type and SHA resolve in that matching receipt.
  Missing/malformed/mismatched receipt or member omits that optional visual,
  never the already authorized grounded text/source or safe example. Invalid DB
  evidence/ownership still rejects the complete evidence; no screenshot is
  invented and no unverified href is emitted.
- Guide cannot call plan, dry-run, or execute.

TASK-548-01-L03 owns the DB evidence type/normalizer. This leaf's
`guideAnswerProjection.ts` owns the exact path-free response schemas,
`normalizeGuideAnswerEvidenceV1`, `projectGuideAnswerEvidenceFromDbV2` and card/
action types. It requires one active identity, reauthorizes requirements,
verifies ordered ownership and explicitly copies only allowlisted fields.
`assistantService.ts`/`assistantClient.ts` implement the parent exact strict `AssistantStatusResponseV2`/`AssistantChatResponseV2`; no legacy path-bearing response bypass remains.

### Exact server visual-registry startup seam

Server-only `core/services/assistant/guideVisualAssetRegistry.ts` is the sole runtime owner. `initializeGuideVisualAssetRegistryV1()` performs one bounded
no-follow read from module-relative
`new URL("../../dist/client/docs-help-assets-v1.json", import.meta.url)`, calls
L02's receipt normalizer once, deep-freezes assets and builds one immutable
sourceHash→outputKey map. Invalid/unreadable input yields a privately branded
empty registry after independently settling one redacted no-throw diagnostic;
diagnostic throw/rejection never becomes Assistant startup failure.

L03-owned `assistantService.ts#getOrInitializeDefaultAssistantRuntimeV2` calls
the initializer once; L03-owned `registerAssistantRoutes` obtains that runtime
once per production registration and injects its registry into service deps.
Tests use the same initializer with a bounded in-memory loader.
`resolveGuideVisualAssetV1` brand-checks the registry and exact active
`{ sourceHash, outputKey, mediaType, sha256 }`, returning a frozen asset/null by
map lookup only—never per-question filesystem, bundle, normalizer or retry.
Source-hash rotation omits visuals until restart loads the matching receipt;
official context remains independently no-throw and text/source survives.

### Server-authoritative Guide retrieval RBAC

The authenticated chat route must resolve the current user's canonical
permissions server-side through the existing injected
`AssistantRouteDeps.resolvePermissions(ctx)` seam or, when it is absent,
`getUserPermissions(ctx.user.id)` from the RBAC owner. It constructs and
normalizes TASK-548-01-L03's exact
`AssistantDocsPermissionSnapshotV1`; it never accepts a permission snapshot,
permissions, roles, requirement, wildcard or authorization hint from the
request body/context.

The strict chat schema continues to allow only `message`, `mode`,
`detailLevel`, `guideMode` and the bounded `context.page`/`context.locale`.
Top-level or nested client attempts to send `permissionSnapshot`,
`permissions`, `roles`, `permissionRequirement` or equivalent unknown keys are
rejected before service invocation. The route copies the allowed request fields
individually. The Guide branch appends the server snapshot; the Agent branch
exposes only an isolated server-owned optional-evidence resolver. Object spread
from the body is forbidden.

After strict validation, the route resolves the requested product and branches
before any permission-snapshot, DB-index, retrieval, or evidence-projection
work. Guide must resolve a trusted snapshot and ready index. Agent provider chat
and action routes have no required Guide dependency. Agent may attach
documentation only as optional evidence that has passed this same server
authorization pipeline; snapshot/index/evidence failure is captured as
the bounded `{ state: "docsEvidenceUnavailable" }` evidence state and cannot
replace, fail, or downgrade a successful provider response.

Missing user identity, resolver failure, missing/malformed state, unknown
permission, duplicate permission, unknown key or mixed wildcard normalizes to
`assistant_docs_permission_snapshot_invalid` and fails closed before DB status/
query, hit ranking, source composition, Guide output or optional Agent docs
evidence. It does not fail Agent provider/action work. Ready `[]`, exact
`allOf`/`anyOf` and sole `["*"]` retain the TASK-548-01-L03 semantics. Every
docs retrieval and response-projection function requires the snapshot explicitly;
there is no optional/default overload. Before returning an evidence ID,
projection verifies the complete authorized hit belongs to the one active
snapshot identity and rechecks its persisted localized requirement with the
same permission snapshot.
Unauthorized documents cannot leak title, snippet, source identity, capability,
admin path, visual ID or example ID.

This server snapshot authorizes both retrieval and the server-returned card
actions. For L02's Core Help-host Admin-action resolver it is projected without
widening to the structurally equivalent ready
`DocsAdminPermissionSnapshotV1`; a denied CMS href is never returned for the
browser to rediscover. Browser permission state
may hide an already-authorized action as defense in depth but can never add an
href or authorize retrieval. Resolving permissions and performing deterministic
Guide retrieval do not resolve or call an AI provider, so Guide remains
provider-independent.

### Manual reindex independence

Replace the current settings/source-root ingest seam with TASK-548-01-L03's
exact `ingestPackagedAssistantDocsV2({ actorId, force? })` dependency. Reindex
must not read runtime settings or a source root, check Agent/LLM/provider/model
availability, parse Markdown, or resolve/call a provider. This does not remove
the Agent-only guard from `answerAssistantQuestion`, enable Agent controls, or
authorize any Agent action.

The reindex route remains the existing internal
`POST /admin/api/assistant/reindex` (`/assistant/reindex` inside the Admin
router). Preserve, without bypasses:

- authenticated Admin session, `settings:write`, unsafe-method CSRF middleware,
  and the `assistant` rate-limit bucket;
- the strict reject-unknown `{ force?: boolean }` request body owned by
  TASK-548-01-L03;
- the packaged `DocsDistributionBundleV2` loader, schema/source-hash/reference
  validation, and no Markdown/network fallback;
- complete localized evidence materialization plus atomic active-pointer,
  successful-run and durable server-cache invalidation-outbox commit;
- the TASK-548-01-L03 single-ingest lock/serialization, previous-active-snapshot
  rollback behavior, audit record, result shape, and exact typed
  `assistant_docs_*`/`assistant_reindex_failed` error mapping.

`reindexAssistantDocs` is a service operation behind those route controls, not
a replacement authorization boundary. This leaf maps the four inherited v2
reindex errors plus `assistant_docs_permission_snapshot_invalid` in the one
centralized switch. It must not delete `assistant_disabled`, because Agent chat
still uses it, or weaken any inherited mapping.

### Agent

- Implement the parent status truth table exactly: `enabled === agentEnabled`, `guideReady === indexReady`, `agentAvailable === agentEnabled && llmAvailable`; settle domains independently and normalize before caching.
- Sends provider chat with `mode: "llm-guide"` and uses existing action routes.
- Provider chat, plan, dry-run, and execute remain usable when the Guide DB, index, active evidence snapshot, or permission resolver is unavailable. Optional
  docs evidence is never an authorization fallback or a prerequisite for them.
- Without provider/config, render a focused unavailable state and link to
  Integrations only when the user can access it.
- If the existing chat service returns a docs-only fallback, do not render it as an Agent answer. Offer an explicit sanitized `Ask Guide` handoff instead.
- Preserve review-before-mutation, dry-run, per-action RBAC, idempotency, audit,
  redaction, and partial/failure UI.

### Separate State and Handoff

Persist versioned, bounded, redacted Guide and Agent snapshots separately. Migrate the current schema-v1 snapshot once:

- `assistantMode: "docs-only"` → Guide transcript;
- `assistantMode: "llm-guide"` plus plan/preview/execution → Agent transcript;
- malformed, expired, oversized, unknown-key, or secret-like values are
  discarded.

`New` clears only the current tab. A handoff button:

1. selects only the user-authored question/goal;
2. passes it through the existing assistant safety redactor and hard length
   limit;
3. shows/prefills the sanitized text in the destination composer;
4. switches only after explicit click;
5. never auto-sends or transfers response text, sources, provider metadata,
   plans, execution results, secrets, or privileged runtime context.

The handoff command accepts only the currently normalized typed
`AssistantConversationSnapshotV2`, a destination, and one bounded entry ID; it
has no free-form `userText` parameter. `entryId` matches
`^[a-z0-9][a-z0-9-]{0,63}$`, must occur exactly once in that source snapshot,
and the snapshot's `product` must differ from the destination. The selected
entry must be exactly `{ entryId, role: "user", kind: "text", text }`.
Recursive reject-unknown normalization rejects mixed entries such as user text
plus source/provider/plan fields. A missing, duplicated or other-snapshot
entry ID is forged and fails closed. Assistant/system text and every
`structured`, `provider`, `source`, `plan`, or `execution` entry are never
eligible. Only the selected user's `text` reaches redaction and clamping.

## Security Contract

- **Endpoint visibility:** no new endpoint. The mounted
  `/admin/api/assistant/status`, `/admin/api/assistant/chat`,
  `/admin/api/assistant/reindex`, and `/admin/api/assistant/actions/*` endpoints
  (`/assistant/*` inside the Admin router) remain internal.
- **Auth:** existing authenticated Admin session-cookie gate and server RBAC
  remain. This leaf adds no generic API-key authentication path.
- **RBAC:** status/chat keep `settings:read`; reindex keeps `settings:write`;
  plan keeps current `settings:read` + `content:read` and contextual
  permissions; dry-run/execute keep per-action read/write permissions. No route
  is broadened to anonymous or permissionless API access. After the
  `settings:read` gate, Guide chat resolves a canonical server permission
  snapshot; Agent does so only inside isolated optional-docs evidence work.
  Every docs retrieval/projection result is filtered before disclosure.
- **CSRF:** every existing assistant POST remains CSRF protected.
- **Rate limit:** all existing calls remain in the `assistant` bucket.
- **Validation:** chat/reindex/action schemas remain strict
  `additionalProperties: false`; any context extension is bounded,
  reject-unknown, and server-trusts only route/locale/stable ids. Permission
  state is never a request field. Add route registration and error-map coverage
  for every changed response/error branch.
- **Anti-abuse:** no public write, so nonce/HMAC/reCAPTCHA do not apply.
  Existing action idempotency and review controls remain mandatory.
- **Secrets/privacy:** separate state and handoff reuse redaction, TTL, size
  caps, exact-key validation, and no provider/session/CSRF/signed-URL storage.
  Handoff selection revalidates snapshot membership and exact user-text role/
  kind at click time; rendered DOM text or a caller-supplied replacement string
  is never trusted.

## Implementation Pseudocode

```ts
import {
  resolvePermittedAdminAction,
  type DocsAdminActionResolutionV1,
} from "../../admin/ui/help/docsHelpHostAdapter";
export type AssistantChatRequestInput = {
  message: string; mode?: AssistantMode; detailLevel?: DocsDetailLevel;
  guideMode?: DocsGuideMode;
  context?: AssistantChatContext;
};
export type AssistantChatServiceInput =
  | (Omit<AssistantChatRequestInput, "mode"> & {
      product: "guide"; mode: "docs-only"; actorId: string | null;
      permissionSnapshot: AssistantDocsPermissionSnapshotV1;
    })
  | (Omit<AssistantChatRequestInput, "mode"> & {
      product: "agent"; mode: "llm-guide"; actorId: string | null;
      resolveOptionalDocsEvidence: () => Promise<
        readonly GuideAnswerEvidenceV1[]
      >;
    });
export async function resolveAssistantDocsRoutePermissionSnapshotV1(
  ctx: RouteContext,
  resolvePermissions?: AssistantRouteDeps["resolvePermissions"]
): Promise<AssistantDocsPermissionSnapshotV1> {
  if (!ctx.user?.id) {
    throw new Error("assistant_docs_permission_snapshot_invalid");
  }
  try {
    const permissions = resolvePermissions
      ? await resolvePermissions(ctx)
      : await getUserPermissions(ctx.user.id);
    return normalizeAssistantDocsPermissionSnapshotV1({ state: "ready", permissions });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "assistant_docs_permission_snapshot_invalid"
    ) {
      throw error;
    }
    throw new Error("assistant_docs_permission_snapshot_invalid");
  }
}
// registerAssistantRoutes: exactly once per production route registration.
const runtime = deps.runtime ?? getOrInitializeDefaultAssistantRuntimeV2();
const service = { ...runtime.routeService, ...(deps.service ?? {}) };
router.post(
  "/assistant/chat",
  requirePermission("settings:read"),
  async (ctx) => {
    validate(assistantChatSchema, ctx.body ?? {});
    const body = ctx.body as AssistantChatRequestInput;
    return withAssistantErrors(ctx.requestId, async () => {
      const product = await resolveValidatedAssistantProduct(body.mode);
      const common = {
        message: body.message,
        detailLevel: body.detailLevel,
        guideMode: body.guideMode,
        context: body.context,
        actorId: ctx.user?.id ?? null,
      };
      if (product === "agent") {
        return service.chat({
          ...common,
          product,
          mode: "llm-guide",
          // Invoked best-effort only after provider completion, never by actions.
          resolveOptionalDocsEvidence: async () => {
            const permissionSnapshot =
              await resolveAssistantDocsRoutePermissionSnapshotV1(
                ctx,
                deps.resolvePermissions
              );
            return retrieveAndProjectAuthorizedDocsFromDbV2({
              message: body.message,
              context: body.context,
              permissionSnapshot,
            });
          },
        });
      }
      const permissionSnapshot =
        await resolveAssistantDocsRoutePermissionSnapshotV1(
          ctx,
          deps.resolvePermissions
        );
      return service.chat({
        ...common,
        product,
        mode: "docs-only",
        permissionSnapshot,
      });
    });
  }
);
// Existing centralized route mapper; TASK-548-01-L03 owns the domain codes.
switch (error.message) {
  case "assistant_docs_permission_snapshot_invalid":
    return {
      code: "assistant_docs_permission_snapshot_invalid",
      message: "Assistant documentation access is unavailable",
      status: 403,
    };
  case "assistant_docs_bundle_invalid":
    return { code: error.message, message: "Assistant docs bundle is invalid", status: 500 };
  case "assistant_docs_reindex_conflict":
    return { code: error.message, message: "Assistant reindex is already running", status: 409 };
  case "assistant_docs_db_unavailable":
    return { code: error.message, message: "Assistant docs database is unavailable", status: 503 };
  case "assistant_docs_ingest_failed":
    return { code: error.message, message: "Assistant docs ingest failed", status: 500 };
  case "assistant_agent_guide_handoff_required": return { code: error.message, message: "Agent answer unavailable; ask Guide explicitly", status: 503 };
}
export function resolveAssistantProducts(status: AssistantStatusResponseV2): {
  guide: ProductReadiness;
  agent: ProductReadiness;
} {
  const exact = normalizeAssistantStatusResponseV2(status);
  return {
    guide: exact.guideReady
      ? { state: "ready" }
      : { state: "unavailable", reason: exact.guideUnavailableReason },
    agent: exact.agentAvailable
      ? { state: "ready" }
      : { state: "unavailable", reason: exact.agentUnavailableReason },
  };
}
export async function getAssistantStatus(): Promise<AssistantStatusResponseV2> {
  const [docs, agent] = await Promise.allSettled([readGuideDbStatus(), readAgentStatusAndProvider()]);
  return normalizeAssistantStatusResponseV2(projectIndependentStatusV2({ docs, agent }));
}
// core/services/assistant/assistantService.ts
export const reindexAssistantDocs = async (
  input: { actorId?: string | null; force?: boolean },
  overrides?: Partial<AssistantServiceDeps>
): Promise<AssistantReindexResult> => {
  const deps = resolveDeps(overrides);
  let ingest: AssistantDocsIngestResult;
  try {
    ingest = await deps.ingestPackagedAssistantDocsV2({
      actorId: input.actorId ?? null,
      force: input.force,
    });
  } catch (error) {
    throw normalizeDocsIngestError(error);
  }
  const dbStatus = await deps.getAssistantDocsDbStatus();
  assertSameAssistantDocsSnapshotIdentityV2(
    dbStatus.activeSnapshot,
    ingest.snapshot
  );
  await logAssistantReindexAuditBestEffort({
    deps,
    actorId: input.actorId ?? null,
    ingest,
    dbStatus,
  });
  return {
    retrievalBackend: "db",
    builtAt: ingest.finishedAt,
    buildDurationMs: ingest.buildDurationMs,
    docCount: dbStatus.docCount,
    chunkCount: dbStatus.chunkCount,
    totalTokens: ingest.totalTokens,
    snapshotId: ingest.snapshot.snapshotId,
    generation: ingest.snapshot.generation,
    sourceHash: ingest.snapshot.sourceHash,
    actorId: input.actorId ?? null,
  };
};
type AssistantDocsRetrievalResult = {
  hits: readonly AssistantDocsLocalizedEvidenceV2[];
  snapshot: AssistantDocsSnapshotIdentityV2;
  permissionSnapshot: AssistantDocsPermissionSnapshotV1;
  retrievalBackend: "db";
};
async function retrieveDocsHits(
  input: {
    message: string;
    context?: AssistantChatContext;
    permissionSnapshot: AssistantDocsPermissionSnapshotV1;
  },
  deps: AssistantServiceDeps
): Promise<AssistantDocsRetrievalResult> {
  const permissionSnapshot = normalizeAssistantDocsPermissionSnapshotV1(
    input.permissionSnapshot
  );
  const dbStatus = await deps.getAssistantDocsDbStatus();
  if (!dbStatus.ready) throw new Error("assistant_index_missing");
  const result = await deps.searchAssistantDocsDb(input.message, {
    topK: 5,
    minScore: 0.01,
    permissionSnapshot,
  });
  assertEveryEvidenceMatchesSnapshotIdentityV2(
    result.records,
    result.snapshot
  );
  return {
    hits: result.records,
    snapshot: result.snapshot,
    permissionSnapshot,
    retrievalBackend: "db",
  };
}
export type GuideSourceIdentityV1 = Readonly<{
  schema: "coderso.guide-source@v1"; docId: string; locale: string;
  sectionId: string; chunkIndex: number; title: string;
  sectionHeading: string; snippet: string; capabilityIds: readonly string[];
}>;
export type GuideVisualCardV2 = Readonly<{
  kind: "visual"; docId: string; locale: string; sectionId: string; visualId: string;
  width: number; height: number; alt: string; caption: string; asset: DocsLocalVisualAssetV1;
}>;
export type GuideExampleCardV2 = Readonly<{
  kind: "example"; docId: string; locale: string; sectionId: string; exampleId: string;
  title: string; language: "json" | "typescript" | "bash" | "text";
  body: string; explanation: string;
}>;
export type GuideEvidenceCardV2 = GuideVisualCardV2 | GuideExampleCardV2;
export type GuideOfficialDocsContextV1 =
  | { state: "configured"; origin: string; basePath: string; version: string }
  | { state: "unavailable" };
export type GuideCardActionsV1 = {
  helpHref: string | null; officialHref: string | null;
  cmsAction: DocsAdminActionResolutionV1 | null;
};
export type GuideAnswerEvidenceV1 = {
  schema: "coderso.guide-answer-evidence@v1";
  source: GuideSourceIdentityV1; snapshot: AssistantDocsSnapshotIdentityV2;
  cards: readonly GuideEvidenceCardV2[]; actions: GuideCardActionsV1;
};
const guideVisualAssetRegistryBrandV1: unique symbol = Symbol();
export type GuideVisualAssetRegistryV1 = Readonly<{
  readonly [guideVisualAssetRegistryBrandV1]: true;
  bySourceHash: ReadonlyMap<string, ReadonlyMap<string, DocsLocalVisualAssetV1>>;
}>;
export function initializeGuideVisualAssetRegistryV1(
  input: { loadReceiptOnce?: () => unknown } = {}
): GuideVisualAssetRegistryV1 {
  try {
    const raw = (input.loadReceiptOnce ?? loadFixedHelpReceiptNoFollowV1)();
    const receipt = normalizeEmbeddedHelpAssetReceiptV1(raw); // exactly once
    return brandAndDeepFreezeReadonlyRegistryV1(receipt.sourceHash, receipt.assets);
  } catch (error) {
    try {
      const diagnostic = logGuideVisualRegistryUnavailableOnceRedacted(error);
      void Promise.resolve(diagnostic).catch(() => undefined);
    } catch { /* synchronous diagnostics are independently no-throw */ }
    return brandAndDeepFreezeReadonlyRegistryV1(null, []);
  }
}
export function resolveGuideVisualAssetV1(registry: GuideVisualAssetRegistryV1,
  input: GuideVisualAssetLookupV1): DocsLocalVisualAssetV1 | null {
  requireGuideVisualAssetRegistryBrandV1(registry);
  const key = normalizeExactGuideVisualAssetLookupV1(input);
  const asset = registry.bySourceHash.get(key.sourceHash)?.get(key.outputKey);
  return asset && asset.mediaType === key.mediaType && asset.sha256 === key.sha256
    ? asset : null;
}
let defaultAssistantRuntimeV2: AssistantServiceRuntimeV2 | null = null;
export function getOrInitializeDefaultAssistantRuntimeV2() {
  return defaultAssistantRuntimeV2 ??= createAssistantServiceRuntimeV2({
    ...defaultDeps, guideVisualAssetRegistry: initializeGuideVisualAssetRegistryV1(),
  });
}
export function normalizeGuideAnswerEvidenceV1(value: unknown):
  GuideAnswerEvidenceV1;
export type GuideAnswerProjectionInputV2 = {
  snapshot: AssistantDocsSnapshotIdentityV2;
  records: readonly AssistantDocsLocalizedEvidenceV2[];
  permissionSnapshot: AssistantDocsPermissionSnapshotV1;
  officialDocs: GuideOfficialDocsContextV1;
  visualAssetRegistry: GuideVisualAssetRegistryV1;
};
export function projectGuideAnswerEvidenceFromDbV2(
  input: GuideAnswerProjectionInputV2
): readonly GuideAnswerEvidenceV1[] {
  const permissionSnapshot =
    normalizeAssistantDocsPermissionSnapshotV1(input.permissionSnapshot);
  const snapshot = normalizeAssistantDocsSnapshotIdentityV2(input.snapshot);
  const records = input.records.map(normalizeAssistantDocsLocalizedEvidenceV2);
  assertEveryEvidenceMatchesSnapshotIdentityV2(records, snapshot);
  return records.map((record) => {
    assertDocumentHasPublicationTarget(record.document, "assistant");
    if (!satisfiesAssistantDocsPermissionRequirementV1(
      record.document.permissionRequirement, permissionSnapshot
    )) {
      throw new Error("assistant_docs_permission_snapshot_invalid");
    }
    const cards: GuideEvidenceCardV2[] = [];
    for (const visual of record.visuals) {
      const outputKey = outputKeyFromVisualSha256V1(visual.sha256);
      const asset = resolveGuideVisualAssetV1(input.visualAssetRegistry, {
        sourceHash: snapshot.sourceHash, outputKey,
        mediaType: visual.mediaType, sha256: visual.sha256,
      });
      if (asset) cards.push(projectPathFreeGuideVisualCardV2(record, visual, asset));
    }
    cards.push(...projectExplicitGuideExampleCardsV2(record));
    const actions = resolveGuideCardActions(record, {
      serverPermissionSnapshot: permissionSnapshot,
      officialDocs: input.officialDocs,
    });
    return normalizeGuideAnswerEvidenceV1({
      schema: "coderso.guide-answer-evidence@v1", snapshot,
      source: projectPathFreeGuideSourceIdentityV1(record), cards, actions,
    });
  });
}
export type AgentDocsEvidenceState =
  | { state: "available"; evidence: readonly GuideAnswerEvidenceV1[] }
  | { state: "docsEvidenceUnavailable" };
async function resolveAgentDocsEvidenceBestEffort(
  resolveEvidence: () => Promise<readonly GuideAnswerEvidenceV1[]>
): Promise<AgentDocsEvidenceState> {
  try {
    return { state: "available", evidence: await resolveEvidence() };
  } catch (error) {
    try {
      // Synchronous, redacted and no-throw at this isolation boundary.
      logAgentDocsEvidenceUnavailableRedacted(error);
    } catch {
      // Diagnostics can never replace or fail an already completed Agent answer.
    }
    return { state: "docsEvidenceUnavailable" };
  }
}
export async function answerAssistantQuestion(
  input: AssistantChatServiceInput,
  overrides?: Partial<AssistantServiceDeps>
) {
  const deps = resolveDeps(overrides);
  if (input.product === "agent") {
    const settings = await readRuntimeSettings(deps);
    if (!settings.enabled) {
      throw new Error("assistant_disabled");
    }
    const answer = assertProviderBackedAgentAnswer(
      await completeProviderAnswer(
        {
          message: input.message,
          mode: input.mode,
          context: input.context,
          actorId: input.actorId,
        },
        settings
      )
    );
    const docsEvidence = await resolveAgentDocsEvidenceBestEffort(
      input.resolveOptionalDocsEvidence
    );
    return normalizeAssistantChatResponseV2(projectAgentChatResponseV2({ answer, docsEvidence, sources: [] }));
  }
  const retrieval = await retrieveDocsHits(
    {
      message: input.message,
      context: input.context,
      permissionSnapshot: input.permissionSnapshot,
    },
    deps
  );
  const evidence = projectGuideAnswerEvidenceFromDbV2({
    snapshot: retrieval.snapshot,
    records: retrieval.hits,
    permissionSnapshot: retrieval.permissionSnapshot,
    officialDocs: await deps.resolveGuideOfficialDocsContextV1(),
    visualAssetRegistry: deps.guideVisualAssetRegistry,
  });
  return normalizeAssistantChatResponseV2(projectGuideChatResponseV2({ composed:
    composeDeterministicGuideAnswer(evidence), sources: evidence.map(({ source }) => source), evidence }));
}
type GuideCardActionContext = {
  serverPermissionSnapshot: AssistantDocsPermissionSnapshotV1;
  officialDocs: GuideOfficialDocsContextV1;
};
export function resolveGuideCardActions(
  inputRecord: AssistantDocsLocalizedEvidenceV2,
  context: GuideCardActionContext
): GuideCardActionsV1 {
  const record = normalizeAssistantDocsLocalizedEvidenceV2(inputRecord);
  const document = record.document;
  assertDocumentHasPublicationTarget(document, "assistant");
  const serverPermissionSnapshot =
    normalizeAssistantDocsPermissionSnapshotV1(
      context.serverPermissionSnapshot
    );
  if (
    !satisfiesAssistantDocsPermissionRequirementV1(
      document.permissionRequirement,
      serverPermissionSnapshot
    )
  ) {
    throw new Error("assistant_docs_permission_snapshot_invalid");
  }
  return {
    helpHref: document.publicationTargets.includes("embedded-help")
      ? adminHelpPath({
          docId: document.docId,
          locale: document.locale,
          sectionId: record.section.sectionId,
        })
      : null,
    officialHref:
      document.publicationTargets.includes("public-docs") &&
      context.officialDocs.state === "configured"
      ? buildDocsPublicHref({
          origin: context.officialDocs.origin,
          basePath: context.officialDocs.basePath,
          route: {
            kind: "version",
            version: context.officialDocs.version,
            locale: document.locale,
            slug: document.slug,
          },
        })
      : null,
    cmsAction: resolvePermittedAdminAction({
      adminPath: document.adminPath,
      permissionRequirement: document.permissionRequirement,
      permissionSnapshot: {
        state: "ready",
        permissions: serverPermissionSnapshot.permissions,
      },
    }),
  };
}
type AssistantConversationEntryV2 =
  | {
      entryId: string;
      role: "user" | "assistant" | "system";
      kind: "text";
      text: string;
    }
  | {
      entryId: string;
      role: "assistant" | "system";
      kind: "structured" | "provider" | "source" | "plan" | "execution";
      payloadRef: string;
    };
type AssistantConversationSnapshotV2 = {
  schema: "coderso.assistant-conversation@v2";
  product: "guide" | "agent";
  entries: readonly AssistantConversationEntryV2[];
};
export function prepareAssistantHandoff(input: {
  sourceSnapshot: AssistantConversationSnapshotV2;
  destination: "guide" | "agent";
  entryId: string;
}): PendingHandoff {
  const snapshot = normalizeAssistantConversationSnapshotV2(
    input.sourceSnapshot
  );
  const entryId = assertBoundedAssistantEntryId(input.entryId);
  if (snapshot.product === input.destination) {
    throw new Error("assistant_handoff_invalid");
  }
  const matches = snapshot.entries.filter((entry) => entry.entryId === entryId);
  if (matches.length !== 1) throw new Error("assistant_handoff_entry_invalid");
  const entry = matches[0];
  if (entry.role !== "user" || entry.kind !== "text") {
    throw new Error("assistant_handoff_entry_forbidden");
  }
  return {
    destination: input.destination,
    text: redactAndClampUserText(entry.text),
    autoSend: false,
  };
}
```

**Data flow:** startup receipt → one immutable visual registry. Reindex → strict
request → provider-independent packaged ingest → inactive evidence plan → atomic
active pointer/success/cache-outbox commit. Chat + `settings:read` → product.
Guide → server permissions → authorized DB ranking → one active identity →
reauthorization → registry lookup → deterministic path-free projection. Agent
review/actions stay independent; only after provider success may best-effort
authorized DB evidence attach. No Guide question opens a bundle, receipt,
Markdown or filesystem.

**Error handling:** DB/index errors remain in Guide state; provider/config/quota
errors remain in Agent state. Agent snapshot/DB/index/evidence failures
produce only `{ state: "docsEvidenceUnavailable" }`; they never become provider
failure, a docs answer masquerading as Agent output, or an action prerequisite.
Only after DB evidence/owner authorization may an unavailable, malformed or
stale startup registry omit that visual while retaining grounded text/source.
A mixed snapshot/sourceHash,
owner mismatch or unsatisfied requirement rejects the complete evidence.
A docs fallback in Agent
becomes an explicit handoff choice; stale snapshot/secret-like handoff is
discarded; no cross-tab state overwrite. Agent-disabled state never blocks
authorized reindex. Reindex lock conflicts, packaged-bundle validation, DB and
ingest failures retain the exact TASK-548-01-L03 typed mapping; they are not
collapsed into provider/Agent availability errors. Missing/malformed canonical
permission state returns bounded
`assistant_docs_permission_snapshot_invalid`/403 before Guide retrieval. The
isolated Agent evidence branch records only `docsEvidenceUnavailable`; neither
path uses a fallback permission, public document or client hint. Its redacted
diagnostic logger is synchronous and nested-settled; logger failure cannot escape
the evidence branch after provider completion.

**Regression-test shape:**

- Guide launcher/tab remains visible with `assistant.enabled=false` for a user
  who satisfies existing chat RBAC;
- every parent status row settles independently; strict server/client normalization
  rejects derived drift/legacy cache; DB failure leaves Agent ready and Agent failure leaves Guide ready;
- Guide sends docs-only and works with provider absent/failing;
- Agent provider chat and action routes work with DB down, index absent, active
  evidence invalid, or permission resolution failing; provider completion precedes the
  optional docs resolver and yields exact `docsEvidenceUnavailable` on failure;
  make both that resolver and its redacted diagnostic logger throw and prove the
  completed provider answer still returns with the same unavailable state;
- chat resolves exact canonical permissions through both the injected resolver
  and `getUserPermissions` fallback, passes the normalized ready snapshot into
  every retriever/projection call, and never resolves a provider for Guide;
- missing user/resolver failure plus missing/malformed/unknown-key/unknown-
  permission/duplicate/mixed-wildcard snapshots map to exact
  `assistant_docs_permission_snapshot_invalid`/403 before DB status/query;
  ready empty permits only null requirements, sole `["*"]` grants all, and
  partial/full `allOf` plus every `anyOf` branch match the pure owner helper;
- strict chat bodies reject top-level and nested `permissionSnapshot`,
  `permissions`, `roles`, `permissionRequirement` and authorization hints;
  spies prove a forged client value cannot replace the server snapshot;
- unauthorized documents never reach Guide ranking or Agent optional evidence
  and disclose no
  title, snippet, `(docId, locale, sectionId)`, capability, admin path,
  `visualId` or `exampleId`; projection rechecks the localized requirement;
- with `assistant.enabled=false`, an authenticated `settings:write` request to
  `POST /admin/api/assistant/reindex` with `{}`, `{ force: true }`, or
  `{ force: false }` invokes the serialized packaged-bundle ingest exactly once,
  succeeds with zero runtime-settings/source-root/Markdown/provider resolver
  calls, preserves its audit/result, and makes Guide ready;
- the same disabled-state regression proves missing session/permission, CSRF,
  rate limit and unknown/non-boolean request fields still reject before ingest;
  lock conflict, invalid/tampered packaged bundle, DB unavailable and ingest
  failure retain their exact typed status/code mappings;
- after that successful disabled-state reindex, Guide docs-only chat works while
  Agent chat/provider/actions and Agent UI controls remain unavailable; no
  reindex response or status field implicitly enables Agent;
- Agent requires global Agent enablement plus provider, never calls actions from
  Guide, and never requires docs evidence for chat/plan/dry-run/execute;
- separate histories, errors, readiness, `New`, plan/preview/execution;
- v1 storage migration and strict v2 unknown/expiry/size/secret rejection;
- handoff accepts a current typed snapshot plus bounded member entry ID, extracts
  only exact user text, is redacted/prefilled/user-triggered, and never
  auto-sent; reject missing/duplicate/other-snapshot IDs, assistant/system text,
  every structured/provider/source/plan/execution entry, and mixed forged
  objects carrying both user text and privileged fields;
- Agent docs fallback cannot masquerade as Agent output;
- cards use exact Help/public links; localized twins stay distinct. The complete
  route/client normalizer rejects unknowns, legacy `DocsAnswerSource`, all path/
  line canaries; Agent sources are `[]`, Guide sources path-free identities;
- fixed receipt vectors prove only an exact active `sourceHash` plus matching
  outputKey/media/SHA yields `DocsLocalVisualAssetV1`; missing, malformed,
  tampered, stale or nonmember startup receipts emit no visual/path/href. Spies
  prove one load/normalization and zero per question; simultaneous loader and
  logger throw, plus rejected diagnostics, still return a branded frozen empty
  registry. Rotation omits visuals until restart; grounded evidence survives;
- cards preserve exact `capabilityIds`; test null plus authenticated empty
  ready snapshot, missing/malformed snapshot, invalid empty non-null
  requirements, exact live `["*"]` full access, duplicate/mixed wildcard
  rejection, partial/full `allOf`, and every `anyOf` branch without alternate
  permission/capability fields; spy the exact named import from
  `core/admin/ui/help/docsHelpHostAdapter.ts`, never the renderer or a local
  evaluator;
- exact-record tests mutate snapshot ID, generation, `sourceHash`, target,
  ordered `capabilityIds`, `permissionRequirement`, visual/example ownership and
  ordering; every mismatch rejects the entire source/card/action, and the
  persisted requirement is reauthorized. Reject unknown keys, mixed snapshots,
  cross-owner, unlisted or fabricated records; zero hits still return and
  preserve the exact active snapshot identity without a bundle lookup;
- assistant/multi-target evidence cards resolve, while `embedded-help`-only and
  `public-docs`-only persisted records cannot leak through a forged ID;
- Guide and optional Agent evidence spies prove zero calls to
  `loadPackagedDocsDistributionBundleV2`, any publication-projection
  constructor, Markdown/parser or filesystem API per question. A reindex race
  returns only one complete old/new `{ snapshotId, generation, sourceHash }`,
  and delayed durable server-outbox invalidation cannot alias an old result to
  the new key; assert zero browser/admin `cacheBus` delivery or import;
- assistant-only cards have neither cross-surface link; assistant+embedded adds
  only Help, assistant+public adds only official, and all-three adds both; an
  unavailable official context removes only that action, null `adminPath`
  returns `cmsAction: null`, and an unsatisfied requirement rejects the complete
  evidence before any CMS href can be serialized;
- existing chat/reindex/action auth/RBAC/CSRF/rate/error mappings remain pinned;
- panel/test modularity and all touched-file line counts.

## Sub-Tasks

- [ ] Split the oversized panel and focused interaction tests.
- [ ] Add separate typed Guide/Agent state machines and storage migration.
- [ ] As the sole post-TASK-548-01-L03 orchestration writer, inject canonical
  server permissions into chat, require them in every retrieval/projection call,
  and map the five inherited `assistant_docs_*` errors without a client
  authorization field or permissionless fallback.
- [ ] Replace the reindex settings/source-root seam with the exact packaged
  ingest dependency; preserve route security, strict body, serialization,
  audit/result and typed mappings, and prove reindex with Agent disabled.
- [ ] Decouple docs-only readiness from Agent enablement without enabling Agent
  chat/provider/actions.
- [ ] Add rich Guide evidence cards only from strict active DB evidence records;
  no per-question packaged loader or corpus join.
- [ ] Add exact snapshot-member user-text handoff with forged/mixed-entry
  rejection and preserve Agent review/action gates.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/ui/assistant-guide-tab.test.tsx \
  tests/vitest/ui/assistant-agent-tab.test.tsx \
  tests/vitest/ui/assistant-tab-handoff.test.tsx \
  tests/vitest/ui/assistant-panel.test.tsx \
  tests/vitest/ui/assistant-panel-conversation.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/vitest/ui/assistant-panel-lazy-load.test.tsx \
  tests/vitest/ui/assistant-conversation-state.test.ts \
  tests/vitest/assistant/docsPermissionSnapshot.test.ts \
  tests/vitest/assistant/docsAnswerComposer.test.ts \
  tests/vitest/docs/docs-renderer.test.tsx

set -a && source .env && set +a
bun test tests/unit/assistant/assistantService.test.ts \
  tests/unit/assistant/guideVisualAssetRegistry.test.ts
bun test tests/integration/routes/assistant-guide-rbac.test.ts \
  tests/integration/routes/assistant-reindex-v2.test.ts \
  tests/integration/routes/assistant.test.ts

bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun --cwd core build:admin
find core/admin/ui/assistant -type f \( -name '*.ts' -o -name '*.tsx' \) \
  -exec wc -l {} +
wc -l core/services/assistant/assistantService.ts core/services/assistant/guideVisualAssetRegistry.ts \
  core/services/assistant/docsAnswerComposer.ts \
  tests/vitest/ui/assistant-guide-tab.test.tsx \
  tests/vitest/ui/assistant-agent-tab.test.tsx \
  tests/vitest/ui/assistant-tab-handoff.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/unit/assistant/assistantService.test.ts tests/unit/assistant/guideVisualAssetRegistry.test.ts \
  tests/integration/routes/assistant-guide-rbac.test.ts \
  tests/integration/routes/assistant-reindex-v2.test.ts
git diff --check
```

Every touched human-authored source/test file must be at most 1,000 lines.
`tests/integration/routes/assistant.test.ts` is already above that threshold;
run it for legacy regression only and do not edit it. Add the complete new RBAC
and reindex route contracts only to the two focused independently runnable
files named above.

## Acceptance Criteria

- Guide and Agent are explicit tabs with independent state, not a restored mode
  selector.
- Guide remains deterministic DB-backed and usable when Agent/global AI is
  disabled or provider calls fail.
- Every Guide/Agent docs retrieval and evidence projection is filtered by the
  canonical server-resolved permission snapshot; client context cannot
  authorize or reveal protected evidence.
- Authorized manual reindex remains provider-independent and succeeds with
  `assistant.enabled=false` without weakening session/RBAC/CSRF/rate/validation,
  ingest serialization or typed errors.
- Agent remains optional, provider-backed, review-first, permission-aware,
  idempotent, audited, and isolated from Guide failure.
- Rich Guide cards use the once-built source-hash registry, perform no per-query receipt I/O/normalization, and degrade safely.
- Handoff is explicit, redacted, bounded, reviewable, and never auto-sent.
- Existing assistant API security and reject-unknown behavior is not weakened.
- `AssistantPanel.tsx` and every other touched production/test file is at most
  1,000 physical lines.

## Documentation Updates Required

Hand Guide/Agent isolation, storage migration, handoff, and security behavior to
TASK-548-07; this leaf edits no shared closeout documentation.
