# TASK-407-03-L03: Basic Widget and Review Fact Selection
# FileName: TASK-407-03-L03-Basic-Widget-and-Review-Fact-Selection.md

**Parent Subtask:** TASK-407-03
**Priority:** High
**Category:** Assistant + Basic Review Facts
**Estimated Effort:** Medium
**Dependencies:** TASK-407-03-L02
**Status:** ✅ Done (2026-06-05)

---

## Overview

Map Basic facts to supported widget/page/content candidates and produce a
reviewable summary. This leaf stops before `siteKit` compilation and action
assembly.

## Sub-Tasks

- Add backend mappings from Basic section roles to supported widget aliases.
- Add candidate facts for pages, widgets, content engines, contact path, media
  policy, and gated items.
- Build a Basic review summary that explains chosen structure in beginner-safe
  language.
- Ensure widget aliases come from supported registries or documented gates.

## Security Contract

- Endpoint visibility: no new endpoint.
- Auth model: unchanged existing admin session.
- RBAC: unchanged until action assembly.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: widget aliases and content candidates must resolve
  through backend-owned registries.
- Anti-abuse: Basic review text is explanatory only and cannot embed executable
  instructions or unreviewed actions.
- Secret handling: review facts must redact secret-like user text and omit raw
  references, cookies, provider keys, and auth state.

## Files To Change

| Area | Files |
|---|---|
| Candidate mapping | `core/services/assistant/assistantSiteBuilderIntakeBasicReview.ts` |
| Widget registry lookup | existing widget/module registry helpers as needed |
| Tests | `tests/vitest/assistant/assistantSiteBuilderIntakeBasicReview.test.ts` |

## Implementation Pseudocode

```ts
export function buildBasicReviewFacts(facts: BasicSiteBuilderFacts) {
  const widgetCandidates = facts.homepageSectionRoles.map((role) => {
    const alias = resolveWidgetAliasForBasicRole(role);
    return alias ? widgetCandidate(role, alias) : gatedWidgetRole(role);
  });
  return {
    pages: facts.siteMap.pageRoles,
    menu: facts.menu,
    widgets: widgetCandidates,
    contentEngines: inferBasicContentCandidates(facts),
    gates: collectBasicGates(widgetCandidates, facts.media),
  };
}
```

## Data Flow and Error Handling

- Basic facts enter candidate mapping after all required steps are answered.
- Unsupported section roles, unavailable widgets, or missing content capabilities
  become review gates rather than invented actions.
- The returned review object is used by UI and later planner leaves, but does
  not execute or persist CMS resources by itself.

## Testing Requirements

- Tests for role -> widget candidate mapping.
- Tests for unsupported roles becoming gates.
- Tests for review summary redaction and stable ordering.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` for Basic review behavior.

## Acceptance Criteria

- Basic review facts are deterministic and explainable.
- Unsupported Basic needs are explicit gates.
- No `siteKit` plan or action graph is assembled in this leaf.

## Closure Evidence

- Added `assistantSiteBuilderIntakeBasicReview.ts` as a Bun-free helper that maps
  completed Basic intake facts into review-only pages, menu items, widget
  candidates, content-engine candidates, media policy, contact path, gates, and a
  bounded redacted summary.
- Widget support resolves through `modulePackMatrix` `assistantPageSections`.
  Unsupported Basic section roles such as process, benefits, comparison, and
  pricing become `widget_alias_unsupported` review gates instead of invented
  widgets or executable actions.
- Content engines are inferred from generic page and section roles as advisory
  review candidates only. The helper does not compile `siteKit`, create action
  ids, or call the provider.
- `featured-items` remains a generic visual `content-list` widget candidate; it
  does not imply a portfolio content engine unless the selected page roles do.
- Review facts require Basic review readiness, required non-review steps,
  `basicDefaults`, hero, and media policy; incomplete facts fail closed with
  `intake_session_invalid`.
- Media-library mode adds an explicit `media_library_selection_required` gate,
  while curated and placeholder policies remain review facts for later adapters.
- Unknown page roles, section roles, media policies, or content-engine ids fail
  closed through the shared intake registry helpers.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicDefaults.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicReview.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`
