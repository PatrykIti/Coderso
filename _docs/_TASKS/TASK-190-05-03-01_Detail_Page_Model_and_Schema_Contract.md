# TASK-190-05-03-01: Detail Page Model and Schema Contract
# FileName: TASK-190-05-03-01_Detail_Page_Model_and_Schema_Contract.md

**Priority:** High
**Category:** Assistant/Core + Detail Page Contract
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-03
**Status:** To Do

---

## Overview

Define the versioned data model for composed public detail pages. This is the
source-of-truth contract for detail page documents before runtime rendering,
binding resolution, or action assembly exists.

The model must be strict, stable, backward compatible with current content
routes, and safe for open-source extension.

It is an assistant/admin-owned collection template resource, not a replacement
for the existing theme-file `content detail` template seam. Public runtime may
prefer this document when linked from a content route, but current content
template fallback must remain intact.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/content/detailPageTypes.ts`
- Add `core/services/content/detailPageSchema.ts`
- Add `tests/vitest/content/detailPageSchema.test.ts`
- Update `core/db/schema.ts`
- Add SQL migration for `detail_page_documents`
- Add SQL migration for `detail_page_revisions`
- Add Drizzle `meta/*_snapshot.json` and `meta/_journal.json` updates.

## Responsibility Boundary

- This leaf owns the detail-page document schema, persisted storage, revision
  history, and UUID-compatible id contract.
- If collection workspace / reuse matching later needs explicit detail-page-
  owned secondary-resource references or stable composition metadata, this leaf
  owns the schema/storage side of those fields inside `DetailPageDocument`.
- This leaf defines the shared `detailPageId` contract shape that later route
  linking must consume, but it does not own the settings/action/admin-client/UI/
  matcher round-trip implementation for that field.
- `TASK-190-05-03-07` is the single implementation owner for:
  - `settingsService.normalizeContentRoutes`,
  - `setting.content-route.upsert` input/execute behavior,
  - `siteSettingsClient` and Site Settings UI round-trip,
  - `contentRouteMatcher` route-match metadata.
- `TASK-190-05-03-04` remains the owner of preview-token storage/query
  semantics for detail-page preview.

## Data Contract

```ts
export type DetailPageDocument = {
  schemaVersion: 1;
  id: string;
  name: string;
  contentTypeId: string;
  contentTypeSlug: string;
  status: "draft" | "published";
  titlePattern: string;
  seo?: DetailPageSeo;
  settings: DetailPageSettings;
  blocks: DetailPageBlock[];
  bindings: DetailPageBinding[];
  related?: DetailRelatedSource[];
};
```

Storage contract:

```ts
detail_page_documents: {
  id,
  name,
  content_type_id,
  content_type_slug,
  status,
  current_document,
  published_document,
  created_at,
  updated_at,
  published_at
}

detail_page_revisions: {
  id,
  detail_page_id,
  version,
  kind,
  document,
  created_at,
  created_by
}
```

Rules:

- `current_document` stores the editable draft document.
- `published_document` stores the public runtime document.
- Public runtime reads `published_document` only.
- Preview reads `current_document` only through valid preview/admin context.
- `site.contentRoutes` can reference `detailPageId` for matching but does not
  own the document.
- `site.contentRoutes` remains the only runtime route owner; detail-page
  documents do not store canonical public route state in parallel.
- `ContentRouteSetting` must support an optional `detailPageId` as the shared
  route-link field consumed by later settings/action/runtime work:

```ts
type ContentRouteSetting = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};
```

- The later route-linking leaf must extend `setting.content-route.upsert`
  rather than replace it:
  - omitted `detailPageId` preserves the current route link,
  - `detailPageId: null` clears the link,
  - `detailPageId: "<id>"` sets/replaces the link.
- `contentRouteMatcher` is expected to surface `detailPageId` with detail route
  matches once `TASK-190-05-03-07` lands.
- Site Settings UI/client are expected to round-trip `detailPageId` once
  `TASK-190-05-03-07` lands.
- `detailPageId` is not a server-only extension, but the end-to-end
  settings/admin route-editor/action/matcher implementation belongs to
  `TASK-190-05-03-07`, not to this leaf.
- `DetailPageDocument.id`, persisted `detail_page_documents.id`, linked
  `site.contentRoutes.detailPageId`, and shared preview/storage targets must all
  stay on one UUID-compatible identifier contract.
- Because current shared storage such as `preview_tokens.target_id` is UUID-based
  today, this leaf treats UUID compatibility as part of the domain contract, not
  an implementation accident.
- Composer-created detail pages use stable deterministic UUID-compatible ids so
  later action assembly can link `site.contentRoutes.detailPageId` without
  waiting on an opaque DB-generated value. The default deterministic scheme is
  UUIDv5 (or equivalent deterministic UUID) derived from stable collection
  identity such as content type id + composition key/role.
- `contentTypeId` is the stable owner key for deterministic ids, joins, and
  reuse matching. `contentTypeSlug` remains a normalized route-facing copy and
  must not become the primary identity input because the content-type owner seam
  already allows slug updates.
- Manual admin create may generate a random UUID server-side, but the
  normalized id must be returned before any route-link mutation.
- `detailPageSchema.ts` plus the content-domain service layer own id validation
  and deterministic-id generation rules. Preview, route-linking, matcher, and
  admin/API slices consume that contract; they must not redefine id format
  locally.
- If explicit detail-page-owned secondary-resource references or stable
  composition metadata are needed for workspace/reuse flows, they must be added
  here as part of the detail-page document contract instead of being stored in
  workspace-only or matcher-only state.
- If a later change wants non-UUID detail-page ids, that change must explicitly
  widen the affected shared storage owners and migrations instead of silently
  drifting this contract.
- The service layer owns normalize/create/update/publish/unpublish helpers.
- Detail page documents follow the same history contract shape as Pages:
  - `kind = publish` for publish snapshots,
  - `kind = autosave` for the latest unsaved editor snapshot,
  - restore applies `current_document` and returns the detail page to draft,
  - discard is allowed only for autosave revisions,
  - retention uses the same min/max policy as Pages unless a later task
    explicitly changes it.

Normalization rules:

- `schemaVersion` must be `1`.
- `id` is UUID-compatible.
- composer-generated `id` is deterministic and UUID-compatible.
- `contentTypeId` must be a valid current content type id.
- `contentTypeSlug` must be a safe content type slug.
- `contentTypeSlug` must stay consistent with the linked `contentTypeId` at
  write/publish time; the slug is descriptive/route-facing data, not the stable
  identity key.
- `blocks[].id` must be unique across the tree.
- `bindings[].id` must be unique.
- `bindings[].blockId` must point to an existing block.
- `bindings[].propPath` uses the same safe dot-path string contract as current
  custom-screen bindings and cannot point to unsafe script/html props.
- `related[].limit` must be clamped.
- Unknown keys are rejected at every level.

## Security Contract

- Visibility: internal planning/storage contract plus public read runtime.
- Auth model: no route changes in this leaf.
- RBAC: model does not grant permissions.
- CSRF: not applicable in this leaf.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: all detail page model levels use strict
  normalization.
- Anti-abuse: ids and prop paths are strict; route linkage remains validated in
  the settings/content-route owner seam instead of a second route contract here.
- Public-write hardening: not applicable; no public write endpoint.
- Secret handling: secret-like field names are rejected or require explicit
  redaction metadata.

## Testing Requirements

- Valid document normalizes deterministically.
- Valid UUID-compatible detail-page ids normalize.
- Non-UUID-compatible detail-page ids reject unless this contract is explicitly
  widened in a later migration-owning task.
- DB migration artifacts are present and valid.
- Publish creates a `publish` revision and updates `published_document`.
- Autosave keeps only the latest autosave revision.
- Restore/discard revision semantics match the Pages revision contract.
- Unknown keys reject.
- Duplicate block ids reject.
- Binding to missing block rejects.
- Unsafe prop paths reject.
- Shared dot-path semantics stay compatible with the current custom-screen
  binding contract.
- Secret-like field binding rejects unless explicitly allowed as non-public.
- End-to-end settings/action/admin-client/UI/matcher round-trip for
  `detailPageId` is explicitly deferred to `TASK-190-05-03-07`; this leaf only
  defines the shared contract that slice must consume.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
