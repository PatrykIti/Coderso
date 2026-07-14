# TASK-540: Custom Screens Functional and Data-Integrity Remediation

# FileName: TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md

**Priority:** High
**Category:** Custom Screens / Admin UI / Accessibility / Cache / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-496, TASK-498, TASK-500, TASK-503, TASK-505, TASK-543 (program order)
**Status:** 🚧 In Progress
**Started:** 2026-07-13
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

## Hard invariants

- New writes use strict schemas for every fixed data-oriented block kind; legacy/plugin
  kinds retain only their explicit compatibility arm. Tabs items have required,
  non-empty, unique IDs and canonical labels/slots.
- Button/image URLs reuse the shared authoring URL policy and reject protocol-
  relative, backslash-confused, executable, and unsupported schemes at write and
  render. A present URL field on write must be a string: direct normalizer/service
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
  `customScreenSchemas.ts` owns one Bun-free `isScreenMediaAssetUuid` predicate used
  by the renderer and later strict override contract; no consumer mirrors its regex.
- Binding GC prunes every missing block, including when the live block set is
  empty, and reports the existing warning shape.
- Tabs use real `tablist`/`tab`/`tabpanel`, one active panel, unique DOM IDs, and
  roving keyboard navigation. In builder mode the visible active tab is derived from
  the host `insertPoint`; activating a tab also arms that tab's slot-end target. Preview
  and entry renderers keep instance-local active state. Authoring and rendering never
  maintain competing tab identities.
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
| TASK-540-01 | Strict Screen data, URLs, Tabs, and binding GC | TASK-540-01-L01 | ✅ Done |
| TASK-540-02 | Button binding and Tabs authoring | TASK-540-02-L01 | ✅ Done |
| TASK-540-03 | Accessible Tabs and selection semantics | TASK-540-03-L01 | ✅ Done |
| TASK-540-04 | Dirty navigation and async/cache recovery | TASK-540-04-L01..L04 | ✅ Done |
| TASK-540-05 | Responsive canvas, ARIA, and user preferences | TASK-540-05-L01, L02 | ⏳ To Do |
| TASK-540-06 | Tests, smoke, and closure | TASK-540-06-L01 | ⏳ To Do |

## Finding coverage matrix

| Findings | Owner | Required proof |
|---|---|---|
| II-H-01 dirty navigation | 540-04/L03 + L04 | builder/entry content/presentation blocker and beforeunload tests |
| II-H-02 unreachable Button binding; II-M-03 inert actions | 540-01/L01 + 540-02/L01 + 540-03/L01 + 540-04/L04 + 540-06/L01 | field→href→clear→rebind→save/reopen→entry link with no empty sentinel persisted; builder never anchors/navigates; preview/entry safe link; legacy unsupported action stays disabled |
| II-H-03 decorative Tabs; II-M-04 weak IDs/schema | 540-01/L01 + 540-02/L01 + 540-03/L01 | reject duplicates/unknowns; add/rename/remove/slot; keyboard/hidden panel behavior |
| II-H-04 Space/nested interaction | 540-03/L01 | contenteditable Space and link/input activation without wrapper activation |
| II-M-05 URL sanitization; image URL LOW plus UUID presentation resolution drift | 540-01/L01 + 540-03/L01 + 540-04/L03 | shared safe/unsafe corpus plus direct-write non-string rejection/stored-read omission; direct-image override, scalar/array binding, malformed/URL-shaped/missing/unsafe cases with no fallback and no UUID in `src`; media-field scalar/array UUID retained for MediaPicker |
| II-M-06 rejected promise; II-M-07 missing target subscription | 540-04/L01..L03 | fail→retry and cacheBus refresh without dirty overwrite |
| II-M-12 empty-doc ghost binding | 540-01/L01 | zero-block prune warning/round-trip test |
| II-M-01 fixed Screen rail; invalid ARIA role; global prefs | 540-05/L01 + L02 | narrow geometry, role/name checks, two authenticated-user isolation |

## Ownership, order, and collision guards

Land `540-01 → 02 → 03 → 04 → 05 → 06`, after TASK-543 and before TASK-539
in the audited remediation dependency map.
Leaves have exclusive source ownership; any shared block data/action/DOM-id
shape is defined by 540-01 and consumed verbatim. TASK-540-03 owns the pure renderer's
optional UUID→URL map prop; TASK-540-04-L03 exclusively threads and populates it through
`CustomScreenEntryCanvas.tsx`, the optional pass-through props of
`CustomScreenPreview.tsx`, and `CustomScreenEntryEditor.tsx`. Preview output remains
byte-identical when no entry-scoped presentation inputs are supplied.
TASK-540-02 exclusively owns compatibility expectation changes in
`tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx` and gates that
suite together with its binding-panel test.

TASK-540 must not edit TASK-478/TASK-481 page-only seams while either stream is
active. Its forbidden paths include `core/admin/ui/pages/**`,
`core/services/pages/pageRendererV2.tsx`, and `core/ui/theme/tokenCss.ts`; reuse
the shared URL helper by import, not by modifying the Page-owned implementation.
TASK-540-01 owns a Screen-specific wrapper that rejects every backslash before
delegating to that imported helper; its compatibility alias delegates to the wrapper
while TASK-540-02 migrates the Inspector and TASK-540-03 migrates the renderer. No
direct Screen consumer may remain on the alias after that rollout. TASK-540-04-L01 owns
both entry-list and media-list promise publication. TASK-540-04-L03 exclusively owns
the presentation-target service expansion plus entry host/canvas forwarding; closure
updates the matching `_docs/CMS_API.md` contract.
If shared `CanvasEditor.tsx` changed meanwhile, re-read and re-audit before land.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after each leaf.
- Every source leaf updates/creates its behavior tests before its targeted gate. Closure
  may add aggregate cases but never defers or re-baselines a source-owner assertion.
- Targeted Custom Screen schema/ops/service/client/UI/runtime Vitest suites and
  existing Bun route integration suites.
- Cache/async tests use deferred promises and explicit unmount/cancellation.
- At least seven real flows: Button bound link with builder non-navigation and
  preview/entry navigation, plus direct/media-field presentation with override and
  scalar/array binding provenance/no-fallback cases;
  add/nest/save/reopen Tabs; keyboard
  Tabs; inline Space; dirty navigation cancel/discard; related-list fail/retry+
  cross-tab update; plus narrow canvas and two-user preference spot checks.
  Assert visible/ARIA/geometry effects, light/dark, and zero console errors.

## Documentation Updates Required

Update `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_SPEC.md`, `_docs/CMS_API.md`,
`_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`, and Custom Screens user/
developer docs. At closure create changelog 1252 and close every descendant.
