# TASK-540-04: Dirty Navigation and Async/Cache Recovery

# FileName: TASK-540-04-Dirty-Navigation-And-Async-Cache-Recovery.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Admin State / Cache / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01, TASK-540-03
**Status:** ✅ Done
**Started:** 2026-07-13
**Completed:** 2026-07-14
**Revalidation Passed:** 2026-07-14 — corrective L03 and L04 gates passed with core type/lint, root `tsc`, and exact Vitest matrices (155/155 and 57/57)
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
| TASK-540-04-L01 | Make related-entry and media promise caches retryable | `entriesClient.ts`, `mediaClient.ts`, and their admin Vitest suites | ✅ Done |
| TASK-540-04-L02 | Cancel and retry related-entry loads | shared Screen hook, Preview dialog, and hook/Preview tests | ✅ Done |
| TASK-540-04-L03 | Guard entry drafts, expand direct-image presentation targets, resolve presentation media UUIDs, and correlate mutation cache events | entry editor/canvas/read-only Preview, `customScreensClient.ts`, cache-bus substrate, the Bun-free override contract + service, and assigned suites | ✅ Done |
| TASK-540-04-L04 | Guard Screen builder drafts | Screen editor page, additive editor-path helper, route/Page/binding-flow tests, and the recovery-suite cacheBus mock seam; read-only cache-bus/client production seams | ✅ Done |

## Corrective workflow

The L04 post-audit correction was executed through
`_docs/_workflows/task-540-fix.mjs`: it accepted completed earlier leaves, landed the
L03 cache-bus/client substrate first, gated it, then landed and gated the L04 editor
consumer. The canonical `_docs/_workflows/task-540-implement.mjs` now validates that
historical corrective evidence, classifies all four leaves as landed, and resumes at
the first later unlanded leaf. Neither workflow may rerun or mutate these completed
leaves.

## Shared contract

- Pending entry/media reads are de-duplicated only while in flight. Priming helpers
  mutate value caches only. Only the exact request still occupying its pending slot
  may publish a value or clear that slot. Exported cached loaders return the stored
  promise directly so concurrent non-force callers receive the same promise object.
  Every successful write-derived entry upsert, status update, or removal and every
  media upsert/removal revokes the relevant pending read even when no value cache exists,
  before any value prime or cache event can expose the mutation.
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
- TASK-540-04-L01 exclusively owns `entriesClient.test.ts` and `mediaClient.test.ts`.
- TASK-540-04-L02 exclusively owns its new hook suite plus the Preview dialog suite;
  the existing related resolver suite is read-only for this leaf.
- TASK-540-04-L03 exclusively owns `custom-screen-entry-editor-restyle.test.tsx`,
  `custom-screen-entry-draft.test.ts`, the new
  `custom-screen-entry-navigation-guard.test.tsx`, and
  `screenEntryPresentationOverrides.test.ts`, plus `customScreensClient.test.ts` and
  `cacheBus.test.ts` for strict UUID response/cache normalization and exact
  same-context operation correlation. Its exclusive source ownership includes
  `customScreensClient.ts`, `cacheBus.ts`,
  `screenEntryPresentationOverrideContract.ts`, and
  `screenEntryPresentationOverrides.ts` in addition to the entry editor/canvas.
  `CustomScreenPreview.tsx` is also owned only to add optional pass-through props; absent
  props preserve its existing builder/list and retained compatibility output. The
  record-interactions and retained Preview compatibility suites run read-only.
- TASK-540-04-L04 exclusively owns `CustomScreenEditorPage.tsx`, the additive
  `buildCustomScreenEditorPath` seam in `routeParams.ts`, `custom-screens-page.test.tsx`,
  `custom-screen-route-params.test.ts`, and
  `custom-screen-editor-binding-flow.test.tsx`. It also owns only the additive
  `createCacheEventOperationToken: () => Symbol()` mock export in
  `custom-screen-section-recovery.test.tsx`; TASK-505's behavior assertions remain frozen
  and may not be re-baselined. It consumes L03-owned
  `customScreensClient.ts`, `cacheBus.ts`, `customScreensClient.test.ts`, and
  `cacheBus.test.ts` read-only; no cache key, serialized payload, or transport changes.

## Security Contract

Existing internal content reads/writes only. Authentication, `content:read` /
`content:write`, CSRF, and admin rate-limit buckets are unchanged. Cache keys and
errors contain resource identities only; no content, secret, or token is placed
in browser storage or logs.
