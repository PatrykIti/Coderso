# TASK-540: Custom Screens Functional and Data-Integrity Remediation

# FileName: TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md

**Priority:** High
**Category:** Custom Screens / Admin UI / Accessibility / Cache / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-496, TASK-498, TASK-500, TASK-503, TASK-505, TASK-539
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; create only at implementation closure)

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
`action:"link"` shape with no `href`, so it is safely disabled without adding a
persisted `disabled` enum. No endpoint or migration is added.

## Hard invariants

- New writes use strict schemas for every fixed data-oriented block kind; legacy/plugin
  kinds retain only their explicit compatibility arm. Tabs items have required,
  non-empty, unique IDs and canonical labels/slots.
- Button/image URLs reuse the shared authoring URL policy and reject protocol-
  relative, backslash-confused, executable, and unsupported schemes at write and
  render.
- Presentation image overrides remain media UUIDs. The entry host resolves them to
  `MediaRecord.url` through an identity/cancellation-guarded cache seam only for direct
  image blocks; the pure renderer sanitizes that winning URL and never places a UUID in
  `src`. Media fields retain the UUID required by MediaPicker.
- Binding GC prunes every missing block, including when the live block set is
  empty, and reports the existing warning shape.
- Tabs use real `tablist`/`tab`/`tabpanel`, one active panel, unique DOM IDs, and
  roving keyboard navigation. Builder slot authoring and runtime share identity.
- Selection is not represented by a focusable `role=button` wrapper containing
  links/inputs/contenteditable. Space in an editor stays text input.
- Both builder and entry dirty states use the shared navigation/beforeunload
  guard. Remote updates never overwrite dirty content or presentation drafts.
- Cached promises are retryable; subscriptions include every related target key;
  async work checks cancellation before every state commit.
- Entry preferences use the existing self-scoped authenticated user-settings
  service/client with a strict namespaced key and degrade safely when no user
  context or network is available.

## Security Contract

- **Visibility/endpoints:** existing internal Custom Screens and content-entry
  routes only; no public Screen write or new route.
- **Auth/RBAC:** session/API-key behavior and `content:read`/`content:write`
  permissions remain unchanged. Presentation overrides keep their current
  internal owner permissions.
- **CSRF/rate limits:** all session writes retain CSRF and `admin_write`; internal
  API-key scope remains required. No public nonce/captcha applies.
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
| TASK-540-01 | Strict Screen data, URLs, Tabs, and binding GC | TASK-540-01-L01 | ⏳ To Do |
| TASK-540-02 | Button binding and Tabs authoring | TASK-540-02-L01 | ⏳ To Do |
| TASK-540-03 | Accessible Tabs and selection semantics | TASK-540-03-L01 | ⏳ To Do |
| TASK-540-04 | Dirty navigation and async/cache recovery | TASK-540-04-L01..L04 | ⏳ To Do |
| TASK-540-05 | Responsive canvas, ARIA, and user preferences | TASK-540-05-L01, L02 | ⏳ To Do |
| TASK-540-06 | Tests, smoke, and closure | TASK-540-06-L01 | ⏳ To Do |

## Finding coverage matrix

| Findings | Owner | Required proof |
|---|---|---|
| II-H-01 dirty navigation | 540-04/L03 + L04 | builder/entry content/presentation blocker and beforeunload tests |
| II-H-02 unreachable Button binding; II-M-03 inert actions | 540-01/L01 + 540-02/L01 + 540-04/L04 + 540-06/L01 | field→href→clear→rebind→save/reopen→entry link with no empty sentinel persisted; legacy unsupported action stays disabled |
| II-H-03 decorative Tabs; II-M-04 weak IDs/schema | 540-01/L01 + 540-02/L01 + 540-03/L01 | reject duplicates/unknowns; add/rename/remove/slot; keyboard/hidden panel behavior |
| II-H-04 Space/nested interaction | 540-03/L01 | contenteditable Space and link/input activation without wrapper activation |
| II-M-05 URL sanitization; image URL LOW plus UUID presentation resolution drift | 540-01/L01 + 540-03/L01 + 540-04/L03 | shared safe/unsafe corpus; direct-image UUID→MediaRecord.url resolution/cancellation and no UUID in `src`; media-field UUID retained for MediaPicker |
| II-M-06 rejected promise; II-M-07 missing target subscription | 540-04/L01..L03 | fail→retry and cacheBus refresh without dirty overwrite |
| II-M-12 empty-doc ghost binding | 540-01/L01 | zero-block prune warning/round-trip test |
| II-M-01 fixed Screen rail; invalid ARIA role; global prefs | 540-05/L01 + L02 | narrow geometry, role/name checks, two authenticated-user isolation |

## Ownership, order, and collision guards

Land `540-01 → 02 → 03 → 04 → 05 → 06`, after TASK-539 and before TASK-541.
Leaves have exclusive source ownership; any shared block data/action/DOM-id
shape is defined by 540-01 and consumed verbatim. TASK-540-03 owns the pure renderer's
optional UUID→URL map prop; TASK-540-04-L03 exclusively threads and populates it through
`CustomScreenEntryCanvas.tsx` and `CustomScreenEntryEditor.tsx`.

TASK-540 must not edit TASK-478/TASK-481 page-only seams while either stream is
active. Its forbidden paths include `core/admin/ui/pages/**`,
`core/services/pages/pageRendererV2.tsx`, and `core/ui/theme/tokenCss.ts`; reuse
the shared URL helper by import, not by modifying the Page-owned implementation.
TASK-540-01 owns a Screen-specific wrapper that rejects every backslash before
delegating to that imported helper; all Screen write/render consumers import the wrapper.
If shared `CanvasEditor.tsx` changed meanwhile, re-read and re-audit before land.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after each leaf.
- Every source leaf updates/creates its behavior tests before its targeted gate. Closure
  may add aggregate cases but never defers or re-baselines a source-owner assertion.
- Targeted Custom Screen schema/ops/service/client/UI/runtime Vitest suites and
  existing Bun route integration suites.
- Cache/async tests use deferred promises and explicit unmount/cancellation.
- At least six real flows: Button bound link; add/nest/save/reopen Tabs; keyboard
  Tabs; inline Space; dirty navigation cancel/discard; related-list fail/retry+
  cross-tab update; plus narrow canvas and two-user preference spot checks.
  Assert visible/ARIA/geometry effects, light/dark, and zero console errors.

## Documentation Updates Required

Update `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_SPEC.md`, `_docs/CMS_API.md`,
`_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`, and Custom Screens user/
developer docs. At closure create changelog 1252 and close every descendant.
