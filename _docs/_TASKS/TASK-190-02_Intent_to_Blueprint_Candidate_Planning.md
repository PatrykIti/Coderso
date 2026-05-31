# TASK-190-02: Intent to Blueprint Candidate Planning
# FileName: TASK-190-02_Intent_to_Blueprint_Candidate_Planning.md

**Priority:** High
**Category:** Assistant/Core + Planner Intelligence
**Estimated Effort:** Large
**Dependencies:** TASK-190-01
**Status:** Done (2026-05-06)

---

## Overview

Add a candidate planner that reads the prompt and returns ranked blueprint
capability candidates. This layer decides whether the prompt should use a single
primary blueprint or a composed set of primary + adjunct modules.

This layer applies to blueprint/setup prompts. It does not replace the existing
generic CMS/admin mutation path, which remains owned by
`assistantOperationPolicy`, `cmsOperationDraft`, and the current
`cms_operation_draft` provider contract.

Business value:
- Users can ask for combined outcomes naturally.
- The assistant can recognize "catalog + lead capture + portfolio proof + blog"
  instead of collapsing the prompt into a single preset.
- Future blueprints become discoverable by metadata rather than prompt-specific
  if/else branches.

## Sub-Tasks

- `TASK-190-02-01_Prompt_Candidate_Extraction_and_Ranking.md`
- `TASK-190-02-02_Provider_Context_and_Structured_Composition_Draft.md`
- `TASK-190-02-03_Composer_Shadow_Mode_and_Routing_Cutover.md`

## Architecture

New owner files:

- `core/services/assistant/blueprints/blueprintCandidateResolver.ts`
- `core/services/assistant/blueprints/blueprintPromptSignals.ts`
- `core/services/assistant/blueprints/blueprintProviderContext.ts`
- `core/services/assistant/blueprints/blueprintComposerShadow.ts`
- `tests/vitest/assistant/blueprint-candidate-resolver.test.ts`
- `tests/vitest/assistant/blueprint-provider-context.test.ts`
- `tests/vitest/assistant/blueprint-composer-shadow.test.ts`

Candidate sketch:

```ts
type BlueprintCandidate = {
  capabilityId: string;
  role: "primary" | "adjunct" | "gated";
  score: number;
  matchedSignals: string[];
  reasons: string[];
};
```

## Acceptance Criteria

1. Candidate resolver can return multiple capabilities for one prompt.
2. Primary capability is deterministic.
3. Adjunct capabilities are deterministic and ordered.
4. Provider may suggest candidate ids but cannot invent capabilities.
5. Existing single-blueprint prompts keep their current selected primary.
6. Candidate shadow mode can run before full graph/merge/action assembly cutover.
7. Generic CMS/admin provider planning remains on the current
   `cms_operation_draft` contract until a later task explicitly widens it.

## Security Contract

- Visibility: internal planning only.
- Auth model: existing assistant planning auth.
- RBAC: candidate planning only reads metadata and advisory context.
- CSRF: no route changes.
- Rate-limit bucket: existing assistant planning bucket.
- Reject-unknown validation: provider composition draft rejects unknown ids,
  roles, and fields.
- Anti-abuse: candidate selection cannot create executable actions directly.
- Secret handling: provider context includes manifest summaries only, no secrets.

## Testing Requirements

- Vitest prompt fixture matrix:
  - single house projects,
  - product catalog + inquiry,
  - Mabudo-like catalog + lead + proof,
  - service directory + booking gated,
  - editorial hub + lead capture.
- Provider draft validation tests.
- Regression tests for current `intentFamily` behavior.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
