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

## Sub-Tasks

- `TASK-190-05-03-01_Detail_Page_Model_and_Schema_Contract.md`
- `TASK-190-05-03-02_Detail_Page_Bindings_and_Field_Resolver.md`
- `TASK-190-05-03-03_Detail_Page_Runtime_Renderer_and_Route_Resolution.md`
- `TASK-190-05-03-04_Detail_Page_Preview_Cache_and_Invalidation.md`
- `TASK-190-05-03-05_Detail_Page_Action_Schema_and_Executor_Adapter.md`
- `TASK-190-05-03-06_Detail_Page_Composer_Fixtures_and_Runtime_Acceptance.md`

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

Add a detail page model that can be carried by content route/page actions and
rendered by public runtime.

```ts
type DetailPageDocument = {
  schemaVersion: 1;
  contentTypeSlug: string;
  routePattern: string;
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
  propPath: string[];
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

- Prefer a dedicated `detailPages`/`detail_page_documents` contract if the
  implementation determines current settings/content-route storage is too
  limited.
- If stored inside `site.contentRoutes`, it must be versioned and validated as
  `detailPage`, not ad-hoc JSON.
- The contract must be non-destructive and backward compatible with current
  content routes.

## Runtime Flow

Public detail rendering should resolve like this:

```text
request /catalog/:slug
  -> match site.contentRoutes detail route
  -> load content type and entry
  -> if detailPage document exists:
       resolve entry field bindings into widget data
       hydrate runtime widgets
       render through public page shell
     else:
       use current legacy entry detail renderer
```

Preview rendering should support the same path with draft-safe data when a
preview token allows it.

## Owner Modules

New modules:

- `core/services/assistant/blueprints/blueprintDetailPageTypes.ts`
- `core/services/assistant/blueprints/blueprintDetailPageSchema.ts`
- `core/services/assistant/blueprints/blueprintDetailPageComposer.ts`
- `core/services/assistant/blueprints/blueprintDetailBindingResolver.ts`
- `core/services/content/detailPageDocumentService.ts`
- `core/services/content/detailPageRuntimeResolver.ts`
- `core/site/renderDetailPage.tsx`

Touched existing modules:

- `core/services/assistant/blueprints/blueprintPageSectionTypes.ts`
- `core/services/assistant/blueprints/blueprintPageSectionComposer.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/server/publicSite.tsx`
- `core/site/contentRouteMatcher.ts`
- `core/services/settings/settingsService.ts`
- `core/db/schema.ts` and migrations if a new table is introduced.

## Implementation Order

1. Define the versioned detail page document and strict normalizers.
2. Define binding resolution from entry fields/meta/computed sources.
3. Add runtime resolver and public renderer with legacy fallback.
4. Add preview/cache/invalidation integration.
5. Extend typed action schema/executor to create/update detail page documents.
6. Add composer fixtures and DB-backed public runtime acceptance tests.

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
  - DB-backed detail page document persistence if a table is introduced,
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
