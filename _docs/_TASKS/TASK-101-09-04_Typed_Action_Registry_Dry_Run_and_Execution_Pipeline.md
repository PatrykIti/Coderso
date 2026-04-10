# TASK-101-09-04: Typed Action Registry, Dry-Run, and Execution Pipeline
# FileName: TASK-101-09-04_Typed_Action_Registry_Dry_Run_and_Execution_Pipeline.md

**Priority:** High  
**Category:** Core/Assistant + Core/Services + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09-03  
**Status:** To Do

---

## Overview

Zbudowac wspolny silnik wykonawczy dla `llm-guide`, ale tak, aby:
- action registry byl jawny i whitelistowany,
- `dry-run` zwracal diff/conflicts/dependencies,
- execute korzystal z istniejacych serwisow i revision hooks.

## Scope

1. Registry typed actions i executor ownership per domain.
2. Dry-run diff model z conflict detection.
3. Execute flow z idempotency, audit i revision hooks.

## Existing Services to Reuse First

First-release action families must reuse current services before introducing any new mutation layer:

- content types:
  - `getContentTypeBySlug`
  - `createContentType`
  - `updateContentType`
  - file: `core/services/content/typeService.ts`
- entries:
  - `createEntry`
  - `updateEntry`
  - `updateEntryMetadata`
  - `publishEntry`
  - file: `core/services/content/entryService.ts`
- custom screens:
  - `createCustomScreen`
  - `updateCustomScreen`
  - file: `core/services/customScreens/customScreenService.ts`
- listing queries:
  - `createListingQuery`
  - `updateListingQuery`
  - `previewListingQuery`
  - file: `core/services/content/listingQueriesService.ts`
- listing templates:
  - `createListingTemplate`
  - `updateListingTemplate`
  - file: `core/services/content/listingTemplatesService.ts`
- pages:
  - `getPageBySlug`
  - `createPage`
  - `updatePage`
  - `publishPage`
  - file: `core/services/pages/pageService.ts`
- forms:
  - `createForm`
  - `updateForm`
  - `setFormFields`
  - file: `core/services/forms/formsService.ts`

Current kit-install flows to mine for reusable logic:
- `core/services/kits/solutionKitsInstallService.ts`
- `core/services/kits/kitInstaller.ts`

Rule:
- do not add assistant-specific direct DB writes for any resource that already has a domain service,
- if kit install owns the only robust implementation for part of a resource flow, extract shared helper(s)
  and make both kit-install and assistant actions call them.

## Legacy to Replace or Retire

- new duplicate resource mutators inside `core/services/assistant/actions/*` that bypass current domain services,
- wizard-only execution paths that duplicate generic preview/execute behavior,
- further growth of direct-DB install-only logic when it should become a shared reusable helper.

## Files to Change

- `core/services/assistant/actionRegistry.ts` (new, ~160-240 LOC)
- `core/services/assistant/actionExecutorService.ts` (new, ~220-320 LOC)
- `core/services/assistant/actionDiffService.ts` (new, ~140-220 LOC)
- `core/services/assistant/actions/*` (new, ~400-700 LOC)
- `tests/vitest/assistant/action-registry.test.ts` (new, ~140-220 LOC)
- `tests/vitest/assistant/action-diff-service.test.ts` (new, ~140-220 LOC)
- `tests/vitest/assistant/action-executor-service.test.ts` (new, ~180-280 LOC)

## Pseudocode

```ts
for (const action of plan.actions) {
  const handler = actionRegistry.get(action.type);
  const preview = await handler.preview(action, ctx);
  previews.push(preview);
}
```

## Sub-Tasks

- `TASK-101-09-04-01_Action_Registry_Dry_Run_Diff_and_Conflict_Model.md`
- `TASK-101-09-04-02_Execution_Idempotency_Revisions_and_Audit_Hooks.md`
- `TASK-101-09-04-03_Existing_Service_Adapters_and_Installer_Extraction.md`

## Testing Requirements

- Vitest unit for registry ownership and action validation.
- Vitest unit for diff/conflict detection.
- Bun integration for execute flow against real route/service boundaries where needed.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
