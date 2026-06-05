# TASK-407-05: SiteKit Plan and Content Engine Decisions
# FileName: TASK-407-05-SiteKit-Plan-and-Content-Engine-Decisions.md

**Parent Task:** TASK-407
**Priority:** High
**Category:** Assistant + SiteKit Planner + Content Engine
**Estimated Effort:** Large
**Dependencies:** TASK-407-02, TASK-407-03, TASK-407-04
**Status:** 🚧 In Progress (2026-06-05)

---

## Overview

Connect completed intake sessions to the existing solution-kit/siteKit planner
and typed action engine. The assistant must decide when a page should stay
static and when it needs a content engine: content type, entries, listing page,
detail page, filters, custom screen, and admin bindings. Follow-up prompts such
as "change projects page" must reuse trusted existing resources and ask for
targets when ambiguous.

The first adapter in this workstream must compile intake facts into existing
`AssistantSiteKitPlanInput` / `SiteBuilderPlanInput`. Blueprint-composer changes
are allowed only as optional lower-level adapters when the existing siteKit
contract cannot express an accepted capability.

## Sub-Tasks

- Convert normalized intake facts into the exact current
  `AssistantSiteKitPlanInput` shape (`businessType`, `goals`, `locale`,
  optional `region`, `siteName`, `preferredKitId`, `selectedKitId`, and
  `enabledStepIds`). Keep review metadata, gates, media decisions, page/menu
  choices, and content-engine candidates outside `context.siteKit`.
- Add content-engine decision rules for services, projects/portfolio, products,
  posts/editorial, testimonials/proof, team, locations, and FAQs where supported.
- Add custom-screen decision rules for content engines that need beginner
  editing surfaces.
- Ensure unsupported modules become gates, not invented actions.
- Implement follow-up refinement routing from active page/custom screen/listing
  context or server-derived candidates.

## Executable Leaves

| ID | Title | Status | Output |
|---|---|---|---|
| TASK-407-05-L01 | Intake Facts to SiteKit Plan Adapter | Done (2026-06-05) | Normalized intake facts converted to existing siteKit plan input. |
| TASK-407-05-L02 | Static Pages Navigation Lead Capture and SEO Actions | To Do | Static page/menu/footer/contact/SEO actions through strict action families. |
| TASK-407-05-L03 | Content Engine Decision Rules | To Do | Supported service/project/product/post/proof/team/location/FAQ engine selection and gates. |
| TASK-407-05-L04 | Custom Screen and Beginner Editing Surface Decisions | To Do | Beginner editing surface decisions and unsupported custom-screen gates. |
| TASK-407-05-L05 | Follow Up Refinement Target Resolution | To Do | Active-resource/server-catalog target resolution and ambiguity questions. |
| TASK-407-05-L06 | Dry Run Idempotency and Runtime Contract Tests | To Do | Strict action validation, dry-run/idempotency tests, and one public runtime proof. |

## Security Contract

- Endpoint visibility: internal assistant action routes only.
- Auth model: existing admin session.
- RBAC: action-specific read/write/publish permissions from existing contracts.
- CSRF: required for POST.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: generated `siteKit` payloads and follow-on action
  payloads must normalize through existing strict schemas before dry-run/execute.
- Anti-abuse: follow-up prompts cannot target resources by untrusted free text
  alone; targets must resolve from active context or server-side catalogs.
- Secret handling: provider/context packages and diagnostics must use prompt
  hashes/redacted facts, not raw secrets or raw file text.

## Files To Change

| Area | Files |
|---|---|
| SiteKit planner | `core/services/kits/solutionKitTypes.ts`, `core/services/assistant/siteBuilderPlanner.ts`, `core/services/assistant/siteBuilderPlanAdapter.ts`, `core/services/assistant/actionPlannerService.ts` |
| Content engine | catalog family presets, solution-kit inputs, optional blueprint/custom-screen composer helpers |
| Policy | `core/services/assistant/operationPolicy/*` |
| Tests | planner/composer/action schema/executor tests |

## Implementation Pseudocode

```ts
function resolveContentEngineCandidates(facts: AssistantSiteBuilderIntakeFacts) {
  return facts.siteMap.pageRoles.flatMap((role) => {
    if (role === "projects") return contentEngine("portfolio-projects");
    if (role === "services") return contentEngine("services-directory");
    if (role === "products") return contentEngine("product-catalog");
    if (role === "blog") return gatedOrEngine("editorial-hub");
    return staticPage(role);
  });
}

function compileIntakeToSiteKitPlanInput(
  session: AssistantSiteBuilderIntakeSession
): AssistantSiteKitPlanInput {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(session);
  assertReadyForReview(normalized);
  return buildSiteKitPlanInputFromIntakeFacts(normalized.facts, {
    supportedSteps: siteBuilderPlanStepIds,
  });
}

function buildSiteKitPlanInputFromIntakeFacts(
  facts: AssistantSiteBuilderIntakeFacts,
  options: { supportedSteps: readonly SiteBuilderPlanStepId[] }
): AssistantSiteKitPlanInput {
  return {
    businessType: resolveSiteKitBusinessType(facts.businessProfile),
    goals: resolveSiteKitGoals(facts.siteGoals),
    locale: facts.businessProfile.locale,
    region: facts.businessProfile.region ?? null,
    siteName: facts.businessProfile.businessName ?? null,
    preferredKitId: facts.preferredKitId ?? null,
    selectedKitId: selectSolutionKitForFacts(facts).id,
    enabledStepIds: resolveEnabledSiteBuilderPlanSteps(facts, options.supportedSteps),
  };
}

function buildSiteBuilderIntakeCompileResult(
  facts: AssistantSiteBuilderIntakeFacts,
  deps: SiteBuilderIntakeCompileDeps
) {
  const siteKit = buildSiteKitPlanInputFromIntakeFacts(facts, {
    supportedSteps: deps.supportedSteps,
  });
  const contentEngines = resolveContentEngineCandidates(facts);
  return {
    siteKit,
    reviewFacts: {
      pageRoles: facts.siteMap.pageRoles,
      menu: facts.menu,
      hero: facts.hero,
      sections: facts.homepageSections,
      mediaPolicy: facts.media,
      visualPreset: facts.visual.presetId,
    },
    contentEngines,
    gates: unsupportedCapabilities(facts),
  };
}
```

## Data Flow and Error Handling

- Completed intake facts feed content-engine resolution first, then existing
  siteKit plan input compilation. Only the exact `AssistantSiteKitPlanInput`
  object enters `context.siteKit`; richer review/gate/engine facts stay in the
  compiler result and follow-on adapters. Strict typed action assembly still
  runs through the existing `buildSiteKitActionPlan` and action family contracts.
- Static pages, listings/detail routes, content engines, custom screens, lead
  capture, SEO, and media policy are selected from supported registries.
- Ambiguous follow-up prompts return a scoped target question; unsupported
  business requirements become explicit gates or `needs_input`.
- Graph conflicts, missing trusted resource locators, unsupported action
  families, or idempotency conflicts block execution until reviewed.

## Testing Requirements

- Planner tests for guided facts -> correct content engines/custom screens.
- Tests for follow-up refinement target resolution and ambiguity handling.
- Tests that unsupported module requests return gates/needs_input.
- Executor dry-run tests for generated actions and idempotency.
- Public runtime tests for at least one guided content-engine site.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` if action coverage changes.

## Acceptance Criteria

- Completed intake sessions assemble strict typed plans through existing siteKit
  and action family contracts.
- Content engines and custom screens are chosen from supported registries.
- Follow-up refinements are scoped, reviewable, and conflict-aware.
