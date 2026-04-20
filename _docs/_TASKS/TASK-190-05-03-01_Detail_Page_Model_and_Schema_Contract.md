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

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintDetailPageTypes.ts`
- Add `core/services/assistant/blueprints/blueprintDetailPageSchema.ts`
- Add `tests/vitest/assistant/blueprint-detail-page-schema.test.ts`
- Update `core/db/schema.ts`
- Add SQL migration for `detail_page_documents`
- Add Drizzle `meta/*_snapshot.json` and `meta/_journal.json` updates.
- Update `core/services/settings/settingsService.ts` only to support safe route
  references to detail page documents, not to store full documents in settings.

## Data Contract

```ts
export type DetailPageDocument = {
  schemaVersion: 1;
  id: string;
  name: string;
  contentTypeSlug: string;
  routePattern: string;
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
  route_pattern,
  status,
  current_document,
  published_document,
  created_at,
  updated_at,
  published_at
}
```

Rules:

- `current_document` stores the editable draft document.
- `published_document` stores the public runtime document.
- Public runtime reads `published_document` only.
- Preview reads `current_document` only through valid preview/admin context.
- `site.contentRoutes` can reference `detailPageId` for matching but does not
  own the document.
- The service layer owns normalize/create/update/publish/unpublish helpers.

Normalization rules:

- `schemaVersion` must be `1`.
- `id` is stable and deterministic for composer output.
- `contentTypeSlug` must be a safe content type slug.
- `routePattern` must be a safe relative route and contain `:slug` or `:id`.
- `blocks[].id` must be unique across the tree.
- `bindings[].id` must be unique.
- `bindings[].blockId` must point to an existing block.
- `bindings[].propPath` must be a non-empty path and cannot point to unsafe
  script/html props.
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
- Anti-abuse: route patterns and prop paths are safe-relative and allowlisted.
- Public-write hardening: not applicable; no public write endpoint.
- Secret handling: secret-like field names are rejected or require explicit
  redaction metadata.

## Testing Requirements

- Valid document normalizes deterministically.
- DB migration artifacts are present and valid.
- Unknown keys reject.
- Duplicate block ids reject.
- Binding to missing block rejects.
- Unsafe route patterns reject.
- Unsafe prop paths reject.
- Secret-like field binding rejects unless explicitly allowed as non-public.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
