# TASK-190-05-03: Detail Page Composition and Content Route Sections
# FileName: TASK-190-05-03_Detail_Page_Composition_and_Content_Route_Sections.md

**Priority:** High
**Category:** Assistant/Core + Public Runtime + Page Sections
**Estimated Effort:** Large
**Dependencies:** TASK-190-05-01, TASK-190-05-02
**Status:** To Do

---

## Overview

Extend the page composer to model detail pages, not only listing/landing pages.
Mixed business prompts often need public detail routes with richer layouts:
project details, gallery, specs, pricing packages, CTA, inquiry form, related
items, and editorial guidance.

This is foundational for future Mabudo-like or product/service detail pages, but
the task should implement generic composition primitives first.

## Sub-Tasks

No child task files.

## Business Behavior

The composer should understand that a catalog outcome usually needs two public
surfaces:
- list page: filters + cards + lead CTA,
- detail page: structured detail view for one entry.

For example:
- house project detail page,
- product detail page,
- service offer detail page,
- portfolio case study detail page.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintDetailPageComposer.ts`
- Update `core/services/assistant/blueprints/blueprintPageSectionTypes.ts`
- Update `core/services/assistant/blueprints/blueprintPageSectionComposer.ts`
- Update `core/services/assistant/actionPlanTypes.ts` if detail-page section
  metadata needs a typed action payload.
- Update `core/services/assistant/actionPlanSchema.ts`
- Update `core/services/assistant/actionExecutorService.ts` if `page.upsert`
  needs to persist detail-page layout metadata.
- Add `tests/vitest/assistant/blueprint-detail-page-composer.test.ts`
- Add DB-backed runtime tests if content route rendering changes.

## Technical Scope

Add detail section kinds:
- `detail-hero`
- `detail-gallery`
- `detail-spec-table`
- `detail-pricing`
- `detail-cta`
- `detail-inquiry-form`
- `related-listing`
- `detail-faq`

Add route-aware section metadata:

```ts
type BlueprintDetailPageContribution = {
  contentTypeSlug: string;
  routePattern: string;
  sections: BlueprintPageSectionContribution[];
  dataBindings: Array<{
    sectionId: string;
    propPath: string;
    field: string;
    fallback?: unknown;
  }>;
};
```

## Pseudocode

```ts
export const composeDetailPage = (graph) => {
  const contentType = graph.primaryContentType;
  const route = graph.routes.find((item) => item.typeSlug === contentType.slug);
  const detailSections = graph.detailSections.length
    ? graph.detailSections
    : defaultDetailSectionsFor(contentType);

  return {
    typeSlug: contentType.slug,
    detailPath: route.detailPath,
    blocks: detailSections.map(toWidgetBlock),
    bindings: composeDetailBindings(detailSections, contentType.schema),
  };
};
```

## Security Contract

- Visibility: internal planning and public read runtime only.
- Auth model: planning uses existing admin session; public detail rendering stays
  read-only.
- RBAC: page/route writes require existing assistant action permissions.
- CSRF: unchanged for writes.
- Rate-limit bucket: existing assistant bucket for planning; public runtime
  unchanged.
- Reject-unknown validation: detail sections and bindings pass widget/page
  schemas.
- Anti-abuse: no public write endpoint is introduced.
- Public-write hardening: inquiry forms included on detail pages must reuse
  existing public form nonce/captcha/access rules.
- Secret handling: no secret-like fields in public detail bindings.

## Testing Requirements

- Detail page section composition tests.
- Missing field binding rejects.
- Detail route generated from primary content type.
- Existing list page composition remains unchanged.
- Public runtime smoke when route rendering changes.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_API.md`
- `_docs/WIDGET_PACK_MATRIX.md` if detail sections require widget coverage.
