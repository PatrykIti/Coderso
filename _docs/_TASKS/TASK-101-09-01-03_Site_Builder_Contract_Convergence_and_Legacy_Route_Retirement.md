# TASK-101-09-01-03: Site Builder Contract Convergence and Legacy Route Retirement
# FileName: TASK-101-09-01-03_Site_Builder_Contract_Convergence_and_Legacy_Route_Retirement.md

**Priority:** High  
**Category:** Core/Assistant + Admin/UI + Runtime Contracts  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-01-02  
**Status:** To Do

---

## Overview

Obecny `assistant/site-builder` to juz typed guided workflow. Nie mozemy po prostu dolozyc obok niego
drugiego, osobnego `llm-guide` execution flow.

Ten leaf ma doprowadzic do konwergencji:
- current site-builder becomes a preset/specialization of the generic guide engine,
- review/execute UX and route shapes are reused where practical,
- standalone legacy contracts are deprecated when parity is reached.

## Existing Code to Reuse

- `core/services/assistant/siteBuilderPlanner.ts`
- `core/services/assistant/siteBuilderExecutor.ts`
- `core/server/routes/assistantRoutes.ts`
- `core/admin/services/assistantClient.ts`
- `core/admin/ui/setup/AiSiteWizard.tsx`
- `core/admin/ui/setup/AiSiteWizardSteps.tsx`
- `_docs/ASSISTANT_SITE_BUILDER.md`

## Legacy to Replace or Retire

- `/assistant/site-builder/plan`
- `/assistant/site-builder/execute`
- `/assistant/site-builder/validate`

Target state:
- keep them as temporary aliases only if needed,
- move primary ownership to the generic `/assistant/actions/*` flow,
- stop growing wizard-only execution logic in parallel.

## Files to Change

- `core/services/assistant/siteBuilderExecutor.ts` (update, ~80-140 LOC)
- `core/server/routes/assistantRoutes.ts` (update, ~60-120 LOC)
- `core/admin/services/assistantClient.ts` (update, ~40-80 LOC)
- `core/admin/ui/setup/AiSiteWizard.tsx` (update, ~60-120 LOC)
- `_docs/ASSISTANT_SITE_BUILDER.md` (update)

## Pseudocode

```ts
if (request.kind === "site-builder") {
  return runGuidePreset("site-builder", request);
}
```

## Sub-Tasks

1. Move common plan/review/execute contracts behind shared guide types.
2. Keep temporary aliases for current wizard routes only if needed for migration.
3. Mark wizard-only routes/components as deprecated once generic flow reaches parity.

## Testing Requirements

- Vitest unit only for alias normalization helpers that stay Bun-free.
- Bun integration for old and new endpoints hitting the same underlying executor contract.
- UI smoke coverage for reused review/execute flow.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
