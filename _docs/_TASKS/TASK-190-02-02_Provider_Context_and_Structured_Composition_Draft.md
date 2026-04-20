# TASK-190-02-02: Provider Context and Structured Composition Draft
# FileName: TASK-190-02-02_Provider_Context_and_Structured_Composition_Draft.md

**Priority:** High
**Category:** Assistant/Core + Provider Planning
**Estimated Effort:** Medium
**Dependencies:** TASK-190-02-01
**Status:** To Do

---

## Overview

Allow providers to suggest a composition draft using capability ids only.
Provider output remains untrusted and cannot include actions.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintProviderContext.ts`
- Add `core/services/assistant/blueprints/blueprintCompositionDraftSchema.ts`
- Update `core/services/assistant/providerPlanningContext.ts`
- Update `core/services/assistant/actionPlannerService.ts`
- Add `tests/vitest/assistant/blueprint-provider-context.test.ts`

## Pseudocode

```ts
type ProviderBlueprintCompositionDraft = {
  primaryCapabilityId: string;
  adjunctCapabilityIds: string[];
  gatedCapabilityIds: string[];
  notes?: string[];
};

const normalizeProviderBlueprintCompositionDraft = (value, registry) => {
  const draft = strictNormalize(value);
  assertKnownCapability(draft.primaryCapabilityId);
  draft.adjunctCapabilityIds.forEach(assertKnownCapability);
  return draft;
};
```

## Security Contract

- Visibility: provider planning context.
- Auth model: existing assistant route.
- RBAC: no permission grants.
- CSRF: unchanged.
- Rate-limit bucket: assistant.
- Reject-unknown validation: strict draft schema; unknown ids reject.
- Anti-abuse: provider cannot return actions, payloads, SQL, paths, or resource ids.
- Secret handling: provider context includes redacted manifest summaries only.

## Testing Requirements

- Valid provider draft normalizes.
- Unknown capability id rejects.
- Provider action arrays reject.
- Provider cannot invent page sections.
- Fallback uses deterministic local candidates.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
