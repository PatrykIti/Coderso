# TASK-407-03: Basic Mode Structured Site Flow
# FileName: TASK-407-03-Basic-Mode-Structured-Site-Flow.md

**Parent Task:** TASK-407
**Priority:** High
**Category:** Assistant + Basic UX + Site Builder
**Estimated Effort:** Large
**Dependencies:** TASK-407-02
**Status:** ⏳ To Do

---

## Overview

Implement Basic mode: a safe default for users who do not understand CMS
structure. The assistant asks a short, rigid sequence, accepts simple
description text, chooses supported widgets/content models, and explains the
result before planning actions.

Basic mode should minimize free-form choices. It should use familiar controls:
single-choice goals, checkbox pages, menu preset choices, hero preset choices,
and bounded text prompts for business copy.

## Sub-Tasks

- Add Basic step definitions for profile, goal, pages, menu, hero, homepage
  sections, subpages, media preference, and review.
- Define starter site maps for common service-business needs without hardcoding
  a single industry.
- Let the backend choose widget aliases from supported widget/module registry
  mappings.
- Add review output listing selected pages, menu items, homepage widgets,
  subpage roles, contact path, content engines, and gates.
- Ensure incomplete Basic answers return `needs_input`, not partial executable
  plans.

## Security Contract

- Endpoint visibility: internal assistant plan/dry-run/execute routes only.
- Auth model: existing admin session.
- RBAC: plan/dry-run read permissions; execute action-specific write/publish
  permissions.
- CSRF: required for POST.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: Basic answers must reject unknown page roles, menu
  presets, widget aliases, hero variants, and media preferences.
- Anti-abuse: Basic free text is content description only and cannot name tools,
  schemas, endpoints, ids, or override restrictions.
- Secret handling: Basic answers and review summaries must redact secret-like
  strings before provider context or diagnostics.

## Files To Change

| Area | Files |
|---|---|
| Guide definitions | `core/services/assistant/guidedSiteBuilder*.ts` |
| Planner | `core/services/assistant/actionPlannerService.ts`, blueprint composer files |
| Admin UI | assistant panel/intake components |
| Tests | guided Basic flow tests and UI tests |

## Implementation Pseudocode

```ts
function buildBasicGuidedSteps(session: GuidedSiteBuilderSession) {
  return [
    question("profile", { controls: ["businessName", "industry", "locale"] }),
    question("goal", { options: ["leads", "booking", "portfolio", "catalog"] }),
    question("pages", { preset: "starter-7", allowCustomLabels: false }),
    question("menu", { options: ["single-level", "grouped"], default: "single-level" }),
    question("hero", { options: ["simple", "split", "image-led"], default: "simple" }),
    question("sections", { options: BASIC_SECTION_ROLES }),
    question("subpages", { deriveFromPages: true }),
    review("review"),
  ];
}

function buildBasicPlanFromFacts(facts: BasicSiteBuilderFacts) {
  const selectedWidgets = selectWidgetsForSectionRoles(facts.homepageSectionRoles);
  const contentEngines = inferContentEngines(facts.pages, facts.goal);
  return buildGuidedSiteBuilderPlan({ ...facts, selectedWidgets, contentEngines });
}
```

## Data Flow and Error Handling

- A broad nontechnical prompt enters Basic mode and is converted into bounded
  profile/goal/page/menu/hero/section answers before planning.
- Basic answers derive normalized facts; backend registries choose widget
  presets, page roles, subpage roles, and content-engine candidates.
- Missing required answers return `needs_input` for the next Basic step; they
  never produce partial executable actions.
- Prompt-injection text, unknown roles/options, unsupported media requests, or
  secret-like content are stored only as sanitized content hints or rejected
  before planner execution.

## Testing Requirements

- Basic step progression tests.
- Tests for safe defaults when user writes broad descriptions.
- Tests that prompt-poisoning text in Basic description is stored as copy/facts
  and cannot alter schema/action rules.
- Planner test for complete Basic flow -> reviewable/dry-runnable plan.
- UI test for Basic stepper and review handoff.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`

## Acceptance Criteria

- A nontechnical user can complete Basic flow without naming widgets or content
  types.
- The assistant explains chosen widgets/pages/menu/subpages before execution.
- Missing Basic data never produces a partial executable site plan.
