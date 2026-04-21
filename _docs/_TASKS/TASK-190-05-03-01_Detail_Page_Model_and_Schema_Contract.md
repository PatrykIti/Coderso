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
- Update `core/services/settings/settingsService.ts` only to support safe route
  references to detail page documents, not to store full documents in settings.
- Update `core/services/assistant/actionPlanTypes.ts` and
  `actionPlanSchema.ts` for `setting.content-route.upsert.detailPageId`.
- Update `core/services/assistant/actionFamilyContracts.ts` for the expanded
  `setting.content-route.upsert` input contract.
- Update `core/admin/services/siteSettingsClient.ts` so `detailPageId`
  survives admin read/write round-trips.
- Update `core/admin/ui/site/siteSettingsValidation.ts`
- Update `core/admin/ui/site/SiteRouteEditor.tsx`
- Update `core/admin/ui/site/SiteSettingsPage.tsx`
- Update `tests/unit/settings/contentRoutesValidation.test.ts`
- Update `tests/unit/site/contentRouteMatcher.test.ts`
- Update `tests/vitest/admin/siteSettingsClient.test.ts`
- Update `tests/vitest/ui/site-settings.test.tsx`
- Update `tests/vitest/ui/plugin-media-site-leaf.test.tsx`

## Data Contract

```ts
export type DetailPageDocument = {
  schemaVersion: 1;
  id: string;
  name: string;
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
- `ContentRouteSetting` must preserve `detailPageId` through settings
  normalization, admin client reads/writes, and route matching:

```ts
type ContentRouteSetting = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};
```

- `setting.content-route.upsert` stays the current route action and is extended
  rather than replaced:
  - omitted `detailPageId` preserves the current route link,
  - `detailPageId: null` clears the link,
  - `detailPageId: "<id>"` sets/replaces the link.
- `contentRouteMatcher` returns `detailPageId` with detail route matches.
- Site Settings UI/client round-trips `detailPageId` without dropping it.
- `detailPageId` is part of the settings/admin route-editor contract, not a
  server-only extension; the owner set includes settings normalization, admin
  client serialization, route-editor form state, and route matching.
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
  identity such as content type slug + composition key/role.
- Manual admin create may generate a random UUID server-side, but the
  normalized id must be returned before any route-link mutation.
- `detailPageSchema.ts` plus the content-domain service layer own id validation
  and deterministic-id generation rules. Preview, route-linking, matcher, and
  admin/API slices consume that contract; they must not redefine id format
  locally.
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
- `contentTypeSlug` must be a safe content type slug.
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
- `ContentRouteSetting.detailPageId` normalizes and round-trips through
  settings service, `siteSettingsClient`, Site Settings UI form state, and
  route-editor validation helpers.
- `setting.content-route.upsert` schema and action-family metadata accept
  optional `detailPageId` without dropping it from normalized plan input;
  preserve/clear execute semantics are owned by `TASK-190-05-03-07`.
- `contentRouteMatcher` exposes `detailPageId` for runtime detail resolution.
- Unknown keys reject.
- Duplicate block ids reject.
- Binding to missing block rejects.
- Unsafe prop paths reject.
- Shared dot-path semantics stay compatible with the current custom-screen
  binding contract.
- Secret-like field binding rejects unless explicitly allowed as non-public.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
