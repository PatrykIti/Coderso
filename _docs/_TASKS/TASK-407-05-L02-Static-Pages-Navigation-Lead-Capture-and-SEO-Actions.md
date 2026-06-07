# TASK-407-05-L02: Static Pages Navigation Lead Capture and SEO Actions
# FileName: TASK-407-05-L02-Static-Pages-Navigation-Lead-Capture-and-SEO-Actions.md

**Parent Subtask:** TASK-407-05
**Priority:** High
**Category:** Assistant + Static Site Actions
**Estimated Effort:** Large
**Dependencies:** TASK-407-05-L01
**Status:** ✅ Done (2026-06-05)

---

## Overview

Assemble strict actions for static pages, navigation/footer, lead capture, and
SEO from the compiled siteKit plan input. This leaf must use existing action family
contracts and same-plan locators.

## Sub-Tasks

- Convert compiled siteKit static-shell inputs into page create/update actions.
- Assemble menu/footer actions from normalized menu facts and same-plan locators.
- Add lead-capture/contact actions when selected by goals and supported forms.
- Add SEO document actions for generated pages.
- Validate all generated actions through existing strict action schemas before
  dry-run/execute.

## Security Contract

- Endpoint visibility: internal assistant action routes only.
- Auth model: existing admin session.
- RBAC: action-specific page/menu/form/SEO write and publish permissions from
  `actionFamilyContracts`.
- CSRF: required for admin POSTs.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: every generated action must pass existing strict
  action schemas and reject unknown fields.
- Anti-abuse: no public assistant write endpoint, no arbitrary URLs/scripts, and
  no mutation before review/dry-run/execute.
- Secret handling: generated actions must not contain provider keys, cookies,
  CSRF tokens, auth state, raw prompts, signed URLs, or raw reference text.

## Files To Change

| Area | Files |
|---|---|
| Action assembly | `core/services/assistant/siteBuilderPlanAdapter.ts`, `core/services/assistant/actionPlannerService.ts`, or existing assembler |
| Contracts | existing `core/services/assistant/actionFamilyContracts.ts` only if action coverage changes |
| Tests | `tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts` |

## Implementation Pseudocode

```ts
function buildSiteKitActionPlan(siteKit: AssistantSiteKitPlanInput) {
  const actionPlan = createExistingSiteKitRecommendAndInstallPlan(siteKit);
  assertReviewedSiteKitStaticCoverage(actionPlan, siteKit);
  return actionPlan;
}

function assertReviewedSiteKitStaticCoverage(
  plan: AssistantActionPlan,
  siteKit: AssistantSiteKitPlanInput
) {
  const installPreview = getSiteKitInstallPreview(plan);
  assertExpectedPageActions(installPreview);
  assertExpectedPrimaryAndFooterMenus(installPreview);
  assertExpectedLeadCaptureForms(installPreview, siteKit.goals);
  assertSeoDefaultsForEveryGeneratedPage(installPreview);
  assertUniqueSamePlanLocators(installPreview);
}
```

## Data Flow and Error Handling

- Compiled siteKit input enters the existing `buildSiteKitActionPlan` path and
  normalizes into strict page/menu/footer/contact/SEO actions.
- Missing locators, unsupported contact paths, unsafe hrefs, schema failures, or
  RBAC conflicts become blocking conflicts or gates before execute.
- The existing siteKit planner path is idempotent: repeated dry-runs should produce stable actions
  and same-plan locators.

## Testing Requirements

- Tests for generated pages, menu/footer links, lead capture, and SEO actions.
- Tests for strict schema validation and reject-unknown behavior.
- Tests for same-plan locator stability and idempotent dry-run output.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` if static action coverage changes.
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` if coverage changes.

## Acceptance Criteria

- Static site resources are assembled through existing action contracts.
- Generated actions are strict, idempotent, and reviewable.
- Unsupported static needs become gates rather than invented mutations.

## Completion Notes

- Added `assistantSiteBuilderIntakeStaticActions.ts` as a pure service helper
  that normalizes reviewed siteKit input through the existing
  `site-kit.recommend` / `site-kit.install` action path.
- Wired the coverage gate into the production `buildSiteKitActionPlan` path, so
  `planAssistantActions({ context: { siteKit } })` fails closed before returning
  executable actions when required static shell coverage drifts.
- Verified static shell coverage from the selected kit preview: page resources,
  primary/footer menus, lead-capture forms, page SEO defaults, action ids, and
  same-plan `target:resourceKey` locators.
- Kept page/menu/form/SEO mutation ownership in the existing solution-kit
  installer instead of introducing a parallel low-level action path.
- Missing page/menu/lead form/SEO coverage or duplicate same-plan locators now
  fail closed as review gates before execute.
- Added regression tests for partial page, primary menu, lead form, and
  generated-page-without-SEO drift.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts`
- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
