# TASK-417: Pages Sections Atomic Blocks Rewrite
# FileName: TASK-417_Pages_Sections_Atomic_Blocks_Rewrite.md

**Priority:** High
**Category:** Pages / Runtime / Admin UI / Assistant
**Estimated Effort:** Very Large
**Dependencies:** TASK-413, TASK-414-01, TASK-410, `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`, `_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html`
**Status:** 🚧 In Progress
**Started:** 2026-06-09

---

## Overview

Replace the Pages product surface with a clean-break v2 document model:
`schemaVersion: 2`, root `sections[]`, and atomic blocks inside each section.
This is a Pages-only rewrite. Existing widget blocks remain valid for non-Page
surfaces such as detail pages, custom screens, and widget templates.

The accepted cutover choices are:

- Stored v1/versionless Page rows are reset to an empty v2 Page document when
  read, rendered, restored, or duplicated. Fresh admin/API writes reject
  legacy/versionless payloads with `page_document_invalid`. This is intentional
  because the CMS is not used in production yet.
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

- [ ] TASK-417-01: Source of truth contract and drift freeze.
- [ ] TASK-417-02: Pages v2 document domain and schema.
- [ ] TASK-417-03: Pages service lifecycle and data disposition.
- [ ] TASK-417-04: Public runtime and preview v2.
- [ ] TASK-417-05: Admin Pages editor v2 canvas.
- [ ] TASK-417-06: Assistant Pages v2 cutover.
- [ ] TASK-417-07: Validation, docs, changelog, and closure.

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
