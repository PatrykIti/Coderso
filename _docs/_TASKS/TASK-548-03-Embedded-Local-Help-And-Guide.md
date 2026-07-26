# TASK-548-03: Embedded Local Help and Guide
# FileName: TASK-548-03-Embedded-Local-Help-And-Guide.md

**Parent Task:** TASK-548
**Priority:** High
**Category:** Admin UI / Documentation / Assistant
**Estimated Effort:** Very Large
**Dependencies:** TASK-548-02
**Status:** ⏳ To Do
**Changelog:** 1261 (pinned; closure only)

---

## Overview

Ship two local documentation experiences from the compiled
`coderso.docs-corpus@v2` distribution generated at
`core/generated/docs/coderso-docs-v2.json`:

1. an authenticated `/admin/help` search and reader that works without an AI
   provider or an external documentation request; and
2. a floating conversation window with separate **Guide** and **Agent** tabs.

Guide remains deterministic and DB-backed through the existing assistant
index/routes. Agent remains optional, provider-backed, review-first, and
auditable. These are distinct products with separate histories and readiness
states; this task does not restore the mode selector removed by TASK-182.

`docs/guide` remains the single authored end-user/assistant source. Embedded
Help consumes the exact compiled distribution produced by TASK-548-01/02, while
reindex materializes every bounded localized source, visual/example, link-input
and provenance record required by Guide under one active DB snapshot identity.
Guide questions read that DB snapshot only; they never load or join the packaged
distribution. Embedded Help remains a separate build-time/local runtime
consumer of L02's private-branded projection and packaged assets. There is no
second Help corpus, per-question remote documentation call, runtime external
docs API, or assistant filesystem fallback.

The dependency graph stays acyclic: `docs-contracts -> []`,
`docs-renderer -> docs-contracts`, `core -> docs-contracts + docs-renderer`, and
`docs-portal -> docs-contracts + docs-renderer`. Within Help rendering, only the
Core host adapter imports `adminPaths`/live RBAC; Guide keeps its server gate.

Consumer targets are fail-closed: embedded Help indexes/renders only documents
whose `publicationTargets` contains `embedded-help`; Guide receives only
`assistant`-targeted rows from ingest/retrieval. `public-docs` remains the portal
owner and is never an implicit Help or Guide fallback.

The interactive site Designer/canvas and accepted-plan CMS mutation workflow
are outside TASK-548.

## Grounded Baseline

- `core/admin/app/AdminApp.tsx` is 1,237 lines and owns route matching plus the
  complete inline route list (`RouteDefinition` at lines 170-175 and the route
  array beginning near line 613).
- Canonical admin paths and aliases live in
  `core/admin/utils/adminPaths.ts:61-99`; navigation must continue through
  `AdminLink` and `prefetchAdminRoute`.
- `core/admin/ui/navigation/sidebarConfig.ts:167-170` currently points the
  footer `Docs` item at `https://coderso.dev/docs`.
- `core/admin/ui/assistant/AssistantPanel.tsx` is 1,359 lines and currently
  mixes launcher geometry, one conversation history, docs Q&A, provider
  planning, dry-run, execute, and rendering.
- `core/admin/ui/assistant/assistantConversationState.ts:22-36` persists one
  mode-bearing snapshot, while TASK-182 intentionally removed the chat mode
  selector.
- `core/services/assistant/assistantService.ts:441-459` reports one global
  `enabled` state and lines 513-711 gate all chat behind it.
- Existing assistant security is explicit in
  `core/server/routes/assistantRoutes.ts:406-448`: status/chat require
  `settings:read`, reindex requires `settings:write`, POST payloads are strict,
  and `/assistant/*` uses the `assistant` rate bucket from
  `core/server/httpServer.ts:37-40`.
- `core/services/assistant/docsAnswerComposer.ts` is 1,202 lines. This child
  does not need to edit it: visual/example cards are projected from the complete
  localized DB evidence added by TASK-548-01-L03. If implementation proves a composer
  change unavoidable, split it by cohesive responsibility below 1,000 lines
  before adding behavior.

## Product Contract

### Embedded Help

- `/admin/help` is an authenticated SPA route available to every authenticated
  Admin user. It has no additional RBAC permission because the bundled corpus
  is public-safe.
- Search, table of contents, article content, examples, and screenshots load
  from one renderer-owned, private-branded `DocsPublicationProjectionV1`
  constructed from a strict, hash-bound, target-only `embedded-help` build
  payload of `DocsPublicationDocumentV1` records. It is a distinct projection,
  never a filtered distribution bundle; full source documents are compile-time
  non-assignable and runtime rejected. A query never calls the official portal.
- Before `sourcePath` is discarded, the trusted constructor resolves parsed
  relative links into a sorted strict table keyed by exact source document,
  locale, section and raw href with only stable target identity/fragment. The
  browser resolves relative links only through that table; it never reparses a
  path, joins a slug or receives resolved repository/filesystem path bytes.
- `core/vite.config.ts` imports L03's exact side-effect-free Node+Bun packaged
  loader only at build/config time. Its narrow plugin normalizes the complete
  bundle, constructs the full-input `embedded-help` projection, verifies the
  exact PNG closure, then emits a canonical target-only projection payload and
  byte-free opaque-output-key/URL/hash receipt. The browser independently
  normalizes and brands only that emitted payload. `sourcePath`, `assetPath`,
  output filesystem paths, the full bundle, non-target documents and PNG bytes
  never enter Admin chunks; build verification may hold paths only transiently.
  Build/Docker checks normalize that receipt and resolve each asset only through
  L02's `core/admin/ui/help/helpBuildAssetVerification.ts` same-handle no-follow
  helper, which returns bounded bytes/hash and never returns/reopens a path.
- `docs-help-assets-v1.json` is recursively exact and self-authenticating:
  `receiptSha256` is lowercase SHA-256 over the RFC-8785 canonical body excluding
  the self field, framed by the v1 domain, NUL and unsigned 64-bit body length.
  Asset order is strict by output key; normalizers recompute and compare it.
- `Open in CMS` is shown only when the document's exact
  `permissionRequirement` is satisfied by the current fail-closed permission
  snapshot. Null means authenticated Admin access with no extra catalog
  permission; `allOf` requires every listed permission and `anyOf` at least one.
  The exact live ready snapshot `["*"]` grants full access consistently with
  Admin auth, while authored requirements forbid `*` and duplicate/mixed
  wildcard snapshots fail closed. Its destination is resolved through
  canonical admin path helpers.
- TASK-548-03-L02 exclusively owns the Core-only
  `core/admin/ui/help/docsHelpHostAdapter.ts`, including canonical Help links and
  `resolvePermittedAdminAction(input): DocsAdminActionResolutionV1 | null`.
  Help and Guide reuse it; renderer/portal never import Admin paths or RBAC.
- `Open official docs` is derived from the validated documentation base URL,
  installed product version, locale, and stable slug only when the selected
  embedded Help document also contains `public-docs`. A Help-only document has
  no official action. Portal failure never blocks local Help.
- The reader renders the exact closed Markdown subset through the shared v2
  parser and safe React token renderer. It never renders raw HTML, arbitrary
  iframes, scripts, event attributes, CSS, or unvalidated URLs.
- English is the complete initial corpus. Locale handling is ready for Polish
  documents when they exist, but neither Help nor this task may claim a fully
  localized Polish Admin UI.

### Guide and Agent

- Guide always sends `mode: "docs-only"` and depends on DB index readiness, not
  provider availability or `assistant.enabled`.
- After existing `settings:read` authorization, the chat route resolves the
  current user's canonical permissions only through the injected server
  resolver/RBAC owner, strictly normalizes a ready snapshot, and passes it
  explicitly into the single DB retrieval/evidence projection. Client
  request/context fields can never supply or override permission state.
- Guide card eligibility requires `assistant`; its Help action additionally
  requires `embedded-help` and its official action additionally requires
  `public-docs`. Missing cross-surface targets render no dead link.
- Each authorized hit is one exact
  `AssistantDocsLocalizedEvidenceV2` from the active
  `{ snapshotId, generation, sourceHash }`, including complete localized
  visual/example metadata and link/provenance inputs. Guide never repairs or
  enriches it from a packaged bundle. A mixed identity fails closed before any
  source/card/action projection.
- Browser Guide evidence is a recursively strict path-free DTO. It explicitly
  copies stable source identity/example fields and never embeds
  `DocsAnswerSource`, `DocsVisualV1`, `path`, `sourcePath` or `assetPath`.
  Optional visuals use only an exact L02 `DocsLocalVisualAssetV1` found in the
  immutable embedded-Help receipt for the active DB `sourceHash`; a missing,
  stale, malformed or nonmember receipt omits the visual and preserves already
  authorized grounded text/source without emitting an unverified href.
- L03's server-only `guideVisualAssetRegistry.ts` owns one module-relative,
  bounded no-follow receipt load and strict normalization during default
  Assistant runtime construction. It deep-freezes a sourceHash→outputKey index
  injected through service deps; questions perform map lookups only. Source-hash
  rotation omits visuals until restart loads the matching packaged receipt.
- `assistant.enabled` remains a backward-compatible persisted setting but
  controls Agent availability, not Guide availability.
- Agent always uses the existing provider/action routes and remains unavailable
  without an enabled provider/model. Guide errors never disable Agent and Agent
  errors never disable Guide.
- Each tab owns independent transcript, composer, readiness, error, active
  plan, preview, and execution state as applicable. `New` clears only the
  active tab.
- A handoff is user-triggered, redacted, bounded, and prefilled for review; it
  never auto-sends a prompt, plan, provider response, credential, or execution
  payload into the other tab.
- Guide cannot call action plan/dry-run/execute endpoints. Agent cannot present
  a docs-only fallback as if it were an Agent answer.

### Exact Assistant status and chat transport v2

TASK-548-03-L03 owns these recursively reject-unknown server/client DTOs. Status
is additive and retains every existing field; `enabled` remains the persisted/API
compatibility alias and must equal `agentEnabled` byte-for-byte.

```ts
type GuideUnavailableReasonV2 = "docs_not_ready" | "docs_status_unavailable";
type AgentUnavailableReasonV2 =
  | "agent_disabled" | "provider_unavailable" | "agent_status_unavailable";
type AssistantStatusResponseV2 = Readonly<{
  schema: "coderso.assistant-status@v2";
  enabled: boolean; agentEnabled: boolean; llmAvailable: boolean;
  guideReady: boolean; agentAvailable: boolean;
  guideUnavailableReason: GuideUnavailableReasonV2 | null;
  agentUnavailableReason: AgentUnavailableReasonV2 | null;
  defaultMode: "docs-only" | "llm-guide"; retrievalBackend: "db";
  indexReady: boolean; indexBuilding: boolean; indexError: string | null;
  lastReindexAt: string | null; docCount: number; chunkCount: number;
}>;
export function normalizeAssistantStatusResponseV2(value: unknown):
  AssistantStatusResponseV2;
```

The status service settles DB status and Agent settings independently. Provider
resolution runs only after valid Agent settings and is independently caught.
The exact truth table is:

| Evidence | Required projection |
| --- | --- |
| DB ready | `guideReady=indexReady=true`, Guide reason null |
| DB valid but not ready | both false, `docs_not_ready` |
| DB read rejects/malformed | both false, `docs_status_unavailable`, safe index error/count defaults |
| settings reject/malformed | both Agent booleans false, `agent_status_unavailable`, compatibility `enabled=false` |
| settings valid, `enabled=false` | `enabled=agentEnabled=agentAvailable=false`, `agent_disabled` |
| enabled, provider absent/fails | Agent enabled true, available/LLM false, `provider_unavailable` |
| enabled and provider ready | all three Agent booleans true, Agent reason null |

No DB state may alter Agent columns and no settings/provider state may alter Guide
columns. The strict client normalizer verifies every derived equality and rejects
unknown/reason-inconsistent data before caching; legacy cache entries without the
v2 discriminator are discarded, not guessed. The server always emits v2 while
old structural clients may continue reading the retained original fields.

The chat response is a complete product-discriminated union. It preserves the
current presentation fields but replaces path-bearing sources before route
serialization; a full `DocsAnswerSource` is never a response member.

```ts
type AssistantChatCommonV2 = Readonly<{
  schema: "coderso.assistant-chat-response@v2";
  answer: string; template: DocsAnswerTemplate; detailLevel: DocsDetailLevel;
  guideMode: DocsGuideMode; confidence: number;
  followUpOptions: readonly DocsFollowUpOption[]; retrievalBackend: "db";
}>;
type GuideChatResponseV2 = AssistantChatCommonV2 & Readonly<{
  product: "guide"; mode: "docs-only"; requestedMode: "docs-only";
  effectiveMode: "docs-only"; fallbackUsed: boolean; llm: null;
  sources: readonly GuideSourceIdentityV1[];
  evidence: readonly GuideAnswerEvidenceV1[];
}>;
type AgentDocsEvidenceV2 =
  | Readonly<{ state: "available"; evidence: readonly GuideAnswerEvidenceV1[] }>
  | Readonly<{ state: "docsEvidenceUnavailable" }>;
type AgentChatResponseV2 = AssistantChatCommonV2 & Readonly<{
  product: "agent"; mode: "llm-guide"; requestedMode: "llm-guide";
  effectiveMode: "llm-guide"; fallbackUsed: false;
  sources: readonly []; llm: AssistantLlmResult;
  docsEvidence: AgentDocsEvidenceV2;
}>;
type AssistantChatResponseV2 = GuideChatResponseV2 | AgentChatResponseV2;
export function normalizeAssistantChatResponseV2(value: unknown):
  AssistantChatResponseV2;
```

Server projection copies Guide sources only into `GuideSourceIdentityV1` and
normalizes the complete union immediately before return; `assistantClient.ts`
normalizes unknown JSON before cache/storage/render. Agent provider success may
attach only separately authorized path-free `docsEvidence`; its compatibility
`sources` is the exact empty tuple. A provider branch that produces a docs-only
fallback is not serializable as Agent v2 and maps to bounded
`assistant_agent_guide_handoff_required`; UI offers an explicit Ask Guide handoff
from the already-normalized user entry. Recursive canaries reject `path`,
`docPath`, `sourcePath`, `assetPath`, line ranges and unknown fields at every
root/source/evidence/card/action depth before response or persistence.

## Architecture and Data Flow

```text
DocsDistributionBundleV2
        |
        +--> one DocsPublicationProjectionV1("embedded-help")
        |       +--> one pure local search index
        |       +--> projection-only renderer/assets/links --> /admin/help
        |
        +--> one serialized reindex --> active enriched DB snapshot
                                       +--> authorized localized Guide evidence

Guide tab  --> POST /assistant/chat { mode: "docs-only" }
Agent tab  --> existing provider chat/plan -> dry-run -> reviewed execute
```

Embedded Help keeps its immutable target-only projection/search index and
build-verified link table plus byte/path-free opaque-output-key receipt in
trusted module memory, deriving one strict selected-article map before render.
Guide's server matches optional visuals against that immutable receipt by the
active DB source hash, then its browser receives only the bounded strict
path-free response—never a full DB source/visual record, corpus or path
resolver. Neither surface copies
non-target corpus records, provider configuration, secrets, or permission
snapshots to `localStorage`. Server Guide caches are keyed by exact active
snapshot identity and invalidated from the durable activation outbox; the
closure owner updates `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`.

## Sub-Tasks

### Exclusive ownership

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-548-03-L01 | Extract the oversized Admin route registry plus Bun-free canonical route descriptors, own the strict pre-loss raw permission-state seam in `authClient.ts`, preserve route/RBAC parity, and add canonical Help path helpers; do not expose a Help link yet | ⏳ To Do |
| TASK-548-03-L02 | Add the Help route, safe shared renderer/search projection, Core-only path/RBAC host adapter, target-only Vite payload/receipt, and atomic footer link | ⏳ To Do |
| TASK-548-03-L03 | Split the oversized Assistant panel, own Assistant routes/service plus the one-time server visual registry, enforce docs RBAC, implement distinct Guide/Agent products, decouple Guide from Agent, and render safe evidence cards | ⏳ To Do |

**Land order:** `TASK-548-03-L01 → TASK-548-03-L02 → TASK-548-03-L03`.
Every source/test file has one leaf writer. L02 may add a route-module file but
its pure descriptor + TSX binding pair must use L01's discovery seam without
editing the registry. L01 alone edits `core/admin/services/authClient.ts` and
`tests/vitest/admin/authClient.test.ts` so raw permission state survives before
the route context is built. L03 must not re-open L01/L02 route, auth-normalizer
or Help contracts. TASK-548-01-L03 first lands pure ingest/retriever/
permission-normalizer code and does not touch `assistantRoutes.ts` or
`assistantService.ts`; this child's L03 then solely edits both orchestration
files and their route/service tests. No later TASK-548 leaf reopens them.

## Security Contract

- **Endpoint visibility:** `/admin/help` is an internal authenticated SPA route;
  no new server/API endpoint is added. Existing `/assistant/*` endpoints remain
  internal.
- **Auth:** Help and every existing Assistant status/chat/reindex/action route
  retain the authenticated Admin session-cookie gate in the shared router.
  Server RBAC remains mandatory; this task adds no generic API-key auth path.
- **RBAC:** Help prose is available to any authenticated Admin user.
  `Open in CMS` actions are permission-filtered. `/assistant/status` and
  `/assistant/chat` retain `settings:read`; `/assistant/reindex` retains
  `settings:write`; action routes retain their per-family permissions. Chat
  additionally applies the exact server-resolved docs permission snapshot
  before query/ranking/source/card disclosure. Missing/malformed/unknown/
  duplicate/mixed-wildcard state fails closed; ready empty/null,
  `allOf`/`anyOf`, and sole `["*"]` use the shared exact semantics.
- **CSRF:** no CSRF applies to static SPA navigation. Every existing assistant
  POST, including chat, reindex, plan, dry-run, and execute, remains CSRF
  protected.
- **Rate limit:** no new Help bucket is introduced. Existing assistant calls
  remain in the `assistant` bucket.
- **Validation:** compiled bundle/schema validation is strict and
  reject-unknown. Existing assistant request schemas stay reject-unknown and
  expose no permission/snapshot/role field at any nesting level.
- **Anti-abuse:** there is no public write, so nonce, signature/HMAC, and
  reCAPTCHA are not applicable. Existing action idempotency and review gates are
  unchanged.
- **Secrets/privacy:** no provider key, cookie, session/CSRF token, permission
  snapshot, raw prompt containing secret-like material, or signed URL is stored
  in the corpus, screenshots, Help cache, transcript, debug output, or handoff.

## Implementation Pseudocode

```ts
export function resolveHelpArticleRendererState(input: {
  projection: DocsPublicationProjectionV1<"embedded-help">;
  documentKey: DocsPublicationDocumentKeyV1;
  localDocumentHrefs: readonly DocsResolvedHelpHostLinkV1[];
  officialDocs: Extract<
    DocsLinkContextV1,
    { surface: "embedded-help" }
  >["officialDocs"];
  emittedAssets: readonly DocsLocalVisualAssetV1[];
  copyExampleBody: DocsCopyExampleBodyV1;
}): HelpArticleRendererState {
  try {
    const document = resolveDocsPublicationDocumentV1(
      input.projection,
      input.documentKey
    );
    const localVisualAssets = buildVerifiedDocsLocalVisualAssetMapV1({
      projection: input.projection,
      documentKey: input.documentKey,
      emittedAssets: input.emittedAssets,
    });
    const linkContext = normalizeDocsLinkContextV1({
      surface: "embedded-help",
      publicationTarget: input.projection.publicationTarget,
      locale: document.locale,
      localDocumentHrefs: input.localDocumentHrefs,
      officialDocs: input.officialDocs,
    });
    return {
      state: "ready",
      rendererProps: {
        projection: input.projection,
        documentKey: input.documentKey,
        linkContext,
        localVisualAssets,
        copyExampleBody: input.copyExampleBody,
      } satisfies DocsRendererProps,
    };
  } catch (error) {
    if (!isDocsArticleEvidenceIntegrityError(error)) throw error;
    return {
      state: "integrity-error",
      code: "docs_help_article_integrity_invalid",
      docId: input.documentKey.docId,
      locale: input.documentKey.locale,
    };
  }
}

export type EmbeddedHelpRuntimeV1 = Readonly<{
  projection: DocsPublicationProjectionV1<"embedded-help">;
  searchIndex: DocsSearchIndexV1;
  emittedAssets: readonly DocsLocalVisualAssetV1[];
}>;

export function createEmbeddedHelpRuntimeV1(): EmbeddedHelpRuntimeV1 {
  return loadEmbeddedHelpBuildAssetsV1();
}

export function resolveEmbeddedHelp(input: {
  runtime: EmbeddedHelpRuntimeV1;
  location: HelpLocation;
  permissionSnapshot: DocsAdminPermissionSnapshotV1;
  officialDocs: Extract<
    DocsLinkContextV1,
    { surface: "embedded-help" }
  >["officialDocs"];
  copyExampleBody: DocsCopyExampleBodyV1;
}): HelpReaderView {
  const { projection, searchIndex, emittedAssets } = input.runtime;
  const localDocumentHrefs = buildDocsHelpHostLinksV1({
    projection,
  });
  const query = normalizeHelpQuery(input.location.query);
  const documentKey = resolvePublishedDocumentKeyV1(
    projection,
    input.location
  );
  const document = resolveDocsPublicationDocumentV1(
    projection,
    documentKey
  );
  const article = resolveHelpArticleRendererState({
    projection,
    documentKey,
    localDocumentHrefs,
    officialDocs: input.officialDocs,
    emittedAssets,
    copyExampleBody: input.copyExampleBody,
  });
  return {
    publicationTarget: projection.publicationTarget,
    results: searchDocs(searchIndex, {
      ...buildHelpSearchInput(input.location),
      query,
    }),
    document,
    article,
    cmsAction: resolvePermittedAdminAction({
      adminPath: document.adminPath,
      permissionRequirement: document.permissionRequirement,
      permissionSnapshot: input.permissionSnapshot,
    }),
    officialHref:
      input.officialDocs.state === "configured"
        ? resolveOptionalHelpOfficialHref({
            document,
            origin: input.officialDocs.origin,
            basePath: input.officialDocs.basePath,
            version: input.officialDocs.version,
          })
        : null,
  };
}

export async function submitConversation(
  tab: "guide" | "agent",
  prompt: string
): Promise<void> {
  if (tab === "guide") {
    return submitGuide({ prompt, mode: "docs-only" });
  }
  return submitAgentWithReview({ prompt, mode: "llm-guide" });
}
```

**Data flow:** validated installed bundle at Vite build/config time → exact
full-input `embedded-help` selection/closure and PNG verification → canonical
hash-bound safe-DTO/link-table payload plus framed byte/path-free
output-key/URL/hash receipt → one browser normalization/private-branded projection and pure in-memory search
index → exact member selection → explicit surface link context + verified
selected-article local asset map + user-event-only copy handler → all required
renderer props → local Help reader; or strict assistant request →
authenticated canonical server permission snapshot → one active-identity DB
query → already-materialized localized source/visual/example/link/provenance
evidence → requirement-rechecked safe response cards. No Help
selector/search/renderer receives an unbranded or unscoped filtered value, and
no Guide retrieval receives a client permission value or reads a bundle/
Markdown/filesystem. Neither the full bundle nor a non-`embedded-help`
document enters the Admin client graph. L02's packaged asset verification
remains exclusive to embedded Help (and portal build); Guide reads only its
already-normalized immutable receipt from memory and returns strict path-free
cards, never a per-question packaged asset/path lookup.

**Error handling:** invalid bundle, target payload, asset receipt, route, or
link fails closed before Help mounts. In embedded Help, a
missing/unlisted/orphan/cross-owner/tampered visual or example, missing asset or
hash mismatch blocks only the selected affected article before
`DocsDocumentRenderer` runs; search, navigation and other valid articles remain
usable, and a bounded integrity panel replaces that article. There is no
text-only success fallback for an invalid Help article. Guide uses a separate
server enrichment projection: only after text/source evidence is both grounded
and permission-authorized may an unresolved optional visual/example card be
omitted while the grounded text/source remains. It never invents or leaks an
unauthorized card/reference. Receipt absence/invalidity, active-source-hash
mismatch or missing output key omits only that optional visual; malformed DB
evidence still rejects the evidence. Portal/network failure leaves local Help usable;
DB index, snapshot-integrity or permission-snapshot failure affects Guide only;
an activation commits its matching source hash and durable invalidation event
atomically, so Guide observes one complete old/new snapshot. Provider failure
affects Agent only; stale/malformed persisted transcript is discarded.

**Regression-test shape:** route parity before/after extraction; no broken Help
link between leaves; any-auth Help route; locale-bearing deep links and
same-doc/same-section cross-locale isolation; local-only search; malicious
Markdown/URL rejection; permission-filtered CMS links including exact live
`["*"]` full access plus duplicate/mixed wildcard rejection; independent tab
histories/readiness;
Guide works with Agent disabled; Agent cannot silently show docs fallback;
redacted explicit handoff; no action calls from Guide; null/empty/partial/full
`allOf`/`anyOf` permission cases; capability-context ranking; file-size gates.
Help integration passes the branded projection/member key, exact Help
`DocsLinkContextV1`, verified selected-article
local asset map and explicit trusted-user-event copy handler; omission of any
prop fails. Missing/orphan/
tampered Help evidence blocks only that article, whereas authorized Guide text/
source survives an omitted unresolved optional card.
Target-leak fixtures prove the Vite-emitted Admin payload contains and Help
renders only `embedded-help` and multi-target records, while Guide evidence
comes only from `assistant`-targeted persisted rows. Browser bundle scans seed
distinct non-target canaries and reject the corpus envelope, full bundle,
`sourcePath`, `assetPath`, output filesystem/repository paths or PNG bytes in
Admin chunks. Compile-time non-assignability and runtime exact-key fixtures
reject full-source documents/visuals. `public-docs`-only
records appear in neither Help nor Guide. Help-only documents omit official
links; embedded+public documents expose them. Guide tests cover assistant-only,
assistant+embedded, assistant+public and all-three action combinations.
Guide route tests inject canonical permissions server-side, reject every client
snapshot/permissions/roles forgery, fail before query on missing/malformed/
unknown/duplicate/mixed-wildcard state, and prove protected title/snippet/source/
visual/example identities never leak. Per-query spies reject every packaged
loader/projection/Markdown/filesystem call; old/new snapshot race tests require
one exact `{ snapshotId, generation, sourceHash }` per answer and exercise
durable cache invalidation retry. Help tests independently prove its L02
build-time packaged projection/assets still work with the Guide DB unavailable.
Projection tests pin relative-link collision, traversal, locale, fragment,
target and no-path behavior. Receipt tests pin canonical vectors, tamper/order/
self-field rejection and recomputation. Guide response tests recursively inject
`path`/`sourcePath`/`assetPath` canaries and prove only exact active-source-hash
receipt members yield safe visual assets; every other receipt state preserves
grounded text while omitting the visual. Registry spies prove one startup load/
normalization, zero per-question I/O/normalization, stale-hash omission and
new-hash availability only after a simulated restart.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/admin/admin-route-registry.test.tsx \
  tests/vitest/admin/adminApp.test.tsx \
  tests/vitest/admin/adminPaths.test.ts \
  tests/vitest/ui/admin-shell-nav.test.tsx \
  tests/vitest/docs/docs-renderer.test.tsx \
  tests/vitest/docs/docs-search.test.ts \
  tests/vitest/docs/help-visual-asset-registry.test.ts \
  tests/vitest/ui-integration/docs-help-host-adapter.test.ts \
  tests/vitest/ui-integration/help-center.test.tsx \
  tests/vitest/ui/assistant-guide-tab.test.tsx \
  tests/vitest/ui/assistant-agent-tab.test.tsx \
  tests/vitest/ui/assistant-tab-handoff.test.tsx \
  tests/vitest/ui/assistant-conversation-state.test.ts \
  tests/vitest/assistant/docsPermissionSnapshot.test.ts \
  tests/vitest/assistant/docsAnswerComposer.test.ts

bun test tests/unit/documentation/helpBuildAssetVerification.test.ts \
  tests/unit/assistant/guideVisualAssetRegistry.test.ts
set -a && source .env && set +a
bun test tests/unit/assistant/assistantService.test.ts \
  tests/integration/routes/assistant-guide-rbac.test.ts \
  tests/integration/routes/assistant-reindex-v2.test.ts \
  tests/integration/routes/assistant.test.ts

bun --cwd core lint:types
bun --cwd core lint
tsc -p packages/docs-renderer/tsconfig.json --noEmit
bun run check:admin-boundary
bun run check:admin-bundle
git diff --check
```

After restarting the task-owned server and checking Admin/front health, run
these six distinct real flows with exact task-scoped `playwright-cli` sessions:

1. `-s=wf548help-wide-light` — Help search/article/TOC and bounded visual in
   wide light mode.
2. `-s=wf548help-narrow-dark` — narrow dark navigation, focus restoration and
   geometry/no-overflow proof.
3. `-s=wf548guide-agent-off` — grounded Guide answer/card with Agent/provider
   disabled and isolated Agent unavailable state.
4. `-s=wf548tabs-handoff` — separate histories and explicit redacted
   Guide→Agent prefill that is not auto-sent.
5. `-s=wf548help-permissions` — null, partial/full `allOf` and valid `anyOf`
   with visible/disabled `Open in CMS` DOM state.
6. `-s=wf548help-a11y-motion` — keyboard landmarks/focus/Escape restoration
   under reduced motion.

Every flow asserts a visible effect through computed style, geometry, DOM or
`aria-*` state, covers responsive light/dark behavior across the matrix,
collects zero console/page errors, performs scoped cleanup and saves a unique
review screenshot through the TASK-548 workflow-evidence owner.

Re-run every named failure alone before classifying it. Run a physical
line-count check across every touched human-authored production and test file;
no result may exceed 1,000.

## Acceptance Criteria

- Authenticated users can open `/admin/help`, search, navigate, read examples,
  view sanitized screenshots, and follow canonical links without a provider or
  official-site request.
- The footer changes from external Docs to local Help only in the same leaf that
  activates the working route.
- Admin route extraction preserves every existing path, alias, lazy load,
  prefetch, permission guard, settings context, SSR behavior, and 404 outcome.
- The floating panel exposes distinct Guide and Agent tabs with separate state;
  it does not restore the TASK-182 mode selector.
- Guide remains DB-backed and usable when Agent/global AI is disabled. Agent
  remains provider-backed and review-first.
- Visual/example cards are resolved by stable ids from the exact installed
  distribution and rendered without raw HTML or arbitrary URLs.
- Invalid visual/example integrity blocks only the affected Help article;
  authorized Guide text/source may survive only by omitting the unresolved
  optional enrichment card.
- No existing assistant auth, RBAC, CSRF, rate-limit, reject-unknown,
  idempotency, audit, or secret-handling invariant is weakened.
- Every touched human-authored source/test file is at most 1,000 physical lines.

## Documentation Updates Required

The TASK-548 closure owner must update `_docs/ARCHITECTURE.md`,
`_docs/CMS_API.md`, `_docs/ASSISTANT_GUIDE.md`,
`_docs/ASSISTANT_SITE_BUILDER.md`, `docs/develop/assistant.md`,
`docs/guide/README.md`, and cache docs only if persistent Help caching actually
lands. Changelog 1261 and board/status changes remain closure-only.
