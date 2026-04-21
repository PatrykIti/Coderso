# TASK-190-06-03-01: Collection Workspace Route, Read Model, and Canonical Resource Linking
# FileName: TASK-190-06-03-01_Collection_Workspace_Route_Read_Model_and_Canonical_Resource_Linking.md

**Priority:** High
**Category:** Admin/UI + Collections + Read Model
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-07, TASK-190-06-01
**Status:** To Do

---

## Overview

Add the collection workspace route and aggregated read model, with explicit
rules for resolving canonical collection resources versus linked secondary
resources.

This slice exists to stop the workspace from silently guessing by names or slug
prefixes. The workspace should surface deterministic links first and return
`unresolved` / `candidates[]` when the repo does not yet have enough
information to pick one canonical resource safely.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/admin/services/collectionsClient.ts`
- Add `core/admin/ui/collections/CollectionWorkspacePage.tsx`
- Add `core/admin/ui/collections/CollectionOverview.tsx`
- Add `core/admin/ui/collections/CollectionReadinessChecklist.tsx`
- Update `core/admin/app/AdminApp.tsx`
- Update `core/admin/utils/adminPaths.ts`
- Update `core/admin/ui/navigation/sidebarConfig.ts` only if existing Engine
  helpers need a canonical workspace link helper
- Add `tests/vitest/admin/collectionsClient.test.ts`
- Add `tests/vitest/ui/collection-workspace.test.tsx`

## Canonical Resource Linking Contract

Workspace root:

```text
/admin/coderso/engine/:contentTypeId/collection
```

The aggregated read model must distinguish:

- `canonical`
- `linkedSecondary`
- `unresolved`
- `candidates`

Deterministic resolution order:

1. Content route:
   - canonical route row is the `site.contentRoutes` row whose `type` equals
     the collection content type slug.
2. Detail template:
   - canonical detail template is the document referenced by
     `site.contentRoutes.detailPageId`.
3. List page:
   - canonical list page is the `pages` record whose `slug` exactly equals the
     canonical route `listPath`.
4. Listing query/template:
   - first read explicit references from the canonical list page data/block
     contract,
   - if no explicit reference exists, allow only deterministic fallback:
     - one matching listing query for the content type,
     - one matching listing template referenced by the canonical list page,
   - otherwise return `unresolved` plus bounded candidates.
5. Admin screen:
   - canonical admin screen may resolve only when exactly one screen is a safe
     deterministic match for the collection content type and workspace role;
     otherwise return `unresolved` plus bounded candidates.
6. Forms/CTA and supporting pages:
   - derive from canonical page/detail-template references first,
   - do not guess from slug prefixes or title similarity alone.

Rules:

- never guess canonical resources from naming heuristics when multiple matches
  exist,
- unresolved tabs stay visible and explain what link is missing,
- candidate lists stay bounded and redacted.

## Read Model Shape

```ts
type CollectionWorkspaceSummary = {
  contentType: {...};
  canonical: {
    route: ... | null;
    listPage: ... | null;
    detailPage: ... | null;
    listingQuery: ... | null;
    listingTemplate: ... | null;
    adminScreen: ... | null;
  };
  linkedSecondary: {
    forms: ...[];
    pages: ...[];
    seoDocuments: ...[];
    screens: ...[];
  };
  unresolved: string[];
  candidates: {
    listingQueries: ...[];
    listingTemplates: ...[];
    adminScreens: ...[];
  };
};
```

## Security Contract

- Visibility: internal admin read model only.
- Auth model: authenticated admin session.
- RBAC: workspace read model requires the same read permissions as the
  underlying resources.
- CSRF: not applicable to read-only requests.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: aggregated payload is strict.
- Anti-abuse: bounded candidates only; no raw blocks, bindings, preview tokens,
  or secret-bearing settings in the workspace summary.
- Secret handling: reuse existing redaction/bounded-catalog rules.

## Testing Requirements

- workspace route registers under the existing Engine family.
- `collectionsClient` resolves canonical route/detail/list resources
  deterministically.
- canonical list page uses exact `slug === listPath`, not fuzzy matching.
- listing query/template/admin screen return `unresolved` + `candidates` when
  multiple plausible matches exist.
- forms/secondary pages are derived from explicit canonical resource references,
  not slug-prefix guessing.
- workspace summary stays bounded and redacted.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
