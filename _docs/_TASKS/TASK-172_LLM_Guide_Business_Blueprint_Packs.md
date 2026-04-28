# TASK-172: LLM Guide Business Blueprint Packs
# FileName: TASK-172_LLM_Guide_Business_Blueprint_Packs.md

**Priority:** High  
**Category:** Assistant/Product + Coderso Blueprints + Runtime UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09, TASK-170, TASK-171  
**Status:** Done (2026-04-12)

---

## Overview

The shipped `LLM Guide` scope proves the product direction with a safe typed engine and current business presets:
- house projects catalog,
- product catalog,
- portfolio projects,
- services directory,
- site-kit actions through the unified action flow,
- first state-aware house-projects refinements.

This does not yet mean the assistant has full product intelligence for every scenario. This umbrella covers concrete business blueprint packs: opinionated, beginner-friendly setup flows that compose existing Coderso modules into useful outcomes.

## Goal

Po tej fali `LLM Guide` powinien miec rozszerzony katalog realnych business outcomes, gdzie kazdy blueprint:
- maps a user prompt to an explicit intent family,
- declares schemas, default fields, listings, pages, forms, and follow-up refinements,
- uses existing modules (`Engine`, `Entries`, `Screens`, `Listings`, `Forms`, `Widgets`, `Pages`),
- avoids duplicate setup creation,
- exposes a useful admin workflow and public runtime surface after execution.

## Target Blueprint Areas

Kandydaci do przyszlych subtaskow:
- lead capture site for small service businesses,
- booking/service business setup when booking domain contracts are ready,
- ecommerce/product inquiry catalog without pretending to be a full checkout if commerce scope is not ready,
- portfolio/case-study pack with testimonials and inquiry CTA,
- local business services directory with filters and contact flow,
- editorial/content hub pack for posts/pages/listings,
- solution-kit-specific refinements that reuse installed kit context instead of reinstalling.

## Architecture

Current owner modules to extend:
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/assistant/blueprints/catalogFamilyPresets.ts`
- `core/services/assistant/blueprints/houseProjectsCatalogBlueprint.ts`
- `core/services/assistant/adminContextCatalogs.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/assistant/actionDiffService.ts`
- domain services for content types, custom screens, listings, forms, pages, booking, commerce, menus, and settings as each pack requires.

Rules:
- blueprints are product surfaces, not loose primitives,
- each pack must be beginner-friendly and composite-first,
- shared blueprint builders should be reused where they reduce real duplication,
- pack-specific schemas must stay deterministic and reject unknown fields,
- refinement flows must prefer updating existing resources over creating duplicates.

## Pseudocode

```ts
const pack = resolveBusinessBlueprintPack(prompt, context);

if (!pack || !pack.prerequisitesSatisfied(context)) {
  return buildNeedsInputPlan(pack?.missingRequirements ?? []);
}

return normalizeAssistantActionPlan(pack.buildActions({ prompt, context }));
```

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/assistant/blueprints/catalogFamilyPresets.ts`
- `core/services/assistant/blueprints/houseProjectsCatalogBlueprint.ts`
- possible new `core/services/assistant/blueprints/businessBlueprintTypes.ts`
- `core/services/assistant/adminContextCatalogs.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/assistant/actionDiffService.ts`
- domain services touched by each pack leaf

## Security Contract

- Visibility: internal only under existing `/admin/api/assistant/actions/*`.
- Auth model: existing admin session.
- RBAC:
  - plan/dry-run: `settings:read` + read permissions for touched resources,
  - execute: `settings:write` + write/publish permissions for touched resources,
  - additional booking/commerce/solution-kit permissions must be explicitly required when those domains are touched.
- CSRF: required for all `POST /assistant/actions/*` calls.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation:
  - every blueprint action must pass strict action plan schema,
  - every domain payload must pass its owner schema/normalizer before persistence.
- Anti-abuse:
  - no public write endpoint in this umbrella,
  - forms created for public submission must reuse existing public form access evaluators and nonce/captcha hardening patterns,
  - future public writes require their own Security Contract.
- Idempotency: execute remains persistent and replay-safe by actor, plan id, and plan hash.
- Secret handling: blueprint context, previews, idempotency payloads, and audit metadata must exclude provider keys, secrets, session data, raw form submissions, and secret-like settings.

## Sub-Tasks

- `TASK-172-01_Blueprint_Pack_Contract_and_Shared_Builder_Expansion.md`
- `TASK-172-02_Lead_Capture_Site_Pack.md`
- `TASK-172-03_Booking_Service_Business_Pack.md`
- `TASK-172-04_Product_Inquiry_and_Ecommerce_Starter_Pack.md`
- `TASK-172-05_Portfolio_Case_Study_Pack.md`
- `TASK-172-06_Editorial_Content_Hub_Pack.md`
- `TASK-172-07_Solution_Kit_Refinement_Packs_and_No_Reinstall_Flow.md`
- `TASK-172-08_Runtime_Acceptance_Docs_and_Widget_Pack_Matrix_Closure.md`

## Implementation Order

1. Freeze the shared pack contract in `TASK-172-01`.
2. Implement packs whose action families already exist or land first under `TASK-170`.
3. Keep booking/commerce packs gated by safe domain-service reuse.
4. Add solution-kit refinements after installed-kit state is audited.
5. Close with runtime acceptance, docs corpus, and widget pack matrix sync in `TASK-172-08`.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - planner classification and routing,
  - blueprint builder/preset coverage,
  - state-aware refinement/no-duplicate logic where Bun-free,
  - UI review output when blueprint plan rendering changes.
- Bun:
  - executor coverage for each blueprint pack,
  - DB-backed no-duplicate/refinement behavior,
  - public runtime acceptance for generated pages/forms/listings,
  - route registration/error mapping when action families change.
- DB tests must load `.env` first when `DATABASE_URL` is required.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/WIDGET_PACK_MATRIX.md` if blueprint completeness depends on widget/module pack coverage
- relevant `docs/` assistant corpus pages for new guide outcomes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a changelog entry when each implementation task is completed

## Progress Notes

- 2026-04-12: Completed `TASK-172-01`; shared business blueprint pack contract now wraps existing catalog-family presets without changing generated plan output.
- 2026-04-12: Completed `TASK-172-02`; lead capture prompts now route to a ready plan that creates a public inquiry form and simple landing page.
- 2026-04-12: Completed `TASK-172-03`; booking prompts now return a gated `needs_input` plan because booking action adapters are not implemented yet.
- 2026-04-12: Completed `TASK-172-04`; product inquiry prompts now create catalog plus public inquiry form, while checkout/payment prompts stay gated.
- 2026-04-12: Completed `TASK-172-06`; editorial content hub prompts now create a page with posts-feed widget without mutating post records.
- 2026-04-12: Completed `TASK-172-05`; portfolio pack now includes case-study result and testimonial fields while preserving the existing catalog action flow.
- 2026-04-12: Completed `TASK-172-07`; solution-kit refinements remain gated until server-derived installed-kit context exists.

## Completion Notes (2026-04-12)

- Added shared business blueprint pack contract.
- Added executable packs for lead capture, product inquiry catalog, portfolio/case-study fields, and editorial content hub.
- Added gated packs/paths for booking service and checkout/payment/solution-kit refinement where safe adapters or server-derived context are not yet available.
- Reused existing typed actions and domain services; no parallel assistant-only write path was added.
- Revalidated targeted planner, executor, and public runtime coverage.
