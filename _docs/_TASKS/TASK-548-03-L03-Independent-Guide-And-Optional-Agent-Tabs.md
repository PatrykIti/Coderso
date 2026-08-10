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
- new Bun-free `core/services/assistant/assistantTransportContracts.ts`: the
  single pure shared transport contract module owning the Guide request-context
  hint schema (`AssistantDocsGuideRequestContextV1`), the strict reindex
  request/response unions (`AssistantReindexRequestV2` and
  `AssistantReindexResultV2` with `prepared`/`unchanged`/`activated` wire
  outcomes), and the `AssistantStatusResponseV2`/`AssistantChatResponseV2`
  unions with strict schemas and normalizers; `assistantRoutes.ts`,
  `assistantService.ts`, `assistantSchemas.ts`, `assistantClient.ts` and
  `assistantStatusClient.ts` import it and no other leaf implements or forks
  the unions;
- server-side resolution of TASK-548-01-L03's strict
  `AssistantDocsGuideSearchContextV1` (canonical locale, installed
  `productVersion`, canonical admin route/surface, catalog-validated
  capability IDs, bounded query, normalized permission snapshot) from the
  advisory request hints through `buildAssistantDocsGuideSearchContextV1`;
- `core/services/assistant/assistantService.ts`;
- `core/server/routes/assistantRoutes.ts`, including the one TASK-548
  `mapAssistantError` update after TASK-548-01-L03 lands (all seven public
  `assistant_docs_*` errors — including `assistant_docs_cutover_required`
  mapped to HTTP 409, never collapsed into a generic 500 — the internal
  `assistant_docs_search_context_invalid` mapped to public `ApiError` code
  `validation_error` with HTTP 400 and bounded details — never exposing the
  sentinel code, and the internal `assistant_docs_v2_consumer_not_ready`
  retained through preactivation and mapped by the service to the public
  `assistant_index_missing`/503 + `docs_not_ready` status) and the reindex
  timeout-owned signal
  pass-through;
- new Bun-free `core/services/assistant/guideAnswerContracts.ts`: the single
  pure browser-safe owner of `DocsHelpActionV1` (identity-only:
  `{ kind: "open-in-help"; docId: string; locale: string; sectionId: string }`,
  never carrying an href), the path-free source/card/evidence/action DTOs
  (`GuideSourceIdentityV1`, `GuideVisualCardV2`, `GuideExampleCardV2`,
  `GuideEvidenceCardV2`, `GuideCardActionsV1`, `GuideAnswerEvidenceV1`,
  `GuideCapabilityRelationCardV1`, `GuideRelatedDocumentationV1`) and their
  recursive exact-key normalizers (`normalizeGuideAnswerEvidenceV1`,
  `normalizeGuideCardActionsV1`, `normalizeGuideCapabilityRelationCardV1`,
  `normalizeGuideRelatedDocumentationV1`); no DB/server/Bun/react import;
- new `core/services/assistant/guideAnswerProjection.ts`: the SERVER MAPPER
  ONLY — it imports the pure `guideAnswerContracts.ts` owner, projects strict
  DB evidence into the owner's DTOs and maps `GuideBasicOutcomeV1` into the
  chat transport; it defines no DTO/action shape itself;
- new server-only `core/services/assistant/guideComposerAdapter.ts` (with the
  focused pure-adapter Vitest suite `tests/vitest/assistant/guideComposerAdapter.test.ts`):
  the ONLY
  adapter that projects authorized TASK-548-01-L03 complete RANKED V2 evidence
  records into the exact existing `DocsSearchHit` shape via the internal
  `projectGuideComposerHitsFromDbV2`, mapping EVERY required
  `DocsChunk`/`DocsSearchHit` field byte-for-byte (stable chunk id,
  full ordered `headingPath` — the exact `readonly string[]` array, element
  for element, never a scalar string — `heading`, `lineStart`/`lineEnd`,
  `content`,
  `normalizedText`, `tokenCount`, the MANDATORY bounded exact `tokenCounts`,
  `docTitle` mapped EXPLICITLY from `record.document.title` with `docPath`
  bound to a safe internal grouping identity ONLY — the unchanged composer's
  `basename(docPath)` label fallback is never reachable because `docTitle` is
  always populated from the evidence record, and no path/filename-derived text
  can ever surface as user-visible answer or source text — plus the
  query-result `snippet`, `score`, `matchedTerms` and the exact
  `rankingSignals`),
  with zero derivation: the adapter never derives or repairs
  token counts (records always carry them; the strict normalizers reject
  missing/malformed `tokenCounts` — no fallback),
  exports the single callable `composeGuideNonBasicAnswerV2`, which invokes the
  INJECTED unchanged composer with exactly
  `{ question, hits, maxSources, detailLevel, guideMode }` for non-basic/helper
  modes, discards the composer's path-bearing `sources` at the adapter boundary
  and returns transport-safe projection inputs (`{ composed, truncated }`, no
  path-bearing member). Response
  sources are projected only from authorized path-free Guide evidence; the
  adapter never edits or claims ownership of the 1,202-line `docsAnswerComposer.ts`
  and `assistantService.ts` never calls `deps.composeDocsAnswer` directly —
  the unchanged composer is injected INTO the adapter (through service deps)
  and is invoked only by `composeGuideNonBasicAnswerV2`;
- server-only `core/services/assistant/guideVisualAssetRegistry.ts`;
- new `core/services/assistant/guideBasicAnswerContract.ts` (Bun-free pure
  oracle with the exact callable export `composeGuideBasicAnswerV1`, so its
  tests belong to the Vitest lane);
- new `core/services/assistant/guideCapabilityRelationProjection.ts` for the
  bounded bidirectional relation DTO/cards; it imports the exact L03 DB lookup
  and defines no second relation/evaluator;
- `core/server/validation/assistantSchemas.ts` (imports the transport contract
  schemas; never re-implements the unions, the Guide request-context hint
  schema or the reindex request schema);
- new `tests/integration/routes/assistant-guide-rbac.test.ts` and
  `tests/integration/routes/assistant-reindex-v2.test.ts`;
- new `tests/unit/assistant/guideVisualAssetRegistry.test.ts`;
- new `tests/vitest/assistant/guideComposerAdapter.test.ts` (the focused
  PURE adapter suite for the `DocsSearchHit` projection and the
  injected unchanged composer invocation; the adapter is Bun-free with an
  injected composer, so its suite belongs to the Vitest lane);
- new `tests/vitest/assistant/guideBasicAnswerContract.test.ts` (the pure
  basic-answer oracle contract runs in the existing Vitest lane);
- the focused service WIRING test stays in its actual Bun lane:
  `tests/unit/assistant/assistantService.test.ts` proves the service calls
  `deps.composeGuideNonBasicAnswerV2` (never `deps.composeDocsAnswer`
  directly) on the non-basic/helper branch;
- related Assistant Vitest/Bun route/service tests named below.

It must not edit TASK-548-03-L01 Admin route-registry/auth-client files, L02
Help/renderer files, provider secret storage, action executors, or
task/changelog metadata.

TASK-548-01-L03 lands first and owns the pure DB ingest/retriever,
permission-snapshot normalizer/evaluator, the strict search-context DTO, the
seven public typed `assistant_docs_*` errors (including the stable
`assistant_docs_cutover_required` for manual preactivation/backfill/source-
drift operator action) plus the two internal sentinels, the
`AssistantDocsIngestResultV2` union, the
  `AssistantDocsActivePointerV2`/`AssistantDocsDbStatusV2` read model
  (including the strict `AssistantDocsGuideReadinessV2` union), and the
legacy startup producer removal
(`httpServer.ts`/`docsIndexService.ts`) before the V1 freeze. This leaf is then
the sole TASK-548 writer of both `assistantRoutes.ts` and `assistantService.ts`:
it wires
the inherited pure contract, maps all seven public errors, removes the legacy
runtime ingest/search consumers, and owns the route/service tests. The internal
`assistant_docs_v2_consumer_not_ready` sentinel is RETAINED internally through
preactivation — the service maps it to the public `assistant_index_missing`/
503 and the status `docs_not_ready`, and it is never removed before activation
or exposed by a route; the internal
`assistant_docs_search_context_invalid` maps to the public `ApiError` code
`validation_error`/400 with bounded details and never appears as a public
error code, and the internal `deferred_cutover_backfill` startup result
remains non-HTTP (startup logs it; only the route/service layer surfaces
`assistant_docs_cutover_required`/409). No TASK-548 leaf may
reopen either orchestration file after this leaf, and this leaf does not edit
`core/server/httpServer.ts` or `core/services/assistant/docsIndexService.ts`
(their legacy startup removal is TASK-548-01-L03-owned).

`core/services/assistant/docsAnswerComposer.ts` is currently 1,202 lines and is
not an owner file for this leaf: project cards from TASK-548-01-L03's complete
localized DB evidence in a separate helper, and invoke the composer ONLY
through the server-only `guideComposerAdapter.ts`'s single callable
`composeGuideNonBasicAnswerV2` (which maps EVERY required
`DocsChunk`/`DocsSearchHit` field byte-for-byte from the authorized complete
ranked V2
records — stable chunk id, full `headingPath`, `heading`,
`lineStart`/`lineEnd`, `content`, `normalizedText`, `tokenCount`, bounded
exact `tokenCounts`, `docTitle` mapped explicitly from
`record.document.title` with `docPath` as a safe internal grouping identity
only (the unchanged composer's `basename(docPath)` label fallback is never
reachable and no path-derived text becomes user-visible answer/source text),
plus the query-result `snippet`, `score`, `matchedTerms`
and exact `rankingSignals` — and calls the injected unchanged
`composeDocsAnswer` with its exact input contract). If verified
implementation evidence
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
- in-memory conversation schemas and the legacy-storage purge.

Do not move arbitrary line ranges or create a generic helper dumping ground.
Keep public exports stable where tests/consumers rely on them. Every new/existing
touched production and test file must remain independently reviewable and at
most 1,000 physical lines. If the 825-line
`assistant-panel-interaction.test.tsx` would cross the limit, extract whole
Guide, Agent, or handoff suites into the new focused test files before adding
assertions.

## Runtime Contract

### Chat request-mode successor

The transport contract module (`assistantTransportContracts.ts`, this leaf)
owns the exact chat request-mode normalization. Accepted request modes remain
exactly `docs-only | llm-guide | llm-rag`; responses emit ONLY canonical modes:

```ts
type AssistantChatRequestModeV1 = "docs-only" | "llm-guide" | "llm-rag";
type AssistantCanonicalChatModeV1 = "docs-only" | "llm-guide";
export function normalizeAssistantChatRequestModeV1(value: unknown, input: {
  defaultMode: AssistantCanonicalChatModeV1; // validated persisted defaultMode
}): AssistantCanonicalChatModeV1;
```

- `docs-only` and `llm-guide` are the canonical modes; `llm-rag` is a DEPRECATED
  input-only alias that normalizes byte-for-byte to the canonical `llm-guide`
  (same product, same service branch, same permissions) and is never emitted in
  a response `mode`/`requestedMode`/`effectiveMode` or in
  `AssistantStatusResponseV2.defaultMode`.
- An omitted/undefined mode resolves through the VALIDATED persisted
  `defaultMode` exactly as current behavior: the server reads the persisted
  setting, validates it as a canonical mode (`docs-only | llm-guide`), and
  resolves that product; an invalid/unknown persisted value fails closed and is
  never guessed.
- Unknown or malformed mode values reject in the strict chat schema and the
  transport normalizer before service invocation (mapped through the existing
  centralized error mapping; no silent fallback).
- Admin tabs always send an explicit canonical request mode: Guide sends
  `mode: "docs-only"`; Agent sends `mode: "llm-guide"` (never the deprecated
  alias).
- Compatibility tests: a client sending `llm-rag` receives the exact
  `llm-guide` product behavior with canonical response modes; a client omitting
  `mode` receives the validated persisted `defaultMode` product exactly as
  current behavior (omitted-default fixtures pin both persisted values); route,
  service and admin-client tests prove the alias, the omitted default, and
  unknown-mode rejection with no silent breaking change.

### Guide

- Always sends explicit canonical `mode: "docs-only"` to existing
  `POST /assistant/chat`.
- If `detailLevel` is omitted, Guide resolves exactly `basic` (not the current
  `medium`). The strict basic oracle applies ONLY when the resolved
  `detailLevel` is exactly `basic` AND the resolved `guideMode` is exactly
  `default`: its primary answer body is at most 440 Unicode scalar values and
  either at most two prose sentences or at most three ordered steps. Sources,
  visuals/examples, relation cards, and actions are separate bounded DTO fields
  and do not justify a longer chat paragraph. Explicit user selection of
  `medium | instruction | advanced`, or any
  `troubleshooting | decision_guide | checklist | security` guide mode,
  preserves the current composer path unchanged (invoked ONLY
  through the server-only `guideComposerAdapter.ts`'s single callable
  `composeGuideNonBasicAnswerV2`, which maps EVERY required
  `DocsChunk`/`DocsSearchHit` field
  byte-for-byte from complete ranked V2 evidence — including `docTitle` mapped
  explicitly from `record.document.title` and `docPath` as a safe internal
  grouping identity only, never a user-visible basename fallback — and calls
  the injected
  unchanged composer with the exact
  `{ question, hits, maxSources, detailLevel, guideMode }` input contract)
  and is never
  routed through the 440/2/3 basic limits.
- `guideBasicAnswerContract.ts` is the sole basic-response oracle (basic +
  default only). Its strict
  response is a discriminated union:

  ```ts
  type GuideBasicOutcomeV1 =
    | { kind: "answer"; format: "prose"; text: string;
        truncated: boolean; confidence: number;
        openInHelp: DocsHelpActionV1; evidence: GuideAnswerEvidenceV1 }
    | { kind: "answer"; format: "ordered-steps"; steps: readonly string[];
        truncated: boolean; confidence: number;
        openInHelp: DocsHelpActionV1; evidence: GuideAnswerEvidenceV1 }
    | { kind: "no_match"; reason: "no_authorized_evidence";
        suggestions: readonly string[]; confidence: number }
    | { kind: "needs_input"; questions: readonly string[];
        confidence: number };
  ```

  `answer` requires at least one authorized active evidence section and its
  mandatory Help action. Zero/filtered hits and current `missing_answer` map to
  `no_match`, not an answer with empty sources. `needs_input` is used only when
  the bounded intent resolver needs disambiguation. Neither non-answer variant
  invents a document link. Every variant carries `confidence`; every `answer`
  carries `truncated` (true only when the first grounded unit alone exceeded
  the scalar budget and was clamped with the ellipsis).
- `guideBasicAnswerContract.ts` exports exactly one callable oracle:

  ```ts
  type LocalePinnedSentenceSegmenterV1 = (text: string) => readonly string[];
  export function composeGuideBasicAnswerV1(input: {
    query: string;                 // normalized bounded query
    evidence: readonly GuideAnswerEvidenceV1[];
    detailLevel: "basic";          // exact discriminator; other levels rejected
    guideMode: "default";          // exact discriminator; other modes rejected
    sentenceSegmenter: LocalePinnedSentenceSegmenterV1; // injected, locale-pinned
    maxPrimaryUnicodeScalars: number;
    maxPrimarySentences: number;
    maxPrimarySteps: number;
    confidence: number;
  }): GuideBasicOutcomeV1;
  ```

  The oracle rejects a `detailLevel` other than `basic` or a `guideMode` other
  than `default` with a typed `assistant_docs_basic_oracle_scope_invalid`
  error; it never silently applies 440/2/3 to another mode. The injected
  locale-pinned `Intl.Segmenter` sentence adapter is a required input
  (production injects the locale-pinned adapter; tests inject a bounded
  deterministic one). `assistantService.ts` calls exactly this export only on
  the basic/default branch; the undefined
  `composeDeterministicGuideAnswer` symbol from earlier drafts does not exist
  and must not be referenced.
- The outcome is mapped losslessly into the Guide chat transport by
  `guideAnswerProjection.ts`'s `mapGuideBasicOutcomeToChatV2` (transport-owned
  `GuideChatResponseV2` fields); `truncated` and `confidence` flow into the
  explicit transport fields so no information is lost:

  | `GuideBasicOutcomeV1` | Chat transport projection |
  | --- | --- |
  | `answer` prose | `template: "location_answer"`, `answer` = the bounded prose text, `confidence` copied, `truncated` copied losslessly into the explicit `truncated` transport field, `sources`/`evidence` = the one authorized evidence, `openInHelp` rendered from the identity-only Help action |
  | `answer` ordered-steps | `template: "how_to_answer"`, `answer` = the bounded steps text (markers/newlines inside the 440-scalar budget), same evidence/action, `confidence`/`truncated` copied losslessly |
  | `no_match` | `template: "missing_answer"`, `answer` = bounded suggestions-derived copy, `confidence` carried, `truncated: false`, `sources: []`, `evidence: []`, no fabricated Help action |
  | `needs_input` | `template: "clarifying_question"`, `answer` = bounded disambiguation copy, `confidence` carried, `truncated: false`, `sources: []`, `evidence: []`, no fabricated Help action |

  Every successful `answer` keeps the invariant that evidence is non-empty and
  exactly one Help action is present; neither non-answer variant ever invents a
  document link. The mapping is total (every outcome maps), injective on
  `kind`/`format`, and covered by transport-normalizer round trips.
- The oracle counts Unicode scalar values with `Array.from`, after NFC/line-
  ending normalization. `ordered-steps` applies only when every nonblank line
  is an exact contiguous `1.`..`N.` item and no prose line remains; it keeps at
  most three. Otherwise the injected locale-pinned sentence
  adapter returns prose units and the oracle keeps at most two. It never cuts a
  complete fitting unit. If the first grounded unit alone exceeds 440 scalars,
  it clamps to 439 scalars plus `…`, sets `truncated: true`, and
  still exposes the full section through Help. Aggregate primary text/steps,
  including list markers/newlines, is at most 440 scalars. Unknown segmentation
  output (malformed adapter result) fails to `needs_input`, never to
  unconstrained prose.
- Requires a ready DB index but ignores `assistant.enabled`,
  `assistant.llm.enabled`, provider, model, and provider failure.
- TASK-548-01-L03's awaited `dockerStart.ts` packaged seed becomes the sole
  startup producer; the legacy `initializeDocsIndexOnBootIfEnabled` removal in
  `core/server/httpServer.ts` and the retired source-root export removal in
  `docsIndexService.ts` are TASK-548-01-L03-owned (V1 freeze gate) and this
  leaf does not edit either file.
  Authorized manual `POST /admin/api/assistant/reindex` remains available even
  when Agent is disabled.
- Server records are TASK-548-01-L03's strict
  `AssistantDocsRankedLocalizedEvidenceV2` (the unranked
  `AssistantDocsLocalizedEvidenceV2` base — complete persisted chunk identity
  plus localized visual/example/link/provenance metadata — wrapped with the
  query-derived `snippet`/`score`/`matchedTerms`/`rankingSignals`) with one
  exact active identity, localized
  chunk owner and complete metadata; capability relation sections use the
  unranked base and never invent score/query terms. DB `sourcePath`/visual
  `assetPath` may be
  used only inside this trusted authorization/projection step; no path-bearing
  source type or `DocsVisualV1` is assignable to the browser response.
- The persisted document requirement is reauthorized before any source, card or
  action projection. Every Guide-eligible record is guaranteed by ingest to
  carry both `assistant` and `embedded-help`, so every returned answer has one
  authorized `Open in Help` action to its complete localized section; absence
  is an invalid Guide result, not a nullable UI state. The versioned official link
  additionally requires `public-docs`. `Open in CMS` remains governed by the
  exact `permissionRequirement`.
- For card actions, null succeeds for an authenticated Admin even with an empty
  permission array; `allOf` requires every listed permission and `anyOf` at
  least one. Empty/partial snapshots deny only an unsatisfied non-null
  requirement, while the exact live ready snapshot `["*"]` grants full access.
  Persisted `authorizationDisposition: "deny_all"` denies even `["*"]` and
  cannot produce a card/action. Authored requirements still forbid `*`;
  duplicate/mixed wildcard and other malformed snapshots fail closed.
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
- After primary retrieval, call TASK-548-01-L03's bounded relation lookup with
  the same active snapshot and the normalized
  `AssistantDocsGuideSearchContextV1` (its single permission/locale/
  productVersion/capability owner — never a bare permission snapshot); the
  lookup applies the exact locale and product-version predicates to every
  related document/member before projection. An atomic answer may show
  authorized containing workflows; a workflow answer may show its exact
  ordered authorized controls. Relation DTOs contain path-free IDs, labels from
  authorized section evidence, order, and Help actions only. Missing/ineligible
  members omit the complete relation without leaking an ID/title/route; area
  `capabilityIds` are never substituted for composition IDs.

TASK-548-01-L03 owns the DB evidence type/normalizer. The Bun-free
`guideAnswerContracts.ts` owner defines the exact path-free response DTOs
(`GuideSourceIdentityV1`, `GuideEvidenceCardV2`, `GuideCardActionsV1`,
`GuideAnswerEvidenceV1`, the relation cards) and their recursive normalizers;
`guideAnswerProjection.ts` is the server mapper only — it imports the owner,
requires one active identity, reauthorizes requirements,
verifies ordered ownership, explicitly copies only allowlisted fields and
projects into the owner's DTOs.
`assistantTransportContracts.ts` owns the wire `AssistantChatResponseV2`/
`AssistantStatusResponseV2` envelopes and imports the pure owner
(`GuideAnswerEvidenceV1`/`DocsHelpActionV1` come from `guideAnswerContracts.ts`,
never from the mapper or the transport module itself), and
`assistantService.ts`/`assistantClient.ts`/`assistantStatusClient.ts` import
and normalize through that transport owner; no legacy path-bearing response
bypass remains and no leaf implements or forks the unions.

`DocsHelpActionV1` is identity-only
(`{ kind: "open-in-help"; docId: string; locale: string; sectionId: string }`)
and carries no href: the UI derives the Help href through L01's exact
`adminHelpPath({ docId, locale, sectionId })` canonical helper at render time,
so no raw href/path from DB, provider or client is ever accepted or copied.

The browser-safe relation shape is exact (owned by `guideAnswerContracts.ts`):

```ts
type GuideCapabilityRelationCardV1 = Readonly<{
  kind: "atomic-control" | "composed-workflow";
  relationId: string;
  title: string;
  expectedOutcome: string | null;
  order: number | null;
  openInHelp: DocsHelpActionV1; // identity-only
}>;

type GuideRelatedDocumentationV1 = Readonly<{
  direction: "atomic-to-workflows" | "workflow-to-ordered-atoms";
  cards: readonly GuideCapabilityRelationCardV1[];
}>;
```

At most eight cards are returned. `openInHelp` is derived from exact authorized
`{ docId, locale, sectionId }`; no href/path from DB/provider/client is copied.

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
`detailLevel`, `guideMode` and the bounded `context.page`/`context.locale`
hints (the hint schema is owned by `assistantTransportContracts.ts`).
Top-level or nested client attempts to send `permissionSnapshot`,
`permissions`, `roles`, `permissionRequirement`, `productVersion`,
`capabilityIds`, a canonical route or equivalent unknown keys are
rejected before service invocation. The route copies the allowed request fields
individually. The Guide branch appends the server snapshot; the Agent branch
exposes only an isolated server-owned optional-evidence resolver. Object spread
from the body is forbidden.

The transport module exports the exact advisory hint DTO with exact bounds:

```ts
type AssistantDocsGuideRequestContextV1 = Readonly<{
  schema: "coderso.assistant-docs-guide-request-context@v1";
  page: string | null;   // advisory page hint; 1..256 UTF-8 bytes, no control chars
  locale: string | null; // advisory BCP-47 hint; 2..64 ASCII bytes
}>;
export function normalizeAssistantDocsGuideRequestContextV1(value: unknown):
  AssistantDocsGuideRequestContextV1;
// reject-unknown; missing page/locale normalize to null; out-of-bounds,
// non-BCP-47 or control-bearing values fail closed before service invocation
```

`normalizeAssistantDocsGuideRequestContextV1(undefined)` yields the exact
discriminator plus both null hints, i.e.
`{ schema: "coderso.assistant-docs-guide-request-context@v1", page: null, locale: null }` —
the same full typed shape the strict type above declares, so every type,
caller and test aligns on the discriminator-bearing object. The normalized
hints are ADVISORY: the service
resolves the canonical locale, product version, canonical route and capability
IDs server-side and never trusts a hint for authorization.

The Guide branch then resolves the strict search context server-side: the
canonical BCP-47 locale (validated user preference, default-locale fallback),
the installed `productVersion` through the same owner as
`resolveGuideOfficialDocsContextV1`, the canonical admin route/surface from the
page hint through TASK-548-03-L01's route-registry seam and
`resolveAdminRoutePath` (null when unresolvable), the resolved route
descriptor's `capabilityIds` validated against the exact capability catalog,
and the normalized permission snapshot. `buildAssistantDocsGuideSearchContextV1`
produces TASK-548-01-L03's strict `AssistantDocsGuideSearchContextV1`, which is
threaded into the era-aware facade `searchAssistantDocsAuthoritativeV2` options
(exact locale and version-range
predicates, deterministic capability-context reranking) and into Help/official
action projection (canonical locale for the deep link, `productVersion` for the
official link version). This leaf DEPLOYS the facade before activation through
a DISPATCH/DEPLOY-GATED consumer cutover: the switch of
`assistantService.ts`/`assistantRoutes.ts`/tests to
`searchAssistantDocsAuthoritativeV2` may dispatch only when the persisted
cutover row is EXACTLY `shadow_parity_clean` (never merely at/past
`backfill_complete`) with exactly one complete prepared
snapshot, the pointer's closed `legacy_acl_snapshot_id` binding (non-NULL,
naming the ACL-owning snapshot), and facade code compatible with the
row's `deploymentIdentity`/`rolloutGeneration` — never a preexisting rollout
receipt, which is recorded for that exact facade build AFTER deployment and
proves zero V1-only serving replicas. Before those facade bytes are
deployed the legacy service remains serving Guide (including at
`v1_active`/`v1_frozen`/`building`/pre-backfill — no facade binary is ever
dispatched pre-gate). Once the facade lands, every V1-era ready result uses
the prepared/ACL snapshot identity named by `legacy_acl_snapshot_id` as its
exact authorization/evidence snapshot; a facade binary starting without that
binding fails readiness (`assistant_index_missing`/503 + `docs_not_ready` with
zero authorized rows), which the canonical deploy order (freeze → backfill →
parity → facade deployment → rollout receipt → consumer readiness →
activation) prevents — no availability gap; the rollout receipt remains
mandatory for `consumers_ready` and activation, never for facade deployment.
The facade dispatch happens inside TASK-548-08's deploy-gated facade phase
(`task548-foundation-migration-resume`), which verifies the committed/deployed
foundation bytes and the EXACT `shadow_parity_clean` DB state before any
02/03 dispatch. Add first-start (fresh install), pre-backfill
and serialized-deployment fixtures proving no gap, no mixed-era window, and
the gated dispatch contract. Guide
remains available over the ACL-covered frozen V1 corpus until activation and
over the active V2 snapshot after activation, and activation/rollback switch
ONLY the DB pointer (rollback after activation restores `v1_frozen` with the
trigger guards, frozen V1 rows, ACL binding and facade preserved; resuming
mutable legacy V1 is a separate destructive/maintenance transition, never
normal rollback). A context/query drift, unknown key, malformed
locale/version/capability or snapshot mismatch fails closed before DB work with
`assistant_docs_search_context_invalid` / `assistant_docs_permission_snapshot_invalid`
as applicable; browser hints are advisory and never supply permissions,
versions, capabilities or routes.

After strict validation, the route resolves the requested product and branches
before any permission-snapshot, DB-index, retrieval, or evidence-projection
work. Guide must resolve a trusted snapshot and a ready backend: the era-aware
facade `searchAssistantDocsAuthoritativeV2` serves the ACL-joined frozen V1
corpus before activation (and after rollback) and the active V2 snapshot after
activation, with exactly one backend per question. Agent provider chat
and action routes have no required Guide dependency. Agent may attach
documentation only as optional evidence that has passed this same server
authorization pipeline; snapshot/index/evidence failure is captured as
the bounded `{ state: "docsEvidenceUnavailable" }` evidence state and cannot
replace, fail, or downgrade a successful provider response.

Missing user identity, resolver failure, missing/malformed state, unknown
permission, duplicate permission, unknown key or mixed wildcard normalizes to
`assistant_docs_permission_snapshot_invalid` and fails closed before DB query,
hit ranking, source composition, Guide output or optional Agent docs
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
exact `ingestPackagedAssistantDocsV2({ actorId, force?, signal,
requestKind: "manual" })` dependency. Reindex
must not read runtime settings or a source root, check Agent/LLM/provider/model
availability, parse Markdown, or resolve/call a provider. This does not remove
the Agent-only guard from `answerAssistantQuestion`, enable Agent controls, or
authorize any Agent action.

The reindex route remains the existing internal
`POST /admin/api/assistant/reindex` (`/assistant/reindex` inside the Admin
router). Preserve, without bypasses:

- authenticated Admin session, `settings:write`, unsafe-method CSRF middleware,
  and the `assistant` rate-limit bucket;
- the strict reject-unknown `AssistantReindexRequestV2` (`{ force?: boolean }`,
  NO request discriminator, `{}` valid, `force` boolean when present) owned by
  `assistantTransportContracts.ts` (the same leaf that owns the
  request/response wire unions; `assistantSchemas.ts` imports it);
- the packaged `DocsDistributionBundleV2` loader, schema/source-hash/reference
  validation, and no Markdown/network fallback;
- complete localized evidence materialization plus atomic active-pointer and
  successful-run commit, with PostgreSQL-authoritative no-cache reads;
- the TASK-548-01-L03 single-ingest lock/serialization, previous-active-snapshot
  rollback behavior, audit record, exact typed
  `assistant_docs_*`/`assistant_reindex_failed` error mapping, and the
  `AssistantDocsIngestResultV2` result union.

`reindexAssistantDocs` is a service operation behind those route controls, not
a replacement authorization boundary. It accepts `{ actorId?, force?, signal }`
and passes the signal through to
`ingestPackagedAssistantDocsV2`; the `signal` is the timeout-owned
`composeAssistantDocsIngestAbortSignalV1()` result (there is no request
`AbortSignal` in the Admin router context and no lifecycle composition at this
layer). Cancellation
during lock acquisition, bundle load or persistence fails closed as
`assistant_docs_ingest_failed` (`cancelled`). The service maps the six inherited V2
reindex errors (`bundle_invalid`, `ingest_failed`, `reindex_conflict`,
`db_unavailable`, `capacity_exceeded`, `cutover_required`) plus
`assistant_docs_permission_snapshot_invalid` in the one centralized switch
(`assistant_docs_cutover_required` maps to HTTP 409 and is never collapsed
into a generic 500); the
internal `assistant_docs_search_context_invalid` maps to the public `ApiError`
code `validation_error` with HTTP 400 and bounded details (never exposing the
sentinel code), and the internal `assistant_docs_v2_consumer_not_ready` is
retained through preactivation and mapped by the service to the public
`assistant_index_missing`/503 + `docs_not_ready` status, so public error codes
and internal sentinels stay distinct. It
must not delete `assistant_disabled`, because Agent chat still uses it, or
weaken any inherited mapping.

Reindex result handling is strict and kind-aware (`AssistantReindexResultV2`
wire union, normalized through the transport owner). The ingest result carries
its OWN transaction-verified pointer/status closure captured under the
advisory lock/commit (TASK-548-01-L03's `AssistantDocsIngestResultV2.closure`),
so the service uses the ONE canonical
`assertAssistantDocsIngestResultClosureV2` helper and NEVER re-asserts pointer
currency after the lock is released: no stale assertSame/status helper chains,
no post-lock current active/prepared status reread, and no reference to the
undefined `assertAssistantDocsSnapshotProvenanceByIdV2` symbol — response
counts/identity come from the immutable ingest result. The status endpoint
remains independent (`deps.getAssistantDocsDbStatus()` is used by the status
service only, never by `reindexAssistantDocs`):

- `deferred_cutover_backfill` (fence at `v1_active`/`v1_frozen`): the bounded
  internal ingest result is mapped by the service to the public
  `assistant_docs_cutover_required`/409 operator-required conflict — manual
  reindex never becomes a second
  preactivation producer, never allocates a run and never creates a snapshot;
  the operator runs the cutover backfill command instead.
- `prepared` (fence not passed, state at/past `backfill_complete`; same-hash
  prepared reuse only): a successful bounded pending-activation
  response — HTTP 200, `outcome: "prepared"`, `changed` true/false, the
  prepared snapshot identity, and the literal `activated: false`.
  `assertAssistantDocsIngestResultClosureV2(ingest)` verifies the member's own
  committed v1 closure (`closure.era === "v1"`, `closure.snapshot === null`)
  and the prepared snapshot identity; all response counts/identity come from
  that immutable result — there is NO current active/prepared status reread
  and no `dbStatus.preparedSnapshot`/`dbStatus.activePointer` comparison; the
  frozen V1 active pointer carries the permanent `snapshot: null` (never a V2
  identity) and the member's `activeSnapshotId` is the literal `null`. A
  `prepared`
  result is
  NEVER reported as failure or an error status.
- `unchanged` (fence passed, same-hash no-op): HTTP 200, the literal union
  member with `outcome: "unchanged"`, `activated: true`, `changed: false`;
  `assertAssistantDocsIngestResultClosureV2(ingest)` verifies the committed v2
  closure equals the member snapshot (the member's snapshot fields ARE the
  active identity at COMMIT).
- `activated` (fence passed, new snapshot): HTTP 200, the literal union
  member with `outcome: "activated"`, `activated: true`, `changed: true`;
  the same single canonical closure helper verifies the committed v2 closure
  equals the new active identity at COMMIT.
- All three successful members run through the SAME canonical
  `assertAssistantDocsIngestResultClosureV2`; there is no separate
  `assertPreparedSnapshotMatchesStatusV2`, `assertAssistantDocsDbStatusActiveV2`
  or `assertSameAssistantDocsSnapshotIdentityV2` chain, no
  `assertAssistantDocsSnapshotProvenanceByIdV2`, and no post-lock
  current-pointer assertion exists anywhere in this leaf.

The audit record and `AssistantReindexResultV2` response carry the exact
snapshot/count/timing fields from the ingest result union; the browser receives
only the path-free wire union, never the raw run row.

### Agent

- Implement the parent status truth table exactly: `enabled === agentEnabled`,
  `guideReady === indexReady === (dbStatus.guideReadiness.state === "ready")`
  — derived ONLY from TASK-548-01-L03's strict
  `AssistantDocsDbStatusV2.guideReadiness` union (ready v1 only with the
  frozen/immutable V1 era + closed/pinned `legacy_acl_snapshot_id` ACL
  snapshot, independent of the ordinal cutover state — `v1_frozen` through
  `consumers_ready` qualify identically — and never invalidated by a
  concurrent replacement `building` snapshot, which retains the old valid
  binding with no gap until the final `building → prepared` transaction
  rebinds; ready
  v2 only with the complete active V2 pointer/snapshot; unbound
  abort/destructive-resume/pre-first-backfill fail closed as `legacy_acl_unbound`/
  `cutover_not_ready`, INITIAL mid-flight backfill as `building` (never a
  replacement backfill with a retained binding), dangling V2 pointer
  as `active_snapshot_missing`) and never guessed from `docCount`/`chunkCount`;
  `agentAvailable === agentEnabled && llmAvailable`,
  and `indexBuilding === dbStatus.indexBuilding` (the DB-owned equality
  invariant: true iff a building snapshot AND a pending
  `request_kind='cutover_backfill'` run exist — the durable start commits both
  atomically; `indexBuilding` never implies `guideReadiness`/`indexReady`);
  settle domains independently. The existing 60-second process-memory Admin
  status dedupe may hold only this non-evidence readiness DTO, clears on
  identity/logout transition, and never caches a permission decision, Guide
  hit/evidence, transcript, action result or server response body.
- Sends provider chat with the explicit canonical `mode: "llm-guide"` (never
  the deprecated `llm-rag` alias) and uses existing action routes.
- Provider chat, plan, dry-run, and execute remain usable when the Guide DB, index, active evidence snapshot, or permission resolver is unavailable. Optional
  docs evidence is never an authorization fallback or a prerequisite for them.
- Without provider/config, render a focused unavailable state and link to
  Integrations only when the user can access it.
- If the existing chat service returns a docs-only fallback, do not render it as an Agent answer. Offer an explicit sanitized `Ask Guide` handoff instead.
- Preserve review-before-mutation, dry-run, per-action RBAC, idempotency, audit,
  redaction, and partial/failure UI.

### Separate State and Handoff

Keep versioned, bounded, redacted Guide and Agent snapshots separately in React
memory for the mounted authenticated Admin session only. Guide evidence is
permission-sensitive and Agent plans/results can be private, so this leaf
retires `assistantConversationState.ts` browser persistence instead of creating
a V2 local/session-storage cache. On first panel mount and every identity/logout
transition, remove both exact legacy keys
`coderso.assistant.conversation.state` and
`nextless.assistant.conversation.state` without parsing, hydrating, migrating,
logging or rewriting their payloads. No transcript, source, visual/example,
permission snapshot, plan, preview, execution result, provider metadata or
signed URL is persisted in browser storage. Existing launcher geometry and
other content-free UI preferences remain independent. Durable identity-scoped
conversation persistence belongs to later TASK-414-03's DB session contract,
not this leaf.

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
  reject-unknown, and server-trusts only route/locale/stable ids. Reindex uses
  the transport-owned `AssistantReindexRequestV2` (no request discriminator,
  `{}` valid)/`AssistantReindexResultV2`
  unions; the internal `assistant_docs_search_context_invalid` maps to public
  `validation_error`/400 with bounded details and the internal
  `assistant_docs_v2_consumer_not_ready` maps to public
  `assistant_index_missing`/503 + `docs_not_ready` (both never exposed as
  public codes, the cutover sentinel retained through preactivation).
  Permission
  state is never a request field. Add route registration and error-map coverage
  for every changed response/error branch.
- **Anti-abuse:** no public write, so nonce/HMAC/reCAPTCHA do not apply.
  Existing action idempotency and review controls remain mandatory.
- **Secrets/privacy:** separate in-memory state and handoff reuse redaction, size
  caps and exact-key validation. Browser storage is limited to content-free UI
  preferences; legacy conversation keys are deleted without hydration. No
  provider/session/CSRF/signed-URL/Guide-evidence persistence is permitted.
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
  message: string;
  mode?: AssistantChatRequestModeV1; // docs-only | llm-guide | llm-rag
                                     // (llm-rag deprecated input-only alias)
  detailLevel?: DocsDetailLevel;
  guideMode?: DocsGuideMode;
  context?: AssistantChatContext;
};
export type AssistantChatServiceInput =
  | (Omit<AssistantChatRequestInput, "mode"> & {
      product: "guide"; mode: "docs-only"; actorId: string | null;
      searchContext: AssistantDocsGuideSearchContextV1;
      // the strict context is the single permission-snapshot owner
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
      // Chat request-mode successor (transport owner): `llm-rag` is a
      // deprecated input-only alias normalized to the canonical `llm-guide`; an
      // omitted mode resolves the VALIDATED persisted `defaultMode` exactly as
      // current behavior; unknown modes reject in the strict schema before this
      // call.
      const canonicalMode = normalizeAssistantChatRequestModeV1(body.mode, {
        defaultMode: await deps.resolveValidatedPersistedDefaultModeV1(),
      });
      const product = await resolveValidatedAssistantProduct(canonicalMode);
      const common = {
        message: body.message,
        guideMode: body.guideMode,
        context: body.context,
        actorId: ctx.user?.id ?? null,
      };
      if (product === "agent") {
        return service.chat({
          ...common,
          detailLevel: body.detailLevel,
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
      const searchContext = await resolveAssistantDocsGuideSearchContextV1(
        {
          message: body.message,
          requestContext: body.context,
          permissionSnapshot,
        },
        deps
      );
      return service.chat({
        ...common,
        detailLevel: body.detailLevel ?? "basic",
        product,
        mode: "docs-only",
        searchContext,
      });
    });
  }
);
// Transport-owned hint schema + L03-owned strict DTO builder:
async function resolveAssistantDocsGuideSearchContextV1(
  input: {
    message: string;
    requestContext: AssistantChatContext | undefined;
    permissionSnapshot: AssistantDocsPermissionSnapshotV1;
  },
  deps: AssistantServiceDeps
): Promise<AssistantDocsGuideSearchContextV1> {
  const requestContext = normalizeAssistantDocsGuideRequestContextV1(
    input.requestContext
  );
  const productVersion = await deps.resolveGuideProductVersionV1();
  const canonicalAdminRoute = resolveCanonicalAdminRouteFromPageHintV1(
    requestContext.page
  );
  const capabilityIds = resolveRouteDescriptorCapabilityIdsV1(
    canonicalAdminRoute
  );
  const locale = resolveCanonicalDocsLocaleV1(requestContext.locale);
  return buildAssistantDocsGuideSearchContextV1({
    locale,
    productVersion,
    canonicalAdminRoute,
    capabilityIds,
    query: normalizeAssistantDocsQueryV1(input.message),
    permissionSnapshot: input.permissionSnapshot,
  });
}
// Existing centralized route mapper; TASK-548-01-L03 owns the domain codes.
switch (error.message) {
  case "assistant_docs_permission_snapshot_invalid":
    return {
      code: "assistant_docs_permission_snapshot_invalid",
      message: "Assistant documentation access is unavailable",
      status: 403,
    };
  case "assistant_docs_search_context_invalid":
    // Internal context sentinel: mapped to the PUBLIC ApiError code
    // `validation_error`/400 with bounded details; the sentinel code is never
    // exposed.
    return {
      code: "validation_error",
      message: "Assistant documentation search context is invalid",
      status: 400,
      details: { field: "context" },
    };
  case "assistant_docs_v2_consumer_not_ready":
    // Internal cutover sentinel: retained through preactivation, mapped to
    // the existing public code; never leaked.
    return {
      code: "assistant_index_missing",
      message: "Assistant documentation index is not ready",
      status: 503,
    };
  case "assistant_docs_bundle_invalid":
    return { code: error.message, message: "Assistant docs bundle is invalid", status: 500 };
  case "assistant_docs_reindex_conflict":
    return { code: error.message, message: "Assistant reindex is already running", status: 409 };
  case "assistant_docs_capacity_exceeded":
    return { code: error.message, message: "Assistant docs capacity is exhausted", status: 409 };
  case "assistant_docs_cutover_required":
    // Stable seventh public error for manual preactivation/backfill/source-
    // drift operator action; mapped 409 and never collapsed into a generic
    // 500. Startup's internal `deferred_cutover_backfill` result is logged,
    // never an HTTP member of this switch.
    return { code: error.message, message: "Assistant docs cutover operator action required", status: 409 };
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
  input: { actorId?: string | null; force?: boolean; signal: AbortSignal },
  overrides?: Partial<AssistantServiceDeps>
): Promise<AssistantReindexResultV2> => {
  const deps = resolveDeps(overrides);
  let ingest: AssistantDocsIngestResultV2;
  try {
    ingest = await deps.ingestPackagedAssistantDocsV2({
      actorId: input.actorId ?? null,
      force: input.force,
      signal: input.signal,
      requestKind: "manual",
    });
  } catch (error) {
    throw normalizeDocsIngestError(error);
  }
  if (ingest.kind === "deferred_cutover_backfill") {
    // Pre-freeze states (v1_active/v1_frozen): manual reindex can never
    // become a second preactivation producer — no run or snapshot was
    // created. Map the bounded internal result to the public
    // `assistant_docs_cutover_required`/409 operator-required conflict; the
    // operator runs the cutover backfill command instead.
    throw normalizeDocsIngestError(
      domainError("assistant_docs_cutover_required", {
        safeReason: "cutover_backfill_required",
      })
    );
  }
  // ONE canonical closure helper: verifies the ingest result's OWN
  // transaction-verified pointer/status closure (captured under the advisory
  // lock/commit). The result is immutable after commit; the service never
  // requires the DB pointer to still be current after lock release, never
  // rereads the current active/prepared status, and never references the
  // undefined `assertAssistantDocsSnapshotProvenanceByIdV2` symbol. Response
  // counts/identity come from this immutable result; the status endpoint
  // (`deps.getAssistantDocsDbStatus()`) remains independent and is not called
  // here.
  assertAssistantDocsIngestResultClosureV2(ingest);
  await logAssistantReindexAuditBestEffort({
    deps,
    actorId: input.actorId ?? null,
    ingest,
  });
  // Construct the exact three-member AssistantReindexResultV2 literal union:
  // prepared carries activated:false, the literal activeSnapshotId: null (the
  // frozen V1 pointer is never a V2 identity) and changed true/false;
  // unchanged/activated carry the active snapshot identity as their own
  // snapshot fields with activated:true and the literal changed flag.
  if (ingest.kind === "prepared") {
    return normalizeAssistantReindexResultV2({
      schema: "coderso.assistant-reindex-result@v2",
      retrievalBackend: "db",
      outcome: "prepared",
      changed: ingest.changed,
      activated: false,
      snapshotId: ingest.snapshot.snapshotId,
      generation: ingest.snapshot.generation,
      sourceHash: ingest.snapshot.sourceHash,
      activeSnapshotId: null, // frozen V1 pointer carries no V2 identity
      builtAt: ingest.finishedAt,
      buildDurationMs: ingest.buildDurationMs,
      docCount: ingest.docCount,
      chunkCount: ingest.chunkCount,
      totalTokens: ingest.totalTokens,
      actorId: input.actorId ?? null,
    });
  }
  return normalizeAssistantReindexResultV2({
    schema: "coderso.assistant-reindex-result@v2",
    retrievalBackend: "db",
    outcome: ingest.kind, // "unchanged" | "activated"
    changed: ingest.changed, // literal flag from the ingest union; never
                             // derived from the outcome
    activated: true,
    snapshotId: ingest.snapshot.snapshotId,
    generation: ingest.snapshot.generation,
    sourceHash: ingest.snapshot.sourceHash,
    builtAt: ingest.finishedAt,
    buildDurationMs: ingest.buildDurationMs,
    docCount: ingest.docCount,
    chunkCount: ingest.chunkCount,
    totalTokens: ingest.totalTokens,
    actorId: input.actorId ?? null,
  });
};
// The legacy startup producer removal in core/server/httpServer.ts and
// core/services/assistant/docsIndexService.ts is TASK-548-01-L03-owned
// (V1 freeze gate); dockerStart.ts remains unchanged and owns the sole
// awaited startup call.
type AssistantDocsRetrievalResult =
  | {
      state: "empty_query";
      searchContext: AssistantDocsGuideSearchContextV1;
      retrievalBackend: "db";
    }
  | {
      state: "ready";
      hits: readonly AssistantDocsRankedLocalizedEvidenceV2[];
      relations: readonly AssistantDocsAuthorizedCapabilityRelationV1[];
      snapshot: AssistantDocsSnapshotIdentityV2;
      searchContext: AssistantDocsGuideSearchContextV1;
      retrievalBackend: "db";
    };
async function retrieveDocsHits(
  input: {
    message: string;
    context?: AssistantChatContext;
    searchContext: AssistantDocsGuideSearchContextV1;
  },
  deps: AssistantServiceDeps
): Promise<AssistantDocsRetrievalResult> {
  // The strict context is the single owner of the permission snapshot.
  const searchContext = normalizeAssistantDocsGuideSearchContextV1(
    input.searchContext
  );
  const result = await deps.searchAssistantDocsAuthoritativeV2(input.message, {
    topK: 5,
    minScore: 0.01,
    searchContext,
    includeSelectedSectionRelations: true,
    maxRelations: 8,
  });
  if (result.state === "empty_query") {
    return { state: "empty_query", searchContext, retrievalBackend: "db" };
  }
  assertEveryEvidenceMatchesSnapshotIdentityV2(
    result.records,
    result.snapshot
  );
  return {
    state: "ready",
    hits: result.records,
    relations: result.relations,
    snapshot: result.snapshot,
    searchContext,
    retrievalBackend: "db",
  };
}
// Types below are owned by the pure Bun-free `guideAnswerContracts.ts` owner
// (single definition site; shown here for reference only). `guideAnswerProjection.ts`
// and `assistantTransportContracts.ts` import them; no leaf re-defines them.
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
  openInHelp: DocsHelpActionV1; // identity-only; NEVER an href
  officialHref: string | null;
  cmsAction: DocsAdminActionResolutionV1 | null;
};
export type GuideAnswerEvidenceV1 = {
  schema: "coderso.guide-answer-evidence@v1";
  source: GuideSourceIdentityV1; snapshot: AssistantDocsSnapshotIdentityV2;
  cards: readonly GuideEvidenceCardV2[]; actions: GuideCardActionsV1;
  relatedDocumentation: GuideRelatedDocumentationV1 | null;
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
  records: readonly AssistantDocsRankedLocalizedEvidenceV2[];
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
  const records = input.records.map(normalizeAssistantDocsRankedLocalizedEvidenceV2);
  assertEveryEvidenceMatchesSnapshotIdentityV2(records, snapshot);
  return records.map((record) => {
    assertDocumentHasPublicationTarget(record.document, "assistant");
    assertDocumentHasPublicationTarget(record.document, "embedded-help");
    if (!authorizesAssistantDocsDocumentV2(
      record.document.authorizationDisposition,
      record.document.permissionRequirement,
      permissionSnapshot
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
      relatedDocumentation: null, // attached only from authorized DB relation lookup below
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
      searchContext: input.searchContext,
    },
    deps
  );
  if (retrieval.state === "empty_query") {
    return normalizeAssistantChatResponseV2(
      projectGuideNoMatchResponseV2("no_authorized_evidence")
    );
  }
  const evidence = projectGuideAnswerEvidenceFromDbV2({
    snapshot: retrieval.snapshot,
    records: retrieval.hits,
    permissionSnapshot: retrieval.searchContext.permissionSnapshot,
    officialDocs: await deps.resolveGuideOfficialDocsContextV1(),
    visualAssetRegistry: deps.guideVisualAssetRegistry,
  });
  const evidenceWithRelations = attachAuthorizedGuideRelations(
    evidence,
    retrieval.relations
  );
  const detailLevel = input.detailLevel ?? "basic";
  const guideMode = input.guideMode ?? "default";
  if (detailLevel === "basic" && guideMode === "default") {
    // The exact callable oracle from guideBasicAnswerContract.ts applies ONLY
    // on the basic/default branch; never an undefined composer symbol.
    const outcome = composeGuideBasicAnswerV1({
      query: normalizeAssistantDocsQueryV1(input.message),
      evidence: evidenceWithRelations,
      detailLevel: "basic",
      guideMode: "default",
      sentenceSegmenter: deps.resolveLocalePinnedSentenceSegmenterV1(),
      maxPrimaryUnicodeScalars: 440,
      maxPrimarySentences: 2,
      maxPrimarySteps: 3,
      confidence: retrievalConfidence(retrieval),
    });
    return normalizeAssistantChatResponseV2(
      mapGuideBasicOutcomeToChatV2({
        outcome,
        evidence: evidenceWithRelations,
        detailLevel,
        guideMode,
        searchContext: retrieval.searchContext,
      })
    );
  }
  // medium/instruction/advanced and every non-default guide mode keep the
  // existing bounded composer path unchanged; never routed through
  // the 440/2/3 basic limits. The server-only guideComposerAdapter's single
  // callable composeGuideNonBasicAnswerV2 projects the
  // authorized complete ranked V2 evidence records into the exact existing
  // DocsSearchHit shape, invokes the INJECTED unchanged composer with its
  // exact input contract, drops the composer's path-bearing sources at the
  // adapter boundary and returns transport-safe projection inputs; the
  // service never calls deps.composeDocsAnswer directly.
  const composedResult = deps.composeGuideNonBasicAnswerV2({
    question: normalizeAssistantDocsQueryV1(input.message),
    records: retrieval.hits, // complete ranked evidence
    maxSources: 3,
    detailLevel,
    guideMode,
  });
  return normalizeAssistantChatResponseV2(
    mapComposedGuideAnswerToTransportV2({
      composed: composedResult.composed, // path-bearing sources already dropped
      truncated: composedResult.truncated,
      evidence: evidenceWithRelations, // path-free response sources only
      searchContext: retrieval.searchContext,
    })
  );
  // mapComposedGuideAnswerToTransportV2 (owned by guideAnswerProjection.ts)
  // consumes the adapter's transport-safe projection inputs, projects response
  // sources ONLY from the authorized path-free Guide evidence, and maps the
  // adapter's bounded result explicitly, including the `truncated` transport
  // flag (true only when the adapter's bounded mapping clamped the primary
  // body).
}
type GuideCardActionContext = {
  serverPermissionSnapshot: AssistantDocsPermissionSnapshotV1;
  officialDocs: GuideOfficialDocsContextV1;
};
export function resolveGuideCardActions(
  inputRecord: AssistantDocsRankedLocalizedEvidenceV2,
  context: GuideCardActionContext
): GuideCardActionsV1 {
  // Ranked records are the answer-path input; the ranked normalizer wraps the
  // exact unranked base, and only base fields are read here.
  const record = normalizeAssistantDocsRankedLocalizedEvidenceV2(inputRecord);
  const document = record.document;
  assertDocumentHasPublicationTarget(document, "assistant");
  assertDocumentHasPublicationTarget(document, "embedded-help");
  const serverPermissionSnapshot =
    normalizeAssistantDocsPermissionSnapshotV1(
      context.serverPermissionSnapshot
    );
  if (
    !authorizesAssistantDocsDocumentV2(
      document.authorizationDisposition,
      document.permissionRequirement,
      serverPermissionSnapshot
    )
  ) {
    throw new Error("assistant_docs_permission_snapshot_invalid");
  }
  return {
    openInHelp: {
      kind: "open-in-help",
      docId: document.docId,
      locale: document.locale,
      sectionId: record.section.sectionId,
    },
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
const RETIRED_ASSISTANT_CONVERSATION_STORAGE_KEYS = [
  "coderso.assistant.conversation.state",
  "nextless.assistant.conversation.state",
] as const;
export function purgeRetiredAssistantConversationStorage(): void {
  try {
    for (const key of RETIRED_ASSISTANT_CONVERSATION_STORAGE_KEYS) {
      window.localStorage.removeItem(key); // remove only; never get/parse/hydrate
    }
  } catch {
    // Storage denial does not enable a fallback; conversation state stays memory-only.
  }
}
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
transport request → provider-independent packaged ingest → `prepared` (inactive,
pre-fence) or `unchanged`/`activated` (post-fence) result union → atomic
active pointer/success commit (or pending-activation for `prepared`). Chat +
`settings:read` → product. Guide → server
permissions → one strict search context → one authorized PostgreSQL retrieval
transaction with active
identity, candidate/evidence/relation statements → reauthorization → registry
lookup → deterministic path-free projection. Agent
review/actions stay independent; only after provider success may best-effort
authorized DB evidence attach. No Guide question opens a bundle, receipt,
Markdown or filesystem.

**Error handling:** DB/index errors remain in Guide state; provider/config/quota
errors remain in Agent state. Agent snapshot/DB/index/evidence failures
produce only `{ state: "docsEvidenceUnavailable" }`; they never become provider
failure, a docs answer masquerading as Agent output, or an action prerequisite.
Only after DB evidence/owner authorization may an unavailable, malformed or
stale startup registry omit that visual while retaining grounded text/source.
A deny-all disposition, mixed snapshot/sourceHash, owner mismatch or
unsatisfied requirement rejects the complete evidence.
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
- every parent status row settles independently; strict server/client
  normalization rejects derived drift, the status-only memory dedupe clears on
  identity change, DB failure leaves Agent ready and Agent failure leaves Guide
  ready;
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
  `assistant_docs_permission_snapshot_invalid`/403 before DB query;
  ready empty permits only null requirements, sole `["*"]` grants all, and
  partial/full `allOf` plus every `anyOf` branch match the pure owner helper;
- strict chat bodies reject top-level and nested `permissionSnapshot`,
  `permissions`, `roles`, `permissionRequirement` and authorization hints;
  spies prove a forged client value cannot replace the server snapshot;
- search-context fixtures prove the route accepts only bounded
  `context.page`/`context.locale` hints, resolves locale/productVersion/
  canonical route/capability IDs server-side through
  `buildAssistantDocsGuideSearchContextV1`, rejects browser-supplied versions,
  capabilities, routes, permissions and snapshots, fails closed on
  context/query drift, pins exact locale/version predicates and capability-
  context rerank determinism, and uses the context locale/version for Help and
  official actions;
- reindex fixtures prove the service passes the timeout-owned signal (never a
  request/lifecycle signal) through `reindexAssistantDocs` into
  `ingestPackagedAssistantDocsV2` (with `requestKind: "manual"`); abort during
  lock/load/persistence returns
  bounded `assistant_docs_ingest_failed` (`cancelled`) with no partial
  snapshot/pointer change; pre-freeze (`v1_active`/`v1_frozen`) manual reindex
  receives the bounded `deferred_cutover_backfill` ingest result and maps it
  to the public `assistant_docs_cutover_required`/409 operator-required
  conflict with zero run/snapshot side effects
  (spies prove no bundle load and no run allocation) — manual reindex never
  becomes a second preactivation producer; at the post-backfill preactivation
  states same-hash runs return the strict `prepared` wire
  outcome (HTTP 200, `activated: false`, `changed` true/false, the
  transaction-verified v1 closure proved by the ONE canonical
  `assertAssistantDocsIngestResultClosureV2` — all response counts/identity
  come from the immutable result with no current active/prepared status
  reread, no `dbStatus.preparedSnapshot` comparison and no
  `assertAssistantDocsSnapshotProvenanceByIdV2` — and the literal
  `activeSnapshotId: null` — the
  frozen V1 pointer is never a V2 identity — never reported as
  failure), while hash drift returns the same public
  `assistant_docs_cutover_required` conflict; post-fence `unchanged` (`activated:
  true`, `changed: false`) and
  `activated` (`activated: true`, `changed: true`) are verified by the SAME
  single canonical closure helper
  (committed v2 closure equals the member snapshot — never a post-lock
  current-pointer assertion or status reread, never a stale
  `assertSame`/status helper chain); the strict
  `AssistantReindexRequestV2` has no request discriminator and accepts `{}`,
  and the three-member `AssistantReindexResultV2` literal union round-trips
  through the PURE one-argument transport normalizer with every member checked
  independently —
  never `changed === (outcome === "activated")` (`prepared`: `activated: false`,
  `changed` true/false, `activeSnapshotId: null`; `unchanged`: `changed: false`,
  `activated: true`; `activated`: `changed: true`, `activated: true`;
  active-identity equality
  for the post-fence members is verified ONLY by the canonical closure helper
  after ingest — the normalizer never reads the database) and
  mixed/contradictory members rejected; service-level `normalizeDocsIngestError`
  round trips prove all seven public errors survive, including
  `assistant_docs_capacity_exceeded` and `assistant_docs_cutover_required`
  (409, never collapsed into a generic 500); the
  internal `assistant_docs_search_context_invalid` maps to
  public `validation_error`/400 with bounded details and the internal
  `assistant_docs_v2_consumer_not_ready` maps to public
  `assistant_index_missing`/503 + `docs_not_ready`, neither sentinel code ever
  exposed and the cutover sentinel retained through preactivation;
  the status endpoint independently reports `indexBuilding` via the DB-owned
  equality invariant (building snapshot AND pending `cutover_backfill` run)
  across durable-start crash/resume and explicit abort fixtures, and status
  fixtures pin the exact `AssistantDocsDbStatusV2.guideReadiness` truth table —
  `guideReady === indexReady === (guideReadiness.state === "ready")` with ready
  v1 only for the frozen/immutable V1 era + closed/pinned `legacy_acl_snapshot_id`
  ACL snapshot (ordinal-cutover-state independent; a concurrent replacement
  `building` snapshot with a retained old valid binding stays ready, while an
  initial mid-flight backfill with no prior binding stays not-ready), ready v2 only for the complete active V2 pointer/snapshot, and
  `legacy_acl_unbound` (unbound abort/destructive-resume/pre-backfill),
  `building` (initial mid-flight backfill only), `active_snapshot_missing` and `cutover_not_ready` failing closed,
  never derived from `docCount`/`chunkCount`;
- unauthorized documents never reach Guide ranking or Agent optional evidence
  and disclose no
  title, snippet, `(docId, locale, sectionId)`, capability, admin path,
  `visualId` or `exampleId`; projection rechecks the localized requirement;
- with `assistant.enabled=false`, an authenticated `settings:write` request to
  `POST /admin/api/assistant/reindex` with `{}`, `{ force: true }`, or
  `{ force: false }` invokes the serialized packaged-bundle ingest exactly once
  and succeeds (pre-fence: a `prepared` pending-activation HTTP 200 response
  with the complete inactive snapshot verified; never an error status) with
  zero runtime-settings/source-root/Markdown/provider resolver
  calls, preserves its audit/result, and leaves Guide ready once the fence
  activates the prepared snapshot;
- the same disabled-state regression proves missing session/permission, CSRF,
  rate limit and unknown/non-boolean request fields still reject before ingest;
  lock conflict, invalid/tampered packaged bundle, DB unavailable and ingest
  failure plus capacity exhaustion retain their exact typed status/code mappings;
- after that successful disabled-state reindex, Guide docs-only chat works while
  Agent chat/provider/actions and Agent UI controls remain unavailable; no
  reindex response or status field implicitly enables Agent;
- Agent requires global Agent enablement plus provider, never calls actions from
  Guide, and never requires docs evidence for chat/plan/dry-run/execute;
- separate in-memory histories, errors, readiness, `New`, plan/preview/execution;
- first mount and identity/logout transitions remove both exact legacy
  conversation localStorage keys without `getItem`, parse, hydration or rewrite;
  spies prove no transcript/evidence/plan/result browser-storage write exists;
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
  cross-owner, unlisted or fabricated records; zero/fully filtered hits return
  exact `no_match` (not `answer`), preserve the active snapshot identity, expose
  no fabricated Help action, and perform no bundle lookup;
- basic-answer oracle tests pin 439/440/441 Unicode scalars, astral characters,
  CRLF/NFC normalization, one/two/three prose sentences, contiguous 1/2/3/4
  ordered steps, mixed prose+steps, first-unit overflow with one ellipsis
  (`truncated: true`), malformed segmenter output (fails to `needs_input`),
  `confidence`/`truncated` round trips into the explicit transport fields, the
  exact basic/default discriminator
  rejection (a non-basic `detailLevel` or non-default `guideMode` input fails
  with `assistant_docs_basic_oracle_scope_invalid`), and the invariant that
  every successful answer
  has nonempty authorized evidence plus one exact identity-only Help action;
  branch tests prove `medium | instruction | advanced` and every
  troubleshooting/decision_guide/checklist/security mode preserve the
  unchanged composer path through the `composeGuideNonBasicAnswerV2` adapter
  (never a direct `deps.composeDocsAnswer` service call) and are never routed
  through 440/2/3; the
  exact
  callable export `composeGuideBasicAnswerV1` is imported by the service (the
  undefined `composeDeterministicGuideAnswer` symbol is never referenced) and
  `mapGuideBasicOutcomeToChatV2` round-trips the full
  `answer`/`no_match`/`needs_input` matrix into the transport templates
  (`location_answer`/`how_to_answer`/`missing_answer`/`clarifying_question`)
  with injective kind/format mapping, lossless `truncated` copying, empty
  sources/evidence and no fabricated
  links on every non-answer variant; `GuideCardActionsV1.openInHelp` is the
  identity-only `DocsHelpActionV1` (never an href) and
  the UI derives hrefs exclusively through L01's `adminHelpPath`;
- `guideComposerAdapter.test.ts` (Vitest lane, pure adapter with an injected
  composer) proves the adapter's single callable `composeGuideNonBasicAnswerV2`
  maps EVERY required
  `DocsChunk`/`DocsSearchHit` field byte-for-byte from authorized complete
  ranked V2
  evidence records and asserts the complete key/value shape (stable chunk id,
  full ordered `headingPath` array — never a scalar string — `heading`,
  `lineStart`/`lineEnd`, `content`,
  `normalizedText`, `tokenCount`, the MANDATORY bounded exact `tokenCounts`,
  `docTitle` equal to the record's `document.title` — the adapter always
  populates it explicitly and never falls back to `basename(docPath)`, with
  `docPath` bound to a safe internal grouping identity only; final-answer
  tests seed `sourcePath`/filename canaries in the records and assert neither
  appears in the composed answer text or projected sources, INCLUDING every
  helper mode (`troubleshooting | decision_guide | checklist | security`) —
  `score`,
  `matchedTerms`, the exact six `rankingSignals` members, and the query-result
  `snippet`), with zero
  derivation: missing/malformed `tokenCounts` records are rejected by the
  strict normalizers before the adapter runs and the adapter never derives or
  repairs a field, drops the
  composer's path-bearing `sources` at the adapter boundary (the returned
  transport-safe projection inputs carry no path-bearing member), invokes the
  INJECTED
  UNCHANGED composer with exactly `{ question, hits, maxSources, detailLevel,
  guideMode }` and `maxSources: 3`, maps its bounded result explicitly
  through `mapComposedGuideAnswerToTransportV2`
  (including the `truncated` transport flag), proves helper-mode section
  routing (`troubleshooting | decision_guide | checklist | security` modes
  route to the expected helper sections through the unchanged composer), and
  never imports or edits the
  1,202-line composer; the focused Bun service wiring test
  (`tests/unit/assistant/assistantService.test.ts`) spies that the non-basic/
  helper branch calls `deps.composeGuideNonBasicAnswerV2` and NEVER
  `deps.composeDocsAnswer` directly; reauthorization failures reject before any
  composer
  call;
- assistant+embedded multi-target evidence cards resolve, while
  `assistant`-only, `embedded-help`-only and
  `public-docs`-only persisted records cannot leak through a forged ID;
- Guide and optional Agent evidence spies prove zero calls to
  `loadPackagedDocsDistributionBundleV2`, any publication-projection
  constructor, Markdown/parser or filesystem API per question. The era-aware
  facade executes exactly ONE backend per question; statement-count fixtures
  count ONLY application data SQL statements issued through the transaction
  handle (BEGIN/COMMIT/ROLLBACK, `SET` and protocol commands never count) and
  pin the successful-path 0/2/3 SQL
  statements on BOTH branches (empty-query 0; plain 2; enriched-with-selected-
  hits 3 — an enriched zero-hit request stays at 2 and never issues an empty
  relation query; the direct V2 retriever's `requiredEra` mismatch is the
  controlled exactly-1 case: statement 1 executes and fails closed with the
  internal sentinel, no evidence statement runs): statement
  1 is the era-RESOLVING candidate statement that returns the authoritative
  era/pointer/ACL inside its own result (before activation/after rollback the
  ACL-joined bounded V1 query against the ACL snapshot named by the pointer's
  `legacy_acl_snapshot_id`; era `v2` the active-V2 candidate query), statement
  2 loads the selected authorized evidence from exactly that era, and optional
  statement 3 loads authorized relations, with no status preflight, no
  separate era/pointer preflight statement, no
  dual-backend query and no
  N+1 relation lookup. First-start (fresh install), pre-backfill and
  serialized-deployment fixtures prove this leaf's facade cutover dispatches
  ONLY at the EXACT `shadow_parity_clean` cutover state (never merely at/past
  `backfill_complete`) with one complete prepared snapshot, the
  closed `legacy_acl_snapshot_id` binding and facade code compatible with the
  row's `deploymentIdentity`/`rolloutGeneration` (never a preexisting rollout
  receipt, which is recorded for that exact facade build after deployment and
  remains the mandatory `consumers_ready`/activation evidence),
  that pre-gate deployments keep the legacy service serving, that a facade
  binary starting without the binding fails readiness (`docs_not_ready`) with
  zero authorized rows, and that the V1-era ready result carries the
  prepared/ACL snapshot identity as its exact authorization/evidence snapshot —
  no availability gap. A reindex race returns only one complete old/new
  `{ snapshotId, generation, sourceHash }`; assert zero Guide value-cache,
  browser/admin `cacheBus`, outbox, scheduler or worker import;
- because ingest enforces `assistant` AND `embedded-help`, persisted Guide
  cards always carry one authorized Help action: assistant+embedded adds only
  Help and all-three adds Help+official; `assistant`-only and
  `assistant`+`public` records fail at ingest and can never be persisted or
  returned; an unavailable official context removes only that action, null
  `adminPath` returns `cmsAction: null`, and an unsatisfied requirement
  rejects the complete evidence before any CMS href can be serialized;
- existing chat/reindex/action auth/RBAC/CSRF/rate/error mappings remain pinned;
- panel/test modularity and all touched-file line counts.

## Sub-Tasks

- [ ] Split the oversized panel and focused interaction tests.
- [ ] Add separate typed in-memory Guide/Agent state machines and the no-read
  purge for both retired conversation-storage keys; persist no conversation
  content.
- [ ] Add the Bun-free transport contract module
  (`assistantTransportContracts.ts`) owning the Guide request-context hint
  schema (exact `AssistantDocsGuideRequestContextV1` shape/bounds), the strict
  reindex request/response unions
  (`AssistantReindexRequestV2` — no request discriminator, `{}` valid —
  /`AssistantReindexResultV2` with
  `prepared`/`unchanged`/`activated` wire outcomes) and the status/chat wire
  unions with schemas and normalizers, importing the pure
  `guideAnswerContracts.ts` owner; routes,
  service, validation schemas and admin clients import it and no leaf forks
  the unions.
- [ ] Add the Bun-free `guideAnswerContracts.ts` owner for `DocsHelpActionV1`
  (identity-only) and every path-free source/card/evidence/action DTO with
  recursive normalizers; `guideAnswerProjection.ts` becomes the server mapper
  only and imports the owner.
- [ ] Add the server-only `guideComposerAdapter.ts` (with focused pure-adapter
  suite `tests/vitest/assistant/guideComposerAdapter.test.ts`) exporting the
  single callable `composeGuideNonBasicAnswerV2`, mapping EVERY required
  `DocsChunk`/`DocsSearchHit` field byte-for-byte from complete ranked V2
  evidence records
  (stable chunk id/ordered headingPath array/heading/lineStart/lineEnd/content/
  normalizedText/tokenCount/mandatory tokenCounts/docTitle mapped explicitly
  from `record.document.title` with `docPath` as a safe internal grouping
  identity only — the composer's basename fallback is never reachable as
  user-visible text —/snippet/score/matchedTerms/
  rankingSignals), byte-for-byte with zero derivation (missing/malformed
  `tokenCounts` is rejected by the strict normalizers — no fallback and no
  derive-at-read repair), invoking the injected unchanged
  composer with exactly `{ question, hits, maxSources, detailLevel,
  guideMode }` for non-basic/helper modes, dropping path-bearing composer
  sources at the adapter boundary, projecting transport-safe projection
  inputs, and mapping its bounded result explicitly through
  `mapComposedGuideAnswerToTransportV2` (including the `truncated` transport
  flag); final-answer tests seed `sourcePath`/filename canaries and assert
  neither appears in the composed answer or projected sources, including every
  helper mode; `assistantService.ts` calls `deps.composeGuideNonBasicAnswerV2`
  (never `deps.composeDocsAnswer` directly), and the focused Bun service
  wiring test in `tests/unit/assistant/assistantService.test.ts` pins that
  call; never edit or claim the 1,202-line
  `docsAnswerComposer.ts`.
- [ ] As the sole post-TASK-548-01-L03 orchestration writer, inject canonical
  server permissions into chat, resolve the strict
  `AssistantDocsGuideSearchContextV1` server-side (locale, productVersion,
  canonical route/surface, catalog-validated capability IDs, bounded query,
  snapshot) from advisory hints, require it in every retrieval/projection
  call as the single permission-snapshot owner, DEPLOY the era-aware facade
  `searchAssistantDocsAuthoritativeV2` before activation through the
  DISPATCH/DEPLOY-GATED consumer cutover (EXACTLY `shadow_parity_clean` —
  never merely at/past `backfill_complete` — + one
  complete prepared snapshot + closed `legacy_acl_snapshot_id` binding +
  facade code compatible with the row's `deploymentIdentity`/
  `rolloutGeneration` — never a preexisting rollout receipt, which is recorded
  for that exact facade build after deployment and remains mandatory for
  `consumers_ready`/activation; before those bytes are deployed the legacy
  service remains serving; once deployed the V1 ready result uses the
  prepared/ACL snapshot identity as its exact authorization/evidence snapshot
  and a facade binary without the binding fails readiness; Guide stays
  available over the ACL-joined frozen V1 corpus until activation and over the
  active V2 snapshot after activation; activation/rollback switch ONLY the DB
  pointer and rollback restores `v1_frozen`; exactly one backend per question),
  and map all seven public
  inherited `assistant_docs_*` errors (including `assistant_docs_cutover_required`
  to HTTP 409, never collapsed into a generic 500) plus the two internal
  sentinels (the
  context sentinel to public `validation_error`/400 with bounded details; the
  cutover sentinel retained through preactivation and mapped to public
  `assistant_index_missing`/503 + `docs_not_ready`) without a client
  authorization field or permissionless fallback.
- [ ] Replace the reindex settings/source-root seam with the exact packaged
  ingest dependency; preserve route security, strict body, serialization,
  audit/result and typed mappings, pass the timeout-owned `AbortSignal`
  through (plus `requestKind: "manual"`), handle the
  `deferred_cutover_backfill`/`prepared`/`unchanged`/`activated` ingest result
  union through the ONE canonical `assertAssistantDocsIngestResultClosureV2`
  (pre-freeze `deferred_cutover_backfill` maps to the public
  `assistant_docs_cutover_required`/409 operator-required conflict with zero
  run/snapshot side effects; post-backfill
  pre-fence `prepared` is a successful pending-activation response with the
  committed v1 closure proved by the canonical closure helper — all response
  counts/identity come from the immutable result, with no current
  active/prepared status reread and no `AssistantDocsDbStatusV2.preparedSnapshot`
  comparison; post-fence
  outcomes are verified by the same canonical closure helper over the
  committed v2 closure — never a post-lock current-pointer assertion), and
  prove reindex with
  Agent disabled.
- [ ] Decouple docs-only readiness from Agent enablement without enabling Agent
  chat/provider/actions.
- [ ] Add rich Guide evidence cards only from strict active DB evidence records;
  no per-question packaged loader or corpus join.
- [ ] Export the exact callable oracle `composeGuideBasicAnswerV1` from
  `guideBasicAnswerContract.ts` with the complete input (normalized query,
  basic/default discriminators, injected locale-pinned sentence segmenter,
  evidence, confidence) and truncation/confidence-bearing outcome; call it from
  the service ONLY on the basic/default branch (never the undefined
  `composeDeterministicGuideAnswer`), preserve the unchanged composer through
  the `composeGuideNonBasicAnswerV2` adapter (the service never calls
  `deps.composeDocsAnswer` directly) for
  `medium | instruction | advanced` and every non-default guide mode, and add
  the lossless
  `mapGuideBasicOutcomeToChatV2` mapping of `answer`/`no_match`/`needs_input`
  into the Guide chat transport/template fields with boundary tests for both
  branches and malformed segmenter output; never use
  the oversized legacy composer as an unconstrained default-output bypass.
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
  tests/vitest/assistant/guideBasicAnswerContract.test.ts \
  tests/vitest/assistant/guideComposerAdapter.test.ts \
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
git diff --check
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

Every touched human-authored source/test file must be at most 1,000 lines,
measured by the canonical NUL-safe line-count gate above (a file above 1,000
makes the gate fail with `exit 1`, including a non-newline final line).
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
  canonical server-resolved permission snapshot and the strict server-resolved
  search context (canonical locale, productVersion, canonical admin
  route/surface, catalog-validated capability IDs, bounded query); client
  context can never authorize, reveal, version or route-protect evidence.
- Authorized manual reindex remains provider-independent and succeeds with
  `assistant.enabled=false` without weakening session/RBAC/CSRF/rate/validation,
  ingest serialization or typed errors.
- Post-backfill pre-fence manual reindex returns the successful `prepared`
  pending-activation
  outcome (HTTP 200, verified complete inactive snapshot, frozen V1 pointer,
  never an error status); at `v1_active`/`v1_frozen` manual reindex maps the
  bounded `deferred_cutover_backfill` ingest result to the bounded
  operator-required conflict and never creates a run or snapshot (the cutover
  backfill command is the sole preactivation producer); post-fence
  `unchanged`/`activated` outcomes are verified by the ONE canonical
  `assertAssistantDocsIngestResultClosureV2` over each result's
  transaction-verified committed closure — no post-lock current-pointer
  assertion and no stale assertSame/status helper chain. The transport reindex
  request has no discriminator
  (`{}` valid) and the response is the true three-member
  `AssistantReindexResultV2` literal union
  (`prepared` with `activated: false`, `changed` true/false and the literal
  `activeSnapshotId: null`;
  `unchanged` with `activated: true`/`changed: false`; `activated` with
  `activated: true`/`changed: true`; active snapshot equals the result for the
  post-fence members), whose PURE one-argument normalizer checks each member
  independently
  (never `changed === (outcome === "activated")`)
  and rejects mixed members, while the committed active-pointer closure for the
  post-fence members is verified ONLY by the canonical closure helper after
  ingest (never by the normalizer, never by a racy post-lock read);
  the internal `assistant_docs_search_context_invalid`
  maps to public `validation_error`/400 with bounded details and the internal
  `assistant_docs_v2_consumer_not_ready` maps to public
  `assistant_index_missing`/503 + `docs_not_ready`, neither sentinel code
  becoming a public error code and the cutover sentinel retained through
  preactivation; the seventh public error `assistant_docs_cutover_required`
  maps to HTTP 409 for manual preactivation/backfill/source-drift operator
  action and is never collapsed into a generic 500, while startup's internal
  `deferred_cutover_backfill` result remains non-HTTP.
- Guide availability has NO gap through the cutover: this leaf deploys the
  era-aware facade `searchAssistantDocsAuthoritativeV2` before activation
  through the DISPATCH/DEPLOY-GATED consumer cutover (EXACTLY
  `shadow_parity_clean` — never merely at/past
  `backfill_complete` — + one complete prepared snapshot + closed
  `legacy_acl_snapshot_id` binding + facade code compatible with the row's
  `deploymentIdentity`/`rolloutGeneration` — never a preexisting rollout
  receipt, which is recorded for that exact facade build after deployment and
  remains mandatory for `consumers_ready`/activation), so
  Guide is served by the ACL-joined frozen V1 corpus until activation and by
  the active V2 snapshot after activation; activation/rollback switch ONLY the
  DB pointer, and exactly one backend is queried per question with zero
  unauthorized bytes on both sides of the switch; a facade binary starting
  without the binding fails readiness (`docs_not_ready`) with zero authorized
  rows, which the canonical deploy order prevents (first-start/pre-backfill/
  serialized-deployment fixtures prove no availability gap and no facade
  dispatch before the gate).
- Agent remains optional, provider-backed, review-first, permission-aware,
  idempotent, audited, and isolated from Guide failure.
- Rich Guide cards use the once-built source-hash registry, perform no per-query receipt I/O/normalization, and degrade safely.
- Handoff is explicit, redacted, bounded, reviewable, and never auto-sent.
- Conversation content is memory-only; legacy localStorage keys are purged
  without hydration and no Guide evidence or Agent plan/result enters browser
  persistence.
- Existing assistant API security and reject-unknown behavior is not weakened.
- `AssistantPanel.tsx` and every other touched production/test file is at most
  1,000 physical lines.

## Documentation Updates Required

Hand Guide/Agent isolation, storage retirement, handoff, and security behavior to
TASK-548-07; this leaf edits no shared closeout documentation.
