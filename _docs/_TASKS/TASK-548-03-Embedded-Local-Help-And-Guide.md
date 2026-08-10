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
whose `publicationTargets` contains `embedded-help`; Guide ingest/retrieval
eligibility is the conjunction `assistant` AND `embedded-help` (every
successful basic Guide answer carries one authorized non-null Help action;
`public-docs` is additional but never required). `public-docs` remains the portal
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
  mode-bearing snapshot today; L03 must retire both conversation-storage keys
  without hydration because Guide evidence and Agent plans/results are not safe
  browser-cache values. TASK-182 intentionally removed the chat mode selector.
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
- Guide defaults to exact `detailLevel: "basic"`: a primary answer of at most
  440 Unicode scalar values and at most two prose sentences or three ordered
  steps, plus an authorized non-null `Open in Help` deep link to the full
  localized section. The full article, not the chat bubble, owns exhaustive
  controls, examples, screenshots, and end-to-end workflow prose.
- Using TASK-548-01's separate persisted
  `DocsCapabilityCompositionCatalogV1` (the original area `capabilityIds` stay
  byte-compatible),
  an atomic-control answer may expose its containing composed workflow and a
  composed-workflow answer may expose its ordered controls. Every related
  evidence record is independently target/RBAC/locale-authorized; an
  unauthorized relation is omitted without leaking title, ID, or route.
- After existing `settings:read` authorization, the chat route resolves the
  current user's canonical permissions only through the injected server
  resolver/RBAC owner, strictly normalizes a ready snapshot, and passes it
  explicitly into the single DB retrieval/evidence projection. Client
  request/context fields can never supply or override permission state.
- Guide search context is one strict server-resolved DTO
  (`AssistantDocsGuideSearchContextV1`, owned by TASK-548-01-L03): the browser
  sends only bounded advisory `context.page`/`context.locale` hints validated
  through the transport contract schema; the service resolves the canonical
  locale, the installed `productVersion`, the canonical admin route/surface
  and its catalog-validated capability IDs server-side, normalizes the
  permission snapshot, and threads the strict DTO into DB options, exact
  locale/version filtering, deterministic capability-context reranking, and
  Help/official action projection. Authorization and version resolution are
  server-owned; browser hints can never supply permissions, versions,
  capabilities or routes.
- Guide availability is preserved through the whole legacy→V2 cutover: L03
  deploys TASK-548-01-L03's era-aware facade
  (`searchAssistantDocsAuthoritativeV2`) before activation, so Guide is served
  by the ACL-joined frozen V1 corpus (SQL authorization before projection/
  LIMIT) until activation and by the active V2 snapshot after activation;
  activation/rollback switch ONLY the DB pointer, and exactly one backend is
  queried per question (never both). That facade cutover is
  DISPATCH/DEPLOY-GATED: it may land only when the persisted cutover row is
  EXACTLY `shadow_parity_clean` (never merely at/past
  `backfill_complete`) with exactly one complete prepared snapshot, the
  pointer's closed `legacy_acl_snapshot_id` binding, and facade code
  compatible with the row's `deploymentIdentity`/`rolloutGeneration` — never
  a preexisting rollout receipt, which is recorded for that exact facade build
  AFTER deployment and proves zero V1-only serving replicas; before those
  bytes are deployed the legacy service remains
  serving Guide (including at `v1_active`/`v1_frozen`/`building`). Once the
  facade lands, its V1 ready result uses the prepared/ACL snapshot identity as
  its exact authorization/evidence snapshot; a facade binary starting without
  the binding fails readiness (`docs_not_ready`), which the canonical deploy
  order (freeze → backfill → parity → facade deployment → rollout receipt →
  consumer readiness → activation) prevents — no availability gap. The
  rollout receipt remains mandatory for `consumers_ready` and activation.
  Rollback after activation restores
  `v1_frozen` with the guards, frozen V1 rows, ACL binding and facade
  preserved; resuming mutable legacy V1 is a separate destructive/maintenance
  transition, never normal rollback.
- Guide card eligibility requires both `assistant` and `embedded-help` (ingest
  enforces the conjunction, so every returned answer has one authorized
  `Open in Help` action to its complete localized section); the official
  action additionally requires `public-docs`. Missing cross-surface targets
  render no dead link.
- Each authorized hit is one exact
  `AssistantDocsRankedLocalizedEvidenceV2` from the active
  `{ snapshotId, generation, sourceHash }` — the unranked
  `AssistantDocsLocalizedEvidenceV2` base (complete persisted chunk identity
  and localized visual/example/link/provenance metadata) wrapped with the
  query-derived `snippet`/`score`/`matchedTerms`/`rankingSignals` — while
  capability relation sections use the unranked base and never invent
  score/query terms. Guide never repairs or
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

One new Bun-free, browser-safe transport contract module
`core/services/assistant/assistantTransportContracts.ts` (single writer:
TASK-548-03-L03) owns the recursively reject-unknown server/client DTOs below
plus their strict schemas/normalizers, the bounded Guide request-context hint
schema, and the strict reindex request/response unions
(`AssistantReindexRequestV2` and `AssistantReindexResultV2` with
`prepared`/`unchanged`/`activated` wire outcomes). `assistantRoutes.ts`,
`assistantService.ts`,
`assistantSchemas.ts`, `assistantClient.ts` and `assistantStatusClient.ts`
import that module; no leaf implements or forks the unions. Status
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
The two DB rows derive EXACTLY from TASK-548-01-L03's DB-owned
`AssistantDocsDbStatusV2.guideReadiness` strict union — `{ state: "ready";
era: "v1" | "v2"; evidenceSnapshot: AssistantDocsSnapshotIdentityV2 }` or
`{ state: "not_ready"; reason: "legacy_acl_unbound" | "building" |
"active_snapshot_missing" | "cutover_not_ready" }` — with the exact truth
table: ready v1 only with the frozen/immutable V1 era (the cutover record at/
past `v1_frozen`, never `v1_active`) AND the closed/pinned
`legacy_acl_snapshot_id` ACL snapshot (that snapshot's identity is the
`evidenceSnapshot`); V1 readiness is independent of the ordinal cutover state
(`v1_frozen` through `consumers_ready` qualify identically) and a concurrent
replacement `building` snapshot never invalidates an existing binding (the
old binding is retained/pinned while the new cohort is assembled, so V1 stays
ready with no gap; only the final `building → prepared` transaction rebinds);
ready v2 only with the complete active V2
pointer/snapshot; unbound abort/destructive-resume/pre-first-backfill fail closed as
`legacy_acl_unbound`/`cutover_not_ready`, an INITIAL mid-flight backfill with
no prior binding as `building` (never a replacement backfill with a retained
binding),
and a dangling V2 pointer as `active_snapshot_missing`. The status service
derives `guideReady === indexReady === (guideReadiness.state === "ready")`
exactly from the union and NEVER guesses readiness from row counts.
The exact truth table is:

| Evidence | Required projection |
| --- | --- |
| DB ready (`guideReadiness.state === "ready"`, v1 or v2) | `guideReady=indexReady=true`, Guide reason null |
| DB valid but not ready (`guideReadiness.state === "not_ready"`, any reason) | both false, `docs_not_ready` |
| DB read rejects/malformed | both false, `docs_status_unavailable`, safe index error/count defaults |
| settings reject/malformed | both Agent booleans false, `agent_status_unavailable`, compatibility `enabled=false` |
| settings valid, `enabled=false` | `enabled=agentEnabled=agentAvailable=false`, `agent_disabled` |
| enabled, provider absent/fails | Agent enabled true, available/LLM false, `provider_unavailable` |
| enabled and provider ready | all three Agent booleans true, Agent reason null |

No DB state may alter Agent columns and no settings/provider state may alter Guide
columns. `indexBuilding` projects exactly `AssistantDocsDbStatusV2.indexBuilding`
(the DB-owned equality invariant: true iff a `buildingSnapshot` exists AND a
pending `request_kind='cutover_backfill'` run exists — the durable start
transaction commits both atomically); it never implies `indexReady`. The strict
client normalizer verifies every derived equality and rejects
unknown/reason-inconsistent data before caching; legacy cache entries without the
v2 discriminator are discarded, not guessed. This cache is status-only process
memory, clears on identity transition, and never stores evidence, permissions,
transcripts, plans or responses. The server always emits v2 while
old structural clients may continue reading the retained original fields.

The chat response is a complete product-discriminated union. It preserves the
current presentation fields but replaces path-bearing sources before route
serialization; a full `DocsAnswerSource` is never a response member.

```ts
type AssistantChatCommonV2 = Readonly<{
  schema: "coderso.assistant-chat-response@v2";
  answer: string; template: DocsAnswerTemplate; detailLevel: DocsDetailLevel;
  guideMode: DocsGuideMode; confidence: number;
  truncated: boolean; // explicit lossless transport flag: true only when the
                      // primary body was clamped (basic oracle) or the
                      // non-basic adapter's bounded result was clamped
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
normalizes unknown JSON before in-memory render. Agent provider success may
attach only separately authorized path-free `docsEvidence`; its compatibility
`sources` is the exact empty tuple. A provider branch that produces a docs-only
fallback is not serializable as Agent v2 and maps to bounded
`assistant_agent_guide_handoff_required`; UI offers an explicit Ask Guide handoff
from the already-normalized user entry. Recursive canaries reject `path`,
`docPath`, `sourcePath`, `assetPath`, line ranges and unknown fields at every
root/source/evidence/card/action depth before response or in-memory state.

The chat request-mode successor is defined exactly by TASK-548-03-L03's
transport owner: accepted request modes remain `docs-only | llm-guide |
llm-rag`; `llm-rag` is a DEPRECATED input-only alias normalized to the canonical
`llm-guide`; an omitted mode resolves through the VALIDATED persisted
`defaultMode` exactly as current behavior; responses (`mode`/`requestedMode`/
`effectiveMode`) and `AssistantStatusResponseV2.defaultMode` emit ONLY the
canonical modes `docs-only | llm-guide`; unknown modes reject. Admin tabs always
send an explicit canonical mode (`docs-only` for Guide, `llm-guide` for Agent).

The transport module also owns the strict reindex request/response unions:

```ts
type AssistantReindexRequestV2 = Readonly<{
  force?: boolean; // NO request discriminator; exact reject-unknown; `{}` valid
}>;
type AssistantReindexResultV2 =
  | Readonly<{
      schema: "coderso.assistant-reindex-result@v2";
      retrievalBackend: "db";
      outcome: "prepared";      // fence not passed: pending activation
      changed: boolean;         // true = new prepared snapshot written;
                                // false = reused; never derived from outcome
      activated: false;
      snapshotId: string; generation: number; sourceHash: string;
      activeSnapshotId: null; // frozen V1 pointer is never a V2 identity
      builtAt: string; buildDurationMs: number;
      docCount: number; chunkCount: number; totalTokens: number;
      actorId: string | null;
    }>
  | Readonly<{
      schema: "coderso.assistant-reindex-result@v2";
      retrievalBackend: "db";
      outcome: "unchanged";     // fence passed: same-hash no-op
      changed: false;
      activated: true;
      snapshotId: string; generation: number; sourceHash: string;
      // snapshot fields ARE the active snapshot identity
      builtAt: string; buildDurationMs: number;
      docCount: number; chunkCount: number; totalTokens: number;
      actorId: string | null;
    }>
  | Readonly<{
      schema: "coderso.assistant-reindex-result@v2";
      retrievalBackend: "db";
      outcome: "activated";     // fence passed: new snapshot activated
      changed: true;
      activated: true;
      snapshotId: string; generation: number; sourceHash: string;
      // snapshot fields ARE the active snapshot identity
      builtAt: string; buildDurationMs: number;
      docCount: number; chunkCount: number; totalTokens: number;
      actorId: string | null;
    }>;
export function normalizeAssistantReindexRequestV2(value: unknown):
  AssistantReindexRequestV2;
export function normalizeAssistantReindexResultV2(value: unknown):
  AssistantReindexResultV2;
```

`AssistantReindexResultV2` is a true three-member literal union: `prepared` has
`activated: false` and `changed` true/false plus the literal
`activeSnapshotId: null` (the frozen V1 pointer carries no V2 identity);
`unchanged` has `activated: true` and `changed: false`
with the active snapshot equal to the result identity; `activated` has
`activated: true` and `changed: true` with the active snapshot equal to the
result identity. The one-argument normalizer is PURE: it enforces wire/
member/cross-field invariants only and never reads the database — it checks
each member independently and never
derives one field from another (`changed` is never computed as
`outcome === "activated"`): `prepared` accepts only `activated: false` with
`changed` true or false, `unchanged` requires exactly
`changed: false, activated: true`, `activated` requires exactly
`changed: true, activated: true`; it additionally enforces member-specific
`activeSnapshotId` presence (`null` on `prepared`, absent on the post-fence
members), and rejects any mixed or contradictory
member. The committed active-pointer closure for the post-fence members is NOT a
normalizer check: it is verified through the ONE canonical
`assertAssistantDocsIngestResultClosureV2` helper over the ingest result's own
transaction-verified closure (captured under the advisory lock/commit) —
`reindexAssistantDocs` never re-asserts pointer currency after lock release,
never rereads the current active/prepared status, and no stale
`assertAssistantDocsDbStatusActiveV2` /
`assertPreparedSnapshotMatchesStatusV2` / `assertSameAssistantDocsSnapshotIdentityV2`
helper chain exists; the undefined
`assertAssistantDocsSnapshotProvenanceByIdV2` symbol is never referenced. The
status endpoint remains independent (`AssistantDocsDbStatusV2` is read only by
the status service).

The request preserves wire compatibility with the live `{ force?: boolean }`
contract (no request discriminator; `additionalProperties: false`; `{}`
valid; `force` boolean when present). The response retains its v2 schema
discriminator and the strict `prepared`/`unchanged`/`activated` union.

A pre-fence `prepared` result is a successful bounded pending-activation wire
outcome (HTTP 200, `activated: false`, the complete inactive snapshot verified
through the ONE canonical `assertAssistantDocsIngestResultClosureV2` over the
immutable ingest result — response counts/identity come from that result with
no current active/prepared status reread — and the literal
`activeSnapshotId: null` — the frozen V1 pointer is never a V2 identity); it is never reported as failure. It is reachable only at the post-backfill
preactivation states (`backfill_complete`/`shadow_parity_clean`/
`consumers_ready`, same-hash prepared reuse with `changed: false`); at
`v1_active`/`v1_frozen` manual reindex receives the bounded internal
`deferred_cutover_backfill` ingest result and maps it to the public
`assistant_docs_cutover_required`/409 operator-required conflict — it never
creates a run or snapshot, because the
cutover backfill command is the sole preactivation producer. Post-fence `unchanged`/
`activated` outcomes are verified by the same canonical
`assertAssistantDocsIngestResultClosureV2` over the result's committed
`{ era: "v2", snapshot }` closure — never a post-lock current-pointer
assertion. The internal
`assistant_docs_search_context_invalid` maps to public `ApiError` code
`validation_error`/400 with bounded details (never the sentinel code), and the
internal `assistant_docs_v2_consumer_not_ready` is retained through
preactivation and mapped to public `assistant_index_missing`/503 + the status
`docs_not_ready`, so public error codes and internal sentinels stay distinct;
the internal `deferred_cutover_backfill` startup result remains non-HTTP and
`assistant_docs_cutover_required` is never collapsed into a generic 500.

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
resolver. Neither surface copies non-target corpus records, provider
configuration, secrets, permission snapshots, transcripts, evidence, plans,
previews or execution results to `localStorage`/`sessionStorage`. L03 purges both
retired conversation keys without reading them. Guide retrieval is PostgreSQL-
authoritative for each question and creates no server cache, invalidation
outbox, scheduler, worker or `cacheBus` family; cache documentation receives no
Guide entry.

## Sub-Tasks

### Exclusive ownership

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-548-03-L01 | Extract the oversized Admin route registry plus Bun-free canonical route descriptors, own the strict pre-loss raw permission-state seam in `authClient.ts`, preserve route/RBAC parity, and add canonical Help path helpers; do not expose a Help link yet | ⏳ To Do |
| TASK-548-03-L02 | Add the Help route, safe shared renderer/search projection, Core-only path/RBAC host adapter, target-only Vite payload/receipt, and atomic footer link | ⏳ To Do |
| TASK-548-03-L03 | Split the oversized Assistant panel, own Assistant routes/service plus the one-time server visual registry, own the server-only Guide composer adapter (`guideComposerAdapter.ts` with the single callable `composeGuideNonBasicAnswerV2` mapping EVERY required `DocsChunk`/`DocsSearchHit` field byte-for-byte from complete ranked V2 evidence — stable chunk id, full `headingPath`, `heading`, `lineStart`/`lineEnd`, `content`, `normalizedText`, `tokenCount`, bounded exact `tokenCounts`, `docTitle` mapped explicitly from `record.document.title` with `docPath` as a safe internal grouping identity only (the composer's basename fallback is never reachable as user-visible text), plus the query-result `snippet`, `score`, `matchedTerms` and exact `rankingSignals` — invoking the injected unchanged composer for non-basic/helper modes, dropping path-bearing composer sources, and returning transport-safe projection inputs; pure adapter suite in `tests/vitest/assistant/guideComposerAdapter.test.ts` with sourcePath/filename-canary final-answer tests, service wiring test in the Bun `assistantService.test.ts` lane), own the Bun-free transport contract module (`assistantTransportContracts.ts` with status/chat/reindex request/response unions — the chat request-mode successor accepts `docs-only | llm-guide | llm-rag` with `llm-rag` as a deprecated input-only alias normalized to canonical `llm-guide`, omitted mode resolves the validated persisted `defaultMode`, responses emit canonical modes only and unknown modes reject — including the explicit `truncated` chat field and the three-member `AssistantReindexResultV2` literal union whose one-argument normalizer is pure — the committed active-pointer closure is verified only through the ONE canonical `assertAssistantDocsIngestResultClosureV2` after ingest, never by the normalizer or a post-lock read) and the server-side Guide search-context resolution, deploy the era-aware facade `searchAssistantDocsAuthoritativeV2` before activation through the DISPATCH/DEPLOY-GATED consumer cutover (EXACTLY `shadow_parity_clean` — never merely at/past `backfill_complete` — + one complete prepared snapshot + closed `legacy_acl_snapshot_id` binding + facade code compatible with the row's `deploymentIdentity`/`rolloutGeneration` — never a preexisting rollout receipt, which is recorded for that exact facade build AFTER deployment; before those bytes are deployed the legacy service remains serving; Guide stays available over the ACL-joined frozen V1 corpus; activation/rollback switch only the DB pointer and rollback restores `v1_frozen`), enforce docs RBAC, retire conversation browser storage, implement distinct Guide/Agent products, decouple Guide from Agent, and render safe evidence cards; the legacy HTTP docs startup producer removal is TASK-548-01-L03-owned | ⏳ To Do |

**Land order:** `TASK-548-03-L01 → TASK-548-03-L02 → TASK-548-03-L03`.
Every source/test file has one leaf writer. L02 may add a route-module file but
its pure descriptor + TSX binding pair must use L01's discovery seam without
editing the registry. L01 alone edits `core/admin/services/authClient.ts` and
`tests/vitest/admin/authClient.test.ts` so raw permission state survives before
the route context is built. L03 must not re-open L01/L02 route, auth-normalizer
or Help contracts. TASK-548-01-L03 first lands pure ingest/retriever/
permission-normalizer code and does not touch `assistantRoutes.ts` or
`assistantService.ts`; the legacy startup producer removal in
`core/server/httpServer.ts`/`docsIndexService.ts` is TASK-548-01-L03-owned (V1
freeze gate) and is not part of this child's orchestration ownership; this
child's L03 then solely edits both orchestration
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
an activation commits its matching source hash and active pointer atomically,
so PostgreSQL-authoritative Guide reads observe one complete old/new snapshot.
Provider failure affects Agent only; retired persisted transcript keys are
purged without hydration.

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
comes only from `assistant`+`embedded-help`-eligible persisted rows (never
`assistant`-only or `assistant`+`public` rows). Browser bundle scans seed
distinct non-target canaries and reject the corpus envelope, full bundle,
`sourcePath`, `assetPath`, output filesystem/repository paths or PNG bytes in
Admin chunks. Compile-time non-assignability and runtime exact-key fixtures
reject full-source documents/visuals. `public-docs`-only
records appear in neither Help nor Guide. Help-only documents omit official
links; embedded+public documents expose them. Guide tests cover the
assistant+embedded and all-three action combinations only — `assistant`-only
and `assistant`+`public` records fail ingest and can never be persisted or
retrieved.
Guide route tests inject canonical permissions server-side, reject every client
snapshot/permissions/roles forgery, fail before query on missing/malformed/
unknown/duplicate/mixed-wildcard state, and prove protected title/snippet/source/
visual/example identities never leak. Search-context tests prove the route
accepts only bounded advisory `context.page`/`context.locale` hints, resolves
locale/productVersion/route/capability context server-side, rejects
browser-supplied versions/capabilities/routes/permissions, and pins the exact
locale/version predicates plus capability-context rerank determinism.
Per-query spies reject every packaged
loader/projection/Markdown/filesystem call; old/new snapshot race tests require
one exact `{ snapshotId, generation, sourceHash }` per answer. Statement-count
fixtures count ONLY application data SQL statements issued through the
transaction handle (BEGIN/COMMIT/ROLLBACK, `SET` and protocol commands never
count) and pin the successful-path 0/2/3
  statements through the era-aware facade on BOTH branches (empty-query 0;
  plain 2; enriched-with-selected-hits 3 — an enriched zero-hit request stays
  at 2 and never issues an empty relation query; the direct V2 retriever's
  `requiredEra` mismatch is the controlled exactly-1 case: statement 1
  executes and fails closed with the internal sentinel, no evidence statement
  runs; statement 1 is the
  era-resolving candidate statement
  that returns the authoritative era/pointer/ACL inside its own result with no
  separate preflight read,
  statement 2 loads selected authorized evidence from exactly that era, and
  optional statement 3 loads authorized relations; before activation/after
  rollback statement 1 joins the ACL snapshot named by the pointer's
  `legacy_acl_snapshot_id` (that ACL snapshot's identity is the ready result's
  exact authorization/evidence snapshot), when the pointer era is `v2` it joins the active V2
  snapshot; one backend per question, never both), and zero Guide cache/outbox/event path. Reindex tests pin the strict `AssistantReindexRequestV2` (no request discriminator, `{}` valid)/three-member `AssistantReindexResultV2` literal union wire contracts (pre-fence `prepared` with `activated: false`, `changed` true/false and the literal `activeSnapshotId: null`; post-fence `unchanged` with `activated: true`/`changed: false` and `activated` with `activated: true`/`changed: true`, active snapshot equal to the result; the pure one-argument normalizer checks each member independently — never `changed === (outcome === "activated")` — while the committed active-pointer closure is verified only through the ONE canonical `assertAssistantDocsIngestResultClosureV2` after ingest), pre-fence `prepared` (HTTP 200, verified complete inactive snapshot, frozen V1 pointer, never failure; manual reindex at `v1_active`/`v1_frozen` instead receives the bounded `deferred_cutover_backfill` ingest result and maps it to the public `assistant_docs_cutover_required`/409 conflict — it never creates a run or snapshot), post-fence `unchanged`/`activated` verified by the same canonical closure helper (never a post-lock current-pointer assertion), the explicit `truncated` chat-transport flag round-trips losslessly, the timeout-owned signal only, and the internal `assistant_docs_search_context_invalid` mapped to public `validation_error`/400 with bounded details while `assistant_docs_v2_consumer_not_ready` maps to `assistant_index_missing`/503 + `docs_not_ready`. Help tests independently prove its L02
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
  tests/vitest/assistant/guideBasicAnswerContract.test.ts \
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

Do not create a TASK-548-03 server/Playwright lifecycle or six independent
smoke sessions. Hand these six visible subflows to TASK-548-07-L01, which
executes them inside the statically registered shared `task-548` adapter and
maps them onto its exact eight report IDs:

1. Help wide/light — Help search/article/TOC and bounded visual in
   wide light mode.
2. Help narrow/dark — narrow dark navigation, focus restoration and
   geometry/no-overflow proof.
3. Guide/Agent-off — grounded Guide answer/card with Agent/provider
   disabled and isolated Agent unavailable state.
4. Tabs handoff — separate histories and explicit redacted
   Guide→Agent prefill that is not auto-sent.
5. Help permissions — null, partial/full `allOf` and valid `anyOf`
   with visible/disabled `Open in CMS` DOM state.
6. Help a11y/motion — keyboard landmarks/focus/Escape restoration
   under reduced motion.

Every flow's handoff specifies computed style, geometry, DOM or `aria-*`
visible effects and the responsive light/dark matrix. The shared adapter owns
server restart/health, common helpers/workers, browser transport, zero
console/page-error observation, screenshots, checkpoints, and scoped cleanup
according to `docs/develop/runtime-smoke-cookbook.md`; this child adds no
task-local wrapper/helper/worker/Playwright/DB/report loop.

Re-run every named failure alone before classifying it. Run the canonical
NUL-safe line-count gate over every added/modified production and test file in
this child's write set (identical contract in every TASK-548 task file; a file
above 1,000 makes the gate fail with `exit 1`, including a non-newline final
line):

```bash
# Canonical NUL-safe line-count gate over the leaf write set (identical
# contract in every TASK-548 task file; a file above 1,000 makes the gate fail
# with exit 1, including a non-newline final line). The verified pre-family
# baseline is the pinned commit 963733cae23456622bea1eef1b734723aaab2350;
# commits/staging cannot narrow the measured scope.
TASK_FAMILY_BASELINE_SHA="963733cae23456622bea1eef1b734723aaab2350"
git cat-file -e "${TASK_FAMILY_BASELINE_SHA}^{commit}" || { echo "invalid/missing baseline commit ${TASK_FAMILY_BASELINE_SHA}" >&2; exit 1; }
failed=0
while IFS= read -r -d '' f; do
  lines=$(awk 'END { print NR }' "$f")
  if [ "$lines" -gt 1000 ]; then
    printf 'OVER-LIMIT %s %s\n' "$lines" "$f"
    failed=1
  fi
done < <({ git diff --name-only -z --diff-filter=ACMRT "$TASK_FAMILY_BASELINE_SHA" -- core packages scripts tests _docs/_workflows; git ls-files --others --exclude-standard -z -- core packages scripts tests _docs/_workflows; } | grep -zE '\.(ts|tsx|mjs|cjs|js|jsx|mts|cts)$' | grep -zvE '\.generated\.(ts|tsx|js|jsx|cjs|mjs|mts|cts)$' | sort -zu)
exit "$failed"
```
Intermediate commits never narrow the baseline.

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
- Conversation content is memory-only; both retired localStorage keys are
  deleted without hydration and no Guide evidence or Agent plan/result is
  browser-persisted.
- Guide remains DB-backed and usable when Agent/global AI is disabled. Agent
  remains provider-backed and review-first.
- Guide's default response is concise and links to the complete internal
  section. One atomic-control question and one composed-workflow question prove
  bidirectional related evidence without duplicated prose or cross-locale/
  permission leakage.
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
