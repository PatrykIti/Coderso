# TASK-190-07-03: Composition Review Metadata and Diagnostics
# FileName: TASK-190-07-03_Composition_Review_Metadata_and_Diagnostics.md

**Priority:** High
**Category:** Assistant/Core + Review UX + Diagnostics
**Estimated Effort:** Medium
**Dependencies:** TASK-190-07-01, TASK-190-07-02
**Status:** To Do

---

## Overview

Add explainable metadata for composed plans so review UI, tests, and logs can
show why the composer selected a primary capability, which adjunct fragments were
included, what was merged, and what was gated.

This prevents the composer from becoming a black box.

## Sub-Tasks

No child task files.

## Business Behavior

When the assistant returns a composed plan, reviewers should be able to answer:
- What primary blueprint did we choose?
- What fragments were added?
- What resources will be created or reused?
- What fields/facets/sections were merged?
- What conflicts were resolved?
- What remains gated or needs input?

## Files to Change

- Update `core/services/assistant/actionPlanTypes.ts`
- Update `core/services/assistant/actionPlanSchema.ts`
- Add `core/services/assistant/blueprints/blueprintCompositionMetadata.ts`
- Update `core/admin/ui/assistant/components/ActionPlanReview.tsx` if metadata is
  shown in UI.
- Add `tests/vitest/assistant/blueprint-composition-metadata.test.ts`
- Add UI test only if metadata rendering changes.

## Metadata Sketch

```ts
type AssistantBlueprintCompositionMetadata = {
  kind: "blueprint-composition";
  primaryCapabilityId: string;
  adjunctCapabilityIds: string[];
  gatedCapabilityIds: string[];
  mergedResources: Array<{
    key: string;
    kind: "content-type" | "page" | "listing" | "form" | "admin-screen";
    sourceCapabilityIds: string[];
  }>;
  resolvedConflicts: BlueprintConflict[];
  unresolvedConflicts: BlueprintConflict[];
  diagnostics?: {
    candidateScores?: Array<{ id: string; score: number; reasons: string[] }>;
  };
};
```

## Pseudocode

```ts
export const attachCompositionMetadata = (plan, graph, candidates) =>
  normalizeAssistantActionPlan({
    ...plan,
    metadata: {
      ...plan.metadata,
      blueprintComposition: buildCompositionMetadata(graph, candidates),
    },
  });
```

## Security Contract

- Visibility: internal review metadata.
- Auth model: existing admin session.
- RBAC: metadata does not grant permissions.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: metadata schema is strict.
- Anti-abuse: metadata cannot contain raw provider output or unvalidated payloads.
- Secret handling: metadata must redact secret-like values and raw user inputs
  beyond safe prompt snippets.

## Testing Requirements

- Metadata normalizes.
- Candidate scores are deterministic in tests.
- Gated modules appear in metadata but not executable actions.
- No secret-like values are serialized.
- Existing action plan schema remains backward-compatible.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/SECURITY_SPEC.md`
