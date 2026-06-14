# 1165 - TASK-455/456/457 client-readiness closure (site shell, forms, collections)

**Date:** 2026-06-12
**Version:** Unreleased
**Tasks:** TASK-455, TASK-455-01, TASK-455-02, TASK-455-03, TASK-456, TASK-456-01, TASK-456-02, TASK-456-03, TASK-457, TASK-457-01, TASK-457-02, TASK-457-03

## Key Changes

### Global Site Shell (TASK-455)

- New settings keys `site.navigationMenuId` / `site.footerTemplateId`
  (nullable-id pattern) with the `publicSiteShell` resolver: published-only,
  fail-closed to no-render for missing/draft refs.
- `SiteHeaderNav` (published menu tree, anonymous render omits `logged_in`
  items, CSS-only mobile disclosure) and `SiteFooter` (the designated Page
  Template rendered through the shared Page v2 pipeline with scoped
  responsive CSS) mount in `DefaultRuntimePageShellV2` for every public page,
  homepage, and both preview targets; shell resolved once per request.
- "Site shell" settings card with validated pickers (published menus / page
  templates) and site-cache invalidation on write.

### Form Authoring (TASK-456)

- `form` block un-gated with real controls: new `ComboboxControl` primitive +
  `combobox` adapter model kind with dynamic options sources (single owner);
  `formId` picker from `listFormsCached`; canvas-safe inert preview
  (pick-a-form empty state, disabled fieldset); palette entry "Form".
- Public submit pipeline untouched; live smoke performed a REAL nonce-path
  submit verified end to end.
- New read-only Form Submissions screen
  (`/advanced/forms/:id/submissions`, row action + builder entry),
  fetch-on-open by design (documented in ADMIN_CACHE).

### Collection Authoring (TASK-457)

- `collection` block un-gated: contentType/query/template comboboxes (query
  options strictly filtered by content type; type change clears the stored
  query in one undoable patch) + limit slider 1..50; canvas preview with
  published entries (interactivity off); palette entry "Collection".
- Final frozen catalog: 11 sections + 16 insertable blocks — TASK-452 guard
  suites deliberately amended (the explicit capability-change path those
  tests exist for); `gallery` block/`embed`/`icon` and the `form`/
  `collection`/`lead-form` SECTIONS stay gated.

### Post-Smoke Polish (commit 7d975441)

- List block items can be authored as links (`{label, href}` owner contract
  in `pageDocumentV2` with reject-unknown; `ListItemsControl` rows) — footer
  link columns work end to end.
- `pageTemplates` detail merge can no longer fabricate an authoritative
  single-item list cache.
- Base-URL validation allows http for RFC 6761 loopback hosts via the
  `siteSettingsValidation` owner; `RuntimePreviewDialog` trusts the
  server-side probe (client check only as a probe-less fallback).
- Pre-existing `revisionService` fixture failure fixed (stale v1 document
  updated to the v2 write contract) — the long-documented known-red is green.

## Validation

- Full Vitest lane: 663 files / 3993 tests PASS (before the polish wave) and
  382 files / 2000 tests PASS on the touched ui/pages/admin lanes after it.
- Bun lanes (env loaded): pages unit + runtime + pageTemplates routes +
  site-shell runtime + settings — all green (91 and 69 in the two closing
  runs); `revisionService` now green.
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc,
  `git diff --check` — clean.
- Live client-site smoke (`.tmp/phase25/client-readiness-smoke.md`): site
  shell on multiple pages + 390px + fail-closed unpublish; real form submit
  with payload retrievable; collection listing respecting limit; catalog
  11+16; Phase 0-2 regressions hold.

## Board

- Done: all 12 TASK-455/456/457 tasks. The client-readiness wave (Phase 2.5)
  is complete; Phase 3a/3b per-target families, TASK-453, and TASK-454 remain
  open.
