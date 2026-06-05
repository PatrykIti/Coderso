# TASK-407-05-L03: Content Engine Decision Rules
# FileName: TASK-407-05-L03-Content-Engine-Decision-Rules.md

**Parent Subtask:** TASK-407-05
**Priority:** High
**Category:** Assistant + Content Engines
**Estimated Effort:** Large
**Dependencies:** TASK-407-05-L02
**Status:** ⏳ To Do

---

## Overview

Add decision rules for when guided facts require supported content engines
instead of only static pages. Unsupported engine needs must become explicit
gates.

## Sub-Tasks

- Add rules for services, projects/portfolio, products, posts/editorial,
  testimonials/proof, team, locations, and FAQs where supported.
- Map engine candidates to existing catalog/listing/detail blueprint helpers.
- Gate unsupported engines, unsupported fields, or unsupported listing/detail
  behavior.
- Keep rules generic across industries and driven by page roles/goals/facts.

## Security Contract

- Endpoint visibility: internal assistant action routes only.
- Auth model: existing admin session.
- RBAC: content type/listing/entry/page permissions from existing action
  contracts.
- CSRF: required for admin POSTs.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: engine ids, field ids, listing ids, and generated
  action payloads must pass strict schemas.
- Anti-abuse: user text cannot create arbitrary database schemas, code, routes,
  plugins, or public write endpoints.
- Secret handling: engine metadata must not include raw prompts, provider keys,
  cookies, auth state, signed URLs, or raw reference text.

## Files To Change

| Area | Files |
|---|---|
| Decisions | `core/services/assistant/blueprints/guidedContentEngineDecisions.ts` |
| Blueprint helpers | `core/services/assistant/blueprints/catalogFamilyPresets.ts`, related catalog/listing helpers if needed |
| Tests | `tests/vitest/assistant/guidedContentEngineDecisions.test.ts` |

## Implementation Pseudocode

```ts
export function resolveGuidedContentEngines(facts: GuidedSiteBuilderFacts) {
  return facts.siteMap.pageRoles.map((role) => {
    const candidate = guidedEngineRegistry[role];
    if (!candidate) return staticPageOnly(role);
    if (!isEngineSupported(candidate, facts)) return gatedEngine(candidate, "engine_unsupported");
    return candidate;
  });
}
```

## Data Flow and Error Handling

- Guided page roles/goals produce engine candidates after static shell assembly.
- Unsupported engines, unsupported detail pages, unsafe public writes, or missing
  required fields produce gates/needs_input.
- Engine decisions feed later custom-screen and action assembly leaves; they do
  not execute directly.

## Testing Requirements

- Tests for each supported engine family decision.
- Tests for unsupported engine gates and missing-field questions.
- Tests that decisions do not depend on one hardcoded industry.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` if engine coverage changes.

## Acceptance Criteria

- Content-engine decisions are generic, supported, and explainable.
- Unsupported requests are gated.
- No arbitrary schema/code/plugin generation path is introduced.
