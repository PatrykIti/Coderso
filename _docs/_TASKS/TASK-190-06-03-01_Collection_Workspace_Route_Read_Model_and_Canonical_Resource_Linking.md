# TASK-190-06-03-01: Collection Workspace Route, Read Model, and Canonical Resource Linking
# FileName: TASK-190-06-03-01_Collection_Workspace_Route_Read_Model_and_Canonical_Resource_Linking.md

**Priority:** High
**Category:** Admin/UI + Collections + Read Model
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-02, TASK-190-05-03-07, TASK-190-06-02
**Status:** Done (2026-05-10)

---

## Overview

Add the collection workspace route and aggregated read model, with explicit
rules for resolving canonical collection resources versus linked secondary
resources.

This slice exists to stop the workspace from silently guessing by names or slug
prefixes. The workspace should surface deterministic links first and return
`unresolved` / `candidates[]` when the repo does not yet have enough
information to pick one canonical resource safely.

This task is now a small program, not one implementation leaf. It still owns
the workspace route/read-model outcome, but the work is split so we do not mix:

- route registration plus server summary assembly,
- canonical resolution plus owner-read/redaction rules,
- client cache/prefetch/UI shell

into one oversized slice.

## Sub-Tasks

- `TASK-190-06-03-01-01_Collection_Workspace_Route_and_Server_Read_Model.md` -
  done: internal collection workspace route/read model is registered and returns
  bounded canonical/unresolved/candidate buckets.
- `TASK-190-06-03-01-02_Collection_Workspace_Canonical_Resolution_and_Read_Permissions.md` -
  done: canonical route/detail/list/listing/admin-screen links now resolve from
  owner seams with unresolved candidates and owner-read redaction.
- `TASK-190-06-03-01-03_Collection_Workspace_Client_Cache_Prefetch_and_UI_Shell.md` -
  done: cached content-types client helpers, specific Engine prefetch warmup,
  and first workspace route shell now hydrate the server-owned summary.

## Files to Change

- Add `core/services/content/collectionWorkspaceService.ts`
- Update `core/server/routes/contentTypeRoutes.ts`
- Add server validation for the collection workspace response only if the repo
  keeps route-level response schemas in a dedicated helper
- Update `core/admin/services/contentTypesClient.ts`
- Update `core/admin/services/cachePolicy.ts`
- Update `core/admin/utils/adminPrefetch.ts`
- Update `tests/perf/admin-prefetch-budget.test.ts` if the shared prefetch matcher
  semantics change to prefer the most specific route
- Add `core/admin/ui/content-types/CollectionWorkspacePage.tsx`
- Add `core/admin/ui/content-types/CollectionOverview.tsx`
- Add `core/admin/ui/content-types/CollectionReadinessChecklist.tsx`
- Update `core/admin/app/AdminApp.tsx`
- Update `core/admin/utils/adminPaths.ts`
- Update `core/admin/ui/navigation/sidebarConfig.ts` only if existing Engine
  helpers need a canonical workspace link helper
- Update current page owner seams only if explicit persisted canonical
  list-page/supporting-resource linkage is missing today; keep that ownership in
  `TASK-190-05-02` / page-owned contracts rather than
  `collectionWorkspaceService.ts`
- Consume the exact `collectionRole` / `compositionKey` fields from
  `TASK-190-06-02` / current custom-screen schema-service-client contracts for
  canonical admin-screen resolution
- Update current detail-page owner seams only if explicit persisted secondary
  references are needed beyond route-level `detailPageId` linkage; land those
  fields in `TASK-190-05-03-01` / `TASK-190-05-03-07` / current detail-page
  service-client contracts
- Update `tests/integration/routes/contentTypes.test.ts`
- Update `tests/vitest/admin/contentTypesClient.test.ts`
- Update `tests/vitest/admin/adminPrefetch.test.ts`
- Add `tests/vitest/ui/collection-workspace.test.tsx`

Reuse rule:

- The bounded collection workspace summary is server-owned and hangs off the
  existing content-type route family; client access extends
  `contentTypesClient.ts` instead of introducing a parallel `collectionsClient.ts`
  wrapper or a client-side scatter-gather fallback.
- `contentTypesClient.ts` owns only client-side read caching/hydration for that
  server-owned summary. It must follow the current admin cache contract
  (`localStorage` cache + background revalidation + `cacheBus` events), not a
  workspace-only fetch/cache transport.
- `CollectionWorkspacePage.tsx` owns route-level background refresh,
  `subscribeCacheEvents(...)` handling, and `remoteUpdatePending` style UX
  state for this route, matching current Page / Custom Screen / Widget Template
  editor patterns; `contentTypesClient.ts` must not absorb that UI orchestration
  responsibility.
- `cachePolicy.ts` owns the workspace cache key under the existing content-type
  family, for example `contentTypes:collectionWorkspace:<contentTypeId>`, so
  the workspace extends current `Engine` ownership instead of creating a
  parallel top-level `collections:*` cache namespace.
- manual and assistant mutation owners may invalidate that existing workspace
  cache key through their current client/cache seams, but they do not become
  second read-model owners or reconstruct the workspace summary outside the
  server-owned read endpoint.
- `contentTypesClient.ts` exposes narrow helpers such as
  `getContentTypeCollectionWorkspace(...)` /
  `getContentTypeCollectionWorkspaceCached(...)` and aggregates existing read
  owners such as `siteSettingsClient`, `pagesClient`, `listingsClient`,
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
  seams; `contentTypesClient.ts` workspace helpers must not become a
  centralized mutation broker.
- `adminPrefetch.ts` remains the owner of route warmup. The new
  `/advanced/engine/:contentTypeId/collection` route must extend the existing
  Engine prefetch family through that shared helper, not route-local hover
  hooks or page-level effect fetches.
- Because current `createAdminPrefetcher(...)` picks the first matching prefix,
  this leaf must ensure the workspace route does not collapse into the generic
  `/advanced/engine` warmup path. The implementation must either:
  - register a more specific workspace prefetch entry ahead of the generic
    Engine entry, or
  - teach `adminPrefetch.ts` to prefer the most specific matching route.
- Do not assume that simply appending a new workspace entry is enough under the
  current prefix-match implementation.

Owner rule:

- `collectionWorkspaceService.ts` owns aggregated read-model assembly and
  deterministic resolution only.
- `contentTypeRoutes.ts` owns the server read endpoint only.
- `contentTypesClient.ts` owns cached read-through access only, and
  `CollectionWorkspacePage.tsx` owns route-local refresh/pending UX only; neither
  becomes a second canonical-link resolver or persistence owner.
- `site.contentRoutes` remains the owner of:
  - canonical route row selection by content type,
  - `detailPageId` linkage,
  - validation/round-trip through settings service, Site Settings UI/client, and
    `setting.content-route.upsert`.
- The page owner seam (`page.upsert` / `page.update` / page service / page admin
  editor) owns persisted canonical list-page linkage and any page-level explicit
  references to listing query/template or supporting resources. The concrete
  page-owned seam is `PageData.settings.collectionLink` from
  `TASK-190-05-02`. If those fields do not exist yet, they must land there
  before this leaf consumes them.
- The detail-page owner seam (`detail-page.upsert` / detail-page document
  service / detail-page admin client) owns persisted references declared inside
  detail-page documents. If extra secondary-resource metadata is needed, it must
  land through `TASK-190-05-03-01` / `TASK-190-05-03-07` before this leaf
  consumes it.
- The custom-screen owner seam owns any explicit `collectionRole`,
  `compositionKey`, and related canonical screen-link metadata needed to resolve
  a canonical admin screen safely. `TASK-190-06-02` has landed those exact
  fields through the current custom-screen schema/service/client/action/storage
  contract; this leaf consumes them read-only.
- The workspace service must only read these owner contracts. It must never
  invent, persist, or backfill canonical links in browser cache, local state, or
  route-local helpers.
- If owner-contract extensions are needed, they must land physically in those
  owner seams first and then be consumed by `collectionWorkspaceService.ts`;
  the workspace slice does not get to "temporarily" own that metadata.

## Canonical Resource Linking Contract

Workspace root:

```text
/admin/advanced/engine/:contentTypeId/collection
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
   - if no canonical `detailPageId` link exists yet, the workspace may still
     expose bounded detail-page candidates for the same collection content
     type, but it must keep `canonical.detailPage = null` and return
     `unresolved` + `candidates.detailPages` until the current owner seams link
     one document explicitly through `site.contentRoutes.detailPageId`.
3. Public list/landing page:
   - canonical list page is the public page explicitly linked by the current
     collection setup contract, not the hidden runtime listing endpoint itself,
   - preferred source of truth is explicit persisted collection-link metadata in
     `PageData.settings.collectionLink` from `TASK-190-05-02`, not
     workspace-only state,
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
   - first read explicit references from the canonical public page contract,
     especially `PageData.settings.collectionLink.listingQueryId` /
     `listingTemplateId`,
   - the canonical page owner seam is authoritative for page-attached
     listing-query / listing-template references,
   - if the current page contract still cannot express a needed page-owned link
     deterministically, extend `PageData.settings.collectionLink` or the
     current page/widget contract rather than add workspace-only mapping state,
   - if no explicit reference exists, allow only deterministic fallback:
     - one matching listing query for the content type,
     - one matching listing template referenced by the canonical public page,
   - otherwise return `unresolved` plus bounded candidates.
5. Admin screen:
  - canonical admin screen may resolve from explicit stable metadata on the
     custom-screen owner seam from `TASK-190-06-02` first,
   - only if that metadata is absent on older rows, canonical admin screen may
     resolve when exactly one screen is a safe deterministic match for the
     collection content type and workspace role;
     otherwise return `unresolved` plus bounded candidates.
6. Forms/CTA and supporting pages:
   - derive from canonical page/detail-template references first,
   - when current owner contracts do not yet carry enough deterministic links,
     extend the current page/detail-page/custom-screen owner seams with explicit
     collection-link metadata under those seams,
   - do not guess from slug prefixes or title similarity alone.

Rules:

- never guess canonical resources from naming heuristics when multiple matches
  exist,
- public list-page resolution must prefer explicit persisted links; the
  detail-route-prefix fallback above is compatibility-only and must bail out to
  `unresolved` on the first sign of ambiguity,
- workspace resolution must never silently promote a compatibility fallback into
  persisted canonical metadata,
- hidden runtime list endpoints and public landing pages remain separate
  resources in the workspace read model when the current blueprint contract
  keeps them separate,
- bounded detail-page candidates are compatibility/read-model data only; they
  support manual selection/follow-up flows, but they do not become canonical
  and must not be persisted from the workspace layer outside the existing
  route/detail-page owner seams,
- supporting pages, editorial/proof/case-study resources, and SEO remain in
  scope, but they must arrive through explicit persisted links or owner-contract
  extensions rather than workspace-only heuristics,
- bounded media candidates for the collection may be exposed when the media
  owner can provide safe summaries. They support follow-up prompts such as
  adding existing gallery assets to entries/detail/page widgets, but they are not
  canonical links and must not include raw bytes, signed URLs, upload tokens, or
  asset-delete authority,
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
    media: ...[];
    pages: ...[];
    seoDocuments: ...[];
    screens: ...[];
  };
  unresolved: string[];
  candidates: {
    pages: ...[];
    detailPages: ...[];
    listingQueries: ...[];
    listingTemplates: ...[];
    media: ...[];
    adminScreens: ...[];
  };
};
```

## Security Contract

- Visibility: internal admin read model only.
- Auth model: authenticated admin session.
- RBAC:
  - the host route remains under the existing content-type route family and
    therefore requires `content:read` at minimum,
  - the server-owned workspace loader must enforce owner-read parity before it
    materializes linked slices from other seams instead of treating the host
    route permission as sufficient for everything,
  - concrete owner-read expectations stay explicit:
    - `settings:read` for canonical `site.contentRoutes` row data and
      route-derived collection link fields,
    - `forms:read` for linked form summaries,
    - `media:read` for bounded media summaries when the workspace exposes
      existing gallery/asset candidates,
    - `content:read` for content types, pages, listings, detail pages, custom
      screens, and SEO summaries that already sit in the content-owned admin
      families,
  - if the actor lacks one of those owner reads, the workspace must redact or
    mark that slice `unresolved` instead of broadening permissions or leaking
    the underlying resource payload.
- CSRF: not applicable to read-only requests.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: aggregated payload is strict.
- Anti-abuse: bounded candidates only; no raw blocks, bindings, preview tokens,
  or secret-bearing settings in the workspace summary.
- Secret handling: reuse existing redaction/bounded-catalog rules.

## Testing Requirements

- workspace route registers under the existing Engine family.
- `contentTypesClient` resolves collection-workspace reads under the current
  content-type service family and does not introduce a parallel `collections`
  client namespace.
- `contentTypesClient` resolves canonical route/detail/list resources
  deterministically from one server-owned collection workspace summary instead
  of inventing a parallel lookup flow in the browser.
- `contentTypesClient` uses the current admin cache contract with a dedicated
  workspace cache key under the existing content-type family plus
  background-revalidation and cache-bus invalidate/update handling.
- `adminPrefetch.ts` keeps workspace warmup inside the existing Engine prefetch
  seam; no route-local prefetch flow is introduced for the collection route.
- Workspace route warmup resolves through a specific workspace prefetch match and
  does not get swallowed by the broader `/advanced/engine` prefix entry under the
  current `adminPrefetch.ts` matcher.
- route tests cover the owner-read bundle explicitly: `content:read` for the
  host route plus `settings:read` / `forms:read` / `media:read` gated slices
  where the workspace summary includes those owner families.
- if `createAdminPrefetcher(...)` changes matching semantics to prefer the most
  specific route, extend the existing perf gate in
  `tests/perf/admin-prefetch-budget.test.ts` so the new matcher still stays
  inside the current hover-burst request budget.
- canonical public list page prefers explicit collection linkage; the
  detail-route-prefix fallback is compatibility-only for current catalog-family
  presets and must return `unresolved` when multiple or non-exact candidates
  exist.
- `collectionWorkspaceService.ts` reads canonical links from current owner seams
  and never persists or backfills inferred links on its own.
- if canonical list-page linkage or page-level listing refs are needed, they
  round-trip through `TASK-190-05-02` / current page owner seams before the
  workspace consumes them.
- canonical list-page / page-level listing references round-trip through
  `PageData.settings.collectionLink` in the page owner seam before the
  workspace consumes them; they are not browser-only annotations.
- if canonical screen-link fields are needed, they round-trip through exact
  `collectionRole` / `compositionKey` fields from `TASK-190-06-02` / current
  custom-screen owner seams before the workspace consumes them.
- if extra detail-page secondary-resource metadata is needed, it round-trips
  through `TASK-190-05-03-01` / `TASK-190-05-03-07` / current detail-page owner
  seams before the workspace consumes it.
- if no canonical route link exists yet and multiple bounded detail-page
  documents exist for the same content type, the workspace returns
  `unresolved` + bounded `candidates.detailPages` rather than guessing a
  canonical template or persisting a workspace-local link.
- page/listing query/template/admin screen return `unresolved` + `candidates`
  when multiple plausible matches exist.
- forms/secondary pages/editorial/proof/SEO links come from explicit canonical
  resource references or owner-contract extensions, not slug-prefix guessing.
- media candidates are exact-id/selectable summaries only; ambiguous filename
  matches stay candidate/needs-input and raw upload details never appear in the
  workspace payload.
- workspace summary stays bounded and redacted.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
