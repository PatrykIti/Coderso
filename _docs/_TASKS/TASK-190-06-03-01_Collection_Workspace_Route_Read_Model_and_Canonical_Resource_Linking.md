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

- Add `core/services/content/collectionWorkspaceService.ts`
- Update `core/server/routes/contentTypeRoutes.ts`
- Add server validation for the collection workspace response only if the repo
  keeps route-level response schemas in a dedicated helper
- Add `core/admin/services/collectionsClient.ts`
- Update `core/admin/services/cachePolicy.ts`
- Add `core/admin/ui/collections/CollectionWorkspacePage.tsx`
- Add `core/admin/ui/collections/CollectionOverview.tsx`
- Add `core/admin/ui/collections/CollectionReadinessChecklist.tsx`
- Update `core/admin/app/AdminApp.tsx`
- Update `core/admin/utils/adminPaths.ts`
- Update `core/admin/ui/navigation/sidebarConfig.ts` only if existing Engine
  helpers need a canonical workspace link helper
- Update `tests/integration/routes/contentTypes.test.ts`
- Add `tests/vitest/admin/collectionsClient.test.ts`
- Add `tests/vitest/ui/collection-workspace.test.tsx`

Reuse rule:

- The bounded collection workspace summary is server-owned and hangs off the
  existing content-type route family; `collectionsClient.ts` is a wrapper over
  that read model endpoint, not a client-side scatter-gather fallback.
- `collectionsClient.ts` owns only client-side read caching/hydration for that
  server-owned summary. It must follow the current admin cache contract
  (`localStorage` cache + background revalidation + `cacheBus` events), not a
  workspace-only fetch/cache transport.
- `cachePolicy.ts` owns the workspace cache key under the existing content-type
  family, for example `contentTypes:collectionWorkspace:<contentTypeId>`, so
  the workspace extends current `Engine` ownership instead of creating a
  parallel top-level `collections:*` cache namespace.
- `collectionsClient.ts` aggregates existing read owners such as
  `contentTypesClient`, `siteSettingsClient`, `pagesClient`, `listingsClient`,
  `customScreensClient`, and later `detailPagesClient` through one existing
  server-owned read model.
- The workspace read model extends those contracts; it does not create a second
  CRUD/read owner for pages, routes, listings, screens, or detail templates.
- If current owner contracts do not yet persist enough deterministic collection
  linkage for secondary resources, extend those contracts with explicit stable
  metadata instead of narrowing product scope or guessing in the workspace.
- Mutation owners that already know a collection/content-type identity
  (site-settings routes, listings, custom screens, detail pages, etc.) remain
  responsible for invalidating the workspace cache key under their current owner
  seams; `collectionsClient.ts` must not become a centralized mutation broker.

## Canonical Resource Linking Contract

Workspace root:

```text
/admin/coderso/engine/:contentTypeId/collection
```

Server-owned read endpoint:

```text
GET /admin/api/content-types/:id/collection-workspace
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
3. Public list/landing page:
   - canonical list page is the public page explicitly linked by the current
     collection setup contract, not the hidden runtime listing endpoint itself,
   - preferred source of truth is explicit persisted collection-link metadata on
     the current owner seam,
   - compatibility fallback for current catalog-family packs is allowed only
     when all of the following are true:
     - the current collection setup uses the known hidden-list pattern
       (`site.contentRoutes.listPath` under `/_catalog/*`),
     - the public detail route prefix (`detailPath` without the trailing
       `/:slug`) resolves to exactly one public page slug candidate,
     - there is no competing explicit link metadata and no second plausible
       public page candidate,
   - this prefix-based fallback is a temporary bridge for today's shipped
     catalog-family presets, not a new general canonical-link heuristic,
   - if any of those conditions fail, return `unresolved` plus bounded
     candidates instead of guessing,
   - do not treat `site.contentRoutes.listPath` as the canonical public page
     slug.
4. Listing query/template:
   - first read explicit references from the canonical public page data/block
     contract,
   - if no explicit reference exists, allow only deterministic fallback:
     - one matching listing query for the content type,
     - one matching listing template referenced by the canonical public page,
   - otherwise return `unresolved` plus bounded candidates.
5. Admin screen:
   - canonical admin screen may resolve only when exactly one screen is a safe
     deterministic match for the collection content type and workspace role;
     otherwise return `unresolved` plus bounded candidates.
6. Forms/CTA and supporting pages:
   - derive from canonical page/detail-template references first,
   - when current owner contracts do not yet carry enough deterministic links,
     extend those contracts with explicit collection-link metadata under the
     current owner seam,
   - do not guess from slug prefixes or title similarity alone.

Rules:

- never guess canonical resources from naming heuristics when multiple matches
  exist,
- public list-page resolution must prefer explicit persisted links; the
  detail-route-prefix fallback above is compatibility-only and must bail out to
  `unresolved` on the first sign of ambiguity,
- hidden runtime list endpoints and public landing pages remain separate
  resources in the workspace read model when the current blueprint contract
  keeps them separate,
- supporting pages, editorial/proof/case-study resources, and SEO remain in
  scope, but they must arrive through explicit persisted links or owner-contract
  extensions rather than workspace-only heuristics,
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
    pages: ...[];
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
  deterministically from one server-owned collection workspace summary instead
  of inventing a parallel lookup flow in the browser.
- `collectionsClient` uses the current admin cache contract with a dedicated
  workspace cache key under the existing content-type family plus
  background-revalidation and cache-bus invalidate/update handling.
- canonical public list page prefers explicit collection linkage; the
  detail-route-prefix fallback is compatibility-only for current catalog-family
  presets and must return `unresolved` when multiple or non-exact candidates
  exist.
- page/listing query/template/admin screen return `unresolved` + `candidates`
  when multiple plausible matches exist.
- forms/secondary pages/editorial/proof/SEO links come from explicit canonical
  resource references or owner-contract extensions, not slug-prefix guessing.
- workspace summary stays bounded and redacted.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
