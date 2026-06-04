# TASK-404-03: Full Service Page and Section Composer
# FileName: TASK-404-03_Full_Service_Page_and_Section_Composer.md

**Priority:** High
**Category:** Assistant + Blueprints + Page Builder
**Estimated Effort:** Large
**Dependencies:** TASK-404-01, TASK-404-02
**Status:** To Do

---

## Overview

Create a deterministic full-service-site capability and page composer that
generates a launch-shaped service-business site through existing page-builder
and widget owner seams.

This must be a distinct capability, not just the existing mixed composition of
portfolio + services + contact. The plan must create the full site map and
sections needed for a real service site.

## Sub-Tasks

- Add a `service-business-full-site` capability/intent.
- Build a full-service page graph for `/`, `/uslugi`, `/portfolio`, `/o-nas`,
  `/proces`, `/referencje`, and `/kontakt`.
- Reuse or extend the existing catalog-family blueprint path for portfolio and
  services so `content-type.upsert`, `listing-query.upsert`,
  `listing-template.upsert`, `setting.content-route.upsert`, and
  `detail-page.upsert` stay owned before public detail routes are tested.
- Use existing page section composer/library helpers and widget owner
  normalization for every block.
- Keep unsupported sections gated instead of inventing ad-hoc widget payloads.
- Ensure generated pages are normal CMS pages that remain editable in admin.

## Files To Change

| File | Required change |
|---|---|
| `core/services/assistant/blueprints/blueprintCapabilityRegistry.ts` | Register `service-business-full-site`. |
| `core/services/assistant/blueprints/businessBlueprintTypes.ts` | Add capability family/types if needed. |
| `core/services/assistant/blueprints/catalogFamilyBlueprint.ts` | Reuse/extend catalog routing, listing, and detail-page action assembly for portfolio/services. |
| `core/services/assistant/blueprints/catalogFamilyPresets.ts` | Reuse the `/portfolio/:slug` and `/uslugi/:slug` presets or extend them without duplicating route contracts. |
| `core/services/assistant/blueprints/fullServiceSiteBlueprint.ts` | New deterministic builder for site map, sections, and resource graph. |
| `core/services/assistant/blueprints/blueprintPageSectionLibrary.ts` | Add aliases only when backed by existing widget owners. |
| `core/services/assistant/blueprints/blueprintPageSectionComposer.ts` | Compose full-site page section sets through current owner seams. |
| `core/services/assistant/blueprints/blueprintActionAssembler.ts` | Assemble full-site graph into strict `page.upsert` actions. |
| `tests/vitest/assistant/actionPlannerService.test.ts` | Prompt classification and full-site action shape. |
| `tests/vitest/assistant/blueprint-composition-fixtures.test.ts` | Fixture coverage and negative gates. |
| `tests/vitest/assistant/blueprint-page-section-composer.test.ts` | Section composition coverage. |
| `tests/vitest/assistant/blueprint-page-section-library.test.ts` | Alias and media safety coverage. |

## Implementation Pseudocode

```ts
const fullServiceSiteMap = [
  { slug: "/", role: "home", required: true },
  { slug: "/uslugi", role: "services", required: true },
  { slug: "/portfolio", role: "portfolio", required: true },
  { slug: "/o-nas", role: "about", required: true },
  { slug: "/proces", role: "process", required: true },
  { slug: "/referencje", role: "proof", required: true },
  { slug: "/kontakt", role: "contact", required: true },
] as const;

function buildFullServiceSitePlan(input: FullServiceSiteInput): AssistantActionPlan {
  const catalogActions = [
    buildCatalogFamilyPlan(PORTFOLIO_PROJECTS_PRESET),
    buildCatalogFamilyPlan(SERVICES_DIRECTORY_PRESET),
  ].flatMap((plan) => plan.actions);

  const pages = fullServiceSiteMap.map((page) => {
    const sections = composeFullServiceSections({
      pageRole: page.role,
      brand: input.brand,
      catalogs: input.catalogs,
      formSlug: "lead-capture-inquiry",
      locale: input.locale,
    });

    return buildPageUpsertAction({
      slug: page.slug,
      title: titleForPageRole(page.role, input.brand),
      status: "published",
      blocks: sections.blocks,
      collectionLink: sections.collectionLink,
    });
  });

  return normalizeAssistantActionPlan({
    status: "ready",
    responseKind: "action_plan",
    intentId: "service-business-full-site",
    actions: [...catalogActions, ...pages],
  });
}
```

Data flow:

- Prompt signals select full-service capability when user asks for a complete
  service-business site.
- Capability builder creates site map and section intents.
- Portfolio/services catalogs are built through the existing catalog-family
  blueprint path so listing queries, listing templates, content routes, and
  detail pages are part of the same early plan contract.
- Section composer maps intents to existing widget blocks and normalizes via
  widget owners.
- Unsupported section aliases return gates and questions instead of invalid
  payloads.

Error handling:

- Unsupported widget alias returns `assistant_blueprint_page_section_unsupported`.
- Raw media URL in page blocks returns existing media gate error.
- Page slug conflict enters existing resource matcher/conflict flow.
- Missing listing-query/listing-template/content-route/detail-page assembly for
  portfolio or services blocks full-service readiness before TASK-404-06.
- Empty composed home/services/proof sections block ready status.

## Security Contract

- Endpoint visibility: existing internal assistant action routes.
- Auth model: admin session.
- RBAC:
  - plan/dry-run require `settings:read` + `content:read`,
  - execute `page.upsert` requires `settings:write` + `content:write` +
    `content:publish` per current action contract,
  - reused catalog-family route/listing/detail actions inherit their existing
    action-family permissions from `listing-query.upsert`,
    `listing-template.upsert`, `setting.content-route.upsert`, and
    `detail-page.upsert`.
- CSRF: required on POST routes.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: all page action inputs and page block payloads must
  pass strict action schema and widget owner normalization.
- Anti-abuse:
  - no public assistant writes,
  - no raw media uploads or raw remote media URLs,
  - form runtime remains existing Forms public hardening.
- Secret handling: generated page copy and diagnostics must not include provider
  keys, cookies, CSRF tokens, auth headers, secret settings, or upload bytes.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/blueprint-composition-fixtures.test.ts tests/vitest/assistant/blueprint-page-section-composer.test.ts tests/vitest/assistant/blueprint-page-section-library.test.ts`
- Add fixture that fails if full-service prompt produces only
  `/portfolio`, `/uslugi`, `/kontakt`.
- Add fixture that gates raw media/upload prompts.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`

## Acceptance Criteria

- Full-service prompts select `service-business-full-site`.
- Ready plan includes `page.upsert` for the full required site map.
- Ready plan includes portfolio/services catalog routing actions:
  `listing-query.upsert`, `listing-template.upsert`,
  `setting.content-route.upsert`, and `detail-page.upsert` where the current
  catalog-family route contract requires them.
- Page blocks are normalized through existing widget owners.
- Unsupported page sections gate with clear `needs_input`; no ad-hoc unsafe
  widget payloads are introduced.
