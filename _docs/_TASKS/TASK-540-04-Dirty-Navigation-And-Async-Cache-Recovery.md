# TASK-540-04: Dirty Navigation and Async/Cache Recovery

# FileName: TASK-540-04-Dirty-Navigation-And-Async-Cache-Recovery.md

**Parent Task:** TASK-540
**Priority:** High
**Category:** Custom Screens / Admin State / Cache / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01, TASK-540-03
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Fix Started:** 2026-07-15
**Implementation Complete:** 2026-07-15 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Repair Reason:** Closure validation reproduced duplicate remote invalidation when the canonical and legacy cache transports delivered the same serialized event, and contract audit required direct-image route-boundary coverage at the strict write seam. The phase-neutral repair state machine designated L03 as the sole repair owner with exactly three writable paths: `core/admin/utils/cacheBus.ts`, `tests/vitest/admin/cacheBus.test.ts`, and additive direct-image regressions in `tests/integration/routes/customScreensRoutes.test.ts`. No production route file changed. L03 completed the focused cache-bus gate, expanded owner/dependency gate, L04 read-only consumer gate, direct-image Bun/DB route gate, core lint/typecheck, root typecheck, workflow self-tests, and diff check; its exact `Repair Pending` receipt was replaced by the matching `Revalidation Passed` successor. L03 and TASK-540-04 remain `🚧 In Progress` with `Implementation Complete` until changelog 1252; L01, L02, and L04 follow the same closure-waiting status, and every other L03 UI/client/service/route production consumer stays read-only.
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
| TASK-540-04-L01 | Make related-entry and media promise caches retryable | `entriesClient.ts`, `mediaClient.ts`, and their admin Vitest suites | 🚧 In Progress |
| TASK-540-04-L02 | Cancel and retry related-entry loads | shared Screen hook, Preview dialog, and hook/Preview tests | 🚧 In Progress |
| TASK-540-04-L03 | Guard entry drafts, expand direct-image presentation targets, resolve presentation media UUIDs, and correlate mutation cache events | entry editor/canvas/read-only Preview, `customScreensClient.ts`, cache-bus substrate, the Bun-free override contract + service, and assigned suites | 🚧 In Progress |
| TASK-540-04-L04 | Guard Screen builder drafts | Screen editor page, additive editor-path helper, route/Page/binding-flow tests, and the recovery-suite plus screen-editor-sections cacheBus mock seams; read-only cache-bus/client production seams | 🚧 In Progress |

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
was replaced by its matching `Revalidation Passed` successor. L03 and TASK-540-04
remain `🚧 In Progress` with `Implementation Complete` until changelog 1252; L01, L02,
and L04 follow the same closure-waiting status. All ten leaves are landed, so closure
continues from the prepared pre-closure boundary with no remaining leaf cursor.

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
- TASK-540-04-L04 exclusively owns `CustomScreenEditorPage.tsx`, the additive
  `buildCustomScreenEditorPath` seam in `routeParams.ts`, `custom-screens-page.test.tsx`,
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
exact requested media UUID keys across canonical record lookup. Reopened L01 now has
atomic monotonic list/detail reconciliation, replayable replace/status/delete authority,
success-only invalidation, and captured-clear safety; its exact owner gate passed 65/65
with static checks and a zero-finding post-audit. Reopened L03 now publishes complete
fallback lists and reconciles monotonic Screen list/detail/mutation authority; its exact
nine-file owner gate passed 181/181 with `core` lint/typecheck, root typecheck, diff
check, and a zero-finding fresh post-audit. Those receipts remain historical. The
phase-neutral repair state machine designated L03 as the sole repair owner. Its exact
three writable paths and full required re-gate are defined above and are now complete.
The former `Repair Pending` receipt has been replaced by the exact successor
`Revalidation Passed`; L03 and TASK-540-04 remain `🚧 In Progress` with
`Implementation Complete` until changelog 1252, while L01, L02, and L04 follow the same
closure-waiting status. L04's narrow 2026-07-15 mock repair passed its
six-file/66-test gate and five zero-finding post-audit lenses. TASK-540-06 retains
ownership of the fresh family-wide audit, aggregate gates, runtime smoke, and final
changelog/board closure.
