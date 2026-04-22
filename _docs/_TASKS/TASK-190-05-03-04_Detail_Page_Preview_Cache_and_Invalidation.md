# TASK-190-05-03-04: Detail Page Preview, Cache, and Invalidation
# FileName: TASK-190-05-03-04_Detail_Page_Preview_Cache_and_Invalidation.md

**Priority:** High
**Category:** Runtime + Preview + Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-03
**Status:** To Do

---

## Overview

Extend preview and cache behavior for composed detail pages. Detail page documents
must preview safely and invalidate public cache when related entries or detail
documents change.

This leaf owns the `detail-page` preview target and query-string contract.
Later route/API leaves, including `/admin/api/detail-pages/:id/preview`, must
reuse this contract instead of introducing a parallel preview target shape.

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/server/publicSite.tsx`
- Update `core/services/pages/previewService.ts`
- Update `core/db/schema.ts`
- Add SQL migration for preview-token context storage
- Add Drizzle `meta/*_snapshot.json` and `meta/_journal.json` updates for the
  preview-token storage change
- Update `core/server/utils/previewUrls.ts`
- Update `core/site/cache/siteCache.ts`
- Update entry/page/detail document services for invalidation hooks.
- Update `tests/unit/pages/previewService.test.ts`
- Update `tests/vitest/server/previewUrls.test.ts`
- Add `tests/integration/runtime/detail-page-preview-cache.test.tsx`

## Preview Storage Contract

This leaf must define the physical persisted contract for server-side
detail-page preview context instead of leaving it implicit.

Current state:

- preview tokens are already DB-backed through `preview_tokens`,
- the current storage only keeps `targetType`, `targetId`, `tokenHash`, and
  `expiresAt`, plus `createdAt`,
- that is not enough for detail-page preview because runtime must also know
  which sample entry was selected server-side.

Required implementation contract for this leaf:

```ts
preview_tokens: {
  id,
  target_type,
  target_id,
  token_hash,
  context,
  expires_at,
  created_at
}
```

`context` is a strict JSON payload owned by `previewService.ts`, not an
untyped grab bag. For this slice:

```ts
type PreviewTokenContext =
  | null
  | {
      kind: "detail-page";
      sampleEntryId: string;
    };
```

Rules:

- The default implementation path extends the existing `preview_tokens` table
  with a nullable JSONB `context` column.
- `previewService.ts` owns strict write/read validation for `context`.
- `previewUrls.ts` remains the shared preview path/base-url owner for every
  preview target type. Adding `type=detail-page` or `detailPageId` extends that
  existing helper in place; detail-page routes/services must not synthesize
  preview URLs through route-local builders.
- `detail-page` preview uses `preview_tokens.context.sampleEntryId`; runtime
  must not trust raw `sampleEntryId` query params.
- This leaf must not introduce a second ad-hoc in-memory preview store.
- A separate preview-session table is explicitly out of scope unless this task
  is rewritten to replace the DB-backed token contract everywhere that currently
  uses `preview_tokens`.
- DB changes require full migration artifacts in this leaf because current
  preview storage is persisted today.

## Preview Contract

Detail pages have two distinct preview modes.

### Detail Template Preview

Use a dedicated preview target for editing the detail template itself:

```text
/preview?type=detail-page&token=<token>&device=desktop
```

Rules:

- `token` targets `detail_page_documents.id`.
- preview issuance stores `sampleEntryId` in `preview_tokens.context`; runtime
  must not trust an arbitrary sample entry id from query params.
- Runtime renders `current_document`, not `published_document`.
- The sample entry must be published by default.
- If previewing against a draft entry is needed, use content preview mode with a
  valid content preview token instead of trusting raw sample-entry query input.
- `device` is optional and uses the existing `desktop|tablet|mobile` contract.

### Entry Detail Preview

Use the existing content preview target for previewing a specific entry:

```text
/preview?type=content&token=<entry-token>&contentType=<type-slug>&slug=<entry-slug>&detailPageId=<detail-page-id>&device=desktop
```

Rules:

- `token` targets the content entry or post.
- Runtime resolves the entry draft allowed by the token.
- the existing shared preview helper currently serializes `contentType` and
  `slug` for `type=content`; this leaf extends that shared contract additively
  with `detailPageId` instead of replacing it with a route-local minimal URL,
- `contentType` and `slug` remain compatibility/path hints owned by the shared
  preview helper until a later explicit helper cutover says otherwise; token
  validation stays the runtime authority,
- `detailPageId` is optional; when omitted, runtime uses the active published
  detail document for the entry content type.
- When `detailPageId` is provided, runtime may use only a published detail page
  document that belongs to the previewed entry content type.
- `type=content` preview must never expose `current_document` of a detail-page
  draft through `detailPageId`. Draft detail-template preview remains owned by
  the dedicated `type=detail-page` preview token / internal admin path.
- Runtime never trusts arbitrary route/detail document ids from query params
  without validating the token target, content type relationship, and published
  status of the referenced detail page.
- Invalid, mismatched, or unpublished `detailPageId` returns `404` instead of
  silently falling back to a draft or unrelated template.

Preview must:

- use current/draft entry data only through valid preview token,
- render the same detail document pipeline as public runtime,
- pass `device=desktop|tablet|mobile` into block visibility logic,
- return `410` for expired token and `404` for disabled preview/missing target.
- extend the existing shared preview-token validation seam in
  `previewService.ts` (or a small helper extracted there) so runtime can
  distinguish `expired` from `missing` without adding a second route-local
  token lookup/result contract in `publicSite.tsx`.

Implementation notes:

- Update `previewService` target types to include `detail-page`.
- Extend preview token storage/validation so detail-page preview can carry the
  server-issued sample entry context inside `preview_tokens.context` instead of
  relying on raw query params.
- Because the current shared helper returns one null-like outcome today, this
  leaf must widen that existing helper in place so callers can map
  `expired -> 410` and `missing/disabled -> 404` through one shared contract
  rather than duplicating token-status branching in each preview route/runtime
  owner.
- `previewUrls.ts` remains the shared preview path/base-url owner for
  `page` / `content` / `widget-template` preview URLs; this leaf extends that
  existing helper in place for the new `detail-page` target instead of adding a
  route-local URL builder.
- because `previewUrls.ts` already emits `contentType` / `slug` for
  `type=content`, this leaf should either keep that compatibility shape and add
  `detailPageId`, or explicitly cut over the helper/tests/routes in the same
  implementation wave; it must not silently document a narrower URL while code
  still emits the existing params.
- `publicSite.tsx` / detail runtime resolution must treat `detailPageId` on
  `type=content` preview as a published-document override only; reading
  `current_document` requires the dedicated `type=detail-page` preview token.
- Update `previewUrls` builders for detail-template preview URLs.
- Update `_docs/PREVIEW_SPEC.md` and `_docs/CMS_API.md`.
- Do not log preview tokens or sample entry data in diagnostics.

## Cache Contract

Invalidation triggers:

- entry publish/unpublish/update/delete,
- content route update,
- detail page document update,
- form referenced by detail page update,
- listing/query/template changes used by related sections.

Owner split:

- `core/site/cache/siteCache.ts` remains the shared owner of normalized public
  path invalidation helpers such as `invalidateSiteCachePath(...)` and
  `invalidateContentEntryCache(...)`.
- Mutation owners reuse those shared helpers when they change public detail
  output:
  - current entry/post/page owner seams for entry-like publish/update/delete
    behavior,
  - current settings/content-route owner seam for route mutations,
  - current and future detail-page document/admin owner seams for detail-page
    save/publish/unpublish/delete,
  - current form/listing query/listing template owner seams when their persisted
    data affects rendered detail-page sections.
- Detail-page preview/admin routes must reuse those owner-hook seams instead of
  introducing a second route-local invalidation flow or cache registry.

Pseudocode:

```ts
export async function invalidateDetailPageCacheForEntry(entry) {
  const routes = await getContentRoutesForType(entry.typeSlug);
  for (const route of routes) {
    invalidateSiteCachePath(resolveDetailPath(route.detailPath, entry));
  }
}
```

## Security Contract

- Visibility: public read preview/cache behavior.
- Auth model: preview token only for draft preview.
- RBAC: no public write.
- CSRF: not applicable.
- Rate-limit bucket: `public_read`.
- Reject-unknown validation: preview query is strict.
- Anti-abuse:
  - cache keys derive from normalized safe paths only,
  - `type=content` preview cannot be used as a side channel to render
    unpublished detail-page drafts,
  - detail-template draft preview requires the dedicated detail-page preview
    token issued from the internal admin flow.
- Secret handling: preview/cache diagnostics cannot log tokens or secret fields.

## Testing Requirements

- Valid content preview token renders the previewed entry through the composed
  detail-page pipeline, but only against a published detail-page document when
  `detailPageId` is provided.
- Valid detail-page preview token renders `current_document` with a selected
  published sample entry from server-issued preview context.
- Preview token context normalization rejects malformed `detail-page` payloads.
- `previewService.test.ts` covers the new `detail-page` target type plus strict
  `preview_tokens.context` normalization on the existing shared preview-token
  seam.
- `previewService.test.ts` also covers the widened shared token-validation
  outcome used to distinguish `expired` from `missing` without route-local
  duplication.
- `previewUrls.test.ts` covers shared URL building for
  `/preview?type=detail-page&token=...` through the existing preview URL helper
  rather than a route-local formatter.
- DB migration artifacts exist for the preview-token context column.
- Detail-page preview with a draft sample entry and no content preview token
  returns `404`.
- Entry preview with `detailPageId` verifies the detail page belongs to the
  entry content type.
- Entry preview with `detailPageId` accepts only published detail-page
  documents; unpublished/draft detail pages return `404`.
- Entry preview token alone cannot render `current_document` of a detail-page
  draft; that path requires the dedicated `type=detail-page` preview token.
- Expired token returns `410`.
- Preview disabled returns `404`.
- Public cache invalidates when entry/detail document changes.
- Query params bypass cache where current public page runtime expects that.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
