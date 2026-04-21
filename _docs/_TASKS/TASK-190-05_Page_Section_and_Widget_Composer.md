# TASK-190-05: Page Section and Widget Composer
# FileName: TASK-190-05_Page_Section_and_Widget_Composer.md

**Priority:** High
**Category:** Assistant/Core + Page Builder + Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-190-03, TASK-190-04
**Status:** To Do

---

## Overview

Create a page section composer that can assemble page sections from blueprint
capabilities: hero, steps, filters, listing, CTA, form embed, testimonials,
contact, FAQ, and editorial blocks.

Business value:
- The assistant can build richer pages without one-off presets.
- Future blueprint fragments can contribute sections to the same page.
- Page output stays composed from existing widget contracts.

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

## Architecture

New owner files:

- `core/services/assistant/blueprints/blueprintPageSectionComposer.ts`
- `core/services/assistant/blueprints/blueprintWidgetCapabilityMap.ts`
- `core/services/assistant/blueprints/blueprintDetailPageComposer.ts`
- `core/services/assistant/blueprints/blueprintDetailPageTypes.ts`
- `core/services/assistant/blueprints/blueprintDetailPageSchema.ts`
- `core/services/assistant/blueprints/blueprintDetailBindingResolver.ts`
- `core/services/content/detailPageRuntimeResolver.ts`
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
- `core/widgets/core/*`

## Acceptance Criteria

1. Composer can produce ordered widget blocks for a page.
2. Blocks pass existing widget schemas.
3. `page.upsert` can accept composed blocks or current catalog-page inputs.
4. Listing filters and content-list can be composed in one page.
5. Missing widget capabilities return gated/needs-input, not invalid blocks.
6. Detail page route sections are first-class public runtime documents, not only
   metadata.
7. Detail page renderer resolves entry-field bindings into widget props through
   the existing content-detail runtime seam and falls back to legacy entry
   detail rendering when no detail document exists.
8. Detail page preview/cache/invalidation behavior is covered by Bun runtime
   tests.

## Security Contract

- Visibility: internal planning and reviewed page execution.
- Auth model: existing assistant action flow.
- RBAC: page writes require current page permissions.
- CSRF: unchanged.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: composed blocks pass widget schema validation.
- Anti-abuse: no raw HTML or scripts unless already supported by strict widget
  contracts.
- Secret handling: page blocks cannot contain secret-like values.

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
