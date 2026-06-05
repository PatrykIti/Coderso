# TASK-407-05: Blueprint Composer and Content Engine Decisions
# FileName: TASK-407-05-Blueprint-Composer-and-Content-Engine-Decisions.md

**Parent Task:** TASK-407
**Priority:** High
**Category:** Assistant + Blueprint Composer + Content Engine
**Estimated Effort:** Large
**Dependencies:** TASK-407-02, TASK-407-03, TASK-407-04
**Status:** ⏳ To Do

---

## Overview

Connect completed guided-intake sessions to the existing typed action engine.
The assistant must decide when a page should stay static and when it needs a
content engine: content type, entries, listing page, detail page, filters, custom
screen, and admin bindings. Follow-up prompts such as "change projects page"
must reuse trusted existing resources and ask for targets when ambiguous.

## Sub-Tasks

- Convert normalized guide facts into blueprint capability candidates and graph
  inputs.
- Add content-engine decision rules for services, projects/portfolio, products,
  posts/editorial, testimonials/proof, team, locations, and FAQs where supported.
- Add custom-screen decision rules for content engines that need beginner
  editing surfaces.
- Ensure unsupported modules become gates, not invented actions.
- Implement follow-up refinement routing from active page/custom screen/listing
  context or server-derived candidates.

## Security Contract

- Endpoint visibility: internal assistant action routes only.
- Auth model: existing admin session.
- RBAC: action-specific read/write/publish permissions from existing contracts.
- CSRF: required for POST.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: generated graph fragments must normalize through
  existing strict action schemas before dry-run/execute.
- Anti-abuse: follow-up prompts cannot target resources by untrusted free text
  alone; targets must resolve from active context or server-side catalogs.
- Secret handling: provider/context packages and diagnostics must use prompt
  hashes/redacted facts, not raw secrets or raw file text.

## Files To Change

| Area | Files |
|---|---|
| Planner/composer | `core/services/assistant/actionPlannerService.ts`, `core/services/assistant/blueprints/*` |
| Content engine | catalog family presets/blueprints, custom screen composer helpers |
| Policy | `core/services/assistant/operationPolicy/*` |
| Tests | planner/composer/action schema/executor tests |

## Implementation Pseudocode

```ts
function resolveContentEngineCandidates(facts: SiteBuilderFacts) {
  return facts.pageRoles.flatMap((role) => {
    if (role === "projects") return contentEngine("portfolio-projects");
    if (role === "services") return contentEngine("services-directory");
    if (role === "products") return contentEngine("product-catalog");
    if (role === "blog") return gatedOrEngine("editorial-hub");
    return staticPage(role);
  });
}

function buildGuidedBlueprintGraph(facts: SiteBuilderFacts) {
  const contentEngines = resolveContentEngineCandidates(facts);
  const customScreens = contentEngines.filter(needsBeginnerAdminScreen).map(buildCustomScreen);
  return buildBlueprintCompositionGraph({
    primary: businessWebsiteShell(facts),
    adjuncts: [...contentEngines, ...customScreens, leadCaptureIfNeeded(facts)],
    gated: unsupportedCapabilities(facts),
  });
}
```

## Data Flow and Error Handling

- Completed guided facts feed content-engine resolution first, then blueprint
  graph assembly, then strict typed action assembly through existing action
  family contracts.
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

- Completed guide sessions assemble strict typed plans through existing action
  families.
- Content engines and custom screens are chosen from supported registries.
- Follow-up refinements are scoped, reviewable, and conflict-aware.
