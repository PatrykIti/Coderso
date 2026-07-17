# TASK-540: Custom Screens Functional and Data-Integrity Remediation

# FileName: TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md

**Priority:** High
**Category:** Custom Screens / Admin UI / Accessibility / Cache / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-496, TASK-498, TASK-500, TASK-503, TASK-505, TASK-543 (program order)
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Modularity Repair Started:** 2026-07-16 — the verified pre-family baseline is `e5f15a5675b58df85e573f760df4429af735400f`, not the current HEAD. Its history-through-working-tree scope freezes 91 owned human-authored production/test paths and the initial pre-split inventory of 15 files above the repository-wide 1,000-physical-line maximum. R01 and TASK-540-02-L01 have resolved the first three blockers; the mechanical gate now reports exactly 12, with TASK-540-03-L01 next. The remaining source owners must land in the exact order below; every pre-split receipt is historical until the 64-Vitest/18-Bun matrix, 347-name preservation proof, hard family line gate, fresh post-audit, and runtime smoke pass.
**Repair Started:** 2026-07-16
**Repair Reason:** The final sequential post-audit stopped before smoke on evidence-backed drift. R01 owns scoped malformed-binding recovery, one-pass legacy orphan filtering, collision-safe id-less legacy generation, explicit-ID-only Assistant composition, stored duplicate-ID fail-closed proof, and metadata-PATCH preservation. L03 owns single-media override eligibility across service and Entry Editor plus canonical import placement. L01 requires every Canvas region name, L02 completes both sides of the authenticated A/B self-scope proof, and L04 owns the binding-flow expectation that now consumes the shared binding-ID helper. Earlier R01/L02/R03 strict-ID, Tab-label, and zero-Tabs repairs remain durable.
**Repair Revalidated:** 2026-07-16 — against HEAD `040604e7e3d5232a5fb2fcb6a05e149295a89a77` plus the exact dirty paths recorded by each leaf, core/root static gates passed; expanded R01 changed suites passed 81/81, six-file Vitest 176/176, route/Assistant Bun 93/93 with 576 expectations, isolated route 20/20 with 118 expectations, and document ops 11/11; L03 retains Vitest 258/258, cacheBus 22/22, and the current pre-split routes 20/20 with 118; L04 passed isolated 3/3 and its ten-file matrix 98/98; TASK-540-05-L01 retains 16/16; TASK-540-05-L02 retains Vitest 66/66, Bun 27/27 with 165, and user-settings 10/10 with 64; DB preflight, workflow self-tests, and diff checks passed. R01/L03 route evidence is pre-modularity-split only. This targeted receipt claims no fresh post-audit, full validation, live smoke, changelog 1252, or atomic closure.
**Prior Repair Revalidation:** 2026-07-16 — before the composer and L04 provenance findings, HEAD `040604e7e3d5232a5fb2fcb6a05e149295a89a77` plus the then-recorded dirty paths passed core/root static gates; R01 Vitest 168/168, route/Assistant Bun 92/92 with 568 expectations, route 19/19 with 110, and ops 11/11; L03 Vitest 258/258, cacheBus 22/22, and L04 consumer matrix 98/98; L01 16/16; L02 Vitest 66/66 and Bun 27/27 with 165 expectations; user-settings 10/10 with 64; DB preflight; binding-flow 3/3; workflow self-tests; and diff checks. This evidence is historical for the expanded contract.
**Historical L03 Repair Started:** 2026-07-15
**Historical L03 Repair Reason:** Closure validation reproduced one logical remote cache event twice when canonical and legacy BroadcastChannel/storage transports delivered the same serialized event, and contract audit required direct-image route-boundary coverage at the strict write seam. TASK-540-04/L03 was the sole scoped repair owner with exactly three writable paths: `core/admin/utils/cacheBus.ts`, `tests/vitest/admin/cacheBus.test.ts`, and additive direct-image regressions in `tests/integration/routes/customScreensRoutes.test.ts`; `core/server/routes/customScreenRoutes.ts` and every other production route/UI/client/service file remained read-only. That repair passed its focused and dependency-shaped gates on 2026-07-15, and its exact `Repair Pending` receipt was replaced by the matching `Revalidation Passed` successor. L03 and every other then-landed source leaf remained `🚧 In Progress` with `Implementation Complete` awaiting family changelog 1252, while post-audit, full validation, live smoke, and atomic closure remained pending.
**Historical L04 Repair Started:** 2026-07-15
**Historical L04 Repair Reason:** Mandatory repository-wide `bun run test` confirmed that `screen-editor-sections.test.tsx` fully mocked cacheBus without the fresh-symbol factory required by the L04-owned Screen builder Save path. TASK-540-04/L04 completed the additive mock repair and exact six-file/66-test re-gate; at that historical phase closure resumed and every source descendant was Done, before the later L03 duplicate-delivery finding paused closure again.
**Historical Repair Started:** 2026-07-14
**Historical Repair Reason:** Repository-wide Bun validation confirmed one stale Assistant Custom Screen block-patch fixture using unsupported strict-V4 block kinds. Only TASK-540-01/L01 was reopened for a fixture-only compatibility repair; every other source descendant remained historically Done and closure remained In Progress.
**Changelog:** 1252 (pinned; create only at implementation closure)
**Changelog File:** `_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md`

---

## Overview

The audit confirmed that Screens can lose dirty work on navigation, Tabs are
authored only partially and render as decoration, Button field binding is not
reachable from the UI, unsafe URL forms survive normalization, empty documents
retain ghost bindings, async related-entry reads can become permanently rejected
or update after unmount, and selection semantics create nested-interactive/Space
failures. Fixed rail clearance, invalid ARIA, and globally keyed preferences add
responsive/accessibility drift.

This family repairs the existing ScreenDocumentV1/Custom Screen V4 product. It
does not invent an action API. Button authoring exposes only the implemented
`link` action; the legacy read adapter maps `publish`/`custom` to the write-valid
`action:"link"` shape with no `href` and prunes only that legacy button's `href`
binding, so it is safely disabled without adding a persisted `disabled` enum. No
endpoint or migration is added. Custom Screens remain a Screen-owned sections/blocks
surface; this family does not add or widen `core/widgets/*`, a Widget Template, a
module-pack entry, or any non-Dashboard widget authoring surface.

## Accepted non-blocking LOW follow-ups

Exactly two evidence-backed, currently behavior-neutral LOW findings are deferred under
the permanent TASK-9999 eligibility contract:

- TASK-9999-01-L01 at
  `_docs/_TASKS/TASK-9999-01-L01-Decouple-Actor-And-Media-Uuid-Domain-Naming.md`.
  TASK-9999-01-L01 approved evidence: core/services/customScreens/screenMediaIdentity.ts:4; core/services/customScreens/screenEntryPresentationOverrideContract.ts:192; core/services/customScreens/screenEntryPresentationOverrideContract.ts:229; core/services/customScreens/screenEntryPresentationOverrides.ts:421.
  Before R01 creates that exact six-line owner, the workflow verifies the equivalent
  pre-split function at `customScreenSchemas.ts:548` only as transitional audit evidence;
  it can never satisfy final closure after the pending marker is removed.
  TASK-9999-01-L01 approved rationale: the shared UUID predicate already accepts and rejects the intended actor/media UUID grammar and preserves exact input bytes; deferral changes no UI/UX/accessibility, data, security/privacy/auth/RBAC, API, persistence/migration, performance/reliability, or test-integrity behavior.
- TASK-9999-01-L02 at
  `_docs/_TASKS/TASK-9999-01-L02-Remove-Unread-Screen-Tab-Label-Draft-State.md`.
  TASK-9999-01-L02 approved evidence: core/admin/ui/custom-screens/ScreenBlockInspectorTabs.tsx:24; core/admin/ui/custom-screens/ScreenBlockInspectorTabs.tsx:25; core/admin/ui/custom-screens/ScreenBlockInspectorTabs.tsx:38; core/admin/ui/custom-screens/ScreenBlockInspectorTabs.tsx:42; core/admin/ui/custom-screens/ScreenBlockInspectorTabs.tsx:53; core/admin/ui/custom-screens/ScreenBlockInspectorTabs.tsx:59; core/admin/ui/custom-screens/ScreenBlockInspectorTabs.tsx:63; normalized AST SHA-256 15897646098bfeb9f653b940c0782e3b3f999a811b9cbc3d9bf46a01cae5df9a; source SHA-256 03cbeb962f40a87085d11403c15f9b69b482302322c5fc85ad224df9a52e16d4.
  The workflow proves the deferred symbols are absent from the facade, with one
  `baseLabel` type member, exactly four writes, the sole `draft.value` read, and no
  `baseLabel` or whole-draft read.
  TASK-9999-01-L02 approved rationale: baseLabel is assigned but never read; deferral changes no rendered UI, keyboard/blur/commit behavior, accessibility, saved data, security/privacy/auth/RBAC, API, persistence/migration, performance/reliability, or test-integrity behavior.

These are the only TASK-540 deferred findings. HIGH/MEDIUM findings and every LOW with
user-visible, accessibility, data, security, privacy, auth/RBAC, API, persistence,
migration, performance, reliability, or test-integrity impact remain blocking.

## Hard invariants

- New writes use strict schemas for every fixed data-oriented block kind; legacy/plugin
  kinds retain only their explicit compatibility arm. Tabs items have required,
  non-empty, unique IDs and canonical labels/slots.
- Button/image URLs pass through the Screen-owned wrapper before the shared authoring
  URL policy. The wrapper rejects every ASCII control (`U+0000..U+001F` and `U+007F`)
  and every backslash before delegation, so TAB/LF/CR protocol-relative confusion,
  executable forms, and unsupported schemes fail closed at write and render without
  modifying the Page-owned helper. A present URL field on write must be a string: direct normalizer/service
  calls reject `null` and every non-string just as the route schema does; only the
  stored-read compatibility path may fail soft by omitting malformed legacy values.
- Builder Buttons are always non-anchor and non-navigating, even with a safe href.
  Preview and entry may render an anchor only for a re-sanitized safe href; absent,
  unsafe, and legacy-disabled hrefs remain disabled non-anchors in every mode.
- Presentation image values remain media UUIDs. A direct image block may receive its
  winning asset identity from an active presentation override or from its bound media
  value. Override presence is absolute and UUID-only: resolve it through the map or
  render a placeholder, without fallback. Only without an override may a present
  binding supply a scalar UUID or the first valid UUID from an array; malformed and
  URL-shaped bound values, missing map entries, and unsafe resolved URLs render the
  placeholder without fallback. Static `data.src` is eligible only when neither
  override nor binding exists. The entry host resolves only direct-image IDs to
  `MediaRecord.url` through an authoritative-request/cancellation-guarded cache seam;
  the pure renderer sanitizes the resolved URL and never places a UUID in `src`. Field
  blocks bound to media retain scalar/array UUID identity required by MediaPicker.
  `screenMediaIdentity.ts` owns one Bun-free `isScreenMediaAssetUuid` predicate,
  explicitly re-exported by the stable `customScreenSchemas.ts` facade and used by the
  renderer and later strict override contract; no consumer mirrors its regex.
- Binding GC prunes every missing block, including when the live block set is
  empty, and reports the existing warning shape.
- Fresh V4 section/block IDs and binding `blockId`/`propPath`/`field` values share one
  segment-safe max-160 path grammar; explicit/generated binding IDs share canonical
  slug grammar and max 120. Strict writes accept only `blockId`; the public Assistant
  compatibility helper requires exactly one `blockId|widgetId` and exact present
  source/mode values. Stored read consciously retains its legacy fail-soft alias and
  source/mode coercion, but emits canonical `blockId` and deterministically hashes safe
  overlong identities so editor/row references, siblings, Tabs slots, input bytes, and
  read/write idempotence survive repair. Legacy V1/V2/V3 editor migrations converge on
  that same V4 stored-read pass after mapping, closing the historical max-bound bypass
  without remigrating list views or losing block data. Metadata-only PATCH persists that
  repaired base definition without document loss.
- `customScreenNormalizationPrimitives.ts` solely implements
  `buildScreenFieldBindingId(blockId, propPath)`; the stable
  `customScreenSchemas.ts` facade explicitly re-exports that same function identity.
  Every generated ID consists of a bounded readable prefix, `-`, and the exact
  13-character hash of `JSON.stringify([blockId, propPath])`; the suffix applies to
  short and long tuples and distinguishes separator/case variants. Valid explicit IDs
  remain unchanged. The schema normalizer and R01-owned `screenDocumentOps` binding
  factories/duplication consume it; the TASK-540-02 Inspector is a read-only
  domain-helper consumer under L02 ownership. No `ScreenFieldBinding` producer keeps a
  local binding-ID mirror. The pre-V4 Assistant `CustomScreenBinding` composer is not a
  `ScreenFieldBinding` generator and does not consume this helper, but its separate
  contract is R01-owned for the correction: contributions require explicit `id: string`,
  runtime absent/null/blank IDs fail closed, and no ambiguous local tuple fallback
  remains. Current catalog callers already provide explicit IDs; duplicate explicit IDs
  keep their existing fail-closed semantics.
- Tabs use real `tablist`/`tab`/`tabpanel`, one active panel, unique DOM IDs, and
  roving keyboard navigation. In builder mode the visible active tab is derived from
  the host `insertPoint`; activating a tab also arms that tab's slot-end target. Preview
  and entry renderers keep instance-local active state. Authoring and rendering never
  maintain competing tab identities.
- A defensive zero-item Tabs runtime value emits no empty tablist, tab, or panel and
  instead visibly renders exact `role="status"` text `No tabs available.`.
- Selection is not represented by a focusable `role=button` wrapper containing
  links/inputs/contenteditable. Space in an editor stays text input.
- Both builder and entry dirty states use the shared navigation/beforeunload
  guard. Synchronous mutation-generation refs are advanced by every local content,
  presentation, document, binding, or Screen-metadata edit; presentation saved/draft refs
  and visible/ref dirtiness transition together, including change-then-revert and
  stale-save-baseline reconciliation. Hydration rechecks the latest generation and every
  applicable dirty channel at commit time, while save-triggered same-tab cache events are
  invalidated per channel/visit. The Screen builder's synchronous exact-save token also
  suppresses matching self-event refreshes and older hydration commits until mutation
  settlement. Both editors use keyed inner sessions with an opaque
  mounted `RouteVisit` that scopes every visible commit, async token, and captured create
  target, so neither route-A state under B nor first-visit A state after A→B→A can render
  or mutate before the exact visit hydrates. Confirmed discard synchronously invalidates
  all current load/save continuations before navigation; cancel changes none. Remote
  updates never overwrite edits made after a request starts.
  Successful persisted creates use the router's explicit blocker bypass only after the
  save succeeds.
- Cached entry and media promises are retryable. Only the request still registered as
  authoritative may publish a value or clear its pending slot; subscriptions include
  every related target key, cache-event reads force one refresh per unique target, and
  async work checks identity/cancellation before every state commit.
- Canonical and legacy remote cache transports are compatibility mirrors, not two logical
  invalidations. Each subscription correlates their exact four-key event identity with a
  private bounded multiset, rejects every non-exact own-key set before state mutation,
  delivers once per logical occurrence in either order, retains canonical-only,
  legacy-only, byte-identical repeated, and asymmetric per-subscription occurrences, and
  commits correlation before invoking a handler so a throwing canonical handler is not
  retried by its legacy twin. It uses a true touch-on-residual LRU with fail-open eviction
  after exactly 128 entries. Malformed/own-source input cannot consume or evict residual
  state. Local events bypass correlation and retain exact non-serialized operation tokens;
  storage payloads over 2048 code units are rejected before parsing and remove-before-set
  re-arms identical fallback broadcasts. The event payload and exported API remain
  unchanged.
- Entry and Custom Screen list/detail publishers reconcile by monotonic per-item
  authority: newer detail/mutation values and delete tombstones survive older lists,
  while full-list responses still fill unrelated rows. A Screen detail fallback that
  fetched the list publishes that complete reconciled list.
- Entry preferences use the existing self-scoped authenticated user-settings
  service/client with a strict namespaced key and degrade safely when no user
  context or network is available.

## Security Contract

- **Visibility/endpoints:** existing internal Custom Screens and content-entry
  routes only; no public Screen write or new route.
- **Auth/RBAC:** these Admin routes use the existing authenticated session-cookie
  model and `content:read`/`content:write` permissions. Presentation overrides keep
  their current internal owner permissions; this task does not add API-key mode.
- **CSRF/rate limits:** all writes retain CSRF and `admin_write`; reads retain their
  existing admin-read bucket. No public nonce/captcha applies.
- **Validation:** route schemas are reject-unknown at every fixed-kind data, nested
  tab, block, section, and binding level. Explicit legacy/plugin kinds retain their
  documented compatibility shape; server normalizers and render seams reapply
  URL/action policy.
- **User settings:** preference reads/writes are internal, self-scoped to the
  authenticated session, and PATCH retains CSRF with strict `{ value }` input.
  Preferences contain non-secret view flags only; no entry content, tokens,
  bindings, or privileged data enters browser storage.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-540-01 | Strict Screen data, URLs, Tabs, and binding GC | TASK-540-01-L01 | 🚧 In Progress |
| TASK-540-02 | Button binding and Tabs authoring | TASK-540-02-L01 | 🚧 In Progress |
| TASK-540-03 | Accessible Tabs and selection semantics | TASK-540-03-L01 | 🚧 In Progress |
| TASK-540-04 | Dirty navigation and async/cache recovery | TASK-540-04-L01..L04 | 🚧 In Progress |
| TASK-540-05 | Responsive canvas, ARIA, and user preferences | TASK-540-05-L01, L02 | 🚧 In Progress |
| TASK-540-06 | Tests, smoke, and closure | TASK-540-06-L01 | 🚧 In Progress |

## Hard family-wide modularity gate

The line gate freezes the verified 91-path pre-split authority, then unions the complete
Git history after baseline `e5f15a5675b58df85e573f760df4429af735400f`, the final HEAD
diff, and all untracked paths. The first TASK-540 family commit must retain that baseline
as its sole parent, and both the baseline and first family commit must remain ancestors
of HEAD. Staging, intermediate commits, squash, rebase, or a new current HEAD never reset
or narrow the scope. This family authorizes no deletion or rename of a touched module:
every authority path must remain a regular non-symlink file in the final tree, while
each cohesive split adds its explicit replacement owners.

The historical pre-split blocker inventory was exactly 15 files. It remains frozen as
provenance for baseline-to-final scope; the first three rows are now resolved by the
R01 and TASK-540-02-L01 splits, and the current gate reports exactly the remaining 12
rows beginning with TASK-540-03-L01:

| Leaf owner | Pre-split blocker | Physical lines | Pre-split SHA-256 |
|---|---|---:|---|
| TASK-540-01-L01 | `core/services/customScreens/screenDocumentOps.ts` | 1,030 | `dc20fc963c6fcc6e4c7ef647284fd0ee3ee174302f9ba196e869f40eaae0b69b` |
| TASK-540-01-L01 | `tests/unit/assistant/actionExecutorService.test.ts` | 6,577 | `41bd0ec9f0a0042ca87bc7f688206b391671788176b13bac0b525ce677f6c62b` |
| TASK-540-02-L01 | `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` | 1,194 | `eb49d21a99cd5fbf8dedfd502c727ba890dd455552a8259b9e9b45eb4b11d4df` |
| TASK-540-03-L01 | `core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` | 1,983 | `eb7b659f5c5c4edcd26bfc0ae53716ec538f6ecfad98aa284ae975a051b143ab` |
| TASK-540-03-L01 | `tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` | 2,415 | `455f8d1149d218f2125003fb8538a330c043e79ac894bb9203f150970452997e` |
| TASK-540-04-L01 | `tests/vitest/admin/entriesClient.test.ts` | 1,893 | `011bdef52770f4943daf9f33fcf25a5597e537c386ae3347102020875c17c9a5` |
| TASK-540-04-L03 | `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` | 2,235 | `9d1c59d48e9c5de8f81d3acaa01583ea04efeab8438bb837af1db392cdd17001` |
| TASK-540-04-L03 | `tests/vitest/admin/cacheBus.test.ts` | 1,165 | `301c51a4725dca5ef159ab18e21ea5afda1a457730c616f4e08dc1c0d82de024` |
| TASK-540-04-L03 | `tests/vitest/admin/customScreensClient.test.ts` | 1,359 | `3e529d58401b62b3cc097d9ddfd51df1b6247b75c9ff8fc2043caecd57aecdda` |
| TASK-540-04-L03 | `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx` | 1,141 | `b336092db65daf52c6d9c381d7e5fc5cbb22206095aae719d98de274de7ebb86` |
| TASK-540-04-L03 | `tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx` | 1,079 | `ded6ce43edb92875c1af0787aa66c010049328de3cf701eb4003d25b9d2b92b6` |
| TASK-540-04-L04 | `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | 1,594 | `66c399215f25a00b123869a56a709e5a02bd53606c72db1966b2477eb24c0ba7` |
| TASK-540-04-L04 | `tests/vitest/ui/custom-screens-page.test.tsx` | 2,313 | `79734548b7374ae24fae034acda989bf5c66d29aa94cd882e933400f8596766f` |
| TASK-540-05-L02 | `tests/integration/routes/userSettings.test.ts` | 1,064 | `c3f70ae3d795367dae66b503d618a8c16587a49114883ba455000074c3c86601` |
| TASK-540-05-L02 | `tests/vitest/ui/assistant-panel-interaction.test.tsx` | 1,506 | `bae04840eb4aa25cbaa02a6c59d8cee121afff8d817ff30136b746313c325095` |

Every listed path has exactly one leaf owner. The final receipt records every extant
scoped human-authored production, test, and test-support file as
`{ path, owner, lines, sha256 }`, using byte-based physical-line counting that includes
blank/comment lines and an unterminated final line. Every result must be `<= 1000`.
Generated artifacts, lockfiles, vendored code, database snapshots, and generated
migration metadata alone retain the AGENTS.md exemption. This gate is blocking and no
violation may become a LOW or TASK-9999 deferral.

The remaining repair land order after the completed R01 and TASK-540-02-L01 splits is
exactly:

```text
TASK-540-03-L01 → TASK-540-04-L01 → TASK-540-04-L03 →
TASK-540-04-L04 →
TASK-540-05-L01 boundary → TASK-540-05-L02 → TASK-540-06-L01 closure
```

The ten protected pre-split test families preserve the exact sorted multiset of all
347 fully expanded test names across their final 36 suite files, with each suite
independently runnable. The closure target is exactly 64 Vitest + 18 Bun = 82 files:
81 source-owner/read-only targets and one closure-owned
`tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx`.

## Finding coverage matrix

| Findings | Owner | Required proof |
|---|---|---|
| II-H-01 dirty navigation | 540-04/L03 + L04 | builder/entry content/presentation blocker and beforeunload tests |
| II-H-02 unreachable Button binding; II-M-03 inert actions | 540-01/L01 + 540-02/L01 + 540-03/L01 + 540-04/L04 + 540-06/L01 | field→href→clear→rebind→save/reopen→entry link with no empty sentinel persisted; builder never anchors/navigates; preview/entry safe link; legacy unsupported action stays disabled |
| II-H-03 decorative Tabs; II-M-04 weak IDs/schema | 540-01/L01 + 540-02/L01 + 540-03/L01 | reject duplicates/unknowns; add/rename/remove/slot; keyboard/hidden panel behavior |
| II-H-04 Space/nested interaction | 540-03/L01 | contenteditable Space and link/input activation without wrapper activation |
| II-M-05 URL sanitization; image URL LOW plus UUID presentation resolution drift | 540-01/L01 + 540-03/L01 + 540-04/L03 | shared safe/unsafe corpus plus TAB/LF/CR protocol-relative-confusion and NUL/DEL controls; direct sanitizer/write/stored-read/compat-alias evidence; final Button disabled-non-anchor and Image placeholder/no-`img` sink evidence; direct-write non-string rejection/stored-read omission; direct-image override, scalar/array binding, malformed/URL-shaped/missing/unsafe cases with no fallback and no UUID in `src`; media-field scalar/array UUID retained for MediaPicker |
| II-M-06 rejected promise; II-M-07 missing target subscription | 540-04/L01..L03 | fail→retry and cacheBus refresh without dirty overwrite |
| II-M-12 empty-doc ghost binding | 540-01/L01 | zero-block prune warning/round-trip test |
| II-M-01 fixed Screen rail; invalid ARIA role; global prefs | 540-05/L01 + L02 | narrow geometry, role/name checks, two authenticated-user isolation |

## Ownership, order, and collision guards

The board-family order remains `540-01 → 02 → 03 → 04 → 05 → 06`,
after TASK-543 and before TASK-539 in the audited remediation dependency map. Within
the active modularity repair, the finer-grained mandatory order is the exact nine-step
leaf/boundary/closure sequence in the hard-gate section above; a historically landed
behavior change does not permit a later modularity owner to overtake an earlier one.
Earlier corrective work across
`540-01-L01 → 540-03-L01 → 540-04-L01 → 540-04-L03 → 540-05-L02` is durable in
the affected task files' historical revalidation/post-audit metadata; no
mutable workflow file is treated as immutable evidence for that earlier pass. The
current `_docs/_workflows/task-540-fix.mjs` records only the completed R01→R03
control-character URL correction, with R01 gated before the R03 final-sink regressions.
That workflow and the prior 75/75 Vitest plus 15/15 DB route evidence remain historical
and were not rewritten for the 2026-07-14 fixture-only repair. Repository-wide Bun
validation subsequently exposed the stale `tests/unit/assistant/actionExecutorService.test.ts`
Custom Screen block-patch fixture. R01 alone owned replacement with canonical
`heading.data.text` and an independent `text.data.content` sibling plus same-block and
sibling-block preservation assertions; production Assistant and Screen schema/source
files remained unchanged. Its repair, revalidation, and then-Done transition are
historical. On 2026-07-16 the final workflow audit reopened R01 for the strict
section/block/binding path max-160 contract, binding-ID max-120 contract, three-mode
normalizer, deterministic identity-preserving stored-read repair, metadata-only PATCH
proof, and domain-owned `buildScreenFieldBindingId`. R01 alone owned
`customScreenSchemas.ts`, the narrow builder replacement in `screenDocumentOps.ts`,
their source-owner tests, route/Assistant Bun proof, and two unchanged read-only
Assistant Vitest consumers. The later contract audit additionally assigned the
explicit-ID-only `blueprintBindingComposer.ts` boundary and its focused suite to R01;
that expanded correction now has its exact current receipt. L02 then owned only the Inspector
call-site handoff, invalid Tab-label restore, and its UI regressions; schema and document
ops remained R01-owned.
R03 owned only the accessible zero-item Tabs renderer branch and its renderer regression.
R01, L02, and R03 now retain their exact current receipts. None claims a fresh
post-audit, full validation, smoke, or closure. After changelog 1252 covers their
physical IDs, the covered post-1252 state may be `✅ Done` with `Completed`.
Mandatory repository-wide `bun run test` on 2026-07-15 then confirmed that the legacy
`screen-editor-sections.test.tsx` full-module cacheBus mock omitted the fresh-symbol factory
called before every L04 Screen-builder mutation. L04 alone owns the additive
`createCacheEventOperationToken: () => Symbol(),` property; all nine TASK-500 tests and all
of their assertions, imports, and other mock bytes are frozen. The one-property repair,
isolated 9/9 regression, exact six-file/66-test re-gate, and five zero-finding post-audit
lenses passed on 2026-07-15; that historical implementation evidence remains valid, while
L04 is later reopened and revalidated for its owned binding-flow generated-ID
expectation with a separate fresh owner receipt.
That one-property path is the exact historical repair scope, not a permanent narrowing
of L04. For a new exact evidence-backed post-audit or final-drift L04 repair, the workflow
uses the full original L04 `allowedFiles`, including its production and owned test paths.
The `screen-editor-sections.test.tsx` seam remains fixture-only and may be touched only
when the finding requires it; the exact finding prompt and post-agent `touchedFiles`
verification constrain the mutation.
Closure validation subsequently reproduced
one logical remote event delivered once from each canonical/legacy compatibility
transport. TASK-540-04/L03 alone owned the scoped repair, completed it, and replaced its
persisted repair receipt with the matching `Revalidation Passed` successor. TASK-540-04
and every other landed source leaf now remain `🚧 In Progress` with
`Implementation Complete` awaiting family changelog 1252. The completed L03 repair wrote only
`core/admin/utils/cacheBus.ts`, `tests/vitest/admin/cacheBus.test.ts`, and additive-only
direct-image route-boundary regressions in
`tests/integration/routes/customScreensRoutes.test.ts`; the production
`core/server/routes/customScreenRoutes.ts` file plus every UI, client, service,
hook/dialog, renderer, and L04 consumer file remained read-only during that historical
repair. The additive route-test path was a one-time historical exception and is not part
of L03's original declared owner set. For a new exact evidence-backed post-audit or
final-drift L03 repair, the workflow uses the full original L03 `allowedFiles`, including
`core/services/customScreens/screenEntryPresentationOverrideContract.ts`, without
silently re-adding the historical route-test exception. The exact finding prompt and
post-agent `touchedFiles` verification still constrain every mutation.
The earlier import-only L03 attempt was reverted before the first prepared-state pass.
The later final sequential post-audit independently reopened L03 for the substantive
single-versus-multiple media override contract and included canonical import placement
inside that scoped repair. R01, L03, L04, TASK-540-05-L01, and TASK-540-05-L02 now carry
their exact current repair receipts. The earlier R01/L02/R03 receipts remain durable
historical prerequisites.
After closure, that exact-finding owner additionally receives only the TASK-540 root,
TASK-540-04 child, and L03 leaf task contracts for evidenced prose; status transitions
remain separate task-state mutations. TASK-540-06-L01 remains deliberately active with
one historical pre-modularity `Revalidation Passed`; its current
`Modularity Repair Pending` field is blocking and it has no `Completed`. All
implementation leaves retain historical behavior evidence, but the eight modularity
owners are not closure-ready until their post-split receipts exist. The pre-fix
repository-wide `bun run test` command still requires a fresh parent rerun; no
full-suite or live-smoke pass is claimed here.
Leaves have exclusive source ownership; any shared block data/action/DOM-id
shape is defined by 540-01 and consumed verbatim. TASK-540-03 owns the pure renderer's
optional UUID→URL map prop; TASK-540-04-L03 exclusively threads and populates it through
`CustomScreenEntryCanvas.tsx`, the optional pass-through props of
`CustomScreenPreview.tsx`, and `CustomScreenEntryEditor.tsx`. Preview output remains
byte-identical when no entry-scoped presentation inputs are supplied.
TASK-540-02 exclusively owns the Inspector's shared binding-ID helper call site and
compatibility expectations in `tests/vitest/ui/custom-screen-binding-panel.test.tsx`
plus `tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx`; R01 retains
the helper and document-op source/test ownership.

TASK-540 must not edit TASK-478/TASK-481 page-only seams while either stream is
active. Its forbidden paths include `core/admin/ui/pages/**`,
`core/services/pages/pageRendererV2.tsx`, and `core/ui/theme/tokenCss.ts`; reuse
the shared URL helper by import, not by modifying the Page-owned implementation.
TASK-540-01 owns a Screen-specific wrapper that rejects every ASCII control
(`U+0000..U+001F`, `U+007F`) and every backslash before delegating to that imported
helper; the Page-owned helper is read-only. Its compatibility alias delegates to the
wrapper while TASK-540-02 migrates the Inspector and TASK-540-03 migrates the renderer.
R01 owns the direct sanitizer/write/stored-read/compat-alias evidence; R03 owns only the
final renderer-sink regressions and need not change renderer production when the wrapper
fix is sufficient. No direct Screen consumer may remain on the alias after that rollout. TASK-540-04-L01 owns
both entry-list and media-list promise publication. TASK-540-04-L03 exclusively owns
the presentation-target service expansion plus entry host/canvas forwarding. Its completed
2026-07-15 repair alone owned the cache-bus canonical/legacy multiset and its owner tests.
The historical L03 cache-bus repair and the earlier R01/L02/R03 corrections remain
validated. The later L03, TASK-540-05-L01, and TASK-540-05-L02 repairs have exact current
receipts; expanded R01 and L04 now have their fresh matching pre-split receipts too. The
resolver must not treat the family as prepared for closure until every owner in the
mandatory modularity sequence has landed and revalidated. L03 has a current scoped source diff and matching
revalidation receipt for the single-versus-multiple media override contract. The matching
`_docs/CMS_API.md` update is already landed and remains read-only while closure validates
and consumes it.
If shared `CanvasEditor.tsx` changed meanwhile, re-read and re-audit before land.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after each leaf.
- Every source leaf updates/creates its behavior tests before its targeted gate. Closure
  may add aggregate cases but never defers or re-baselines a source-owner assertion.
- Targeted Custom Screen schema/ops/service/client/UI/runtime Vitest suites and
  existing Bun route integration suites.
- R01's identity correction owns `custom-screen-schemas.test.ts`,
  `screenDocumentOps.test.ts`, and `blueprint-binding-composer.test.ts`; its targeted
  gate also runs the unchanged
  `action-plan-schema.test.ts` and `catalogBlueprintEngine.test.ts` as explicit read-only
  Assistant consumers plus the existing image-src contract. L02 owns only the Inspector
  call site and `custom-screen-binding-panel.test.tsx`, gated with the existing image
  inspector suite. R03 owns the accessible zero-item renderer state and its exact 89/89
  renderer/interaction/image gate. Closure runs all of them read-only in the final
  64-Vitest/18-Bun aggregate (81 source-owner/read-only files plus one closure-owned
  aggregate), including every independently runnable split suite. The ten protected
  split families must additionally retain their exact 347-name pre-split multiset.
- R01's exact Bun gate includes `tests/unit/assistant/actionExecutorService.test.ts`;
  only its existing Custom Screen block-patch fixture/assertions may change, while the
  full file proves the fixture remains compatible with the Assistant executor contract.
- Cache/async tests use deferred promises and explicit unmount/cancellation.
- At least seven real flows: Button bound link with builder non-navigation and
  preview/entry navigation, plus direct/media-field presentation with override and
  scalar/array binding provenance/no-fallback cases;
  add/nest/save/reopen Tabs; keyboard
  Tabs; inline Space; dirty navigation cancel/discard; related-list fail/retry+
  cross-tab update; plus narrow canvas and two-user preference spot checks.
  Assert visible/ARIA/geometry effects, light/dark, and zero console errors.

## Documentation Updates Required

Update `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_SPEC.md`,
the narrow unsafe-method CSRF wording in `_docs/SECURITY_SPEC.md`; validate the
already-landed `_docs/CMS_API.md` direct-image/media-field correction read-only; update
`_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`, and Custom Screens user/
developer docs. At closure create changelog 1252 and close every descendant.
