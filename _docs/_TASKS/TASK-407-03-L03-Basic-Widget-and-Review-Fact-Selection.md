# TASK-407-03-L03: Basic Widget and Review Fact Selection
# FileName: TASK-407-03-L03-Basic-Widget-and-Review-Fact-Selection.md

**Parent Subtask:** TASK-407-03
**Priority:** High
**Category:** Assistant + Basic Review Facts
**Estimated Effort:** Medium
**Dependencies:** TASK-407-03-L02
**Status:** ⏳ To Do

---

## Overview

Map Basic facts to supported widget/page/content candidates and produce a
reviewable summary. This leaf stops before blueprint graph/action assembly.

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
| Candidate mapping | `core/services/assistant/guidedSiteBuilderBasicReview.ts` |
| Widget registry lookup | existing widget/module registry helpers as needed |
| Tests | `tests/vitest/assistant/guidedSiteBuilderBasicReview.test.ts` |

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
- No action graph is assembled in this leaf.
