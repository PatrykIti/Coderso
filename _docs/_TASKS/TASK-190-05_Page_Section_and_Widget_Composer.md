# TASK-190-05: Page Section and Widget Composer
# FileName: TASK-190-05_Page_Section_and_Widget_Composer.md

**Priority:** High
**Category:** Assistant/Core + Page Builder + Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-190-03, TASK-190-04
**Status:** In Progress (2026-05-07)

---

## Overview

Create a page section composer that can assemble page sections from blueprint
capabilities: hero, steps, filters, listing, CTA, form embed, testimonials,
contact, FAQ, and editorial blocks.

Business value:
- The assistant can build richer pages without one-off presets.
- Future blueprint fragments can contribute sections to the same page.
- Page output stays composed from existing widget contracts.

Reuse rule:

- page sections are composed from the existing widget registry, composite widget
  metadata, and current section/page preset coverage,
- this slice must not create a second source of truth for section readiness next
  to the current widget pack / preset contract.

Current slice note:
- `TASK-190-05-01` is landed: assistant-facing section alias/slot vocabulary
  and deterministic widget/pack mapping now sit in
  `blueprintPageSectionTypes.ts` / `blueprintPageSectionLibrary.ts`.
- `TASK-190-05-02` is landed: canonical collection pages now compose
  listing/filter/form blocks through `blueprintPageSectionComposer.ts`, and
  assistant-created collection pages persist `PageData.settings.collectionLink`
  through the existing page owner seam.
- `TASK-190-05-03-01` is landed: detail-page document/revision storage and the
  blocking `content_type_has_detail_pages` dependency now exist under the
  content-domain owner seam.
- `TASK-190-05-03-02` is landed: detail-page blocks now resolve strict
  entry-field/meta/computed bindings through `detailPageBindingResolver.ts`
  with shared safe dot-path helpers and thin adapters over the existing
  content/forms runtime seams.
- `TASK-190-05-03-07-02` is landed: canonical content routes now round-trip
  structural `detailPageId` linkage through settings, assistant actions, and
  matcher metadata so the runtime leaf can consume one validated route owner
  seam.
- `TASK-190-05-03-03` is landed: published content routes with linked
  `detailPageId` now resolve and hydrate composed detail-page blocks through
  the existing page runtime shell, while unlinked routes stay on the legacy
  entry-detail renderer.
- The later detail-page binding/runtime/action/admin waves remain open.

## Sub-Tasks

- `TASK-190-05-01_Page_Section_Library_and_Composition_Slots.md`
- `TASK-190-05-02_Page_Upsert_Composition_Adapter.md`
- `TASK-190-05-03_Detail_Page_Composition_and_Content_Route_Sections.md`
  - `TASK-190-05-03-01_Detail_Page_Model_and_Schema_Contract.md`
  - `TASK-190-05-03-02_Detail_Page_Bindings_and_Field_Resolver.md`
  - `TASK-190-05-03-03_Detail_Page_Runtime_Renderer_and_Route_Resolution.md`
  - `TASK-190-05-03-04_Detail_Page_Preview_Cache_and_Invalidation.md`
  - `TASK-190-05-03-05_Detail_Page_Action_Schema_and_Executor_Adapter.md`
  - `TASK-190-05-03-06_Detail_Page_Composer_Fixtures_and_Runtime_Acceptance.md`
  - `TASK-190-05-03-07_Detail_Page_Route_Linking_and_Internal_Admin_API.md`
  - `TASK-190-05-03-08_Detail_Page_Generic_Assistant_Resource_Integration.md`

## Architecture

New owner files:

- `core/services/assistant/blueprints/blueprintPageSectionComposer.ts`
- `core/services/assistant/blueprints/blueprintWidgetCapabilityMap.ts`
- `core/services/assistant/blueprints/blueprintDetailPageComposer.ts`
- `core/services/content/detailPageTypes.ts`
- `core/services/content/detailPageSchema.ts`
- `core/services/content/detailPageBindingResolver.ts`
- add `core/services/content/detailPageRuntimeResolver.ts` only if extracting a
  shared runtime-facing resolver over the current public runtime owners
  improves reuse; otherwise keep detail-page runtime resolution inside
  `core/server/publicSite.tsx` / `core/site/renderPublicEntry.tsx`
- `tests/vitest/assistant/blueprint-page-section-composer.test.ts`
- `tests/vitest/assistant/blueprint-detail-page-composer.test.ts`

Touched existing files:

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/server/publicSite.tsx`
- `core/site/renderPublicEntry.tsx`
- `core/site/contentRouteMatcher.ts`
- `core/services/settings/settingsService.ts`
- `core/widgets/modulePackMatrix.ts` if existing preset metadata needs a helper
  seam for section composition
- `core/widgets/core/*`

## Acceptance Criteria

1. Composer can produce ordered widget blocks for a page.
2. Blocks pass existing widget schemas.
3. `page.upsert` can accept composed blocks or current catalog-page inputs.
4. Listing filters and content-list can be composed in one page.
5. Missing widget capabilities return gated/needs-input, not invalid blocks.
6. Detail page route sections are first-class public runtime documents, not only
   metadata.
7. Detail-page domain types/schema/normalizer stay under one content-domain
   owner; blueprint composition consumes that contract instead of redefining it.
8. Detail page renderer resolves entry-field bindings into widget props through
   the existing content-detail runtime seam and falls back to legacy entry
   detail rendering when no detail document exists.
9. Runtime route ownership stays in `site.contentRoutes` plus `detailPageId`;
   detail page documents do not become a second route registry.
10. `setting.content-route.upsert` is extended rather than replaced; omitted
    `detailPageId` preserves the current link, `null` clears it, and a string
    sets it.
11. Generic assistant resource support for `detail-page` is a later explicit
    slice; base composer/runtime/admin flow does not pretend that support
    already exists.
12. Detail page preview/cache/invalidation behavior is covered by Bun runtime
    tests.

## Security Contract

- Visibility: internal planning/reviewed assistant execution plus public read
  runtime/preview for linked detail pages.
- Auth model:
  - planning and execute use the existing assistant/admin session flow,
  - public detail runtime remains unauthenticated read-only,
  - draft preview stays on the existing preview-token seam.
- RBAC:
  - page-like writes keep the current page/content permission model,
  - detail-page subleaves may widen current content-owned write/publish
    contracts only through their named owner seams (`detail-page.upsert`,
    `setting.content-route.upsert`, internal detail-page routes), not through
    page-local side channels.
- CSRF: unchanged for assistant/admin writes; not applicable to public read.
- Rate-limit bucket:
  - existing assistant bucket for planning/execution,
  - `public_read` for linked detail runtime/preview.
- Reject-unknown validation:
  - composed blocks pass widget schema validation,
  - widened detail-page/route contracts stay strict at their named owner seams.
- Anti-abuse: no raw HTML or scripts unless already supported by strict widget
  contracts; public detail rendering and embedded forms reuse the current route,
  runtime, and form hardening instead of introducing parallel public-write flow.
- Secret handling: page/detail-page blocks cannot contain secret-like values,
  and preview/runtime diagnostics must not leak tokens or internal binding data.

## Testing Requirements

- Vitest section composition tests.
- Vitest detail page schema, binding, and fixture tests.
- Widget schema validation tests.
- Bun dry-run/execute page upsert tests when block assembly changes.
- Bun public detail page runtime, preview, and cache invalidation tests.

## Documentation Updates Required

- `_docs/WIDGET_PACK_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
