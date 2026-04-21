# TASK-190-02-02: Provider Context and Structured Composition Draft
# FileName: TASK-190-02-02_Provider_Context_and_Structured_Composition_Draft.md

**Priority:** High
**Category:** Assistant/Core + Provider Planning
**Estimated Effort:** Medium
**Dependencies:** TASK-190-02-01
**Status:** To Do

---

## Overview

Prepare a provider-side capability context for blueprint/setup prompts and allow
an optional shadow-only capability suggestion draft that uses capability ids
only. Provider output remains untrusted and cannot include actions.

This leaf must not replace the current production `cms_operation_draft`
contract used by generic CMS/admin planning. The existing provider response
contract stays unchanged unless a later cutover task explicitly promotes a
blueprint candidate response path.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintProviderContext.ts`
- Add `core/services/assistant/blueprints/blueprintCompositionDraftSchema.ts`
- Update `core/services/assistant/providerPlanningContext.ts`
- Update `core/services/assistant/actionPlannerService.ts`
- Add `tests/vitest/assistant/blueprint-provider-context.test.ts`

Owner rule:

- `providerPlanningContext.ts` remains the top-level owner of provider prompt
  packaging.
- `blueprintProviderContext.ts` may exist only as a narrow blueprint/setup
  helper consumed by `providerPlanningContext.ts`, not as a second parallel
  prompt-package entry point.

Scope guard:

- production `/assistant/actions/plan` provider routing continues to request
  `cms_operation_draft` for the generic CMS/admin path,
- any provider capability-id suggestion added here is shadow-only or
  blueprint-setup-only behind an explicit allowlist/feature flag,
- no production planner path may silently switch from `cms_operation_draft` to a
  new response contract in this leaf.

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
- Planner boundary: current generic CMS/admin provider contract stays
  `cms_operation_draft` until a later explicit cutover task.

## Testing Requirements

- Valid provider draft normalizes.
- Unknown capability id rejects.
- Provider action arrays reject.
- Provider cannot invent page sections.
- Fallback uses deterministic local candidates.
- Generic CMS/admin provider path keeps using `cms_operation_draft`.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
