# TASK-417: Pages Sections Atomic Blocks Rewrite
# FileName: TASK-417_Pages_Sections_Atomic_Blocks_Rewrite.md

**Priority:** High
**Category:** Pages / Runtime / Admin UI / Assistant
**Estimated Effort:** Very Large
**Dependencies:** TASK-413, TASK-414-01, TASK-410, `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`, `_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html`
**Status:** ✅ Done
**Started:** 2026-06-09
**Completed:** 2026-06-09

---

## Overview

Replace the Pages product surface with a clean-break v2 document model:
`schemaVersion: 2`, root `sections[]`, and atomic blocks inside each section.
This is a Pages-only rewrite. Existing widget blocks remain valid for non-Page
surfaces such as detail pages, custom screens, and widget templates.

The accepted cutover choices are:

- Stored v1/versionless Page rows are reset to an empty v2 Page document when
  read by admin, snapshotted for revision/autosave, published without a fresh
  payload, restored, duplicated, rendered publicly, or previewed. Fresh
  admin/API writes reject legacy/versionless payloads with
  `page_document_invalid`. This is intentional because the CMS is not used in
  production yet.
- There is no Pages v1 public renderer after this family closes.
- Assistant page-building is cut over in this family so `page.upsert` and
  related page automation emit v2 sections instead of legacy widget blocks.
- The static redesign HTML is a UX reference, not the source-of-truth data
  contract. `_docs/PAGE_MODEL.md` becomes the normative v2 contract.

Read-only pre-implementation audits were completed against
`d0dd7352644c849bb3cd4d84abbe53a55b4f4f62` with a clean worktree by Claude,
Epicurus, and Bacon. The main risks they found were source-of-truth doc drift,
v1 `blocks[]` persistence/runtime coupling, assistant widget-block coupling,
non-Page widget boundary risk, route Security Contract coverage, and missing
validation lane ownership.

Fresh implementation reconnaissance against HEAD
`e1709ed1b762208c1a721f9cc1cab1fd2e45ee5b` was completed by Claude, Godel,
and Hubble before code edits. The material findings are now part of this task
contract:

- Pages v2 must use a separate renderer/template boundary from the legacy
  `PageTemplateProps.blocks` and `page-landing.tsx` path, because that path is
  still shared by detail pages and widget-template preview.
- Stored Page admin reads, revision snapshots, autosave snapshots, no-payload
  publish, duplicate, restore, public render, and preview must all use the
  stored-read legacy reset adapter; strict v2 write normalization is only for
  fresh writes.
- `mapPageError` must follow the repository `ApiError(code, message, status)`
  convention and cover `page_not_found`, `page_document_invalid`, and
  `page_document_unknown_field`.
- `page.widget.patch` is retired/re-scoped only for Pages; shared widget patch
  helpers remain valid for non-Page widget template/detail/custom surfaces.
- Real browser checks must run incrementally with `coderso-dev-core-host` and
  `playwright-cli` whenever a testable runtime/admin slice lands.

TASK-414 remains active, so TASK-417-06 must rebase and rerun drift checks
against the current assistant action/blueprint/executor surface before landing
assistant code. TASK-417 depends only on the completed TASK-414-01 slice rather
than the whole active umbrella.

---

## Security Contract

- **Endpoint visibility:** Pages admin endpoints remain internal under
  `/admin/api/pages*`; public page rendering and `/preview` keep their existing
  public read/token boundaries.
- **Auth model:** session auth for admin endpoints; `/preview` remains anonymous
  only with a valid preview token.
- **RBAC:** `content:read` for reads and preview token creation,
  `content:write` for create/update/autosave/duplicate/delete/restore/discard,
  `content:publish` for publish/unpublish.
- **CSRF:** all admin/internal write methods continue to require the shared
  admin CSRF protections before route handlers run.
- **Rate-limit bucket:** existing admin bucket for internal Pages writes and
  preview token creation; existing public preview protections for token reads.
- **Validation:** Pages v2 payloads must be schema-first and reject unknown
  fields at the route boundary, then normalize through the Pages v2 owner
  module before persistence or rendering.
- **Anti-abuse controls:** no public write endpoint is introduced; nonce,
  signature/HMAC, and reCAPTCHA are not applicable to Pages admin writes.
  Preview keeps token TTL, hashed token storage, and sanitized probe metadata.

---

## Sub-Tasks

- [x] TASK-417-01: Source of truth contract and drift freeze.
- [x] TASK-417-02: Pages v2 document domain and schema.
- [x] TASK-417-03: Pages service lifecycle and data disposition.
- [x] TASK-417-04: Public runtime and preview v2.
- [x] TASK-417-05: Admin Pages editor v2 canvas.
- [x] TASK-417-06: Assistant Pages v2 cutover.
- [x] TASK-417-07: Validation, docs, changelog, and closure.

---

## Implementation Order

1. Freeze the task contract and source-of-truth docs, then rerun read-only drift
   audits until no material task drift remains.
2. Build the Bun-free Pages v2 document owner with types, defaults,
   normalization, atomic block catalog, responsive cascade, and legacy reset.
3. Cut server validation and page services to v2 while preserving route
   auth/RBAC/CSRF/cache/audit behavior.
4. Add a Pages v2 renderer and keep widget renderers scoped to non-Page
   surfaces.
5. Replace PageEditor with the new canvas, floating toolbar, command palette,
   layers, and responsive override editing.
6. Cut assistant active-surface, schemas, blueprints, executor, and policy to
   sections.
7. Run targeted validation, release gates, final drift audits, docs, board, and
   changelog closeout.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest lanes for Pages v2 document helpers, responsive cascade, admin editor,
  and assistant pure planning/schema contracts.
- Bun lanes for Pages routes, DB-backed service lifecycle, public runtime,
  preview, publish, cache, and security behavior.
- `bun run gates:coderso`
- DB-backed tests require `set -a && source .env && set +a` first when
  `DATABASE_URL` is available.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/content-and-widgets.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache keys or
  invalidation semantics change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` plus `_docs/_CHANGELOG/README.md`

---

## Completion Notes

- Implemented Pages v2 as a clean-break `schemaVersion: 2` document contract
  with root `sections[]` and atomic section blocks.
- Added `core/services/pages/pageDocumentV2.ts` as the schema/defaults/
  normalizer owner and removed the unused legacy Page widget data normalizer.
- Updated Pages route validation, Page services, autosave/revisions/publish,
  public runtime, preview/runtime shell, admin Page list creation, and PageEditor.
- Replaced the Pages left/right widget editor with a canvas-first editor using
  command palette, layers, floating toolbar, settings, history, preview, save,
  and publish flows.
- Cut assistant Page active surfaces, schemas, blueprints, executor, resolver,
  and policies to v2 sections; `page.widget.patch` is retired for Pages but
  widget-template/custom-screen block patch behavior remains.
- Migrated Solution Kits and Advanced site-kit runtime overrides so kit-created
  Pages are v2 section documents instead of legacy root `blocks[]`.
- Preserved non-Page widget boundaries for detail pages, custom screens, and
  widget templates.
- Stopped deriving widget-template install seeds from Pages v2 data; explicit
  kit template blueprints remain available for legacy widget-template installs.
- Upgraded root dev-only `concurrently` to `10.0.3` to clear the local
  `shell-quote@1.8.3` security advisory discovered during closeout scans.

## Validation Evidence

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- Page/admin Vitest targeted group - 5 files, 17 tests passed.
- Assistant Vitest targeted groups - 15 files, 285 tests passed.
- Page service/routes/runtime Bun group - 34 tests passed.
- Assistant executor/full-service public runtime Bun group - 74 tests passed.
- Assistant executor site-kit smoke - 73 tests passed.
- Solution Kit catalog/manifest/template seed Bun group - 3 files, 9 tests
  passed.
- Solution Kit installer/site-builder Bun group - 2 files, 9 tests passed.
- Advanced site-builder Vitest group - 3 files, 17 tests passed.
- Assistant route permission suite - 28 tests passed.
- Detail-page/widget-template/custom-screen boundary suites passed; one
  combined detail-runtime run hit shared DB fixture interference and the
  affected detail runtime file passed in isolation.
- `bun run gates:coderso` - passed all functional, UX, performance, security,
  and reliability gates.
- `bun run scan:security` - clean.
- `bun run scan:security:strict` - clean.
- `coderso-dev-core-host` plus `playwright-cli` verified admin create/edit/save/
  publish and public v2 rendering for `/task-417-playwright-smoke`.

## Changelog

- `_docs/_CHANGELOG/1139-2026-06-09-task-417-pages-v2-sections-editor.md`
