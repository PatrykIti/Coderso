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
- new `core/services/assistant/guideAnswerEnrichment.ts` if server-side response
  projection is needed;
- `core/server/validation/assistantSchemas.ts` only if the existing strict chat
  context must be extended with stable document context;
- new `tests/integration/routes/assistant-guide-rbac.test.ts` and
  `tests/integration/routes/assistant-reindex-v2.test.ts`;
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
not an owner file for this leaf: resolve cards from TASK-548-01/02 evidence ids
in a separate enrichment/projection helper. If verified implementation evidence
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
- Answer/source records carry TASK-548-01/02 stable
  `(docId, locale, sectionId)` identity.
  Response cards resolve matching local `visualId`/`exampleId` records from the
  installed bundle only after confirming the document still contains the
  `assistant` target and round-trip exact `capabilityIds`. Card eligibility
  requires only `assistant`; `Open in Help` exists only when that same document
  also contains `embedded-help`, while the versioned official link exists only
  when it also contains `public-docs`. `Open in CMS` remains governed by the
  exact `permissionRequirement`.
- For card actions, null succeeds for an authenticated Admin even with an empty
  permission array; `allOf` requires every listed permission and `anyOf` at
  least one. Empty/partial snapshots deny only an unsatisfied non-null
  requirement, while the exact live ready snapshot `["*"]` grants full access.
  Authored requirements still forbid `*`; duplicate/mixed wildcard and other
  malformed snapshots fail closed.
- Card actions import L02's exact
  `resolvePermittedAdminAction`/`DocsAdminActionResolutionV1` exports from
  `@coderso/docs-renderer`; this leaf defines no parallel path or permission
  evaluator.
- Missing/mismatched local metadata degrades to text/source evidence and never
  invents a screenshot/example.
- Guide cannot call plan, dry-run, or execute.

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
individually and appends the server snapshot; object spread from the body is
forbidden.

Missing user identity, resolver failure, missing/malformed state, unknown
permission, duplicate permission, unknown key or mixed wildcard normalizes to
`assistant_docs_permission_snapshot_invalid` and fails closed before DB status/
query, hit ranking, source composition, provider snippets or local visual/
example enrichment. Ready `[]`, exact `allOf`/`anyOf` and sole `["*"]` retain
the TASK-548-01-L03 semantics. Every retrieval and server enrichment function
requires the snapshot explicitly; there is no optional/default overload.
Before returning an evidence ID, enrichment rechecks the exact localized
document's requirement with the same snapshot. Unauthorized documents cannot
leak title, snippet, source identity, capability, admin path, visual ID or
example ID.

This server snapshot is distinct from the browser Admin permission snapshot
used only to decide whether an already-authorized card may show `Open in CMS`.
The client snapshot can never authorize retrieval. Resolving permissions and
performing deterministic Guide retrieval do not resolve or call an AI provider,
so Guide remains provider-independent.

### Manual reindex independence

The current `reindexAssistantDocs` implementation in
`core/services/assistant/assistantService.ts` reads runtime settings and then
throws `assistant_disabled` when `settings.enabled` is false before invoking
the ingest dependency. Remove exactly that Agent-enable guard from the reindex
service path. Reindex must not check `assistant.enabled`,
`assistant.llm.enabled`, provider, model or provider availability and must
never resolve/call a provider. This does not remove the mode-specific Agent
guard from `answerAssistantQuestion`, enable Agent controls, or authorize any
Agent action.

The reindex route remains the existing internal
`POST /admin/api/assistant/reindex` (`/assistant/reindex` inside the Admin
router). Preserve, without bypasses:

- authenticated Admin session, `settings:write`, unsafe-method CSRF middleware,
  and the `assistant` rate-limit bucket;
- the strict reject-unknown `{ force?: boolean }` request body owned by
  TASK-548-01-L03;
- the packaged `DocsDistributionBundleV2` loader, schema/source-hash/reference
  validation, and no Markdown/network fallback;
- the TASK-548-01-L03 single-ingest lock/serialization, previous-active-snapshot
  rollback behavior, audit record, result shape, and exact typed
  `assistant_docs_*`/`assistant_reindex_failed` error mapping.

`reindexAssistantDocs` is a service operation behind those route controls, not
a replacement authorization boundary. This leaf maps the four inherited v2
reindex errors plus `assistant_docs_permission_snapshot_invalid` in the one
centralized switch. It must not delete `assistant_disabled`, because Agent chat
still uses it, or weaken any inherited mapping.

### Agent

- Availability is `assistant.enabled && llmAvailable`; keep
  `assistant.enabled` as the backward-compatible stored key/API field while
  exposing explicit `guideReady`, `agentEnabled`, and `agentAvailable` UI
  semantics.
- Sends provider chat with `mode: "llm-guide"` and uses existing action routes.
- Without provider/config, render a focused unavailable state and link to
  Integrations only when the user can access it.
- If the existing chat service returns a docs-only fallback, do not render it as
  an Agent answer. Offer an explicit sanitized `Ask Guide` handoff instead.
- Preserve review-before-mutation, dry-run, per-action RBAC, idempotency, audit,
  redaction, and partial/failure UI.

### Separate State and Handoff

Persist versioned, bounded, redacted Guide and Agent snapshots separately.
Migrate the current schema-v1 snapshot once:

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
  `settings:read` gate, chat resolves a canonical server permission snapshot
  and filters every docs retrieval/enrichment result before disclosure.
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
export type AssistantChatRequestInput = {
  message: string;
  mode?: AssistantMode;
  detailLevel?: DocsDetailLevel;
  guideMode?: DocsGuideMode;
  context?: AssistantChatContext;
};

export type AssistantChatServiceInput = AssistantChatRequestInput & {
  actorId: string | null;
  permissionSnapshot: AssistantDocsPermissionSnapshotV1;
};

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
    return normalizeAssistantDocsPermissionSnapshotV1({
      state: "ready",
      permissions,
    });
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

router.post(
  "/assistant/chat",
  requirePermission("settings:read"),
  async (ctx) => {
    validate(assistantChatSchema, ctx.body ?? {});
    const body = ctx.body as AssistantChatRequestInput;
    return withAssistantErrors(ctx.requestId, async () => {
      const permissionSnapshot =
        await resolveAssistantDocsRoutePermissionSnapshotV1(
          ctx,
          deps.resolvePermissions
        );
      return service.chat({
        message: body.message,
        mode: body.mode,
        detailLevel: body.detailLevel,
        guideMode: body.guideMode,
        context: body.context,
        actorId: ctx.user?.id ?? null,
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
}

export function resolveAssistantProducts(status: AssistantStatusResponse): {
  guide: ProductReadiness;
  agent: ProductReadiness;
} {
  return {
    guide: status.indexReady
      ? { state: "ready" }
      : { state: "unavailable", reason: "docs_not_ready" },
    agent:
      status.agentEnabled && status.llmAvailable
        ? { state: "ready" }
        : { state: "unavailable", reason: "provider_unavailable" },
  };
}

// core/services/assistant/assistantService.ts
export const reindexAssistantDocs = async (
  input: { actorId?: string | null },
  overrides?: Partial<AssistantServiceDeps>
): Promise<AssistantReindexResult> => {
  const deps = resolveDeps(overrides);
  const settings = await readRuntimeSettings(deps);

  // Intentionally no settings.enabled, LLM or provider gate. By this leaf's
  // dependency order, this inherited ingest seam loads/validates the packaged
  // v2 bundle and retains the TASK-548-01-L03 single-ingest serialization.
  let ingest: AssistantDocsIngestResult;
  try {
    ingest = await deps.ingestInternalDocsToDb({
      sourceRoot: settings.docsSourceRoot,
      triggeredByUserId: input.actorId ?? null,
    });
  } catch (error) {
    throw normalizeDocsIngestError(error);
  }

  const dbStatus = await deps.getAssistantDocsDbStatus();
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
    actorId: input.actorId ?? null,
  };
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
  const hits = await deps.searchAssistantDocsDb(input.message, {
    topK: 5,
    minScore: 0.01,
    permissionSnapshot,
  });
  return { hits, permissionSnapshot, retrievalBackend: "db" };
}

export type GuideEvidenceCardRefV1 =
  | {
      kind: "visual";
      docId: string;
      locale: string;
      sectionId: string;
      visualId: string;
    }
  | {
      kind: "example";
      docId: string;
      locale: string;
      sectionId: string;
      exampleId: string;
    };

export type GuideAnswerEvidenceV1 = {
  source: DocsAnswerSource;
  cards: readonly GuideEvidenceCardRefV1[];
};

export function enrichGuideAnswerEvidence(input: {
  hits: readonly DocsSearchHit[];
  bundle: DocsDistributionBundleV2;
  permissionSnapshot: AssistantDocsPermissionSnapshotV1;
}): readonly GuideAnswerEvidenceV1[] {
  const permissionSnapshot = normalizeAssistantDocsPermissionSnapshotV1(
    input.permissionSnapshot
  );
  return input.hits.map((hit) => {
    if (
      !satisfiesAssistantDocsPermissionRequirementV1(
        hit.permissionRequirement,
        permissionSnapshot
      )
    ) {
      throw new Error("assistant_docs_permission_snapshot_invalid");
    }
    const source = projectAuthorizedGuideSource(hit);
    const cards = resolveOptionalGuideCardsFromExactLocalizedBundleOwner({
      bundle: input.bundle,
      docId: hit.docId,
      locale: hit.locale,
      sectionId: hit.sectionId,
      visualIds: hit.visualIds,
      exampleIds: hit.exampleIds,
      permissionSnapshot,
    });
    return { source, cards };
  });
}

export async function answerAssistantQuestion(
  input: AssistantChatServiceInput,
  overrides?: Partial<AssistantServiceDeps>
) {
  const deps = resolveDeps(overrides);
  const settings = await readRuntimeSettings(deps);
  const requestedMode = normalizeMode(input.mode, settings.defaultMode);
  if (requestedMode !== "docs-only" && !settings.enabled) {
    throw new Error("assistant_disabled");
  }
  const retrieval = await retrieveDocsHits(
    {
      message: input.message,
      context: input.context,
      permissionSnapshot: input.permissionSnapshot,
    },
    deps
  );
  const evidence = await enrichGuideAnswerEvidence({
    hits: retrieval.hits,
    bundle: await deps.loadPackagedDocsDistributionBundleV2(),
    permissionSnapshot: retrieval.permissionSnapshot,
  });
  return requestedMode === "docs-only"
    ? composeDeterministicGuideAnswer(evidence)
    : completeProviderAnswerOrExplicitFallback(evidence, settings);
}

type GuideCardActionContext = {
  locale: string;
  sectionId: string;
  adminActionPermissionSnapshot: DocsAdminPermissionSnapshotV1;
  officialDocs: {
    origin: string;
    basePath: string;
    version: string;
  };
};

export function resolveGuideCardActions(
  document: DocsDocumentV2,
  context: GuideCardActionContext
): GuideCardActions {
  assertDocumentHasPublicationTarget(document, "assistant");
  assertLocalizedDocumentAndSectionIdentity(document, {
    docId: document.docId,
    locale: context.locale,
    sectionId: context.sectionId,
  });
  return {
    helpHref: document.publicationTargets.includes("embedded-help")
      ? adminHelpPath({
          docId: document.docId,
          locale: document.locale,
          sectionId: context.sectionId,
        })
      : null,
    officialHref: document.publicationTargets.includes("public-docs")
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
      permissionSnapshot: context.adminActionPermissionSnapshot,
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

**Data flow:** authorized manual reindex → strict request validation → provider-
independent serialized packaged-bundle ingest → active DB snapshot; chat body
strict validation + authenticated `settings:read` → canonical server permission
resolution/normalization → explicit service-only snapshot → authorized DB
document metadata → authorized chunks/ranking → requirement-rechecked
enrichment/composition; active tab + isolated snapshot → explicit mode request;
Agent optionally invokes provider/action review only with those authorized
sources.
Guide evidence `(docId, locale, sectionId)` → installed distribution join →
safe locale-bound visual/example cards from L02 renderer/link policy.

**Error handling:** DB/index errors remain in Guide state; provider/config/quota
errors remain in Agent state. Only after the DB hit/source is permission-
authorized may a missing/mismatched local visual/example owner cause
`resolveOptionalGuideCardsFromExactLocalizedBundleOwner` to return no card while
retaining that grounded text/source; an unsatisfied requirement omits the whole
hit/evidence and fails closed, never just the card. A docs fallback in Agent
becomes an explicit handoff choice; stale snapshot/secret-like handoff is
discarded; no cross-tab state overwrite. Agent-disabled state never blocks
authorized reindex. Reindex lock conflicts, packaged-bundle validation, DB and
ingest failures retain the exact TASK-548-01-L03 typed mapping; they are not
collapsed into provider/Agent availability errors. Missing/malformed canonical
permission state returns bounded
`assistant_docs_permission_snapshot_invalid`/403 before retrieval; no fallback
permission, public document or client hint is used.

**Regression-test shape:**

- Guide launcher/tab remains visible with `assistant.enabled=false` for a user
  who satisfies existing chat RBAC;
- Guide sends docs-only and works with provider absent/failing;
- chat resolves exact canonical permissions through both the injected resolver
  and `getUserPermissions` fallback, passes the normalized ready snapshot into
  every retriever/enrichment call, and never resolves a provider for Guide;
- missing user/resolver failure plus missing/malformed/unknown-key/unknown-
  permission/duplicate/mixed-wildcard snapshots map to exact
  `assistant_docs_permission_snapshot_invalid`/403 before DB status/query;
  ready empty permits only null requirements, sole `["*"]` grants all, and
  partial/full `allOf` plus every `anyOf` branch match the pure owner helper;
- strict chat bodies reject top-level and nested `permissionSnapshot`,
  `permissions`, `roles`, `permissionRequirement` and authorization hints;
  spies prove a forged client value cannot replace the server snapshot;
- unauthorized documents never reach ranking/provider snippets and disclose no
  title, snippet, `(docId, locale, sectionId)`, capability, admin path,
  `visualId` or `exampleId`; enrichment rechecks the localized requirement;
- with `assistant.enabled=false`, an authenticated `settings:write` request to
  `POST /admin/api/assistant/reindex` with `{}`, `{ force: true }`, or
  `{ force: false }` invokes the serialized packaged-bundle ingest exactly once,
  succeeds without resolving a provider, preserves its audit/result, and makes
  Guide ready;
- the same disabled-state regression proves missing session/permission, CSRF,
  rate limit and unknown/non-boolean request fields still reject before ingest;
  lock conflict, invalid/tampered packaged bundle, DB unavailable and ingest
  failure retain their exact typed status/code mappings;
- after that successful disabled-state reindex, Guide docs-only chat works while
  Agent chat/provider/actions and Agent UI controls remain unavailable; no
  reindex response or status field implicitly enables Agent;
- Agent requires global Agent enablement plus provider and never calls actions
  from Guide;
- separate histories, errors, readiness, `New`, plan/preview/execution;
- v1 storage migration and strict v2 unknown/expiry/size/secret rejection;
- handoff accepts a current typed snapshot plus bounded member entry ID, extracts
  only exact user text, is redacted/prefilled/user-triggered, and never
  auto-sent; reject missing/duplicate/other-snapshot IDs, assistant/system text,
  every structured/provider/source/plan/execution entry, and mixed forged
  objects carrying both user text and privileged fields;
- Agent docs fallback cannot masquerade as Agent output;
- cards join stable ids, hide unsafe/missing assets, use exact
  `adminHelpPath({ docId, locale, sectionId })` for Help and the L02
  public-link helpers for official URLs; two locale rows sharing `docId` and
  `sectionId` resolve distinct Help/source/asset evidence;
- an already-authorized grounded Guide source survives an unresolved optional
  local card with `cards: []`; an unsatisfied localized requirement yields no
  hit/source/card identity at all;
- cards preserve exact `capabilityIds`; test null plus authenticated empty
  ready snapshot, missing/malformed snapshot, invalid empty non-null
  requirements, exact live `["*"]` full access, duplicate/mixed wildcard
  rejection, partial/full `allOf`, and every `anyOf` branch without alternate
  permission/capability fields; spy the exact L02 named resolver import rather
  than a local evaluator;
- assistant/multi-target evidence cards resolve, while `embedded-help`-only and
  `public-docs`-only bundle records cannot leak through a forged/mismatched ID;
- assistant-only cards have neither cross-surface link; assistant+embedded adds
  only Help, assistant+public adds only official, and all-three adds both;
- existing chat/reindex/action auth/RBAC/CSRF/rate/error mappings remain pinned;
- panel/test modularity and all touched-file line counts.

## Sub-Tasks

- [ ] Split the oversized panel and focused interaction tests.
- [ ] Add separate typed Guide/Agent state machines and storage migration.
- [ ] As the sole post-TASK-548-01-L03 orchestration writer, inject canonical
  server permissions into chat, require them in every retrieval/enrichment call,
  and map the five inherited `assistant_docs_*` errors without a client
  authorization field or permissionless fallback.
- [ ] Remove only the `settings.enabled` guard from `reindexAssistantDocs`;
  preserve the internal route security, strict body, serialized packaged ingest,
  audit/result and typed mappings, and prove reindex with Agent disabled.
- [ ] Decouple docs-only readiness from Agent enablement without enabling Agent
  chat/provider/actions.
- [ ] Add rich Guide evidence cards from local bundle ids.
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
  tests/vitest/assistant/docsAnswerComposer.test.ts \
  tests/vitest/docs/docs-renderer.test.tsx

set -a && source .env && set +a
bun test tests/unit/assistant/assistantService.test.ts
bun test tests/integration/routes/assistant-guide-rbac.test.ts \
  tests/integration/routes/assistant-reindex-v2.test.ts \
  tests/integration/routes/assistant.test.ts

bun --cwd core lint:types
bun --cwd core lint
bun run check:admin-boundary
bun --cwd core build:admin
find core/admin/ui/assistant -type f \( -name '*.ts' -o -name '*.tsx' \) \
  -exec wc -l {} +
wc -l core/services/assistant/assistantService.ts \
  core/services/assistant/docsAnswerComposer.ts \
  tests/vitest/ui/assistant-guide-tab.test.tsx \
  tests/vitest/ui/assistant-agent-tab.test.tsx \
  tests/vitest/ui/assistant-tab-handoff.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/unit/assistant/assistantService.test.ts \
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
- Rich Guide cards resolve only stable local bundle evidence and degrade safely.
- Handoff is explicit, redacted, bounded, reviewable, and never auto-sent.
- Existing assistant API security and reject-unknown behavior is not weakened.
- `AssistantPanel.tsx` and every other touched production/test file is at most
  1,000 physical lines.

## Documentation Updates Required

Hand Guide/Agent isolation, storage migration, handoff, and security behavior to
TASK-548-07; this leaf edits no shared closeout documentation.
