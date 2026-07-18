# TASK-540-04: Dirty Navigation and Async/Cache Recovery

# FileName: TASK-540-04-Dirty-Navigation-And-Async-Cache-Recovery.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Admin State / Cache / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01, TASK-540-03
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Fix Started:** 2026-07-17
**Implementation Complete:** 2026-07-18 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Historical Implementation Complete:** 2026-07-15 — the earlier cacheBus/mock repair phase completed before the current L03/L04 corrections.
**Repair Reason:** A fresh post-audit reopened L03 because the bounded 201-direct-image path rendered a transient load message and dead-end `Retry` for a structural overflow that performs zero media reads. L03 now distinguishes retryable load failures from a non-retryable visible overflow; focused revalidation has passed and a fresh clean post-audit remains pending.
**Post-Audit Overflow Retry Repair:** 2026-07-17 — L03 carries an explicit media error kind through its pure plan, hook, route session, and layout, preserves transient retry, and removes the impossible retry affordance from the bounded overflow. The exact owner gate passed and is recorded by L03's exact `Revalidation Passed` receipt.
**Historical Compatibility Revalidation:** 2026-07-16 — before the Page/cache-bus split, L03 retained its exact five-path media override receipt and L04 passed post-change static gates, isolated binding-flow 3/3, and the then-current ten-file matrix 98/98. This receipt is superseded by the 2026-07-17 final fifteen-file/98-test owner receipt and does not govern any current or repeated validation.
**Historical Pre-Modularity L03 Revalidation:** 2026-07-16 — against HEAD `040604e7e3d5232a5fb2fcb6a05e149295a89a77` plus L03's then-five dirty owner paths, core/root static gates passed; expanded L03 Vitest passed 258/258, isolated cacheBus 22/22, L04 read-only consumers 98/98, DB preflight was reachable, and the then-current pre-split registered Custom Screens routes passed 20/20 with 118 expectations; `git diff --check` passed. This is historical pre-modularity evidence only and does not gate the current overflow repair.
**Modularity Repair Revalidated:** 2026-07-17 — all eight family source-owner modularity receipts existed and the family line gate reported zero blockers before the current L03 overflow repair. This remains split/line evidence only; L03 now has no `Repair Pending` and is landed, while closure returns to its pre-closure frontier after a fresh clean post-audit.
**Historical Pre-Overflow Post-Audit Hygiene Revalidated:** 2026-07-17 — L03 removed its dead fixture and tautological settlement comparisons while preserving fail-closed request/generation authority; L04 removed synthetic source projection and added the exact five-module Page-family verifier. Focused static/test/line gates and fresh scoped audits were green at that checkpoint; the current L03 overflow repair supersedes its behavior-gate state.
**Historical Pre-Overflow Subsequent Post-Audit Repair Revalidated:** 2026-07-17 — L03 then performed one forced content-type read per initial Entry visit and degraded a 201-ID presentation-media plan to the bounded visible error without a render crash or media request. The exact twenty-two-file L03 gate passed 258/258, the final fifteen-file L04 read-only consumer gate passed 98/98, and core/root static, all-family name/body, line, workflow, and diff gates were green at that checkpoint. The current L03 overflow repair supersedes that behavior gate.
**Historical Pre-Overflow Post-Audit Final-Gate Contract Revalidated:** 2026-07-17 — L03 then marked the historical transient handoff as superseded and named the final 15-file, 98-test L04 consumer matrix as the sole repeat-validation authority; workflow checks and a fresh zero-finding audit passed. The current L03 overflow repair supersedes that behavior gate and prepared closure state.
**Historical Cache Repair Reason:** Closure validation reproduced duplicate remote invalidation when canonical and legacy cache transports delivered the same serialized event. That scoped 2026-07-15 cacheBus/test plus additive route-evidence repair remains durable historical evidence.
**Historical L04 Fix Started:** 2026-07-15
**Historical L04 Repair Reason:** Mandatory repository-wide `bun run test` confirmed that the legacy `screen-editor-sections.test.tsx` Save flow lacked the fresh-symbol cacheBus factory required by the L04-owned `CustomScreenEditorPage`. L04 added only that mock export and passed its exact six-file re-gate; L01 through L03 remained historically Done, and closure resumed.
**Historical L04 Completion:** 2026-07-15
**Historical Completion:** 2026-07-14
**Historical Reopen:** 2026-07-14 (final post-audit: stale detail-cache publication and mixed-case media UUID projection)
**Historical Corrective Revalidation:** 2026-07-14 — L01 exact Entries/Media gate 65/65; core lint/typecheck and diff check green; fresh L01 post-audit zero findings
**Historical Previous Completion:** 2026-07-14
**Historical Previous Revalidation:** ✅ Passed (L01 exact gate 57/57; L03 exact gate 161/161; static gates green)
**Changelog:** 1252 (pinned; closure only)

---

## Scope

Make related-entry and media reads retryable, authoritative, and cancellation-safe;
subscribe entry hosts to every relation target cache; extend direct-image
presentation overrides without converting media-field UUIDs to URLs; and guard both
Screen builder and entry drafts with the shared navigation/beforeunload contract.
Dirty content and presentation state always wins over background hydration, including
when the user edits after a background request has already started.

## Leaves and strict order

| ID | Title | Exclusive source ownership | Status |
|---|---|---|---|
| TASK-540-04-L01 | Make related-entry and media promise caches retryable | `entriesClient.ts`, `mediaClient.ts`, Entries harness/three-suite split, and Media suite | 🚧 In Progress |
| TASK-540-04-L02 | Cancel and retry related-entry loads | shared Screen hook, Preview dialog, and hook/Preview tests | 🚧 In Progress |
| TASK-540-04-L03 | Guard entry drafts, expand direct-image presentation targets, resolve presentation media UUIDs, and correlate mutation cache events | stable Entry Editor facade/eight extracted owners, canvas/read-only Preview, `customScreensClient.ts`, cache-bus substrate, override contract/service, four split test families/support, and assigned suites | 🚧 In Progress |
| TASK-540-04-L04 | Guard Screen builder drafts | stable Screen Builder facade/seven extracted owners, additive editor-path helper, Page harness/four-suite split, route/binding/recovery seams, and read-only cache-bus/client production seams | 🚧 In Progress |

## Mandatory parent modularity sequence

The immutable historical pre-split evidence is below. L01, L03, and L04 have resolved
all eight child-owned rows; the table remains frozen as baseline provenance:

| Leaf | Path | Lines | SHA-256 |
|---|---|---:|---|
| TASK-540-04-L01 | `tests/vitest/admin/entriesClient.test.ts` | 1,893 | `011bdef52770f4943daf9f33fcf25a5597e537c386ae3347102020875c17c9a5` |
| TASK-540-04-L03 | `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` | 2,235 | `9d1c59d48e9c5de8f81d3acaa01583ea04efeab8438bb837af1db392cdd17001` |
| TASK-540-04-L03 | `tests/vitest/admin/cacheBus.test.ts` | 1,165 | `301c51a4725dca5ef159ab18e21ea5afda1a457730c616f4e08dc1c0d82de024` |
| TASK-540-04-L03 | `tests/vitest/admin/customScreensClient.test.ts` | 1,359 | `3e529d58401b62b3cc097d9ddfd51df1b6247b75c9ff8fc2043caecd57aecdda` |
| TASK-540-04-L03 | `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx` | 1,141 | `b336092db65daf52c6d9c381d7e5fc5cbb22206095aae719d98de274de7ebb86` |
| TASK-540-04-L03 | `tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx` | 1,079 | `ded6ce43edb92875c1af0787aa66c010049328de3cf701eb4003d25b9d2b92b6` |
| TASK-540-04-L04 | `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | 1,594 | `66c399215f25a00b123869a56a709e5a02bd53606c72db1966b2477eb24c0ba7` |
| TASK-540-04-L04 | `tests/vitest/ui/custom-screens-page.test.tsx` | 2,313 | `79734548b7374ae24fae034acda989bf5c66d29aa94cd882e933400f8596766f` |

Each leaf's final receipt covers every extant history/current/untracked production,
test, and test-support owner path as `{ path, owner, lines, sha256 }`; all must be
`<= 1000`.
Staging or intermediate commits cannot reset the full baseline scope. L01 preserves its
exact 42-name Entries family, L03 preserves the exact 40-name Custom Screens client,
22-name cacheBus, 17-name Entry-restyle, and 22-name navigation families, and L04
preserves the exact 36-name Page family. Every resulting suite remains independently
runnable. These names join the global protected 347-name multiset; no line or
test-integrity violation is eligible for TASK-9999.

## Corrective workflow

The earlier five-owner corrective work completed sequentially across
`540-01-L01 → 540-03-L01 → 540-04-L01 → 540-04-L03 → 540-05-L02`; its durable evidence
is the affected task files' historical revalidation/post-audit metadata,
not the mutable `_docs/_workflows/task-540-fix.mjs` file. That current file records only
the later completed R01→R03 URL-control correction. Mandatory repository-wide testing on
2026-07-15 then exposed the L04-owned `CustomScreenEditorPage` Save dependency missing
from the legacy `screen-editor-sections.test.tsx` full-module cacheBus mock. L04 completed
the one-property compatibility repair and exact six-file/66-test re-gate; L01 through L03
and every non-L04 source descendant remained Done at that point. Closure validation then
reproduced canonical+legacy twin delivery of one serialized remote cache event, and
contract audit required direct-image route-boundary coverage at the strict write seam.
The phase-neutral repair state machine designated L03 as the sole repair owner with
exactly three writable paths: `core/admin/utils/cacheBus.ts`,
`tests/vitest/admin/cacheBus.test.ts`, and additive regressions in
`tests/integration/routes/customScreensRoutes.test.ts`; production route code remains
read-only. The focused cache-bus gate, expanded L03 owner/dependency gate, L04 read-only
consumer gate, direct-image Bun/DB route gate, core lint/typecheck, root typecheck,
workflow self-tests, and diff check all passed, and the exact `Repair Pending` receipt
was replaced by its matching `Revalidation Passed` successor. At that historical
checkpoint L03 and TASK-540-04 remained `🚧 In Progress` with `Implementation Complete`
until changelog 1252. L04 was later reopened and revalidated for its binding-ID
compatibility test. Before the hard
line rule was introduced, those receipts would have returned the graph to the prepared
pre-closure boundary. The later L01/L03/L04 modularity sequence, downstream L01
authoring-boundary handoff, and L02 test splits all passed their exact gates; all eight
receipts and the zero-blocker line gate placed the family at the closure frontier at
that historical checkpoint. The L03 overflow repair has since passed its fresh gate;
a fresh clean five-lens post-audit is the next closure gate.

## Shared contract

- Pending entry/media reads are de-duplicated only while in flight. Priming helpers
  mutate value caches only. Only the exact request still occupying its pending slot
  may publish a value or clear that slot. Exported cached loaders return the stored
  promise directly so concurrent non-force callers receive the same promise object.
  Every successful write-derived entry upsert, status update, or removal revokes its
  matching pending detail and records a typed value/patch/tombstone; it keeps an older
  full-list request so reconciliation can fill unrelated rows. Media upsert/removal
  remains list-only and revokes its pending read even when no value cache exists.
- Entry and Custom Screen list/detail publishers additionally share a monotonic
  per-resource authority ledger. A full-list response reconciles against every newer
  pending detail or successful mutation: it fills unrelated rows, preserves newer
  values/creates, and honors newer deletion tombstones. A detail response updates only
  its exact still-authoritative item and never collapses a complete list to one row.
  List-start→detail and detail-start→list are pinned in both settlement orders. A
  Custom Screen detail fallback that fetched the list publishes the reconciled complete
  list, not only its matched row. Rejected reads/writes do not erase the last successful
  item authority, and explicit clear invalidates every captured continuation.
- Scoped presentation-override GETs obey the same exact pending-promise authority:
  concurrent non-force callers share the stored promise, forced B supersedes A, and only
  the exact registered request publishes or cleans up. A successful PATCH revokes a
  pre-write pending GET before value-cache publication even when no value cache exists;
  rejected PATCH does not revoke, prime, or broadcast.
- Related loaders expose visible retry state, catch every rejection, and discard
  results after unmount/input generation change.
- Related committed state carries normalized request identity separately from attempt/
  retry identity. A request mismatch derives empty/loading so prior-target rows never
  appear under a new target; a same-request background attempt retains current rows,
  exposes refreshing state, and still generation-guards every commit.
- One immutable normalized relation plan is derived from the exact binding/field/data
  flow used by the resolver. Missing bindings and empty normalized selected-ID sets
  produce no target read. Target-list load identity is separate from per-block projection
  identity, so a projection A→B change during a forced same-target load consumes a fresh
  authoritative target result instead of falling back to an older value cache. Every
  requested target subscribes to `cacheKeys.entriesList`; initial attempts are non-force,
  while manual retry and cache-event attempts are explicitly forceful. Each unique
  attempt receives a reducer-persisted globally monotonic, never-reused token for initial,
  input-change, inherited-force, manual, and cache-event transitions, reads each unique
  target slug exactly once, and distributes that one target result to every consumer.
  Each reducer attempt owns its frozen plan; `settledToken` is separate, settlement never
  replaces the stable attempt object, and exhaustive discriminated action handling makes
  stale settlements strict no-ops. The sync trigger is only the lossless normalized input
  key, never raw plan identity. Effects use accepted-attempt object changes plus local
  cleanup, with no `generationRef` or render-time current-plan/current-token ref writes;
  semantic rerenders and ignored force actions cannot invalidate the active attempt.
  Settlement identity plus success/error payload publish atomically in the reducer after
  exact input/request/token validation; a layout current-input guard rejects results in
  the render→passive-cleanup window. Canonical plan identity is explicitly typed JSON
  tuple serialization with strict round-trip validation, not a magic serializer/decoder.
- Builder dirty guard covers its document/binding changes. Entry dirty guard
  covers content and presentation changes. Every local mutation synchronously advances
  a generation and updates dirty refs. Presentation saved/draft refs, the dirty ref, and
  render-visible dirty state transition together; change-then-revert and a stale save
  baseline equal to the current draft become clean for both navigation and hydration.
  No passive effect mirrors presentation dirtiness. Every initial/background request guards all
  success, bounded error/warning, and loading-finalization commits by route, channel,
  request generation, and unmount identity. Draft generation plus dirty refs form an
  additional barrier only for authoritative draft replacement; a current dirty success
  emits a bounded external-update warning, a current dirty rejection reports that local changes
  are unchanged, and current `finally` still ends the spinner. Independent entry and
  override hydrations use separate load generations so starting one never cancels the
  other. Confirm synchronously clears all applicable refs/flags before blocker-skipping
  navigation.
- Hydration catch classification is fail-safe: generic load/API failure copy is shown
  only when the captured draft generation remains exact and every relevant dirty ref is
  false (`content` + `presentation` for entries, builder dirty for Screens). Any dirty
  ref or generation mismatch uses bounded local-changes-unchanged copy.
- Entry and builder route identity is established/inactivated without writing a
  current-route ref during render. Both editors own a `key={routeKey}` inner session and
  one opaque `RouteVisit` allocated for that mount; layout cleanup increments every owned
  load/save/media generation, revokes any captured create target, and clears assistant
  context before late commits. Entry/override and builder committed state, errors,
  warnings, notices, activity, async tokens, stale-create targets, and media commits carry
  the exact visit identity. This prevents first-visit A state from becoming current again
  after A→B→A merely because the serialized route key matches. Per-effect active cleanup
  covers the route-render → passive-cleanup window without synchronous effect state.
  Until the current channel has authoritative visit/route authority, old
  screen/content/draft/override data, related/media inputs, errors/warnings/notices,
  assistant context, and save activity are neither rendered nor mutable.
- Every entry-content, presentation, and Screen-builder update/create save captures the
  route/channel save generation and draft generation before awaiting. Only an exact
  response may replace the draft, clear the matching dirty ref, or auto-navigate. If an
  edit lands in flight, the response advances only safe server baseline state, preserves
  the newer draft/dirty state, and shows a bounded notice. A stale create response stores
  its server ID so Retry PATCHes rather than duplicates; an exact retry response clears
  the draft and auto-navigates to that captured ID with the canonical domain route helper.
  Entry and builder captured IDs are scoped to the exact create `RouteVisit` + generation.
  Both are synchronously cleared on route cleanup and confirmed discard, so create A can
  never make create B PATCH A. Retry failure stays dirty
  and does not navigate. Entry retries use the workspace-entry helper; Screen builder
  retries use the canonical Screen-editor helper and preserve `/advanced/custom-screens/:id`.
- Entry, override, and Custom Screen clients broadcast same-tab cache updates before their
  save promises resume. Entry/override saves invalidate their matching pre-response load
  generation. The Screen builder additionally installs an exact visit/save token before
  its client call. The shared cache bus supplies backward-compatible `local`/`remote`
  delivery provenance plus an optional non-serialized operation token. L03's mutation
  client forwards the editor's exact token to both local list/detail events. Only matching
  token events are self-events; remote events and independent same-context writers remain
  visible and advance a visit-scoped external-event generation. Only the current Screen
  detail key is an external mutation signal; generic list events cannot identify the
  resource and are ignored by the builder. Every non-self detail event synchronously marks
  an unresolved external revision in both ref and visit-scoped render state, blocks stale
  full-document saves without invalidating the resolving forced GET, and clears only after a
  current forced hydration succeeds. Dirty refresh requires explicit discard confirmation and
  synchronously restores the last persisted baseline before the forced read, so failure never
  presents discarded authored values as clean.
  Neither external events nor manual Refresh may start hydration while the save token is active. Save settlement clears
  only warnings that predate its captured external-event generation. Any older hydration that
  settles while the token is active cannot publish or advance the draft generation. Only
  identity-current settlement, discard, or route cleanup clears that token; the response
  then invalidates its visit's hydration/loading state and only pre-capture warnings before
  advancing the baseline. Other Screen cache events consult the synchronous dirty ref,
  never a delayed
  rendered-state closure.
- One logical remote event mirrored over the canonical and legacy channel/storage
  families is delivered once per subscription and occurrence. L03 owns a private
  per-subscription canonical/legacy multiset keyed by
  `JSON.stringify([sourceId, ts, key, action])`, strict bounded parsing that rejects any
  non-exact own-key set, and a true 128-entry residual LRU that touches repeated residual
  identities and evicts oldest fail-open. Malformed and own-source input is rejected
  before any correlation/LRU mutation. Canonical-only, legacy-only, identical repeated,
  and asymmetric per-subscription occurrences remain lossless; correlation commits
  before handler invocation so a throwing canonical handler is not retried by its legacy
  twin. Local broadcasts bypass correlation and retain exact operation-symbol identity.
  Storage fallback rejects more than 2048 code units before parsing and removes each
  canonical/legacy key immediately before setting it so an identical later occurrence
  re-emits.
  This changes no payload, exported API, cache key, route, or intended UI/UX contract; it
  deliberately reduces a mirrored remote event from two refresh attempts to one.
- Cache refreshes use existing `keepUnsaved` behavior and must never replace a dirty
  draft, even when the request began while the draft was clean. Successful create-save
  navigation uses `{ skipBlockers: true }` only after persistence succeeds and captured
  draft authority is still exact.
- Presentation overrides remain media UUIDs. A direct-image target accepts the winning
  presentation UUID, while a media field retains its UUID for MediaPicker. The entry
  host resolves only winning direct-image IDs from either an override or bound media
  value via the L01-authoritative `listMediaCached`, forwards an identity-keyed UUID→URL
  map through both editable Canvas and non-editor/read-only Preview branches, and loads a
  frozen sorted ID snapshot keyed by full Screen/entry/create route identity plus
  a reducer-persisted monotonic attempt token. Semantically identical rerenders cannot
  duplicate a forced read; ID changes during a pending forced global-media request inherit
  force. Media settlement updates a separate `settledToken` without replacing the stable
  attempt object; exhaustive stale actions are no-ops and no render-time identity refs
  are used. Every commit remains generation/unmount guarded. The renderer owns final URL
  sanitization; a missing or
  unsafe winning direct-image asset does not fall back.
- The Custom Screens admin response/cache normalizer imports the Bun-free,
  service-owned override normalizer and fail-closed-validates media override UUIDs
  before browser persistence or rendering. A malformed override response/cache envelope
  is rejected or evicted; an arbitrary string can never become a direct-image URL. The
  exact modes are three-key `draft-cache`, Date-metadata `repository-record`, and ISO-
  metadata `transport-response`. Repository mode preserves Date metadata for service
  active filtering and route output; transport mode projects to drafts only at the admin
  cache boundary. Every whole list validates first and imports the canonical media UUID
  predicate from `customScreenSchemas.ts`.

## Physical test ownership

- TASK-540-03-L01 exclusively owns
  `custom-screen-runtime-renderer.test.tsx` and
  `custom-screen-record-interactions.test.tsx`; TASK-540-04 leaves may run them
  read-only but never edit them.
- TASK-540-04-L01 exclusively owns `entriesClient.test.ts`,
  `entriesClientReadAuthority.test.ts`, `entriesClientMutationReconciliation.test.ts`,
  `support/entriesClientTestHarness.ts`, and `mediaClient.test.ts`.
- TASK-540-04-L02 exclusively owns its new hook suite plus the Preview dialog suite;
  the existing related resolver suite is read-only for this leaf.
- TASK-540-04-L03 exclusively owns `custom-screen-entry-editor-restyle.test.tsx`,
  `custom-screen-entry-presentation-media.test.ts`,
  `custom-screen-entry-draft.test.ts`,
  `custom-screen-entry-navigation-guard.test.tsx`,
  `custom-screen-entry-navigation-authority.test.tsx`,
  `support/customScreenEntryNavigationHarness.tsx`, and
  `screenEntryPresentationOverrides.test.ts`; the admin families are
  `customScreensClient.test.ts` + `customScreensEntryOverridesClient.test.ts` + their
  support harness and `cacheBus.test.ts` + `cacheBusCorrelation.test.ts` +
  `cacheBusHardening.test.ts` + their support harness. They preserve strict UUID
  response/cache normalization and exact same-context operation correlation. Its
  exclusive source ownership includes
  `CustomScreenEntryEditor.tsx`, `CustomScreenEntryRouteSession.tsx`,
  `CustomScreenEntryEditorLayout.tsx`,
  `CustomScreenEntryPresentationPanel.tsx`, `customScreenEntryRuntime.ts`,
  `customScreenEntryPresentation.ts`, `customScreenEntryPresentationMedia.ts`,
  `hooks/useScreenEntryHydration.ts`,
  `hooks/useScreenEntryPresentationMedia.ts`, `customScreensClient.ts`, `cacheBus.ts`,
  `screenEntryPresentationOverrideContract.ts`, and
  `screenEntryPresentationOverrides.ts` in addition to the entry editor/canvas.
  `CustomScreenPreview.tsx` is also owned only to add optional pass-through props; absent
  props preserve its existing builder/list and retained compatibility output. The
  record-interactions and retained Preview compatibility suites run read-only. During
  the completed 2026-07-15 repair, L03's only writable files were
  `core/admin/utils/cacheBus.ts`, `tests/vitest/admin/cacheBus.test.ts`, and additive
  direct-image route-boundary regressions in
  `tests/integration/routes/customScreensRoutes.test.ts`. That third path is a narrow
  historical repair-specific ownership exception; it is not silently added to a future
  L03 repair. For a new exact evidence-backed post-audit or final-drift finding, the
  pre-closure fixer uses L03's full original `allowedFiles` declared by the workflow,
  including `screenEntryPresentationOverrideContract.ts`, and remains bounded by the
  exact finding prompt plus post-agent `touchedFiles` verification. After closure it may
  add only the TASK-540 root, TASK-540-04 child, and exact L03 task contracts for
  evidenced contract findings; task-state transitions remain separate.
- TASK-540-04-L04 exclusively owns the stable `CustomScreenEditorPage.tsx` facade,
  `customScreenEditorModel.ts`, `hooks/useCustomScreenEditorPersistence.ts`,
  `hooks/useCustomScreenDocumentActions.ts`, `CustomScreenEditorPreviewOwner.tsx`,
  `CustomScreenEditorSettingsPanel.tsx`, `CustomScreenEditorLayout.tsx`, and
  `CustomScreenEditorRouteSession.tsx`; the additive `buildCustomScreenEditorPath`
  seam in `routeParams.ts`; `custom-screens-page.test.tsx`,
  `custom-screen-editor-draft-and-save.test.tsx`,
  `custom-screen-editor-hydration-authority.test.tsx`,
  `custom-screen-editor-visit-authority.test.tsx`, their page harness,
  `custom-screen-route-params.test.ts`, and
  `custom-screen-editor-binding-flow.test.tsx`. It also owns only the additive
  `createCacheEventOperationToken: () => Symbol()` mock export in
  `custom-screen-section-recovery.test.tsx`; TASK-505's behavior assertions remain frozen
  and may not be re-baselined. The 2026-07-15 repair additionally owns only the identical
  additive `createCacheEventOperationToken: () => Symbol(),` property in
  `screen-editor-sections.test.tsx`; all nine TASK-500 tests and all of their assertions,
  imports, and every other mock byte remain frozen. It consumes L03-owned
  `customScreensClient.ts`, `cacheBus.ts`, `customScreensClient.test.ts`, and
  `cacheBus.test.ts` read-only; no cache key, serialized payload, or transport changes.
  That one-property path records only the completed historical repair and does not
  permanently narrow L04 repair authority. For a new exact evidence-backed post-audit
  or final-drift finding, the fixer uses L04's full original `allowedFiles`, including
  its production and owned test paths. The `screen-editor-sections.test.tsx` seam remains
  fixture-only and is touched only when the finding requires it; the exact finding prompt
  plus post-agent `touchedFiles` verification bound every mutation.

## Completed Entry Editor modularity handoff

The root `AGENTS.md` line-limit rule is a blocking closure gate, not a non-blocking LOW
and not a `TASK-9999` candidate. L03 owned and completed the cohesive split of its Entry
Editor source and restyle test while preserving the public import path and every
currently exported helper behind one-way dependencies:

```text
CustomScreenEntryEditor.tsx
└── CustomScreenEntryRouteSession.tsx
    ├── customScreenEntryRuntime.ts
    ├── customScreenEntryPresentation.ts
    ├── hooks/useScreenEntryHydration.ts
    ├── hooks/useScreenEntryPresentationMedia.ts
    │   └── customScreenEntryPresentationMedia.ts
    └── CustomScreenEntryEditorLayout.tsx
        └── CustomScreenEntryPresentationPanel.tsx
```

The wrapper may import the route session and re-export pure helpers. The route session
may compose hooks, pure helpers, and views. Hooks must not import views; views must not
import the route session or hooks; pure modules must not import React, admin clients,
runtime/server adapters, DB modules, or Bun APIs. No generic helper dumping ground is
allowed. The detailed file budgets, pseudocode, compatibility surface, test partition,
and targeted gates are authoritative in TASK-540-04-L03.

`tests/vitest/ui/custom-screen-authoring-boundary.test.ts` remains exclusively owned by
TASK-540-05-L01. L03 did not edit it. After the L03 and L04 final module graphs landed,
L01 added every new Entry Editor production module above to its forbidden-import
coverage and passed that suite read-only against the final module graph. That historical
handoff ran in order: L03 split/target gate → L04 split/target gate → TASK-540-05-L01
boundary update/gate → TASK-540-05-L02 split/target gate. At that checkpoint the
modularity handoff and physical-line owner gates no longer blocked entry into closure.
The L03 overflow repair is revalidated and no longer independently blocks closure; the
fresh family-wide five-lens post-audit is next, while smoke, changelog, and closure remain outstanding.

Before closure, count complete physical lines, including blanks/comments and an
unterminated final line, for every family-scoped human-authored production, test, and
support module derived from the verified pre-family history rather than the current
HEAD diff. Every file must report `<= 1000`; only AGENTS.md exemptions apply. After all
ten protected test families are split, their exact 347-name multiset is unchanged and
the authoritative family matrix is 64 Vitest + 18 Bun = 82 files, comprising 81
source-owner/read-only dependency files and one closure-owned aggregate. Workflow and
TASK-540-06 must pin those totals and independently runnable suite paths before the full
gate without changing pinned changelog 1252.

## Security Contract

- **Visibility/endpoints:** session-admin traffic only under the existing internal
  `/admin/api` prefix. The API-related scope is limited to the existing route templates
  `GET|POST /admin/api/custom-screens`,
  `GET|PATCH|DELETE /admin/api/custom-screens/:id`,
  `GET|PATCH /admin/api/custom-screens/:screenId/entries/:entryId/overrides`,
  `GET /admin/api/content-entries`, `GET|POST /admin/api/content/:type/entries`,
  `GET|PATCH|DELETE /admin/api/content/:type/entries/:id`,
  `PATCH /admin/api/content/:type/entries/:id/metadata`,
  `POST /admin/api/content/:type/entries/:id/duplicate`,
  `POST /admin/api/content/:type/entries/:id/preview`,
  `POST /admin/api/content/:type/entries/:id/publish`,
  `POST /admin/api/content/:type/entries/:id/unpublish`, and
  `GET /admin/api/media`.
  This task adds no route and keeps `core/server/routes/customScreenRoutes.ts` read-only
  during the current regression repair.
- **Authentication/RBAC:** the HttpOnly session cookie is the only auth model.
  Custom Screen, override, and content-entry reads require `content:read`; their writes
  require `content:write` (with existing `content:publish` checks still applying to any
  publish transition). The media-list dependency requires `media:read`. No permission is
  widened or bypassed.
- **CSRF/rate limits:** every POST, PATCH, or DELETE remains CSRF-protected. GET requests
  are classified as `admin_read`; writes are classified as `admin_write`. The shared
  authenticated-admin rate-limit bypass remains unchanged, so this contract does not
  claim that successful session requests consume those counters.
- **Validation/anti-abuse:** Custom Screen, override, and entry write schemas remain
  strict reject-unknown, and browser/service normalizers continue to fail closed before
  persistence, rendering, or caching. There is no API-key mode or public write, so no
  public nonce, signature/HMAC, or CAPTCHA path applies. Cache keys and errors contain
  resource identities only; no content, secret, credential, or auth token is placed in
  browser storage or logs.

## Historical revalidation evidence

The 2026-07-14 corrective pass repaired stale entry and Screen detail-cache publication,
made forced Screen list/detail reads identity-authoritative and retryable, and preserved
exact requested media UUID keys across canonical record lookup. At that checkpoint,
reopened L01 had atomic monotonic list/detail reconciliation, replayable
replace/status/delete authority, success-only invalidation, and captured-clear safety;
its exact owner gate passed 65/65 with static checks and a zero-finding post-audit.
Reopened L03 then published complete fallback lists and reconciled monotonic Screen
list/detail/mutation authority; its exact
nine-file owner gate passed 181/181 with `core` lint/typecheck, root typecheck, diff
check, and a zero-finding fresh post-audit. Those receipts remain historical. The
phase-neutral repair state machine designated L03 as the sole repair owner. Its exact
three writable paths and full required re-gate were complete at that checkpoint. The
former `Repair Pending` receipt was then replaced by the exact successor
`Revalidation Passed`; L03 then remained `🚧 In Progress` with `Implementation Complete`
until the later overflow repair superseded and reopened that state, then restored it
under the current exact successor receipt. L04 was
separately revalidated for its then-current binding-ID compatibility test and provenance
gate. L04's narrow 2026-07-15 mock repair
and six-file/66-test gate remain historical evidence only. TASK-540-06 retains
ownership of the fresh family-wide audit, aggregate gates, runtime smoke, and final
changelog/board closure.
