# TASK-540-04-L03: Guard Entry Drafts and Subscribe Related Caches

# FileName: TASK-540-04-L03-Guard-Entry-Drafts-And-Subscribe-Related-Caches.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-04
**Priority:** High
**Category:** Custom Screens / Entry Editor / Data Safety
**Estimated Effort:** Large
**Dependencies:** TASK-540-03-L01, TASK-540-04-L02
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Repair Started:** 2026-07-16
**Implementation Complete:** 2026-07-15 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Revalidation Passed:** 2026-07-16 — validated against HEAD `040604e7e3d5232a5fb2fcb6a05e149295a89a77` with dirty L03 owner paths `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`, `core/services/customScreens/screenEntryPresentationOverrideContract.ts`, `core/services/customScreens/screenEntryPresentationOverrides.ts`, `tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts`, and `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx`: core/root static gates passed; the expanded fourteen-file L03 Vitest gate passed 258/258; isolated cacheBus passed 22/22; the L04 read-only consumer matrix passed 98/98; DB preflight was reachable; the current pre-split registered Custom Screens route suite passed 20/20 with 118 expectations; and `git diff --check` passed. This is pre-modularity-split evidence only. No full-suite, live-smoke, changelog, or closure result is claimed.
**Repair Reason:** Final post-audit proved a scalar presentation override could replace a `media.multiple` field's UUID array before `MediaPicker`, emptying the visible selection and allowing a later pick to truncate stored gallery data. L03 now makes single-media eligibility one shared Bun-free contract: service writes reject multiple-media targets, stored legacy rows are inactive and cleanup-eligible, and Entry Editor filters them before Canvas/Preview while preserving the exact bound array. The same repair moves the shared UUID import to the canonical module header.
**Modularity Repair Pending:** 2026-07-17 — the root `AGENTS.md` `File Size and Modularity` hard gate applies to the currently touched 2,235-line `CustomScreenEntryEditor.tsx`, 1,359-line `customScreensClient.test.ts`, 1,165-line `cacheBus.test.ts`, 1,079-line `custom-screen-entry-navigation-guard.test.tsx`, and 1,141-line `custom-screen-entry-editor-restyle.test.tsx`. The exact production and test splits below are required before closure; they preserve all behavior receipts as history but require fresh static, targeted, isolation, test-name-multiset, boundary, line-count, post-audit, and runtime evidence after files move.
**Historical Cache Repair Started:** 2026-07-15
**Historical Cache Revalidation:** generation ff397af11ad9b309d5244372b0705637 / token 191e7db6acd8e2cf36016f821d2f6b88 / gate green
**Historical Cache Repair Reason:** Closure validation reproduced one logical remote cache event twice when canonical and legacy transports delivered the same serialized event; the scoped repair owned cacheBus source/test plus additive registered-route override evidence and remains durable historical evidence.
**Historical Completion:** 2026-07-14
**Historical Reopen:** 2026-07-14 (final post-audit: cross-channel Screen list/detail reconciliation and complete fallback-list publication)
**Historical Revalidation:** 2026-07-14 — focused `customScreensClient` 40/40; exact nine-file L03 Vitest matrix 181/181; `core` lint/typecheck, root typecheck, and `git diff --check` all green
**Historical Post-Audit:** 2026-07-14 — PASS; zero HIGH, MEDIUM, or LOW findings on the corrected working tree
**Previous Completion:** 2026-07-14
**Previous Revalidation:** ✅ Passed (`core` lint/typecheck, root typecheck, and the exact nine-file Vitest matrix: 161/161)
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- new `core/admin/ui/custom-screens/CustomScreenEntryRouteSession.tsx`
- new `core/admin/ui/custom-screens/CustomScreenEntryEditorLayout.tsx`
- new `core/admin/ui/custom-screens/CustomScreenEntryPresentationPanel.tsx`
- new `core/admin/ui/custom-screens/customScreenEntryRuntime.ts`
- new `core/admin/ui/custom-screens/customScreenEntryPresentation.ts`
- new `core/admin/ui/custom-screens/customScreenEntryPresentationMedia.ts`
- new `core/admin/ui/custom-screens/hooks/useScreenEntryHydration.ts`
- new `core/admin/ui/custom-screens/hooks/useScreenEntryPresentationMedia.ts`
- `core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx`
- `core/admin/ui/custom-screens/CustomScreenPreview.tsx`
- `core/admin/services/customScreensClient.ts`
- `core/admin/utils/cacheBus.ts` (sole writer for the canonical/legacy remote-event repair)
- `core/services/customScreens/screenEntryPresentationOverrideContract.ts`
- `core/services/customScreens/screenEntryPresentationOverrides.ts`
- `tests/vitest/admin/customScreensClient.test.ts`
- new `tests/vitest/admin/customScreensEntryOverridesClient.test.ts`
- new `tests/vitest/admin/support/customScreensClientTestHarness.ts`
- `tests/vitest/admin/cacheBus.test.ts` (sole repair-test writer)
- new `tests/vitest/admin/cacheBusCorrelation.test.ts`
- new `tests/vitest/admin/cacheBusHardening.test.ts`
- new `tests/vitest/admin/support/cacheBusTestHarness.ts`
- `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx`
- new `tests/vitest/ui/custom-screen-entry-presentation-media.test.ts`
- `tests/vitest/ui/custom-screen-entry-draft.test.ts`
- new `tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx`
- new `tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx`
- new `tests/vitest/ui/support/customScreenEntryNavigationHarness.tsx`
- `tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts`

The completed 2026-07-15 repair's mutation authority was a separate exact historical set:
`core/admin/utils/cacheBus.ts`,
`tests/vitest/admin/cacheBus.test.ts`, and the additive-only
`tests/integration/routes/customScreensRoutes.test.ts`. That route suite is retained only
as read-only historical provenance in this L03 contract. R01 owns the shared route-test
file for every new TASK-540 route assertion or future finding; L03 may not reuse the
historical additive exception without a newly reconciled owner contract.

No other TASK-540 leaf edits these paths. TASK-540-03-L01 exclusively owns
`ScreenRuntimeRenderer.tsx`, `custom-screen-runtime-renderer.test.tsx`, and
`custom-screen-record-interactions.test.tsx`; this leaf consumes and may run that
landed renderer contract read-only. The retained
`tests/vitest/widgets/screenWidgets.test.tsx` Preview compatibility suite is also a
read-only gate. The corresponding `_docs/CMS_API.md` correction is already landed at
the current HEAD; TASK-540-06 validates it read-only and does not own another edit.
L03 landed the cache-bus substrate and mutation-client forwarding before L04. The
2026-07-15 repair reopened exactly
`cacheBus.ts`, `cacheBus.test.ts`, and the additive
`customScreensRoutes.test.ts`; every UI, client, service, production route, renderer,
hook, dialog, and other consumer suite listed by this contract remained read-only in
that historical repair. L04 consumes the repaired seam read-only and never edits these
L03-owned files. For a new exact evidence-backed post-audit or final-drift L03 repair,
the pre-closure fixer uses the full original owner set listed above, including
`screenEntryPresentationOverrideContract.ts`; the additive historical
`customScreensRoutes.test.ts` exception is not automatically reusable. The exact finding
prompt and post-agent `touchedFiles` verification bound the mutation. An after-closure
audit fixer may additionally edit only the root TASK-540 contract, this TASK-540-04
child contract, and this exact L03 leaf contract when a finding is evidenced there.
Reopen/complete status transitions remain separate task-state mutations.
The later cache-authority correction edited only `customScreensClient.ts` plus its owner
test; the already-gated cacheBus/editor/service seams stayed read-only. Its durable
evidence is the Historical Revalidation/Historical Post-Audit metadata above, not
the mutable `_docs/_workflows/task-540-fix.mjs`, which now records only the completed
R01→R03 URL-control correction. The earlier prepared-boundary resolver state is
historical only. The current `Modularity Repair Pending` field blocks L03 from being
treated as landed despite its prior `Implementation Complete` and `Revalidation Passed`
receipts. Only the completed cohesive split, fresh targeted gate, and replacement
`Modularity Repair Revalidated` receipt restore landed status; that targeted receipt
still never substitutes for either sibling owner gate or the later family post-audit,
smoke, and closure gates.

## Grounded anchors

The line references below describe the pre-split staged implementation and remain
historical behavior anchors. The modularity implementation must relocate, not reinterpret,
those exact responsibilities; its final receipt records the replacement file/symbol
anchors.

- Entry content/presentation state and dirty authority:
  `CustomScreenEntryEditor.tsx:671-780,1380-1446`.
- Entry/override hydration, refresh, and cache subscriptions:
  `CustomScreenEntryEditor.tsx:916-1165,1395-1418`.
- Related-entry hook consumption: `CustomScreenEntryEditor.tsx:1251-1258`.
- Save/create navigation authority: `CustomScreenEntryEditor.tsx:1415-1713`.
- Direct-image presentation target and winning UUID collection:
  `CustomScreenEntryEditor.tsx:256-342,539-567`.
- Direct-image/media-field active-target validation:
  `screenEntryPresentationOverrides.ts:145-220`.
- Admin override response/cache normalization:
  `customScreensClient.ts:109-129,369-389`.
- Same-context-only cache-event origin/operation delivery, canonical/legacy transport
  constants, storage emission, strict parsing, broadcast, and subscription teardown:
  `cacheBus.ts:10-39,42-48,57-237`.
- Cache-bus transport/token, twin correlation, descriptor hardening, and bounds regressions:
  `cacheBus.test.ts:184-1165`.
- Read-only historical provenance for the registered-route direct-image override
  fixtures, PATCH→GET round trip, and bounded invalid-target mapping:
  `customScreensRoutes.test.ts:313-463`. Any new finding on this shared suite is assigned
  to R01, not L03.
- Optional Custom Screen mutation token forwarding across both local list/detail events:
  `customScreensClient.ts:100-102,590-644`.
- Bun-free override schema/type owner:
  `screenEntryPresentationOverrideContract.ts:1-300`.
- Shared guard: `AdminDirtyNavigationGuard.tsx:17-106`.

## Mandatory L03 file-size remediation

### Hard gate and exact physical ownership

The root `AGENTS.md` `File Size and Modularity` section is authoritative: every touched
human-authored production module or test file must contain at most 1,000 complete
physical lines after this leaf closes, counting blank lines and comments. Exceeding the
limit fails the gate and cannot be deferred to TASK-9999. This remediation changes no
route, payload, cache key, schema, persistence behavior, component contract, intended
UI/UX, security boundary, or pinned changelog number 1252.

The touched-file set is measured from verified pre-family baseline `e5f15a567` through
the final working tree. That history includes every intermediate commit and checkpoint:
staging or committing cannot remove a path from the gate or make a newly over-limit file
eligible for LOW/TASK-9999 deferral.

Split the current Entry Editor only along the following cohesive boundaries. The line
budgets are post-format ceilings with deliberate headroom; `1,000` remains the absolute
limit even if an estimate is missed.

| File | Sole responsibility | Expected physical lines | Hard maximum |
|---|---|---:|---:|
| `CustomScreenEntryEditor.tsx` | Public route wrapper, canonical route-key construction, keyed session mount, compatibility re-exports | 40–60 | 1,000 |
| `CustomScreenEntryRouteSession.tsx` | Route-scoped state/refs, dirty and save authority, content mutations, assistant context, navigation guard, related-entry composition | 820–930 | 1,000 |
| `customScreenEntryRuntime.ts` | Empty runtime values, opaque route-visit/message types, definition normalization, document/binding resolution, selected-block preservation | 65–100 | 1,000 |
| `customScreenEntryPresentation.ts` | Presentation target/label/binding rules, sort/serialize/upsert/remove, dirty transition, multiple-media render filtering | 250–300 | 1,000 |
| `customScreenEntryPresentationMedia.ts` | Route/request codecs, attempt types/reducer, winning direct-image UUID planning, exact URL projection | 265–310 | 1,000 |
| `hooks/useScreenEntryHydration.ts` | Entry/override load tokens, hydration, refresh, authority checks, initial queued loads, relevant cache subscriptions | 280–350 | 1,000 |
| `hooks/useScreenEntryPresentationMedia.ts` | Reducer wiring, pending-promise reuse, media cache subscription, force/retry, generation/unmount guarded commits | 190–240 | 1,000 |
| `CustomScreenEntryPresentationPanel.tsx` | Presentation controls and button/MediaPicker rendering only | 230–280 | 1,000 |
| `CustomScreenEntryEditorLayout.tsx` | EditorShell, alerts, header/toolbar, CanvasEditor and read-only Preview branches | 390–500 | 1,000 |
| `custom-screen-entry-editor-restyle.test.tsx` | Mounted Entry Editor layout, dirty UI, metadata, direct/multiple-media and async media lifecycle flows | 945–955 | 1,000 |
| `custom-screen-entry-presentation-media.test.ts` | Bun-free codec/reducer/planning/projection unit contract | 205–240 | 1,000 |

The source move follows the current staged line responsibilities:

- current lines `101–143` move to `customScreenEntryRuntime.ts`;
- current lines `145–367` move to `customScreenEntryPresentation.ts`;
- current lines `368–390` and `403–614` move to
  `customScreenEntryPresentationMedia.ts`; the hook-owned `MediaCommit` at `391–397`
  moves to `hooks/useScreenEntryPresentationMedia.ts`, while opaque `RouteVisit`,
  `RouteMessageCommit`, and `PresentationErrorCommit` at `399–401` move to
  `customScreenEntryRuntime.ts`;
- current lines `615–631` remain the public wrapper shape;
- current load-token/hydration block `916–1165` and entry/override cache subscription
  `1395–1418` move to `hooks/useScreenEntryHydration.ts`;
- the related-entry target/composition effect at current `1167–1173` remains in
  `CustomScreenEntryRouteSession.tsx`; it is not hydration-hook ownership;
- current media orchestration `1260–1394`, its pending/generation refs, and its matching
  cleanup/discard invalidation move together to
  `hooks/useScreenEntryPresentationMedia.ts`;
- current presentation-panel JSX `1773–1947` moves to
  `CustomScreenEntryPresentationPanel.tsx`;
- current shell/alert/canvas/preview JSX `1948–2235` moves to
  `CustomScreenEntryEditorLayout.tsx`;
- the remaining route-session logic moves to `CustomScreenEntryRouteSession.tsx`.

Line numbers are extraction anchors for the staged 2,235-line input, not permission to
cut arbitrary ranges. Imports, local types, and callbacks move with the responsibility
that owns them. Do not compress readable code, delete assertions/comments merely to
meet the limit, duplicate helpers, or create a generic state/fixture dumping ground.

### Exact client, cache-bus, and navigation test splits

The same hard gate requires cohesive splits of the three other over-limit L03 suites.
Their harnesses contain reusable fixtures/factories only, hold no tests, and expose no
module-global mutable state that can leak between independently executed suites.

| Existing/new file | Exact responsibility and final test count | Expected physical lines | Hard maximum |
|---|---|---:|---:|
| `tests/vitest/admin/support/customScreensClientTestHarness.ts` | `jsonResponse`, local-storage/deferred factories, Screen/override builders, and per-test cleanup helpers | 90–150 | 1,000 |
| `tests/vitest/admin/customScreensClient.test.ts` | Screen list/detail cache, fallback, mutation, CSRF, and operation-token cases; retain the first 29 expanded tests | 820–930 | 1,000 |
| `tests/vitest/admin/customScreensEntryOverridesClient.test.ts` | Entry-override storage/transport normalization, promise authority, UUID round trip, PATCH revocation, and rejection cases; retain the final 11 expanded tests | 430–520 | 1,000 |
| `tests/vitest/admin/support/cacheBusTestHarness.ts` | BroadcastChannel/storage harnesses, remote-event builders, sequence emitter, and exact restoration helpers | 150–220 | 1,000 |
| `tests/vitest/admin/cacheBus.test.ts` | The first six broadcast/local-delivery/token tests through same-tab notification | 240–330 | 1,000 |
| `tests/vitest/admin/cacheBusCorrelation.test.ts` | The next eleven storage/remote-origin and canonical/legacy correlation tests through storage rearm | 430–540 | 1,000 |
| `tests/vitest/admin/cacheBusHardening.test.ts` | The final five reentrancy, 128-entry LRU, malformed/unknown input, capacity-state-neutrality, and exact-byte-boundary tests | 420–520 | 1,000 |
| `tests/vitest/ui/support/customScreenEntryNavigationHarness.tsx` | Happy-dom route/editor fixture, service mocks, deferred controls, mount/flush/event helpers, and deterministic cleanup | 380–470 | 1,000 |
| `tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx` | The first nine clean/content/presentation dirty, save failure, stale-create, route-gating, and shared-discard tests | 300–390 | 1,000 |
| `tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx` | The remaining thirteen expanded hydration-order, dirty timing, discard, create retry, A→B→A, and visit-scoped background-work tests | 370–470 | 1,000 |

`customScreensClient.test.ts` and `customScreensEntryOverridesClient.test.ts` import
their SUT exports directly plus only the dedicated client harness. Neither imports the
other suite. The cache-bus suites import `cacheBus.ts` directly plus only
`cacheBusTestHarness.ts`; the harness receives the subscribe function where a type or
callback is needed rather than re-exporting production behavior. The navigation suites
import the stable Entry facade directly plus only `customScreenEntryNavigationHarness`;
the harness owns mounting and fixtures, never expectations or hidden test registration.
No harness imports a `.test.*` file, and no suite imports another suite.

The pre-split expanded test-name multisets are immutable behavior receipts:
`customScreensClient` remains exactly 40 names split 29+11, `cacheBus` remains exactly
22 names split 6+11+5, and Entry navigation remains exactly 22 names split 9+13. Before
moving tests, the workflow seals each current pre-modularity fully expanded Vitest name
multiset (including `test.each` suffixes). After moving them, it compares the combined
multiset with exact multiplicity, rejects missing/renamed/duplicated/skipped tests, and
runs every final suite by itself. Its isolation self-test must fail when any named suite
is omitted, duplicated, or made dependent on another suite's registration/global state.
Line-range movement alone is not permission to weaken an assertion or change a name.

### Dependency direction and compatibility

The only valid production dependency direction is:

```text
CustomScreenEntryEditor.tsx
├── customScreenEntryPresentation.ts (explicit compatibility re-exports only)
├── customScreenEntryPresentationMedia.ts (route-key helper + explicit compatibility re-exports)
└── CustomScreenEntryRouteSession.tsx
    ├── customScreenEntryRuntime.ts
    ├── customScreenEntryPresentation.ts
    ├── hooks/useScreenEntryHydration.ts
    ├── hooks/useScreenEntryPresentationMedia.ts
    │   └── customScreenEntryPresentationMedia.ts
    └── CustomScreenEntryEditorLayout.tsx
        └── CustomScreenEntryPresentationPanel.tsx
```

- Pure modules import no React, admin API/cache client, DB, server/runtime adapter, or
  `Bun.*` API.
- Pure modules also may not import `customScreensClient.ts`, `mediaClient.ts`, or the
  UI-owned `SchemaBuilder.tsx`. `customScreenEntryRuntime.ts` declares a narrow
  `ScreenDefinitionCarrier` structural input containing exactly the four values the
  current read normalizer consumes: optional `definition`, `schemaVersion`, `blocks`,
  and `bindings`, each typed as `unknown` at this pure boundary. It passes those exact
  values to `normalizeCustomScreenDefinitionForRead`, preserving the legacy fallback.
  `customScreenEntryPresentation.ts` imports
  `ScreenEntryPresentationOverrideDraft` from the service-owned override contract and
  declares a narrow field shape containing only `name`, `label`, `type`, `multiple`, and
  `media.multiple` plus `media.accept`; the latter remains the exact MediaPicker accept
  filter when the target crosses into the presentation panel.
  `customScreenEntryPresentationMedia.ts` declares a narrow media
  projection record containing only `id`, `type`, and `url`. Admin records are
  structurally assignable at the route-session/hook boundary; no pure helper needs an
  admin-client type import or copied normalization algorithm.
- `customScreenEntryRuntime.ts` owns the shared opaque `RouteVisit`, route-message, and
  presentation-error value types so both hooks and the route session can import them
  without a hook-to-hook or hook-to-component cycle.
- Hooks may import pure modules and existing admin clients but never layout/panel or the
  route-session component.
- Layout/panel receive typed values and callbacks; they never import hooks, mutate
  caches, persist data, or own a second draft authority.
- The route session composes hooks and views and remains the sole owner of cross-channel
  content/presentation dirty and save authority.
- No module imports the public wrapper, preventing a barrel cycle.
- The wrapper may import React plus the existing admin-router/route-parameter helpers as
  external dependencies. Among these nine split modules its only outgoing edges are the route
  session plus the two pure compatibility owners shown above; all reverse edges into
  the wrapper are forbidden.

`CustomScreenEntryEditor.tsx` keeps the existing lazy-route/component API and re-exports
every currently exported helper/type from its new owner so existing imports remain
compatible: `resolvePresentationDraftTransition`, `isDraftAuthorityClean`,
`filterRenderableScreenEntryPresentationOverrides`, `MediaAttemptCause`, `MediaAttempt`,
`MediaMachineState`, `MediaAttemptInput`, `MediaAttemptAction`,
`PRESENTATION_MEDIA_LOAD_ERROR`, `buildEntryRouteKey`,
`buildPresentationMediaRequestKey`, `decodeAndValidatePresentationMediaRequestKey`,
`readRequestedIdsFromMediaRequestKey`, `allocateMediaAttempt`, `mediaAttemptReducer`,
`initializeMediaMachineState`, `collectWinningDirectImageAssetIds`, and
`projectExactRequestedMediaUrls`. Internal consumers and pure tests import the owning
module directly; the wrapper re-exports are compatibility, not ownership.

### Authority-preserving implementation pseudocode

```ts
// customScreenEntryRuntime.ts — pure structural carrier, no admin-client import.
export type ScreenDefinitionCarrier = Readonly<{
  definition?: unknown;
  schemaVersion?: unknown;
  blocks?: unknown;
  bindings?: unknown;
}>;

// customScreenEntryPresentation.ts — only fields consumed by presentation UI.
export type ScreenEntryPresentationField = Readonly<{
  name: string;
  label: string;
  type: string;
  multiple?: boolean;
  media?: Readonly<{ multiple?: boolean; accept?: string[] }>;
}>;
```

```tsx
// CustomScreenEntryEditor.tsx
export {
  filterRenderableScreenEntryPresentationOverrides,
  isDraftAuthorityClean,
  resolvePresentationDraftTransition,
} from "./customScreenEntryPresentation";
export {
  PRESENTATION_MEDIA_LOAD_ERROR,
  allocateMediaAttempt,
  buildEntryRouteKey,
  buildPresentationMediaRequestKey,
  collectWinningDirectImageAssetIds,
  decodeAndValidatePresentationMediaRequestKey,
  initializeMediaMachineState,
  mediaAttemptReducer,
  projectExactRequestedMediaUrls,
  readRequestedIdsFromMediaRequestKey,
} from "./customScreenEntryPresentationMedia";
export type {
  MediaAttempt,
  MediaAttemptAction,
  MediaAttemptCause,
  MediaAttemptInput,
  MediaMachineState,
} from "./customScreenEntryPresentationMedia";

export function CustomScreenEntryEditor() {
  const { path } = useAdminRouter();
  const { screenId, entryId } = resolveCustomScreenEntryParams(path);
  const isCreateMode = entryId === "new";
  const routeKey = buildEntryRouteKey({ screenId, entryId, isCreateMode });
  return (
    <CustomScreenEntryRouteSession
      key={routeKey}
      screenId={screenId}
      entryId={entryId}
      isCreateMode={isCreateMode}
      routeKey={routeKey}
    />
  );
}
```

The explicit list above is the complete pre-split public surface. Do not use `export *`
or accidentally expose private sort/update helpers.

```ts
// hooks/useScreenEntryHydration.ts
function useScreenEntryHydration(input: {
  identity: { screenId; entryId; isCreateMode; routeKey; routeVisit };
  authority: {
    mountedRef; routeGenerationRef; draftMutationGenerationRef;
    entryLoadGenerationRef; overrideLoadGenerationRef;
    contentDirtyRef; presentationDirtyRef;
  };
  commit: { applyEntry; applyOverrides; reportEntry; reportOverrides };
}) {
  // Capture the unchanged channel/route/visit/load/draft token before each await.
  // Commit only when mounted + route + visit + channel generation are exact.
  // Replace a draft only when generation and both dirty refs remain clean.
  // A dirty rejection uses the bounded local-changes-unchanged message.
  // Return stable refreshEntry/refreshPresentation callbacks.
}

// hooks/useScreenEntryPresentationMedia.ts
function useScreenEntryPresentationMedia(input: {
  routeKey; routeVisit; document; bindings; values; overrides; mountedRef;
}) {
  // Derive the canonical sorted request key with the existing pure helper.
  // Preserve reducer attempt identity and the exact pending promise in StrictMode.
  // Cache retry and manual retry remain force:true; inherited ID-set attempts retain force.
  // Guard every success/error/finalization by request, token, generation, visit, and unmount.
  // Return { state, retry, invalidate } without exposing mutable refs.
}
```

The opaque `RouteVisit` is still allocated once inside the keyed route session. It must
not become a memoized/global key. The hydration hook receives the existing authority
refs rather than creating competing refs. The media hook may encapsulate media-only refs,
but its `invalidate` is called by confirmed discard and route cleanup before navigation.
Content, presentation, load, save, stale-create, media, assistant-context, and cache-event
invariants described elsewhere in this task remain byte-for-behavior identical.

The route session calculates the already-landed
`filterRenderableScreenEntryPresentationOverrides` result before both direct-image media
planning and layout props. Canvas and Preview receive that same filtered array, while the
unfiltered draft remains the exact persistence/dirty authority. A scalar legacy override
therefore cannot replace a `media.multiple` array, but no stored draft is silently
rewritten by the view extraction.

`CustomScreenEntryPresentationPanel.tsx` receives the resolved target, selected values,
dirty/loading/saving flags, and typed save/reload/clear/change callbacks. It renders no
control for a multiple-media target. `CustomScreenEntryEditorLayout.tsx` receives grouped
status/content/presentation/media/action props and owns rendering only. Neither component
calls a service or derives a second save/dirty baseline.

### Pure test split and boundary-owner handoff

Keep all mounted UI/runtime scenarios through the current unmounted-attempt regression in
`custom-screen-entry-editor-restyle.test.tsx`. Move only the current final four Bun-free
tests (pre-split lines `957–1141`) to
`tests/vitest/ui/custom-screen-entry-presentation-media.test.ts`:

1. route-scoped canonical key codec and malformed-snapshot rejection;
2. reducer identity, monotonic/frozen attempts, inherited force, and stale settlements;
3. direct-image override/binding winner planning and media-field exclusion;
4. exact requested UUID casing and canonical media-record projection.

The new file imports `customScreenEntryPresentationMedia.ts` directly, uses no happy-dom,
component mount, client mock, or copied UI fixture, and remains independently runnable.
The restyle suite retains the new `media.multiple` array-preservation scenario and all
StrictMode/cache/force/unmount visible-flow assertions. Its mounted single-media target
case changes the fixture to the non-default ordered value
`media.accept: ["image/png", "image/webp"]` and proves that exact array reaches the
mounted `MediaPicker` as `data-accept="image/png,image/webp"`; an assertion that sees
only the fallback `["image/*"]` is insufficient. The separate direct-image fallback
remains `["image/*"]`. Do not duplicate its 457-line
mock harness in another test file. `custom-screen-entry-draft.test.ts` stays in place and
imports its two presentation authority helpers from `customScreenEntryPresentation.ts`.

`tests/vitest/ui/custom-screen-authoring-boundary.test.ts` belongs exclusively to
TASK-540-05-L01. L03 must not edit it. After this split, L01 ensures all nine Entry
Editor production files named in the budget table are covered by the existing forbidden
page-builder/widget import check (the wrapper is already listed, so eight paths are
additive). The same suite must enforce the exact one-way import graph above, forbid
React/admin-client/`SchemaBuilder` imports from the three pure modules, forbid every
module from importing the wrapper, and source-pin the wrapper's complete existing
value/type compatibility re-export list. A compile-only consumer is insufficient because
the pure tests intentionally move to their owning modules. Land order is L03 split →
L03 target gate and immediate L03 `Modularity Repair Revalidated` receipt → L04
split/gate and immediate L04 receipt → L01 additive boundary update/gate → family
post-audit/smoke/closure; a passing check that still reads only the thin wrapper is
insufficient evidence.

### Required workflow and targeted validation changes

Before implementation, add every new production, test, and dedicated harness path above
to L03's workflow `allowedFiles`/`requiredFiles`. Add the five net-new Vitest suites
(`customScreensEntryOverridesClient`, two cacheBus suites, Entry navigation authority,
and Entry presentation media) to `TARGET_VITEST_FILES`, the expanded L03 command, the
sealed test-name-multiset verifier, and the exact named-file isolation self-test. Harness
modules are required source-owner paths but are not test targets. This leaf contributes
exactly +5 Vitest files while preserving 84 existing expanded tests across the first
three pre-split suites (40 client + 22 cache-bus + 22 navigation), plus the existing 17
Entry restyle/pure tests split 13+4.

After reconciling every TASK-540 modularity repair from baseline `e5f15a567`, the
authoritative family aggregate is 64 Vitest + 18 Bun = 82 target files: 81
source-owner/read-only dependency files and 1 closure-owned aggregate file. These totals
supersede the earlier partial 51+7 calculation. TASK-540-06 and workflow assertions must
use 64+18 consistently before closure; changelog remains 1252.

Run, at minimum, after the final split and formatting:

```bash
for file in \
  core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx \
  core/admin/ui/custom-screens/CustomScreenEntryRouteSession.tsx \
  core/admin/ui/custom-screens/CustomScreenEntryEditorLayout.tsx \
  core/admin/ui/custom-screens/CustomScreenEntryPresentationPanel.tsx \
  core/admin/ui/custom-screens/customScreenEntryRuntime.ts \
  core/admin/ui/custom-screens/customScreenEntryPresentation.ts \
  core/admin/ui/custom-screens/customScreenEntryPresentationMedia.ts \
  core/admin/ui/custom-screens/hooks/useScreenEntryHydration.ts \
  core/admin/ui/custom-screens/hooks/useScreenEntryPresentationMedia.ts \
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx \
  tests/vitest/ui/custom-screen-entry-presentation-media.test.ts \
  tests/vitest/ui/custom-screen-entry-draft.test.ts \
  tests/vitest/ui/support/customScreenEntryNavigationHarness.tsx \
  tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx \
  tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx \
  tests/vitest/admin/support/customScreensClientTestHarness.ts \
  tests/vitest/admin/customScreensClient.test.ts \
  tests/vitest/admin/customScreensEntryOverridesClient.test.ts \
  tests/vitest/admin/support/cacheBusTestHarness.ts \
  tests/vitest/admin/cacheBus.test.ts \
  tests/vitest/admin/cacheBusCorrelation.test.ts \
  tests/vitest/admin/cacheBusHardening.test.ts; do
  lines="$(awk 'END { print NR }' "$file")"
  if [ "$lines" -gt 1000 ]; then
    echo "$file exceeds 1000 physical lines: $lines" >&2
    exit 1
  fi
done

bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit
bunx vitest run \
  tests/vitest/ui/custom-screen-entry-presentation-media.test.ts \
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx \
  tests/vitest/ui/custom-screen-entry-draft.test.ts \
  tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx \
  tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx \
  tests/vitest/admin/customScreensClient.test.ts \
  tests/vitest/admin/customScreensEntryOverridesClient.test.ts \
  tests/vitest/admin/cacheBus.test.ts \
  tests/vitest/admin/cacheBusCorrelation.test.ts \
  tests/vitest/admin/cacheBusHardening.test.ts \
  tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts
# After TASK-540-05-L01 performs its owned additive handoff:
bunx vitest run tests/vitest/ui/custom-screen-authoring-boundary.test.ts
git diff --check
```

Strict land order is L03 → L04 → L01. Immediately after L03 and before L04 may edit its
Page family, run the transient L04 read-only consumer gate with the single current
`custom-screens-page.test.tsx`, the other eight unchanged L04 consumers, and all three
post-L03 cache-bus suites: 12 files total. That phase must not reference the three future
L04 Page test paths. Once L04 lands, supersede it with the final 15-file consumer gate
listed in Validation below. Then run the registered Custom Screens Bun/DB route gate and
workflow self-tests. A source/test move invalidates the current L03 modularity receipt;
immediately after the green L03 split gate, replace only `Modularity Repair Pending`
with the matching HEAD/dirty-path-bound `Modularity Repair Revalidated` receipt while
preserving the historical behavior receipt. The later L04 and L01 gates receive their
own receipts and do not delay the L03 transition. Fresh post-audit lenses and the
mandatory TASK-540 runtime smoke run only after every modularity owner lands.

## Canonical/legacy remote-event repair contract

This repair changes no route, payload, exported cache-bus type, cache key, consumer API,
or intended UI/UX contract. It deliberately changes mirrored remote runtime delivery from
two refresh attempts to one per logical occurrence. `CacheEvent` remains exactly
`{ action, key, sourceId, ts }`; transport family is private subscription state and is
never serialized. Local delivery continues to bypass remote correlation and preserves
the exact caller-owned operation token.

Each `subscribeCacheEvents` call owns an independent, bounded correlation map. Its key is
the collision-free `JSON.stringify([sourceId, ts, key, action])`, and each value is
`{ canonical, legacy, delivered }`. Canonical and legacy listener wrappers pass their
private transport family into one remote-delivery helper. For each valid non-self event:

1. Increment only the received family count.
2. Compute delivery iff `Math.max(canonical, legacy) > delivered` and increment
   `delivered` when true.
3. Subtract `paired = Math.min(canonical, legacy)` from all three counters. Delete a
   balanced entry; otherwise move its residual entry to the newest LRU position. Finish
   this complete correlation-state update before invoking the consumer, so a throwing
   handler cannot make the mirrored twin a retry.
4. When delivery was selected, invoke the consumer after the state update. Keep at most
   128 residual identities and evict the oldest residual identity on overflow.
   Eviction is intentionally fail-open: a very late twin may duplicate an invalidation,
   but memory remains bounded and no new invalidation is suppressed.

This count/multiset rule preserves every occurrence from a canonical-only or legacy-only
sender, including byte-identical repeats, and collapses the two mirrored transports from
the current emitter. It supports either arrival order and all interleavings. A third-party
sender that alternates exactly one transport family per logical occurrence while reusing
the same complete tuple is inherently indistinguishable from delayed twins; that is an
explicit compatibility limit, not a timestamp-expiry heuristic. Do not add TTL or wall-
clock freshness logic.

Remote parsing is strict, reject-unknown, accessor-safe, and bounded before correlation:

- `MAX_REMOTE_IDENTITIES = 128`, `MAX_KEY_CODE_UNITS = 1024`,
  `MAX_SOURCE_ID_CODE_UNITS = 128`, and `MAX_STORAGE_PAYLOAD_CODE_UNITS = 2048`.
- `key` and `sourceId` are non-empty strings within their code-unit caps; `action` is
  exactly `invalidate` or `update`; `ts` is a non-negative safe integer.
- Storage strings larger than the payload cap are rejected before `JSON.parse`.
- Obtain one snapshot with `Object.getOwnPropertyDescriptors(payload)` inside `try/catch`;
  a proxy descriptor trap or any other descriptor-snapshot failure rejects the payload.
  `Reflect.ownKeys(descriptors)` must then be exactly the four string keys `action`, `key`,
  `sourceId`, and `ts`, with no extra string, symbol, or non-enumerable own key on the
  payload. Every required descriptor must be enumerable and must own a data `value`;
  accessor descriptors are rejected without invoking their getters. Validation reads only
  the captured descriptor `.value` snapshots, never `payload[field]`, so a getter cannot
  mutate the shape between key validation and value validation.
- Unknown-key, accessor, non-enumerable, proxy-trap, invalid-type/action/bound, malformed
  JSON, oversized storage, storage-removal, and same-source inputs are ignored before any
  correlation lookup, insertion, LRU touch, or eviction. Every parse failure is therefore
  state-neutral and cannot consume or perturb residual state.

Storage fallback must re-arm identical serialized occurrences. For canonical and legacy
storage keys independently, call `removeItem(key)` immediately before `setItem(key,
serialized)`. Canonical and legacy writes still carry the same serialized four-key event;
their resulting storage notifications enter the same per-family multiset algorithm.

Teardown removes the exact canonical and legacy listener wrappers, closes both channels,
removes the storage listener, deletes the local handler, and clears the subscription's
private correlation map. A later subscription starts with fresh state. BroadcastChannel
construction behavior and same-source filtering remain compatible with the existing
seam; no module-global remote correlation state is permitted.

### Repair pseudocode

```ts
type RemoteTransport = "canonical" | "legacy";
type RemoteCounts = { canonical: number; legacy: number; delivered: number };
const CACHE_EVENT_KEYS = Object.freeze(["action", "key", "sourceId", "ts"] as const);

const remoteCounts = new Map<string, RemoteCounts>(); // private to one subscription

function parseEvent(payload: unknown): CacheEvent | null {
  if (!payload || typeof payload !== "object") return null;
  let descriptors: PropertyDescriptorMap;
  try {
    descriptors = Object.getOwnPropertyDescriptors(payload);
  } catch {
    return null; // proxy descriptor traps fail closed and do not mutate correlation state
  }

  const ownKeys = Reflect.ownKeys(descriptors);
  if (
    ownKeys.length !== CACHE_EVENT_KEYS.length ||
    !CACHE_EVENT_KEYS.every((key) => ownKeys.includes(key))
  ) {
    return null; // exact four descriptor keys; reject extra strings, symbols, and hidden keys
  }
  const values: Record<(typeof CACHE_EVENT_KEYS)[number], unknown> = {
    action: undefined,
    key: undefined,
    sourceId: undefined,
    ts: undefined,
  };
  for (const field of CACHE_EVENT_KEYS) {
    const descriptor = descriptors[field];
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) return null;
    values[field] = descriptor.value; // snapshot read; no payload getter is invoked
  }

  const { action, key, sourceId, ts } = values;
  if (action !== "invalidate" && action !== "update") return null;
  if (typeof key !== "string" || key.length === 0 || key.length > MAX_KEY_CODE_UNITS) return null;
  if (
    typeof sourceId !== "string" ||
    sourceId.length === 0 ||
    sourceId.length > MAX_SOURCE_ID_CODE_UNITS
  ) return null;
  if (typeof ts !== "number" || !Number.isSafeInteger(ts) || ts < 0) return null;
  return { action, key, sourceId, ts };
}

function parseStorageEvent(serialized: string): CacheEvent | null {
  if (serialized.length > MAX_STORAGE_PAYLOAD_CODE_UNITS) return null;
  try {
    return parseEvent(JSON.parse(serialized));
  } catch {
    return null;
  }
}

function touchLruAndEvictOldestFailOpen(
  identity: string,
  counts: RemoteCounts,
  max: number
): void {
  remoteCounts.delete(identity);
  remoteCounts.set(identity, counts);
  if (remoteCounts.size <= max) return;
  const oldest = remoteCounts.keys().next().value;
  if (oldest !== undefined) remoteCounts.delete(oldest);
}

function deliverRemote(payload: unknown, transport: RemoteTransport): void {
  const parsed = parseEvent(payload);
  if (!parsed || parsed.sourceId === cacheBusId) return;
  const identity = JSON.stringify([parsed.sourceId, parsed.ts, parsed.key, parsed.action]);
  const counts = remoteCounts.get(identity) ?? { canonical: 0, legacy: 0, delivered: 0 };
  counts[transport] += 1;
  const shouldDeliver = Math.max(counts.canonical, counts.legacy) > counts.delivered;
  if (shouldDeliver) counts.delivered += 1;
  const paired = Math.min(counts.canonical, counts.legacy);
  counts.canonical -= paired;
  counts.legacy -= paired;
  counts.delivered -= paired;
  if (counts.canonical === 0 && counts.legacy === 0) remoteCounts.delete(identity);
  else touchLruAndEvictOldestFailOpen(identity, counts, MAX_REMOTE_IDENTITIES);
  if (shouldDeliver) handler(parsed, "remote"); // token undefined; state already final
}

const canonicalListener = (event: MessageEvent) =>
  deliverRemote(event.data, "canonical");
const legacyListener = (event: MessageEvent) => deliverRemote(event.data, "legacy");

function emitStorageEvent(event: CacheEvent): void {
  const serialized = JSON.stringify(event);
  for (const key of [STORAGE_EVENT_KEY, LEGACY_STORAGE_EVENT_KEY]) {
    localStorage.removeItem(key);
    localStorage.setItem(key, serialized);
  }
}
```

### Repair regression matrix

The combined `cacheBus.test.ts`, `cacheBusCorrelation.test.ts`, and
`cacheBusHardening.test.ts` family must retain every existing assertion and add
deterministic proof for:

1. One canonical plus one legacy twin delivers once in both `canonical→legacy` and
   `legacy→canonical` order.
2. Two identical logical occurrences deliver exactly the prefix maximum and final count
   two for all six interleavings: `CCLL`, `CLCL`, `CLLC`, `LCCL`, `LCLC`, `LLCC`.
3. `CCC` and `LLL` each deliver three occurrences; complementary late twins add no
   deliveries.
4. Different source IDs, timestamps, keys, and actions remain independent, including a
   tuple corpus whose delimiter-like strings would collide under string concatenation.
5. Per-subscription isolation is asymmetric and instance-directed: send only canonical
   `C` to subscription A's canonical channel and only legacy `L` to subscription B's
   legacy channel; both deliver. Their complementary twins suppress only in the same
   subscription. Create another residual pair, unsubscribe A, prove B's complement still
   suppresses, then resubscribe A and prove its matching tuple delivers from fresh state.
6. Storage canonical/legacy twins collapse in either order. `newValue:null` removal
   notifications are state-neutral, while two byte-identical fallback broadcasts each emit
   because both keys use remove-before-set.
7. Two identical local broadcasts both deliver with their exact distinct operation
   tokens; remote tokens remain `undefined`, and own-source remote echoes stay filtered.
8. Unsubscribe removes both exact channel wrappers/listeners, closes both channels, and
   clears only that subscription's correlation state. During a canonical handler
   invocation, synchronously re-enter the legacy listener with the exact twin and then
   throw: the reentrant twin is suppressed because the complete multiset/LRU update happened
   before the handler, the outer error still propagates to the harness, and an unrelated
   tuple remains deliverable.
9. True LRU and its exact cap use two fresh runs. At exactly 128 residual identities, the
   oldest identity's twin suppresses. In a fresh run, re-touch identity 0, add identity
   128, then prove identity 1 was evicted and delivers fail-open while identity 0 remains
   resident and suppresses. This must fail FIFO and off-by-one caps of 1 or 127.
10. Reject an extra enumerable string key, extra symbol key, extra non-enumerable key, and
    a non-enumerable required key. Reject both a throwing accessor and a mutating accessor
    on a required field, and assert exactly zero getter calls. Reject a proxy whose
    `getOwnPropertyDescriptor` trap throws; no exception may escape remote parsing.
11. Reject an unknown string action, a non-string action, and non-string `key`/`sourceId`.
    Reject `ts` values `-1`, a fraction, `NaN`, `Infinity`, and
    `Number.MAX_SAFE_INTEGER + 1`; accept `0` and `Number.MAX_SAFE_INTEGER`.
12. Measure every string bound in UTF-16 code units: accept 512 astral characters for the
    1024-unit key cap and 64 for the 128-unit source cap, but reject 513 and 65 respectively.
    Keep the equivalent exact ASCII boundaries accepted.
13. Reject storage payloads longer than 2048 UTF-16 code units before `JSON.parse`, proven
    with a parse spy/counter. Accept an exactly 2048-unit padded JSON payload containing an
    astral-boundary key; reject that payload plus one astral character as 2050 units without
    another parse. Malformed JSON and unrelated storage keys are ignored.
14. With 128 residual identities established, send enough unique unknown-key, accessor,
    proxy-trap, invalid action/type/bound, malformed-storage, `newValue:null`, and own-source
    inputs that any accidental insertion/touch would overflow or reorder the map. They must
    deliver nothing and remain state-neutral; the oldest valid identity's later twin still
    suppresses.
15. Canonical channel, legacy channel, and storage serialization retain exactly
    `action`, `key`, `sourceId`, and `ts`, including storage remove-before-set order.

## Implementation Pseudocode

```ts
// screenEntryPresentationOverrideContract.ts owns one Bun-free normalization family.
// Both the domain service and admin client import it; neither mirrors validation.
// UUID syntax is NOT redefined here: import the canonical TASK-540-01 export.
import { isScreenMediaAssetUuid } from "./customScreenSchemas";

function normalizeCanonicalMediaUuid(value: unknown) {
  if (!isScreenMediaAssetUuid(value)) throw invalidOverride();
  return value;
}

function normalizeScreenEntryPresentationOverrideDraft(input: unknown) {
  rejectUnknownKeys(input, ["blockId", "propPath", "value"]);
  const blockId = normalizeSafeBlockId(input.blockId);
  const propPath = normalizeOverridePropPath(input.propPath);
  const value = mediaPropPathSet.has(propPath)
    ? normalizeCanonicalMediaUuid(input.value)
    : normalizeOwnedTextEnum(propPath, input.value);
  return { blockId, propPath, value };
}

type ScreenEntryPresentationOverrideTransportRecord =
  Omit<ScreenEntryPresentationOverrideRecord, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  };

const assertNeverOverrideSource = (value: never): never => {
  throw invalidOverride();
};

const normalizeScreenEntryPresentationOverrideDraftKeys = (row: unknown) => {
  const record = expectOverrideRecord(row);
  return normalizeScreenEntryPresentationOverrideDraft({
    blockId: record.blockId,
    propPath: record.propPath,
    value: record.value,
  });
};

function normalizeRepositoryMetadata(
  row: unknown
): Omit<ScreenEntryPresentationOverrideRecord, keyof ScreenEntryPresentationOverrideDraft> {
  // Safe scope IDs, updatedBy canonical UUID|null, and finite valid Date instances.
  return validateAndPreserveRepositoryMetadata(row);
}

function normalizeTransportMetadata(
  row: unknown
): Omit<ScreenEntryPresentationOverrideTransportRecord, keyof ScreenEntryPresentationOverrideDraft> {
  // Safe scope IDs, updatedBy canonical UUID|null, and canonical ISO timestamp strings.
  return validateAndPreserveTransportMetadata(row);
}

function normalizeScreenEntryPresentationOverrideList(
  input: unknown,
  options: { source: "draft-cache" }
): ScreenEntryPresentationOverrideDraft[];
function normalizeScreenEntryPresentationOverrideList(
  input: unknown,
  options: { source: "repository-record" }
): ScreenEntryPresentationOverrideRecord[];
function normalizeScreenEntryPresentationOverrideList(
  input: unknown,
  options: { source: "transport-response" }
): ScreenEntryPresentationOverrideDraft[];
function normalizeScreenEntryPresentationOverrideList(
  input: unknown,
  options: {
    source: "draft-cache" | "repository-record" | "transport-response";
  }
): ScreenEntryPresentationOverrideDraft[] | ScreenEntryPresentationOverrideRecord[] {
  if (!Array.isArray(input) || input.length > 200) throw invalidOverride();
  switch (options.source) {
    case "draft-cache":
      return input.map(normalizeScreenEntryPresentationOverrideDraft);
    case "repository-record":
      return input.map((row) => {
        const record = expectOverrideRecord(row);
        rejectUnknownKeys(record, [
          "blockId", "propPath", "value", "screenId", "entryId",
          "updatedBy", "createdAt", "updatedAt",
        ]);
        const draft = normalizeScreenEntryPresentationOverrideDraftKeys(record);
        const metadata = normalizeRepositoryMetadata(record); // valid Date instances
        return { ...metadata, ...draft }; // preserve metadata for service/route
      });
    case "transport-response":
      return input.map((row) => {
        const record = expectOverrideRecord(row);
        rejectUnknownKeys(record, [
          "blockId", "propPath", "value", "screenId", "entryId",
          "updatedBy", "createdAt", "updatedAt",
        ]);
        normalizeTransportMetadata(record); // exact ISO strings; updatedBy UUID | null
        return normalizeScreenEntryPresentationOverrideDraftKeys(record); // project here
      });
    default:
      return assertNeverOverrideSource(options.source);
  }
}

// customScreensClient owns only the transport envelope, not row validation.
function normalizeOverrideResponseEnvelope(input: unknown) {
  rejectUnknownKeys(input, ["overrides"]);
  return normalizeScreenEntryPresentationOverrideList(input.overrides, {
    source: "transport-response",
  });
}

// NON-EXECUTABLE INDEX NOTE: the sole cacheBus implementation algorithm is the
// "Canonical/legacy remote-event repair contract" pseudocode above. Do not add a second
// post-serialization path or invoke a remote handler outside its state-before-handler
// deliverRemote algorithm. The already-owned additive operation-token API remains unchanged.

// The L03-owned mutation client forwards one caller-provided local operation token to
// both list/detail cache notifications. Existing callers omit it.
export type CustomScreenMutationOptions = Readonly<{
  cacheEventOperationToken?: CacheEventOperationToken;
}>;

export async function createCustomScreen(
  input: CustomScreenCreateInput,
  options?: CustomScreenMutationOptions
): Promise<CustomScreenRecord> {
  const created = await postCustomScreen(input); // options never joins this request
  upsertCachedScreen(created);
  broadcastCacheEvent(listEvent, {
    operationToken: options?.cacheEventOperationToken,
  });
  broadcastCacheEvent(detailEvent(created.id), {
    operationToken: options?.cacheEventOperationToken,
  });
  return created;
}

export async function updateCustomScreen(
  id: string,
  input: CustomScreenUpdateInput,
  options?: CustomScreenMutationOptions
): Promise<CustomScreenRecord> {
  const updated = await patchCustomScreen(id, input);
  upsertCachedScreen(updated);
  broadcastCacheEvent(listEvent, {
    operationToken: options?.cacheEventOperationToken,
  });
  broadcastCacheEvent(detailEvent(updated.id), {
    operationToken: options?.cacheEventOperationToken,
  });
  return updated;
}

// The token never joins fetch input, JSON, cache values, storage, BroadcastChannel
// payloads, logs, or server contracts.

// Extend the existing service-owned active-target check; do not add a parallel schema.
function isMediaOverrideTargetActive(override, block, bindings, properties) {
  if (!mediaPropPathSet.has(override.propPath)) return false;
  if (block.type === "image") return true;
  if (block.type !== "field") return false;
  const field = resolveFieldBlockField(block, bindings);
  return field ? isSingleMediaFieldResolvable(field, properties) : false;
}

// Entry UI uses the same target distinction.
function resolvePresentationTarget(block, field) {
  if (block.type === "image") {
    return { kind: "direct-image", blockId: block.id, propPath: "mediaAssetId" };
  }
  if (
    block.type === "field" &&
    field?.type === "media" &&
    field.media?.multiple !== true
  ) {
    return { kind: "media-field", blockId: block.id, propPath: "mediaAssetId" };
  }
  return existingTextTargetOrNull(block, field);
}

function collectWinningDirectImageAssetIds({
  document,
  bindings,
  values,
  overrides,
}): string[] {
  const ids = new Set<string>();
  for (const block of collectScreenDocumentBlocks(document)) {
    if (block.type !== "image") continue;
    const overrideId = readNormalizedMediaOverride(overrides, block.id);
    const boundId = resolveBoundMediaAssetId(block, bindings, values);
    const winningId = overrideId ?? boundId;
    if (isScreenMediaAssetUuid(winningId)) ids.add(winningId);
  }
  return [...ids].sort();
}
```

`screenEntryPresentationOverrideContract.ts` remains Bun-free and becomes the sole owner
of strict safe-block-ID, reject-unknown draft/list, prop-path, and bounded-text-enum
normalization. It imports `isScreenMediaAssetUuid` from the TASK-540-01-owned
`customScreenSchemas.ts` contract and must not mirror that predicate or its regex. The
service imports the override normalizer for request and stored-row normalization; the
admin client imports the same normalizer for request, response, and browser cache
normalization. Its three source modes are exact: `draft-cache` accepts only the three
draft keys; `repository-record` requires the known record metadata with valid `Date`
objects; and `transport-response` requires the same metadata with canonical ISO timestamp
strings and `updatedBy` as a canonical UUID or `null`. `screenId` and `entryId` use the
existing safe scope-ID contract. Draft-cache rows project to strict drafts;
repository-record rows validate and preserve their `Date` metadata so the service's
active-target filter and route continue returning records; transport-response rows
validate their serialized metadata and project to strict drafts only at the admin-client
cache boundary. No mode accepts a row shape belonging to another mode, and the complete
list validates before any result is returned. Service, client, and the
TASK-540-03-L01-owned renderer all use the same
canonical UUID predicate; this leaf runs renderer coverage read-only and does not edit
that owner. Metadata is projected away only before browser cache.
No DB, server, settings, or Bun runtime adapter may enter the contract module.

The strict override envelope and shared UUID normalizer remain authoritative. Extend
only the service's target-activity rule so `image` blocks accept the existing
`mediaAssetId`/legacy `image` prop paths. Field blocks remain accepted only when bound
to a schema-declared single-media field. A `media.multiple` field is never a scalar
presentation-override target: new writes fail closed, stored legacy rows are inactive
and cleanup-eligible, and the Entry Editor omits them before Canvas/Preview so the bound
UUID array reaches `MediaPicker` unchanged. Non-media fields and all other block kinds
remain fail-closed. No URL is persisted: replacement, repository round trip, active
read, and cleanup all preserve the exact normalized UUID.

For a direct image, collect the one winning asset identity: authored presentation
override first, otherwise the bound media value. Multiple blocks sharing a UUID produce
one requested ID. Single-media field override/bound UUIDs never enter the URL map and
continue unchanged to MediaPicker; multiple-media fields accept no scalar override and
retain their exact bound array. Static URL fallback requires no media lookup. If an authored
direct-image UUID wins but has no safe resolved record, the renderer's already-landed
TASK-540-03-L01 contract renders a placeholder without falling back.

`customScreensClient` must validate the exact response envelope and the complete list
before returning or caching it. It must never `flatMap`-drop a bad row. An unknown key,
unsafe block ID, invalid enum, non-UUID media value, malformed known record metadata, or
non-array/oversized list rejects the entire response with the fixed payload-free
`custom_screen_override_invalid` code and writes no cache. A malformed persisted cache
envelope or any malformed row evicts the whole scoped cache entry and falls through to
the network path; it never returns a partial list. Cache writes contain only normalized
three-key drafts. Exact normalized UUIDs survive replace, cache, response, active read,
repository round trip, and cleanup.

The cached override GET follows the same exact-pending-authority invariant as L01:

```ts
export function getScreenEntryOverridesCached(
  screenId: string,
  entryId: string,
  options?: { force?: boolean }
): Promise<ScreenEntryPresentationOverrideDraft[]> {
  const key = getScreenEntryOverridesCacheKey(screenId, entryId);
  if (!options?.force) {
    const cached = readScreenEntryOverridesCache(screenId, entryId);
    if (cached) return Promise.resolve(cached);
    const pending = screenEntryOverridesPromises.get(key);
    if (pending) return pending; // exact caller-visible promise identity
  }

  let request: Promise<ScreenEntryPresentationOverrideDraft[]>;
  request = getAndNormalizeScreenEntryOverrides(screenId, entryId)
    .then((overrides) => {
      if (screenEntryOverridesPromises.get(key) === request) {
        writeScreenEntryOverridesCache(screenId, entryId, overrides);
      }
      return overrides;
    })
    .finally(() => {
      if (screenEntryOverridesPromises.get(key) === request) {
        screenEntryOverridesPromises.delete(key);
      }
    });
  screenEntryOverridesPromises.set(key, request);
  return request; // this export must not be async
}

async function replaceScreenEntryOverrides(screenId, entryId, drafts) {
  const saved = normalizeOverrideResponseEnvelope(await patchOverrides(drafts));
  const key = getScreenEntryOverridesCacheKey(screenId, entryId);
  // A successful write is newer authority than any pre-write GET, even when no
  // browser value exists. Revoke before writing/broadcasting the PATCH result.
  screenEntryOverridesPromises.delete(key);
  writeScreenEntryOverridesCache(screenId, entryId, saved);
  broadcastOverrideUpdate(key);
  return saved;
}
```

Forced GET B replaces pending GET A. Only the exact request still registered for the
scope may publish or clean up; late A may resolve to its caller but cannot overwrite B
or delete B's slot. A successful PATCH revokes any pending GET before it writes the
normalized PATCH value, so a late pre-write GET cannot publish over it. Rejected PATCH
does not revoke or prime. Non-force concurrent GET callers receive the same stored
promise object.

Custom Screen list/detail publication uses the same monotonic reconciliation model as
the L01 Entry client, adapted to full Screen records:

```ts
type PendingVersioned<T> = Readonly<{ promise: Promise<T>; version: number }>;
type ScreenItemAuthority = Readonly<{
  version: number;
  change: { kind: "replace"; value: CustomScreenRecord } | { kind: "delete" };
}>;

let pendingScreensList: PendingVersioned<CustomScreenRecord[]> | null = null;
let committedScreensListVersion = 0;
const pendingScreenDetails = new Map<
  string,
  PendingVersioned<CustomScreenRecord | null>
>();
const settledScreenItemAuthority = new Map<string, ScreenItemAuthority>();

function publishScreenList(items, listVersion) {
  if (listVersion <= committedScreensListVersion) return;
  // Reconcile every server row with pending details and replace/delete mutations newer
  // than this list start. Fill unrelated rows and preserve newer creates/tombstones.
  const reconciled = reconcileCompleteScreenList(
    items,
    listVersion,
    pendingScreenDetails,
    settledScreenItemAuthority
  );
  invalidateScreenDetailsAtOrBefore(listVersion);
  clearKnownScreenDetailsOmittedFrom(reconciled, listVersion); // unless newer authority
  primeScreensListValue(reconciled);
  reconciled.forEach((item) => writeScreenDetailValue(item, listVersion));
  committedScreensListVersion = listVersion;
  discardSettledScreenAuthorityAtOrBefore(listVersion);
}

function listCustomScreensCached(options) {
  if (!options?.force) {
    const cached = getCachedCustomScreens();
    if (cached) return Promise.resolve(cached);
    if (pendingScreensList) return pendingScreensList.promise;
  }
  const version = nextScreenPublicationVersion();
  let pending!: PendingVersioned<CustomScreenRecord[]>;
  const promise = listCustomScreens()
    .then((items) => {
      if (pendingScreensList === pending) publishScreenList(items, version);
      return items;
    })
    .finally(() => {
      if (pendingScreensList === pending) pendingScreensList = null;
    });
  pending = { promise, version };
  pendingScreensList = pending;
  return promise;
}

function getCustomScreenCached(id, options) {
  if (!options?.force) {
    const cached = getCachedCustomScreen(id);
    if (cached) return Promise.resolve(cached);
    const pending = pendingScreenDetails.get(id);
    if (pending) return pending.promise;
  }
  const version = nextScreenPublicationVersion();
  let pending!: PendingVersioned<CustomScreenRecord | null>;
  const promise = getCustomScreen(id)
    .then((item) => ({ kind: "detail" as const, item }))
    .catch(async () => {
      const items = await listCustomScreens();
      return {
        kind: "fallback-list" as const,
        items,
        item: items.find((entry) => entry.id === id) ?? null,
      };
    })
    .then((result) => {
      if (pendingScreenDetails.get(id) !== pending) return result.item;
      if (result.kind === "fallback-list") {
        publishScreenList(result.items, version); // complete, omission-cleaning list
      } else {
        settleScreenAuthority(id, {
          version,
          change: { kind: "replace", value: result.item },
        });
        mergeScreenIntoCurrentList(result.item); // preserve unrelated rows
        writeScreenDetailValue(result.item, version);
      }
      return result.item;
    })
    .finally(() => removePendingScreenDetailOnlyIfExact(id, pending));
  pending = { promise, version };
  pendingScreenDetails.set(id, pending);
  return promise;
}
```

A full-list request and a detail request each capture a monotonic start version. In
detail-start→newer-list, the newer list wins that item; in list-start→newer-detail, the
list still fills unrelated rows while preserving the newer item. Both settlement orders
produce the same final cache. A full-list version becomes committed only on successful
exact publication; rejection clears only its pending record and cannot permanently block
an older detail. Successful create/update/delete records a newer exact value/tombstone
and revokes only the matching detail; an older full list may still fill unrelated rows
but cannot undo that mutation. Rejected mutations allocate no authority. Every complete
list publication—including detail fallback—clears known omitted detail rows unless a
newer value/tombstone owns that ID. Explicit cache clear invalidates list/detail pending
records, values, known IDs, and captured versions. Helpers that write reconciled values
never mutate pending-request slots.

The service first runs every repository row through the shared fail-closed stored-list
normalizer; only after that complete list succeeds may the existing active-target pass
filter structurally valid but currently inactive targets. A malformed repository row is
not the same as an inactive target and must reject the whole operation rather than being
silently dropped.

### Concrete media attempt contract

```tsx
// One opaque object is allocated per keyed route-session mount. It is never serialized.
type RouteVisit = Readonly<{ routeKey: string }>;

export type MediaAttemptCause = "initial" | "manual-retry" | "cache-event";
export type MediaAttempt = {
  requestKey: string;
  token: number;
  cause: MediaAttemptCause;
  force: boolean;
  requestedIds: readonly string[];
};
export type MediaMachineState = {
  lastToken: number;
  settledToken: number | null;
  requestKey: string;
  attempt: MediaAttempt | null;
};
export type MediaAttemptInput = {
  requestKey: string;
  requestedIds: readonly string[];
};
export type MediaAttemptAction =
  | { type: "sync-request"; requestKey: string; requestedIds: readonly string[] }
  | {
      type: "retry";
      requestKey: string;
      cause: "manual-retry" | "cache-event";
    }
  | { type: "settled"; requestKey: string; token: number };
const assertNeverMediaAttemptAction = (action: never): never => {
  throw new Error(`Unhandled media-attempt action: ${String(action)}`);
};
type MediaCommit = {
  routeVisit: RouteVisit | null;
  requestKey: string | null;
  attemptToken: number | null;
  urlsById: Readonly<Record<string, string>>;
  error: string | null;
};
const PRESENTATION_MEDIA_LOAD_ERROR = "Presentation image could not be loaded.";

export function buildEntryRouteKey(input: {
  screenId: string | null;
  entryId: string | null;
  isCreateMode: boolean;
}): string {
  return JSON.stringify([input.screenId ?? "", input.entryId ?? "", input.isCreateMode]);
}

const invalidPresentationMediaKey = () =>
  new Error("custom_screen_presentation_media_invalid");

const parsePresentationMediaJson = (value: string): unknown => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw invalidPresentationMediaKey();
  }
};

const decodeAndValidateEntryRouteKey = (routeKey: string) => {
  const tuple = parsePresentationMediaJson(routeKey);
  if (
    !Array.isArray(tuple) || tuple.length !== 3 ||
    typeof tuple[0] !== "string" || typeof tuple[1] !== "string" ||
    typeof tuple[2] !== "boolean"
  ) throw invalidPresentationMediaKey();
  return Object.freeze([tuple[0], tuple[1], tuple[2]] as const);
};

const assertScreenMediaAssetUuid = (value: unknown): string => {
  if (!isScreenMediaAssetUuid(value)) throw invalidPresentationMediaKey();
  return value;
};

export function buildPresentationMediaRequestKey(
  routeKey: string,
  requestedIds: readonly string[]
): string {
  decodeAndValidateEntryRouteKey(routeKey);
  const ids = [...new Set(requestedIds.map(assertScreenMediaAssetUuid))].sort();
  if (ids.length > 200) throw new Error("custom_screen_presentation_media_invalid");
  return JSON.stringify([routeKey, ids]);
}

export function decodeAndValidatePresentationMediaRequestKey(key: string): {
  routeKey: string;
  requestedIds: readonly string[];
} {
  const tuple = parsePresentationMediaJson(key);
  if (
    !Array.isArray(tuple) || tuple.length !== 2 ||
    typeof tuple[0] !== "string" || !Array.isArray(tuple[1]) || tuple[1].length > 200
  ) throw invalidPresentationMediaKey();
  decodeAndValidateEntryRouteKey(tuple[0]);
  const requestedIds = Object.freeze(tuple[1].map(assertScreenMediaAssetUuid));
  if (new Set(requestedIds).size !== requestedIds.length) throw invalidPresentationMediaKey();
  if (requestedIds.some((id, index) => index > 0 && requestedIds[index - 1]! > id)) {
    throw invalidPresentationMediaKey();
  }
  return { routeKey: tuple[0], requestedIds };
}

// routeKey is the canonical serialized cache/media codec. It is not mounted-visit
// authority; every async/visible continuation below also carries the opaque routeVisit.
// JSON tuple decoding validates every member and rejects extra tuple positions.
const routeKey = buildEntryRouteKey({ screenId, entryId, isCreateMode });

// In the implementation, declare the route-scoped committed-state aliases shown in the
// Dirty hydration section below before deriving this plan. They are presented later only
// to keep the contract grouped by responsibility; no const is consumed before declaration.

const requestedIdsPlan = useMemo(
  () => collectWinningDirectImageAssetIds({
    document: currentRuntimeDocument,
    bindings: currentRuntimeBindings,
    values: currentCanvasFieldValues,
    overrides: currentDraftOverrides,
  }),
  [currentRuntimeDocument, currentRuntimeBindings, currentCanvasFieldValues, currentDraftOverrides]
);
const mediaRequestKey = buildPresentationMediaRequestKey(routeKey, requestedIdsPlan);
// The memory-only canonical key losslessly encodes the full route identity plus the
// sorted/deduplicated UUID list. The decoder validates the route tuple and revalidates
// every UUID with isScreenMediaAssetUuid.
export const readRequestedIdsFromMediaRequestKey = (key: string): readonly string[] =>
  Object.freeze(decodeAndValidatePresentationMediaRequestKey(key).requestedIds);

export function allocateMediaAttempt(
  state: MediaMachineState,
  input: MediaAttemptInput,
  cause: MediaAttemptCause,
  force: boolean
): MediaMachineState {
  const token = state.lastToken + 1;
  return {
    ...state,
    lastToken: token,
    requestKey: input.requestKey,
    attempt: {
      requestKey: input.requestKey,
      token, // globally monotonic for this mounted host and never reused
      cause,
      force,
      requestedIds: Object.freeze([...input.requestedIds]),
    },
  };
}

export function mediaAttemptReducer(
  state: MediaMachineState,
  action: MediaAttemptAction
): MediaMachineState {
  switch (action.type) {
    case "sync-request": {
      if (action.requestKey === state.requestKey) return state;
      if (action.requestedIds.length === 0) {
        return { ...state, requestKey: action.requestKey, attempt: null };
      }
      const priorPending =
        state.attempt !== null && state.attempt.token !== state.settledToken;
      const inheritForce = priorPending && state.attempt!.force;
      return allocateMediaAttempt(
        state,
        action,
        inheritForce ? state.attempt!.cause : "initial",
        Boolean(inheritForce)
      );
    }
    case "retry":
      if (action.requestKey !== state.requestKey || !state.attempt) return state;
      return allocateMediaAttempt(
        state,
        { requestKey: state.requestKey, requestedIds: state.attempt.requestedIds },
        action.cause,
        true
      );
    case "settled":
      if (
        state.attempt?.requestKey !== action.requestKey ||
        state.attempt.token !== action.token
      ) return state; // stale settlement is a strict no-op
      if (state.settledToken === action.token) return state;
      return { ...state, settledToken: action.token }; // preserve attempt reference
    default:
      return assertNeverMediaAttemptAction(action);
  }
}

export function initializeMediaMachineState(input: MediaAttemptInput): MediaMachineState {
  const empty = {
    lastToken: 0,
    settledToken: null,
    requestKey: input.requestKey,
    attempt: null,
  } satisfies MediaMachineState;
  return input.requestedIds.length === 0
    ? empty
    : allocateMediaAttempt(empty, input, "initial", false);
}

const [mediaMachine, dispatchMediaAttempt] = useReducer(
  mediaAttemptReducer,
  { requestKey: mediaRequestKey, requestedIds: requestedIdsPlan },
  initializeMediaMachineState
);

useEffect(() => {
  if (mediaMachine.requestKey === mediaRequestKey) return undefined;
  let active = true;
  // Async result boundary: no synchronous state update in an effect, and IDs are
  // reconstructed from the canonical scalar key rather than captured as an array dep.
  queueMicrotask(() => {
    if (!active) return;
    mediaLoadGenerationRef.current += 1;
    dispatchMediaAttempt({
      type: "sync-request",
      requestKey: mediaRequestKey,
      requestedIds: readRequestedIdsFromMediaRequestKey(mediaRequestKey),
    });
  });
  return () => {
    active = false;
  };
}, [mediaMachine.requestKey, mediaRequestKey]);

const attempt =
  mediaMachine.requestKey === mediaRequestKey ? mediaMachine.attempt : null;
const attemptToken = attempt?.token ?? null;
const [mediaCommit, setMediaCommit] = useState<MediaCommit>({
  routeVisit: null,
  requestKey: null,
  attemptToken: null,
  urlsById: {},
  error: null,
});
const mediaLoadGenerationRef = useRef(0);

const beginMediaAttempt = useCallback((cause: "manual-retry" | "cache-event") => {
  mediaLoadGenerationRef.current += 1;
  dispatchMediaAttempt({ type: "retry", requestKey: mediaRequestKey, cause });
}, [mediaRequestKey]);

const hasRequestedMediaIds = requestedIdsPlan.length > 0;
useEffect(() => subscribeCacheEvents((event) => {
  if (event.key === cacheKeys.mediaList && hasRequestedMediaIds) {
    beginMediaAttempt("cache-event");
  }
}), [beginMediaAttempt, hasRequestedMediaIds]);

useEffect(() => {
  if (!attempt || attempt.requestKey !== mediaRequestKey) return undefined;
  const frozenRouteVisit = routeVisit;
  const frozenRequestedIds = attempt.requestedIds;
  const frozenAttemptToken = attempt.token;
  let active = true;
  const generation = ++mediaLoadGenerationRef.current;
  const isCurrent = () =>
    active &&
    mountedRef.current &&
    generation === mediaLoadGenerationRef.current;
  void listMediaCached({ force: attempt.force })
    .then((records) => {
      if (!isCurrent()) return;
      dispatchMediaAttempt({
        type: "settled",
        requestKey: mediaRequestKey,
        token: frozenAttemptToken,
      });
      setMediaCommit({
        routeVisit: frozenRouteVisit,
        requestKey: mediaRequestKey,
        attemptToken: frozenAttemptToken,
        urlsById: projectExactRequestedMediaUrls(records, frozenRequestedIds),
        error: null,
      });
    })
    .catch((_error) => {
      if (!isCurrent()) return;
      dispatchMediaAttempt({
        type: "settled",
        requestKey: mediaRequestKey,
        token: frozenAttemptToken,
      });
      setMediaCommit((previous) => ({
        routeVisit: frozenRouteVisit,
        requestKey: mediaRequestKey,
        attemptToken: frozenAttemptToken,
        urlsById:
          previous.routeVisit === frozenRouteVisit &&
          previous.requestKey === mediaRequestKey
            ? previous.urlsById
            : {},
        error: PRESENTATION_MEDIA_LOAD_ERROR,
      }));
    });
  return () => {
    active = false;
  };
}, [attempt, mediaRequestKey, routeVisit]);

const mediaMatchesRequest =
  mediaCommit.routeVisit === routeVisit && mediaCommit.requestKey === mediaRequestKey;
const presentationMediaState =
  requestedIdsPlan.length === 0
    ? { urlsById: {}, loading: false, refreshing: false, error: null }
    : mediaMatchesRequest
      ? {
          urlsById: mediaCommit.urlsById,
          loading: false,
          refreshing: mediaCommit.attemptToken !== attemptToken,
          error:
            mediaCommit.attemptToken === attemptToken ? mediaCommit.error : null,
        }
      : { urlsById: {}, loading: true, refreshing: false, error: null };
```

The route/media key codec, media state initializer, allocator, and reducer are Bun-free
exports owned by `customScreenEntryPresentationMedia.ts`. The public
`CustomScreenEntryEditor.tsx` wrapper compatibility-re-exports their pre-split names,
while the dedicated pure Vitest suite imports the owner directly to prove exact object
identity, monotonic token allocation, frozen snapshots, exhaustive stale-action no-ops,
and route-key round trips. The component hook consumes the same owner and no test-only
production fallback is added.

Initial media resolution is non-force. The visible Retry button and
`cacheKeys.mediaList` events use explicit `force:true` attempts. Every attempt uses
L01's authoritative media cache and guards request key, globally monotonic attempt
token, generation, and
unmount before commit. Same-request refresh retains URLs and exposes refreshing;
request mismatch exposes an empty map/loading. A settled bounded error is visible and
retryable as title `Presentation image unavailable`, description
`Presentation image could not be loaded.`, and button `Retry`; it is hidden during
loading/refreshing and does not disable entry editing. `CustomScreenEntryCanvas` and
the existing read-only `CustomScreenPreview` branch forward only `urlsById` to the
renderer; neither resolves nor sanitizes URLs. The Preview props remain optional so
builder/list previews and retained compatibility consumers are byte-identical when no
entry-scoped presentation data is supplied.

The load effect depends only on canonical `mediaRequestKey` and the stable
reducer-persisted attempt object. It captures that attempt's frozen, sorted ID snapshot;
neither the live requested-ID array reference nor any render-time current-token ref is
used. `settledToken` is stored separately, so settlement preserves exact attempt-object
identity and cannot restart the effect. The discriminated action union uses an exhaustive
switch; stale settlement is an identical-state no-op and never falls through to retry.
Referentially new but semantically identical editor inputs during a forced attempt
therefore retain the same request key/attempt and issue exactly one media read.

`mediaRequestKey` includes the exact `routeKey` (`screenId`, `entryId`, and create-mode
identity) as well as the UUID snapshot. Navigating Screen A -> Screen B with the same
entry ID and winning UUIDs therefore allocates a fresh attempt after layout cleanup; the
old result is rejected and the new route cannot remain stranded in loading state.

Because every ID set reads the same global `cacheKeys.mediaList` resource, an ID-set
change during a still-pending forced media attempt inherits its cause and `force:true`
while receiving `lastToken + 1`; it cannot fall back to an older global value cache. The
sorted/deduplicated ID snapshot is copied and frozen at allocation and remains unchanged
even if later render inputs mutate or reorder their arrays.

While editing the L03-owned
`custom-screen-entry-editor-restyle.test.tsx`, replace only its stale assertion that the
Field metadata toggle writes `coderso.screens.entry.preferences.v1` to `localStorage`.
Retitle that test around transport-neutral UI behavior and keep the assertions that the
toggle changes `aria-checked` and visibly reveals the entry badges; do not change the
preference source in this leaf. TASK-540-05-L02 later owns the dedicated
`custom-screen-entry-preferences-persistence.test.tsx` coverage for server-backed,
per-user persistence and absence of localStorage, and runs this restyle suite read-only
after that transport switch.

Before the mandatory modularity split, this leaf was the sole writer of
`CustomScreenEntryEditor.tsx`; it remains the sole writer of the wrapper and every new
Entry Editor module listed in Exclusive ownership. The already-landed transport-neutral
English comment `Entry-view badge preferences are owned by the dedicated hook (default
OFF).` moves with the hook call into `CustomScreenEntryRouteSession.tsx` without changing
the executable preference behavior. Later leaves consume that call site read-only.

### Dirty hydration and navigation contract

#### Post-audit route-visit correction

The implementation post-audit found that `routeKey` alone cannot identify a mounted
visit: after A -> B -> A, route-keyed commits from the first A visit become current
again. The route-key-only state shapes in the original pseudocode are therefore
superseded by this correction. Keep the canonical serialized `routeKey` for cache and
media-key codecs, but render an L03-local keyed session and allocate one opaque
`RouteVisit` inside that session. Every visible entry/override commit, warning, error,
load/save activity, notice, async token, stale-create target, and media commit compares
the exact visit object as well as the existing route/channel generation. This is a
correctness identity, not a `useMemo` cache identity.

```tsx
export function CustomScreenEntryEditor() {
  const { path } = useAdminRouter();
  const params = resolveCustomScreenEntryParams(path);
  const routeKey = buildEntryRouteKey({
    ...params,
    isCreateMode: params.entryId === "new",
  });
  return <CustomScreenEntryRouteSession key={routeKey} {...params} routeKey={routeKey} />;
}

function CustomScreenEntryRouteSession({ routeKey, ...route }: RouteSessionProps) {
  const [routeVisit] = useState<RouteVisit>(() => Object.freeze({ routeKey }));
  // All state, refs, effects, subscriptions, and async continuations live here.
}
```

The keyed boundary unmounts A before B and creates a fresh session for the second A
visit. `useLayoutEffect` cleanup still invalidates all generations and clears the global
assistant surface before passive cleanup, so the render-to-passive-cleanup race remains
covered. Confirmed discard synchronously invalidates generations and committed visit
authority before the shared guard continues navigation. Tests must cover A -> B -> A
with pending content and presentation saves, discarded-A hydration failure, old media
settlement, cache callbacks, and assistant-context cleanup. Presentation controls are
withheld until the exact override visit is ready; an initial override-load error is a
route-level retryable alert independent of block selection and cannot be cleared by a
rejected/no-op mutation.

```tsx
const contentDirtyRef = useRef(false);
const presentationDirtyRef = useRef(false);
const savedOverridesRef = useRef(initialPresentationOverrides);
const draftOverridesRef = useRef(initialPresentationOverrides);
const [hasUnsavedPresentationChanges, setHasUnsavedPresentationChanges] =
  useState(false);
const draftMutationGenerationRef = useRef(0);
const entryLoadGenerationRef = useRef(0);
const overrideLoadGenerationRef = useRef(0);
const contentSaveGenerationRef = useRef(0);
const presentationSaveGenerationRef = useRef(0);
type RouteMessageCommit = { routeVisit: RouteVisit; message: string };
type PresentationErrorCommit = RouteMessageCommit & { kind: "load" | "save" };
const persistedEntryTargetRef = useRef<{
  routeVisit: RouteVisit;
  routeGeneration: number;
  id: string;
} | null>(null);
const mountedRef = useRef(true);
const routeGenerationRef = useRef(0);
// `routeKey` remains the canonical serialized tuple for cache/media codecs. The opaque
// visit object is the mounted-session authority and is never serialized or persisted.
const initialEntryRouteReady = Boolean(
  initialScreen && initialContentType && (isCreateMode || initialEntry)
);
const initialPresentationRouteReady =
  isCreateMode || initialCachedPresentationOverrides !== null;
const [committedEntryVisit, setCommittedEntryVisit] = useState<RouteVisit | null>(
  initialEntryRouteReady ? routeVisit : null
);
const [committedOverrideVisit, setCommittedOverrideVisit] = useState<RouteVisit | null>(
  initialPresentationRouteReady ? routeVisit : null
);
const [entryErrorCommit, setEntryErrorCommit] = useState<RouteMessageCommit | null>(null);
const [presentationErrorCommit, setPresentationErrorCommit] =
  useState<PresentationErrorCommit | null>(null);
const [remoteEntryWarningVisit, setRemoteEntryWarningVisit] =
  useState<RouteVisit | null>(null);
const [remotePresentationWarningVisit, setRemotePresentationWarningVisit] =
  useState<RouteVisit | null>(null);
const [entryLoadActivityVisit, setEntryLoadActivityVisit] = useState<RouteVisit | null>(
  initialEntryRouteReady ? null : routeVisit
);
const [presentationLoadActivityVisit, setPresentationLoadActivityVisit] =
  useState<RouteVisit | null>(
    !isCreateMode && initialCachedPresentationOverrides === null ? routeVisit : null
  );
const [contentSaveActivityVisit, setContentSaveActivityVisit] =
  useState<RouteVisit | null>(null);
const [presentationSaveActivityVisit, setPresentationSaveActivityVisit] =
  useState<RouteVisit | null>(null);
const [saveNoticeCommit, setSaveNoticeCommit] = useState<RouteMessageCommit | null>(null);
const [presentationSaveNoticeCommit, setPresentationSaveNoticeCommit] =
  useState<RouteMessageCommit | null>(null);

const entryRouteReady = committedEntryVisit === routeVisit;
const overrideRouteReady = committedOverrideVisit === routeVisit;
const error =
  entryErrorCommit?.routeVisit === routeVisit ? entryErrorCommit.message : null;
const presentationError =
  presentationErrorCommit?.routeVisit === routeVisit
    ? presentationErrorCommit.message
    : null;
const presentationErrorKind =
  presentationErrorCommit?.routeVisit === routeVisit
    ? presentationErrorCommit.kind
    : null;
const remoteUpdatePending = remoteEntryWarningVisit === routeVisit;
const remotePresentationUpdatePending =
  remotePresentationWarningVisit === routeVisit;
const isLoading =
  entryLoadActivityVisit === routeVisit || (!entryRouteReady && error === null);
const isPresentationLoading =
  presentationLoadActivityVisit === routeVisit ||
  (!isCreateMode && !overrideRouteReady && presentationError === null);
const isSaving = contentSaveActivityVisit === routeVisit;
const isPresentationSaving = presentationSaveActivityVisit === routeVisit;
const currentSaveNotice =
  saveNoticeCommit?.routeVisit === routeVisit ? saveNoticeCommit.message : null;
const currentPresentationSaveNotice =
  presentationSaveNoticeCommit?.routeVisit === routeVisit
    ? presentationSaveNoticeCommit.message
    : null;
const currentScreen = entryRouteReady ? screen : null;
const currentContentType = entryRouteReady ? contentType : null;
const currentEntry = entryRouteReady ? entry : null;
const currentFields = entryRouteReady ? fields : [];
const currentDraftOverrides = overrideRouteReady ? draftOverrides : [];
const currentRuntimeDocument = resolveRuntimeDocument(currentScreen);
const currentRuntimeBindings = resolveRuntimeBindings(currentScreen);
const currentCanvasFieldValues = entryRouteReady ? canvasFieldValues : {};
const currentScreenCapabilities = resolveCustomScreenCapabilities({
  definition: currentScreen ? resolveRuntimeDefinition(currentScreen) : undefined,
});
function mayMutateCurrentEntry() {
  return entryRouteReady && currentContentType !== null;
}

function mayMutateCurrentPresentation() {
  return entryRouteReady && overrideRouteReady && !isCreateMode;
}

const relatedState = useScreenRelatedEntries({
  enabled: entryRouteReady,
  document: currentRuntimeDocument,
  bindings: currentRuntimeBindings,
  values: currentCanvasFieldValues,
  fields: currentFields,
});

useLayoutEffect(() => {
  mountedRef.current = true;
  routeGenerationRef.current += 1;
  return () => {
    // Layout cleanup runs before the next route's async work can commit.
    clearActiveAssistantSurfaceContext();
    persistedEntryTargetRef.current = null; // synchronous route-scope revocation
    mountedRef.current = false;
    routeGenerationRef.current += 1;
    entryLoadGenerationRef.current += 1;
    overrideLoadGenerationRef.current += 1;
    contentSaveGenerationRef.current += 1;
    presentationSaveGenerationRef.current += 1;
    mediaLoadGenerationRef.current += 1;
  };
}, [routeKey]);

function markContentMutation() {
  if (!mayMutateCurrentEntry()) return false;
  draftMutationGenerationRef.current += 1;
  contentDirtyRef.current = true;
  setHasUnsavedChanges(true);
  return true;
}

function applyPresentationDraftMutation(
  update: (
    current: readonly ScreenEntryPresentationOverrideDraft[]
  ) => ScreenEntryPresentationOverrideDraft[]
) {
  if (!mayMutateCurrentPresentation()) return;
  const nextDraft = normalizePresentationOverrideOrder(
    update(draftOverridesRef.current)
  );
  draftMutationGenerationRef.current += 1;
  draftOverridesRef.current = nextDraft;
  const dirty =
    serializePresentationOverrides(savedOverridesRef.current) !==
    serializePresentationOverrides(nextDraft);
  presentationDirtyRef.current = dirty;
  setDraftOverrides(nextDraft);
  setHasUnsavedPresentationChanges(dirty);
}

function applyLoadedState(
  nextScreen: CustomScreenRecord,
  nextContentType: ContentTypeSummary,
  nextEntry: EntryDetail | null,
  acceptedRouteVisit: RouteVisit
) {
  const nextFields = fieldsFromSchema(nextContentType.schema);
  const editorView = resolveRuntimeEditorView(nextScreen);
  const nextDraft = nextEntry
    ? hydrateEditorViewDraft({ contentType: nextContentType, editorView, entry: nextEntry })
    : buildInitialEntryDraft({ contentType: nextContentType, editorView });
  setScreen(nextScreen);
  setContentType(nextContentType);
  setEntry(nextEntry);
  setFields(nextFields);
  setTitle(nextDraft.title);
  setSlug(nextDraft.slug);
  setValues(nextDraft.data);
  setEditableFields(nextDraft.editableFields);
  setOriginalData(nextDraft.originalData);
  setFieldErrors({});
  contentDirtyRef.current = false;
  setHasUnsavedChanges(false);
  setRemoteEntryWarningVisit(null);
  setSelectedRuntimeBlockId((current) =>
    preserveSelectedElementAcrossRefresh({
      selectedBlockId: current,
      nextDocument: resolveRuntimeDocument(nextScreen),
    })
  );
  setEntryErrorCommit(null);
  setCommittedEntryVisit(acceptedRouteVisit);
}

function applyAuthoritativePresentationState(
  overrides: ScreenEntryPresentationOverrideDraft[],
  acceptedRouteVisit: RouteVisit
) {
  const ordered = normalizePresentationOverrideOrder(overrides);
  savedOverridesRef.current = ordered;
  draftOverridesRef.current = ordered;
  presentationDirtyRef.current = false;
  setSavedOverrides(ordered);
  setDraftOverrides(ordered);
  setHasUnsavedPresentationChanges(false);
  setPresentationErrorCommit(null);
  setRemotePresentationWarningVisit(null);
  setCommittedOverrideVisit(acceptedRouteVisit);
}

type LoadChannel = "entry" | "override";
type LoadToken = {
  channel: LoadChannel;
  routeKey: string;
  routeVisit: RouteVisit;
  routeGeneration: number;
  loadGeneration: number;
  draftGeneration: number;
};

function captureLoadToken(channel: LoadChannel): LoadToken {
  const loadGeneration =
    channel === "entry"
      ? ++entryLoadGenerationRef.current
      : ++overrideLoadGenerationRef.current;
  return {
    channel,
    routeKey,
    routeVisit,
    routeGeneration: routeGenerationRef.current,
    loadGeneration,
    draftGeneration: draftMutationGenerationRef.current,
  };
}

function isLoadIdentityCurrent(token: LoadToken) {
  const currentLoadGeneration =
    token.channel === "entry"
      ? entryLoadGenerationRef.current
      : overrideLoadGenerationRef.current;
  return mountedRef.current &&
    token.routeKey === routeKey &&
    token.routeVisit === routeVisit &&
    routeGenerationRef.current === token.routeGeneration &&
    currentLoadGeneration === token.loadGeneration;
}

function mayApplyAuthoritativeDraft(token) {
  return isLoadIdentityCurrent(token) &&
    token.draftGeneration === draftMutationGenerationRef.current &&
    !contentDirtyRef.current &&
    !presentationDirtyRef.current;
}

function didCompleteDraftRemainClean(token) {
  return token.draftGeneration === draftMutationGenerationRef.current &&
    !contentDirtyRef.current &&
    !presentationDirtyRef.current;
}

async function runEntryHydration(force: boolean, isActive: () => boolean) {
  const token = captureLoadToken("entry");
  setEntryLoadActivityVisit(token.routeVisit);
  try {
    const result = await loadEntryRoute(force);
    if (!isActive() || !isLoadIdentityCurrent(token)) return;
    if (!mayApplyAuthoritativeDraft(token)) {
      setRemoteEntryWarningVisit(token.routeVisit);
      return;
    }
    applyLoadedState(
      result.nextScreen,
      result.nextContentType,
      result.nextEntry,
      token.routeVisit
    );
  } catch {
    if (!isActive() || !isLoadIdentityCurrent(token)) return;
    setEntryErrorCommit({
      routeVisit: token.routeVisit,
      message: didCompleteDraftRemainClean(token)
        ? "Failed to load record."
        : "Could not check for record updates. Local changes are unchanged.",
    });
  } finally {
    if (isActive() && isLoadIdentityCurrent(token)) {
      setEntryLoadActivityVisit((current) =>
        current === token.routeVisit ? null : current
      );
    }
  }
}

async function runOverrideHydration(force: boolean, isActive: () => boolean) {
  const token = captureLoadToken("override");
  setPresentationLoadActivityVisit(token.routeVisit);
  try {
    const result =
      !screenId || !entryId || isCreateMode
        ? []
        : await getScreenEntryOverridesCached(screenId, entryId, { force });
    if (!isActive() || !isLoadIdentityCurrent(token)) return;
    if (!mayApplyAuthoritativeDraft(token)) {
      setRemotePresentationWarningVisit(token.routeVisit);
      return;
    }
    applyAuthoritativePresentationState(result, token.routeVisit);
  } catch {
    if (!isActive() || !isLoadIdentityCurrent(token)) return;
    setPresentationErrorCommit({
      routeVisit: token.routeVisit,
      kind: "load",
      message: didCompleteDraftRemainClean(token)
        ? "Failed to load presentation overrides."
        : "Could not check for presentation updates. Local changes are unchanged.",
    });
  } finally {
    if (isActive() && isLoadIdentityCurrent(token)) {
      setPresentationLoadActivityVisit((current) =>
        current === token.routeVisit ? null : current
      );
    }
  }
}

const refresh = useCallback(
  (force = false) => runEntryHydration(force, () => true),
  [runEntryHydration]
);
const refreshPresentation = useCallback(
  (force = false) => runOverrideHydration(force, () => true),
  [runOverrideHydration]
);

// Cache callbacks are owned by this keyed session and never commit directly. They enter
// refresh helpers that capture a fresh LoadToken containing this exact routeVisit plus the
// route/channel generations before any await.
useEffect(() => subscribeCacheEvents((event) => {
  if (overrideCacheKey && event.key === overrideCacheKey) {
    void refreshPresentation(true);
    return;
  }
  if (isCurrentEntryCacheEvent(event)) void refresh(true);
}), [overrideCacheKey, refresh, refreshPresentation]);

type SaveChannel = "content" | "presentation";
type SaveToken = {
  channel: SaveChannel;
  routeKey: string;
  routeVisit: RouteVisit;
  routeGeneration: number;
  saveGeneration: number;
  draftGeneration: number;
  createRouteVisit: RouteVisit | null;
};

function captureSaveToken(channel: SaveChannel): SaveToken {
  const saveGeneration =
    channel === "content"
      ? ++contentSaveGenerationRef.current
      : ++presentationSaveGenerationRef.current;
  return {
    channel,
    routeKey,
    routeVisit,
    routeGeneration: routeGenerationRef.current,
    saveGeneration,
    draftGeneration: draftMutationGenerationRef.current,
    createRouteVisit: isCreateMode ? routeVisit : null,
  };
}

function isSaveIdentityCurrent(token: SaveToken) {
  const currentSaveGeneration =
    token.channel === "content"
      ? contentSaveGenerationRef.current
      : presentationSaveGenerationRef.current;
  return mountedRef.current &&
    token.routeKey === routeKey &&
    token.routeVisit === routeVisit &&
    routeGenerationRef.current === token.routeGeneration &&
    currentSaveGeneration === token.saveGeneration;
}

function isExactSaveDraft(token: SaveToken) {
  return isSaveIdentityCurrent(token) &&
    token.draftGeneration === draftMutationGenerationRef.current;
}

function commitContentSaveResponse(saved: EntryDetail, token: SaveToken) {
  if (!isSaveIdentityCurrent(token)) return { mayNavigate: false };
  // The clients broadcast their cache event before this awaited promise resumes.
  // Revoke any self-event hydration before changing the persisted baseline.
  entryLoadGenerationRef.current += 1;
  setEntryLoadActivityVisit((current) =>
    current === token.routeVisit ? null : current
  );
  setRemoteEntryWarningVisit(null);
  if (!isExactSaveDraft(token)) {
    updatePersistedEntryBaselineWithoutReplacingDraft(saved);
    if (token.createRouteVisit !== null) {
      persistedEntryTargetRef.current = {
        routeVisit: token.createRouteVisit,
        routeGeneration: token.routeGeneration,
        id: saved.id,
      };
    }
    setSaveNoticeCommit({
      routeVisit: token.routeVisit,
      message: "Saved server version; newer local changes remain unsaved.",
    });
    return { mayNavigate: false };
  }
  contentDirtyRef.current = false;
  persistedEntryTargetRef.current = null;
  applySavedEntryAndBaseline(saved);
  setHasUnsavedChanges(false);
  setSaveNoticeCommit(null);
  return { mayNavigate: true };
}

function commitPresentationSaveResponse(savedOverrides, token: SaveToken) {
  if (!isSaveIdentityCurrent(token)) return;
  // Revoke the same-tab PATCH cache-event hydration before publishing the baseline.
  overrideLoadGenerationRef.current += 1;
  setPresentationLoadActivityVisit((current) =>
    current === token.routeVisit ? null : current
  );
  setRemotePresentationWarningVisit(null);
  const ordered = normalizePresentationOverrideOrder(savedOverrides);
  savedOverridesRef.current = ordered;
  setSavedOverrides(ordered);
  // The server baseline is safe to advance, but a newer local draft is never replaced
  // or marked clean by an older response.
  if (!isExactSaveDraft(token)) {
    const stillDirty =
      serializePresentationOverrides(ordered) !==
      serializePresentationOverrides(draftOverridesRef.current);
    presentationDirtyRef.current = stillDirty;
    setHasUnsavedPresentationChanges(stillDirty);
    setPresentationSaveNoticeCommit(
      stillDirty
        ? {
            routeVisit: token.routeVisit,
            message: "Saved server presentation; newer local changes remain unsaved.",
          }
        : null
    );
    return;
  }
  presentationDirtyRef.current = false;
  draftOverridesRef.current = ordered;
  setDraftOverrides(ordered);
  setHasUnsavedPresentationChanges(false);
  setPresentationSaveNoticeCommit(null);
}

const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
  blocked: hasUnsavedChanges || hasUnsavedPresentationChanges,
  title: "Discard unsaved entry changes?",
  description: "Content or presentation changes have not been saved.",
  confirmLabel: "Discard and continue",
  cancelLabel: "Keep editing",
  onConfirmDiscard: () => {
    // Update refs before the shared hook performs blocker-skipping navigation.
    contentDirtyRef.current = false;
    presentationDirtyRef.current = false;
    draftMutationGenerationRef.current += 1;
    entryLoadGenerationRef.current += 1;
    overrideLoadGenerationRef.current += 1;
    contentSaveGenerationRef.current += 1;
    presentationSaveGenerationRef.current += 1;
    mediaLoadGenerationRef.current += 1;
    persistedEntryTargetRef.current = null;
    setCommittedEntryVisit(null);
    setCommittedOverrideVisit(null);
    setEntryLoadActivityVisit(null);
    setPresentationLoadActivityVisit(null);
    setContentSaveActivityVisit(null);
    setPresentationSaveActivityVisit(null);
    setEntryErrorCommit(null);
    setPresentationErrorCommit(null);
    setRemoteEntryWarningVisit(null);
    setRemotePresentationWarningVisit(null);
    setSaveNoticeCommit(null);
    setPresentationSaveNoticeCommit(null);
    setHasUnsavedChanges(false);
    clearUnsavedPresentationDraftWithoutPersisting();
  },
});

async function saveEntryContent(payload) {
  if (!mayMutateCurrentEntry()) return;
  const token = captureSaveToken("content");
  setContentSaveActivityVisit(token.routeVisit);
  setEntryErrorCommit(null);
  try {
    // After a stale create response, retry updates that same server record; it must not
    // create a duplicate while the editor intentionally preserves its newer draft.
    const capturedTarget = persistedEntryTargetRef.current;
    const targetId = !isCreateMode
      ? entryId
      : capturedTarget?.routeVisit === routeVisit &&
          capturedTarget.routeGeneration === routeGenerationRef.current
        ? capturedTarget.id
        : null;
    const saved = targetId
      ? await persistUpdatedEntry(targetId, payload)
      : await persistCreatedEntry(payload);
    const { mayNavigate } = commitContentSaveResponse(saved, token);
    if (isCreateMode && mayNavigate) {
      navigate(buildCustomScreenWorkspacePath({ screenId, entryId: saved.id }), {
        skipBlockers: true,
      });
    }
  } catch (saveError) {
    if (isSaveIdentityCurrent(token)) {
      setEntryErrorCommit({
        routeVisit: token.routeVisit,
        message: boundedContentSaveMessage(saveError),
      });
    }
  } finally {
    if (isSaveIdentityCurrent(token)) {
      setContentSaveActivityVisit((current) =>
        current === token.routeVisit ? null : current
      );
    }
  }
}

async function savePresentation(drafts) {
  if (!mayMutateCurrentPresentation()) return;
  const token = captureSaveToken("presentation");
  setPresentationSaveActivityVisit(token.routeVisit);
  setPresentationErrorCommit((current) =>
    current?.routeVisit === routeVisit && current.kind === "save" ? null : current
  );
  try {
    const saved = await replaceScreenEntryOverrides(screenId, entryId, drafts);
    commitPresentationSaveResponse(saved, token);
  } catch (saveError) {
    if (isSaveIdentityCurrent(token)) {
      setPresentationErrorCommit({
        routeVisit: token.routeVisit,
        kind: "save",
        message: boundedPresentationSaveMessage(saveError),
      });
    }
  } finally {
    if (isSaveIdentityCurrent(token)) {
      setPresentationSaveActivityVisit((current) =>
        current === token.routeVisit ? null : current
      );
    }
  }
}

```

Every local content mutation and every presentation set/reset action must call its
corresponding synchronous mutation helper before scheduling React state. Presentation
dirtiness has one authority transition: `savedOverridesRef`, `draftOverridesRef`,
`presentationDirtyRef`, and render-visible `hasUnsavedPresentationChanges` are updated
together. There is no passive effect that later mirrors derived presentation dirtiness.
Changing a value back to the saved value synchronously becomes clean for both the guard
and hydration barrier. Content handlers must return before any state write when
`markContentMutation()` returns
false; presentation handlers are rejected by `mayMutateCurrentPresentation()` inside
their single transition. Save handlers use the same route-ready guards.
Initial entry hydration, initial override hydration, forced background revalidation, entry/cache-bus
refresh, and any async apply helper capture the route generation, their own channel generation, and
the draft generation at request start. Entry and override loads may overlap and both
authoritative results must commit; starting one never increments or invalidates the
other channel's load generation. Every success, bounded error, remote-warning, and
loading-finalization commit first checks mounted/route/channel identity. Authoritative
draft replacement additionally rechecks the latest draft generation plus both dirty
refs immediately before apply. Checking dirty only before starting a request is
insufficient. Either dirty channel protects all entry draft channels from background
replacement; a current late success denied by dirty state sets only the matching remote
update warning. Explicit user-confirmed discard advances the generation before applying
authoritative state.

The draft-generation/dirty barrier governs only authoritative draft replacement. It does
not suppress route/channel-current status cleanup: `finally` always ends that channel's
spinner. A current success denied by a newer edit emits only the matching bounded remote
warning. A current rejection after a newer edit shows the deterministic bounded
`Could not check ... Local changes are unchanged.` message and never touches draft or
baseline state. Route/channel-stale or post-unmount success, rejection, warning, and
`finally` commits are all ignored.

Generic `Failed to load ...` copy is allowed only when the captured draft generation is
still exact and both content/presentation dirty refs are false at catch time. If either
ref was already dirty when the request began, or became dirty without a further
generation change, the same current rejection uses the bounded local-changes-unchanged
copy. Error classification never relies on generation equality alone.

No route/current-token ref is written during render. A `useLayoutEffect([routeKey])`
boundary invalidates route, entry-load, override-load, content-save, presentation-save,
and media generations in cleanup before the next route can accept async commits; its
setup establishes the new route generation. Each hydration/media calling effect also
owns a local `active` cleanup flag. Thus a promise resolving in the route-render → passive-
effect-cleanup window is already rejected by layout cleanup, without any synchronous
state update in an effect.

Committed entry and override visits are initialized only from a cache proven for the
current keyed session and are advanced only by an identity-current authoritative apply.
While either committed visit is not the exact current `routeVisit`, all
visible/interactive values for that channel are gated:
`currentScreen`, `currentContentType`, `currentEntry`, `currentFields`, runtime document/
bindings, active assistant-surface context, related-hook inputs, media-ID planning,
Canvas/Preview props, presentation
overrides, buttons, and save/mutation handlers cannot consume the prior route. The entry
branch renders current-route loading or its route-scoped bounded error; the presentation
branch supplies an empty pending/error state and never leaks the prior route's overrides.
Warnings, errors, load/save activity, save notices, media commits, and stale-create
targets also carry the exact visit identity, so an old pending continuation cannot
disable, annotate, or seed the new editor. A clean A -> B transition must
therefore show no A content or controls before B settles, and B becomes editable only in
the same accepted batch that commits B's visit. Returning B -> A creates a new A session;
no first-visit A state can become current merely because its serialized route key matches.

Initial entry and override hydration deliberately overlap: each captures and checks its
own load generation while sharing the draft-generation/dirty barrier. A regression must
start both requests before either settles and prove that both current authoritative
results commit in entry-first and override-first settlement orders. That test also proves
that starting either channel does not increment or invalidate the other's generation.

Every content/presentation save captures route, channel save generation, and shared draft
generation before awaiting. Only an identity-current response whose draft generation is
still exact may replace draft state, clear its dirty ref, or perform create navigation.
Because the entry and override clients synchronously broadcast their cache update before
the mutation promise resumes, every identity-current successful save first increments its
matching load generation, clears only that channel's self-event warning/loading state,
and then advances the server baseline. This invalidates a same-tab forced hydration
without cancelling the independent channel. A save-triggered cache event must therefore
never surface a false external-update warning or replace the just-saved baseline.
Save commits do not advance the shared local-mutation generation: their channel-specific
load generation is the invalidation seam, so a safe overlapping load in the independent
channel can still commit after the saved channel becomes clean.
If any local edit lands during the save, the response advances only the safe server
baseline, preserves the newer draft and all dirty refs, and shows the fixed bounded
saved-server/newer-local notice. If a stale presentation response's new baseline is
byte-equivalent to the current presentation draft, the shared presentation authority
transition marks it clean and omits that notice; guard and hydration state may not
diverge. A content save must not clear an unsaved presentation
ref; a presentation save must not clear unsaved content. Rejections leave refs, baselines,
and navigation blocking unchanged.

A create response that lost draft authority stores the created server ID as the
persistence target scoped to the exact opaque create `routeVisit + routeGeneration`, does not
auto-navigate, and leaves the navigation guard active. Layout cleanup synchronously
clears that target before another route mounts. Retry on the same create route
updates that same created record rather than creating a duplicate. When that PATCH retry
returns with exact draft authority, the editor becomes clean and automatically navigates
to `buildCustomScreenWorkspacePath({ screenId, entryId: saved.id })` with
`skipBlockers:true`. A failed retry stays dirty and does not navigate.
An old create-A response settling after navigation cannot seed create-B; B performs POST,
never PATCH against A's captured ID.

Keep the shared navigation/beforeunload hook as the only blocker. Confirm synchronously
clears both refs and local flags before its existing blocker-skipping continuation.
Cancel changes nothing. Save failure remains dirty. Successful exact-authority create
navigation alone uses `skipBlockers:true`, and only after persistence returns; failed,
superseded-by-edit, or unsaved navigation never bypasses blockers.

Replace the duplicated related-entry IIFE with L02's hook. Related target subscriptions
stay hook-owned. The existing screen/current-entry/override cache subscriptions remain
here and obey the commit-time generation contract.

## Error/compatibility flow

- Related and presentation-media failures are visible and independently retryable;
  neither disables entry editing.
- Late results from a prior entry, override set, attempt, cache event, or unmounted
  editor cannot commit.
- Dirty content, dirty presentation, or both protect the complete local draft.
- Direct-image override and bound media values resolve by UUID; media fields preserve
  their original UUID identities.
- Existing cache warning/debug codes remain machine-readable.
- Invalid, unknown-key, oversized, and own-source remote hints fail closed before
  correlation state. Consumer exceptions still propagate to the delivery harness, but
  the selected occurrence and balanced-pair/LRU state commit first, so its legacy twin
  cannot retry the throwing canonical invocation and unrelated tuples remain deliverable.

## Route, persistence, UI, and renderer proof

- `screenEntryPresentationOverrides.test.ts` proves strict reject-unknown behavior,
  direct-image acceptance, non-media rejection, media-field UUID preservation,
  injected-repository replace/get round trip, and cleanup retaining only active UUID
  targets. This exercises the same exported service used by the route.
- The additive DB-backed `customScreensRoutes.test.ts` proof uses the real
  `registerCustomScreenRoutes` boundary and strict validator. It creates uniquely scoped
  user, content-type, Screen, and Entry fixtures, PATCHes a UUID-valued direct-image
  override, GETs the same persisted record, maps a structurally valid inactive target to
  the bounded `custom_screen_override_invalid` 400, proves the rejected write persisted
  nothing, and cleans up only its owned rows. It uses only the existing `hasDb` skip
  pattern and does not add a production route or test-only fallback.
- `custom-screen-entry-editor-restyle.test.tsx` proves the UI offers the direct-image
  media target, sends the UUID-valued existing route envelope, consumes its returned
  UUID, resolves override-or-bound direct-image winners, and never URL-converts a media
  field. It also proves a scalar legacy override cannot replace a multiple-media field's
  bound UUID array and that a subsequent pick/save preserves the complete array. The
  non-editor/read-only entry branch forwards the same filtered override contract and URL
  map through optional `CustomScreenPreview` props.
- `custom-screen-entry-presentation-media.test.ts` directly proves the extracted
  Bun-free route/media codec, attempt reducer, winning direct-image UUID planner, and
  exact media-record projection without importing or mounting the React component.
- TASK-540-03-L01's exclusively owned
  `custom-screen-runtime-renderer.test.tsx` is a read-only prerequisite proving safe
  URL-map consumption and missing/unsafe winner behavior. This leaf must not edit it.
- TASK-540-06 closure validates the already-landed `_docs/CMS_API.md`
  direct-image-or-media-field wording read-only and records the existing route
  registration/security evidence without editing that file.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- `custom-screen-entry-editor-restyle.test.tsx`: direct-image target/payload;
  override and bound-value UUID collection; exact URL-map forwarding; media-field UUID
  preservation; multiple-media scalar-override exclusion and array-preserving save;
  missing record; first rejection then forced retry; cache-event force;
  request/attempt mismatch; stale generation and unmount; semantically identical fresh
  render inputs during a forced attempt issue one read/subscription; the frozen ID
  snapshot survives later array mutation/reordering; settlement preserves exact attempt
  object identity and stale settled actions allocate no retry; ID-set change during pending force
  inherits force with a fresh monotonic token; Screen A -> Screen B with identical entry/
  UUID inputs allocates a new route-scoped attempt; transport-neutral metadata-toggle
  `aria-checked` plus visible-badge behavior remains mounted here.
- New `custom-screen-entry-presentation-media.test.ts`: the extracted key codec,
  initializer, allocator, reducer, UUID winner planner, and exact URL projection retain
  their direct `toBe`, monotonic-token, frozen-snapshot, malformed-input, deduplication,
  field-exclusion, and canonical/mixed-case record assertions. It is a Bun-free Vitest
  file and must run independently.
- `custom-screen-entry-draft.test.ts`: pure draft initialization/hydration, create/update
  payload boundaries, validation/error projection, presentation change→revert authority,
  and exact-generation plus both-dirty-ref replacement barriers. Observable route,
  effect, blocker, and async continuation behavior stays in the mounted component suite
  below rather than being simulated in a helper-only test.
- The 9+13 `custom-screen-entry-navigation-guard.test.tsx` and
  `custom-screen-entry-navigation-authority.test.tsx` pair: clean, content dirty,
  presentation dirty, both dirty, cancel, confirm, beforeunload, save failure, and
  successful create-save navigation bypass only after persistence; stale first create
  captures one ID without navigation, the next exact retry performs PATCH (no second
  create) and auto-navigates to that ID with `skipBlockers`; failed retry remains dirty
  and does not navigate; navigate create A→create B before A settles and prove layout
  cleanup plus visit authority clears A so B performs POST, not PATCH A. It also owns
  entry A→B→A pending content/presentation-save regressions, both initial hydration
  settlement orders, dirty-before/dirty-during rejected refresh, discarded-visit late
  failure/finally, edit-during-save baseline preservation, same-tab self-cache-event
  suppression, global retryable presentation-load failure with controls withheld, and
  clean A→B loading gates that hide A content and save controls until B settles.
- `screenEntryPresentationOverrides.test.ts`: strict service validation and
  fail-closed complete-list normalization for exact `draft-cache`, Date-valued
  `repository-record`, and ISO-string `transport-response` modes; unknown keys,
  cross-mode timestamp shapes, invalid `updatedBy`, and one malformed row reject the
  whole list; canonical UUID or `null` `updatedBy` succeeds where applicable;
  draft-cache returns strict drafts, repository-record preserves exact `Date` metadata
  through active filtering and route output, and transport-response validates exact ISO
  metadata then projects strict drafts for the client cache; repository-backed
  save/get/cleanup round trip described above.
- The 29+11 `customScreensClient.test.ts` and
  `customScreensEntryOverridesClient.test.ts` pair: exact-envelope reject-unknown behavior; strict safe
  block ID, enum, and media UUID validation; one bad response row rejects the whole
  request with `custom_screen_override_invalid` and writes no cache; one bad cached row
  evicts the whole scoped cache and falls through to a network response; no partial-row
  recovery; normalized three-key cache round trip preserves the exact UUID; concurrent
  non-force GET callers share the exact promise and one transport; forced A→B publishes
  only B in old-first and new-first settlement orders; authoritative rejection clears
  then retries; successful PATCH revokes a pre-write pending GET before value write both
  with and without an existing cache, and late GET cannot overwrite it; rejected PATCH
  performs no revoke, prime, or broadcast; create/update called with an operation token
  deliver that exact token only to same-context list/detail subscribers, while omitted
  options remain backward compatible and no token appears in network/cache/event JSON.
  Cross-channel cases cover detail-start→list and list-start→detail in both settlement
  orders, preserve every unrelated row, publish the complete fallback list, preserve
  successful create/update/delete authority against older lists, retain authority after
  rejection, and invalidate every captured publisher on explicit clear. A fallback-list
  racing a regular forced list in both orders obeys exact committed full-list authority;
  complete publication evicts an omitted stale detail unless a newer replace/delete owns it.
- The 6+11+5 `cacheBus.test.ts`, `cacheBusCorrelation.test.ts`, and
  `cacheBusHardening.test.ts` family: the complete canonical/legacy remote-event repair matrix above;
  distinct operation-symbol identities; exact same-context token delivery; remote
  token absence; own-source filtering; strict bounded parsing; per-subscription state;
  bounded LRU fail-open behavior; exact teardown; remove-before-set storage re-arming;
  unchanged exact four-key serialization; and backward-compatible tokenless use.

TASK-540-06 runs the declared owner/dependency suites read-only and must not re-baseline
the assertions.
`custom-screen-record-interactions.test.tsx` and
`custom-screen-runtime-renderer.test.tsx` remain exclusively owned by
TASK-540-03-L01.

## Security Contract

The route family remains internal admin and authenticated-session only. Override GET is
classified in the `admin_read` rate-limit bucket and requires `content:read`; override
PATCH is classified in `admin_write`, requires `content:write`, and remains protected by
the shared admin CSRF middleware. Both boundaries retain strict reject-unknown validation
and fail-closed UUID/active-target normalization. There is no public or API-key mode and,
because this is not a public write, no nonce, signature/HMAC, or CAPTCHA path is added.
The existing authenticated-admin rate-limit bypass semantics remain shared rather than
being reimplemented in this route. No browser secret, credential, or auth token is added.
The in-memory cache-operation symbol carries no data and never crosses a process,
transport, storage, or logging boundary. A remote cache event remains a same-origin
invalidation hint, never authentication, authorization, or data authority. Invalid and
oversized inputs, exact-own-key mismatches, and own-source echoes are rejected before
handler delivery or any correlation-state mutation; correlation memory is capped at 128
residual identities per subscription, and overflow fails open so an attacker cannot use
deduplication state to suppress a valid invalidation.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/tsc -p tsconfig.json --noEmit
bunx vitest run tests/vitest/admin/cacheBus.test.ts \
  tests/vitest/admin/cacheBusCorrelation.test.ts \
  tests/vitest/admin/cacheBusHardening.test.ts
# Every split suite is independently runnable with its pinned expanded count.
bunx vitest run tests/vitest/admin/customScreensClient.test.ts # 29
bunx vitest run tests/vitest/admin/customScreensEntryOverridesClient.test.ts # 11
bunx vitest run tests/vitest/admin/cacheBus.test.ts # 6
bunx vitest run tests/vitest/admin/cacheBusCorrelation.test.ts # 11
bunx vitest run tests/vitest/admin/cacheBusHardening.test.ts # 5
bunx vitest run tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx # 9
bunx vitest run tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx # 13
bunx vitest run tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx # 13
bunx vitest run tests/vitest/ui/custom-screen-entry-presentation-media.test.ts # 4
# DB preflight and exact Bun route gate; customScreensRoutes.test.ts is additive-only.
set -a && source .env && set +a && bun --eval 'import { canConnect } from "./tests/utils/db"; const configured = Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); process.stdout.write(JSON.stringify({ configured, reachable, selectOne: reachable ? 1 : 0 })); if (!reachable) process.exit(1); process.exit(0)'
set -a && source .env && set +a && bun test tests/integration/routes/customScreensRoutes.test.ts
# Exact expanded L03 owner/dependency gate after the modular split.
# It covers 19 files: the prior 14 plus five net-new focused suites.
bunx vitest run tests/vitest/admin/cacheBus.test.ts \
  tests/vitest/admin/cacheBusCorrelation.test.ts \
  tests/vitest/admin/cacheBusHardening.test.ts \
  tests/vitest/admin/customScreensClient.test.ts \
  tests/vitest/admin/customScreensEntryOverridesClient.test.ts \
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx \
  tests/vitest/ui/custom-screen-entry-presentation-media.test.ts \
  tests/vitest/ui/custom-screen-entry-draft.test.ts \
  tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx \
  tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx \
  tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts \
  tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx \
  tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx \
  tests/vitest/widgets/screenWidgets.test.tsx \
  tests/vitest/ui/use-screen-related-entries.test.tsx \
  tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx \
  tests/vitest/ui/custom-screen-records.test.tsx \
  tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx \
  tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx
# Exact post-split L04 read-only consumer gate; do not edit or re-baseline these files.
# It covers 15 files after the Page and cache-bus suite splits.
bunx vitest run tests/vitest/ui/custom-screens-page.test.tsx \
  tests/vitest/ui/custom-screen-editor-draft-and-save.test.tsx \
  tests/vitest/ui/custom-screen-editor-hydration-authority.test.tsx \
  tests/vitest/ui/custom-screen-editor-visit-authority.test.tsx \
  tests/vitest/ui/custom-screen-route-params.test.ts \
  tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx \
  tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx \
  tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx \
  tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx \
  tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx \
  tests/vitest/ui-integration/screen-editor-sections.test.tsx \
  tests/vitest/ui/custom-screen-list-view-canvas.test.tsx \
  tests/vitest/admin/cacheBus.test.ts \
  tests/vitest/admin/cacheBusCorrelation.test.ts \
  tests/vitest/admin/cacheBusHardening.test.ts
node --check _docs/_workflows/task-540-implement.mjs
node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings
git diff --check
```

The workflow derives named-file isolation metadata from the actual Vitest/Bun command
shape, not the command ID. `expandedL03Vitest`, `l04ReadOnlyConsumerVitest`, and
`directImageOverrideRouteBun` must enumerate every named file above exactly so any
identified failure is rerun once in isolation. The DB preflight owns no isolation file.
The same workflow self-test seals and compares the four pre/post split test-name
multisets, validates the 29+11, 6+11+5, 9+13, and 13+4 distributions, and rejects a
false-clean when any independently named suite is missing, duplicated, or registered by
another test file.
The permanent repair-sibling self-test preserves sibling-state safety while the
effective-owner self-test pins full original L03 authority for a new verified finding,
keeps `screenEntryPresentationOverrideContract.ts` writable, excludes the historical
additive route-test exception, adds only the three task contracts after closure, and
denies task-transition authority. Named-file isolation still pins all three named-test
metadata sets and the exact DB preflight command.

## Completed 2026-07-15 repair evidence

- 2026-07-15 focused cache-bus proof: `cacheBus.test.ts` 22/22, including the full
  at-capacity descriptor/proxy/type/bound/own-source channel corpus and malformed/removal
  storage corpus with the oldest valid twin still correlated.
- 2026-07-15 DB preflight: `{ configured: true, reachable: true, selectOne: 1 }`.
- 2026-07-15 isolated real-route proof: `customScreensRoutes.test.ts` 17/17, including the
  two additive direct-image PATCH→GET and invalid-target/no-persistence regressions.

## Historical validation evidence

Implemented a keyed entry-route session with one opaque `RouteVisit` per mount,
generation- and visit-scoped entry/override/media continuations, complete content and
presentation dirty-navigation protection, stale-create POST→PATCH retry authority,
retryable presentation loads, cache subscriptions, and UUID-only direct-image media
resolution. Strict shared override normalization now rejects malformed draft-cache,
repository, and transport lists atomically; exact pending-promise and PATCH-revocation
authority prevents stale cache publication.

Earlier audits corrected the serialized-route A→B→A reactivation risk,
presentation-control exposure during failed/pending hydration, a missing mounted
forced-media regression, and exact same-context save correlation. The final family
post-audit then reopened this leaf for two further issues: mixed-case requested media
UUIDs did not project onto lowercase canonical records, and a late forced Screen detail
read could overwrite a newer request or mutation in shared caches. The corrective pass
now preserves the exact requested UUID key while matching records canonically, gives
Screen list/detail requests identity-guarded publication authority, revokes matching
pending detail reads on successful mutations, and keeps rejected requests retryable.
A fresh 2026-07-14 gate initially passed `core lint:types`, `core lint`, root `tsc`, and
all nine declared Vitest files (161/161). The subsequent cross-channel audit reproduced
a detail/list ordering that either staled the target row or reduced a complete fallback
list to its matched row. The corrected client now uses monotonic list/detail authority,
publishes complete fallback lists, reconciles newer replace/delete mutations, evicts
omitted details, and invalidates captured continuations on explicit clear. The expanded
exact gate passed 181/181 with all static checks, and a fresh read-only post-audit
reported zero findings. TASK-540-06 still owns the final family-wide audit, aggregate
validation, runtime smoke, and closure evidence.
