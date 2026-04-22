# TASK-190-05-03: Detail Page Composition and Content Route Sections
# FileName: TASK-190-05-03_Detail_Page_Composition_and_Content_Route_Sections.md

**Priority:** High
**Category:** Assistant/Core + Public Runtime + Page Sections
**Estimated Effort:** Very Large
**Dependencies:** TASK-190-05-01, TASK-190-05-02
**Status:** To Do

---

## Overview

Introduce the full foundation contract for composed public detail pages.

This is not a future/gated metadata note. The composer must be able to produce
two public surfaces for catalog-like outcomes:

- list/landing page: filters, listing cards, lead CTA, intro sections,
- detail page: page-builder-like sections bound to one content entry.

The runtime must render detail pages with the same level of visual control as
normal Pages, while preserving the current CMS safety model: strict schemas,
typed actions, reviewed execution, public read-only rendering, existing form
hardening, and no provider-defined payloads.

This unlocks proper Mabudo-like/product/service/portfolio detail pages instead
of generic entry detail output.

This is not only a theme-template concern. The business scope is still
assistant-composed site/service setup from a complex prompt, including content
models, public pages, routes, inquiry modules, and admin surfaces. Detail pages
are one resource inside that broader setup.

Current `content` list/detail templates remain important here, but only as the
existing runtime presentation seam. TASK-190 should reuse and extend that seam
for collection-owned detail documents instead of creating a second unrelated
detail rendering system.

## Sub-Tasks

- `TASK-190-05-03-01_Detail_Page_Model_and_Schema_Contract.md`
- `TASK-190-05-03-02_Detail_Page_Bindings_and_Field_Resolver.md`
- `TASK-190-05-03-03_Detail_Page_Runtime_Renderer_and_Route_Resolution.md`
- `TASK-190-05-03-04_Detail_Page_Preview_Cache_and_Invalidation.md`
- `TASK-190-05-03-05_Detail_Page_Action_Schema_and_Executor_Adapter.md`
- `TASK-190-05-03-06_Detail_Page_Composer_Fixtures_and_Runtime_Acceptance.md`
- `TASK-190-05-03-07_Detail_Page_Route_Linking_and_Internal_Admin_API.md`
- `TASK-190-05-03-08_Detail_Page_Generic_Assistant_Resource_Integration.md`

## Product Contract

Detail pages become a first-class public surface owned by the blueprint composer.

Required user-facing outcomes:

- house project detail pages can render hero, gallery, specs, price/packages,
  inquiry form, related projects, FAQ, and editorial/help sections,
- product detail pages can render gallery, price/specs, inquiry CTA, related
  products, and supporting content,
- service detail pages can render offer overview, packages, process, proof,
  inquiry/booking CTA, FAQ, and related services,
- portfolio/case-study detail pages can render challenge, solution, result,
  gallery, testimonial, CTA, and related case studies.

The detail page contract must be beginner-friendly and composite-first. It
should not expose loose arbitrary block bindings to users. The composer owns the
schema-first detail page document and turns it into validated widget blocks.

## Contract Shape

Add a detail page authoring document that is linked from `site.contentRoutes`,
owned by the assistant/admin setup flow, and resolved by the existing public
content detail runtime. The document owns public-detail composition data, but it
does not become a second runtime route registry; runtime path ownership remains
in `site.contentRoutes` through `detailPageId`.

```ts
type DetailPageDocument = {
  schemaVersion: 1;
  id: string;
  name: string;
  contentTypeId: string;
  contentTypeSlug: string;
  status: "draft" | "published";
  titlePattern: string;
  seo?: {
    titlePattern?: string;
    descriptionField?: string;
    imageField?: string;
  };
  settings: {
    template: string;
    layout: DetailPageLayoutSettings;
  };
  blocks: DetailPageBlock[];
  bindings: DetailPageBinding[];
  related?: DetailRelatedSource[];
};

type DetailPageBlock = {
  id: string;
  type: string;
  variant?: string;
  data: Record<string, unknown>;
  slots?: Record<string, DetailPageBlock[]>;
  visibility?: {
    enabled: boolean;
    devices: Array<"desktop" | "tablet" | "mobile">;
  };
};

type DetailPageBinding = {
  id: string;
  blockId: string;
  propPath: string;
  source:
    | { kind: "entry-field"; field: string }
    | { kind: "entry-meta"; field: "title" | "slug" | "publishedAt" | "author" }
    | { kind: "computed"; resolver: "detailHref" | "relatedItems" | "formContext" };
  fallback?: string | number | boolean | null | Record<string, unknown>;
  transform?: "text" | "number" | "currency" | "area" | "image" | "gallery" | "list";
  required?: boolean;
};
```

Storage direction:

- `detail_page_documents` is the required storage contract.
- `contentTypeId` is the stable owner identity for joins, deterministic ids, and
  reuse matching; `contentTypeSlug` remains a route-facing/admin-facing copy
  derived from the current content-type owner seam.
- `site.contentRoutes` remains the route matcher and may reference a
  `detailPageId`, but it must not store the full detail page document.
- `ContentRouteSetting.detailPageId` is the canonical stable link from a
  content detail route to a detail page document.
- `site.contentRoutes` is the only runtime route owner for public content
  detail URLs. Detail page documents do not own canonical route patterns in
  parallel.
- Detail page documents must have their own draft/published lifecycle,
  versioned JSON document payload, stable id, and content type ownership.
- DB changes require full migration artifacts: SQL migration, meta snapshot, and
  journal update.
- The contract must be non-destructive and backward compatible with current
  content routes.
- `DetailPageDocument` is an assistant/admin-managed collection resource; it is
  not a replacement for theme-file-based content detail templates.
- Any route snapshot shown in admin/read-model UX is derived from the linked
  `site.contentRoutes` row, not stored as a second authoritative runtime
  contract inside `detail_page_documents`.
- When a detail page document is absent, current theme override support for
  `content` detail templates remains the fallback behavior.

## Runtime Flow

Public detail rendering should resolve like this:

```text
request /catalog/:slug
  -> match site.contentRoutes detail route
  -> load content type and entry
  -> if detailPage document exists:
       resolve entry field bindings into widget data
       hydrate runtime widgets
       render through the existing content-detail runtime entry point
     else:
       use current legacy entry detail renderer
```

Preview rendering should support the same path with draft-safe data when a
preview token allows it.

## Owner Modules

New modules:

- `core/services/assistant/blueprints/blueprintDetailPageComposer.ts`
- `core/services/content/detailPageTypes.ts`
- `core/services/content/detailPageSchema.ts`
- `core/services/content/detailPageBindingResolver.ts`
- `core/services/content/detailPageDocumentService.ts`
- add `core/services/content/detailPageRuntimeResolver.ts` only if a shared
  extraction from `core/server/publicSite.tsx` / `core/site/renderPublicEntry.tsx`
  materially improves reuse; otherwise keep detail-page runtime resolution in
  those current public runtime owners
- `core/server/routes/detailPageRoutes.ts`
- `core/server/validation/detailPageSchemas.ts`

Touched existing modules:

- `core/services/assistant/blueprints/blueprintPageSectionTypes.ts`
- `core/services/assistant/blueprints/blueprintPageSectionComposer.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/server/publicSite.tsx`
- `core/site/renderPublicEntry.tsx`
- `core/site/contentRouteMatcher.ts`
- `core/services/settings/settingsService.ts`
- `core/db/schema.ts`
- SQL migration plus Drizzle meta snapshot/journal artifacts for
  `detail_page_documents`.

## Implementation Order

1. Define the versioned detail page document, dedicated DB storage, and strict
   normalizers under one content-domain owner, including stable id rules for
   composer-created documents.
2. Define binding resolution from entry fields/meta/computed sources using the
   existing dot-path binding model.
3. Add runtime resolver and plug it into the current content-detail runtime
   entry point with legacy fallback.
4. Add required `detail-page.upsert` typed action schema/executor to
   create/update detail page documents without mutating route ownership.
5. Add internal admin detail page API plus explicit stable-id behavior for
   assistant/composer upserts and manual admin create flows.
6. Extend preview/cache/invalidation with detail-page-specific preview context
   stored server-side, not trusted from ad-hoc query params.
7. Add `detailPageId` content-route round-trip and runtime linkage after the
   detail page document exists; live route ownership must stay in
   `site.contentRoutes`.
8. Add manual Collection Workspace / Detail Template editing integration in
   `TASK-190-06-03`.
9. Add generic assistant resource/policy integration for `detail-page` only
   after the base action/admin/runtime flow exists; do not couple the first
   reviewed action promotion to the later generic CMS resource vocabulary.
10. Add composer fixtures and DB-backed public runtime acceptance tests.

## Security Contract

- Visibility: internal planning/execution plus public read-only runtime.
- Auth model:
  - planning/dry-run/execute use existing admin session,
  - public detail rendering requires no session and remains read-only,
  - preview uses existing preview token rules.
- RBAC:
  - planning uses current read permissions for content/page/listing/form
    resources,
  - execute uses current typed action permissions for content routes/pages/forms
    and any promoted detail page action.
- CSRF: unchanged for admin writes; all assistant action POST routes require
  CSRF through the existing middleware.
- Rate-limit bucket:
  - assistant bucket for planning/execution,
  - public_read for public detail rendering.
- Reject-unknown validation:
  - detail page documents reject unknown fields,
  - blocks pass widget schemas,
  - bindings reference existing schema fields or allowed entry meta/computed
    sources,
  - assembled actions pass `actionPlanSchema`.
- Anti-abuse:
  - no public write endpoint is introduced,
  - provider cannot provide detail page action payloads,
  - raw HTML/script injection is forbidden unless already supported by a strict
    widget contract,
  - related-list queries must clamp limits and only return published entries on
    public runtime.
- Public-write hardening:
  - inquiry forms embedded on detail pages must reuse existing forms access
    evaluators, nonce, captcha, and rate-limit contracts.
- Secret handling:
  - bindings cannot expose secret-like fields publicly,
  - prompt/provider/context diagnostics must redact field values,
  - preview/log/audit payloads must not include submissions, tokens, cookies, or
    provider keys.

## Testing Requirements

- Vitest:
  - detail page schema/normalizer tests,
  - binding resolver tests,
  - composer section-to-document fixtures,
  - action schema tests,
  - provider draft rejection tests where relevant.
- Bun:
  - DB-backed detail page document persistence,
  - public runtime detail render tests,
  - preview token detail render tests,
  - cache invalidation tests for entry updates and detail document updates,
  - execute/dry-run tests for detail page action assembly.
- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/WIDGET_PACK_MATRIX.md` if new widgets/section readiness rules are
  introduced.
- `_docs/_TASKS/README.md`
