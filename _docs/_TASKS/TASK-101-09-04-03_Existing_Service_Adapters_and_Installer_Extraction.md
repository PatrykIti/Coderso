# TASK-101-09-04-03: Existing Service Adapters and Installer Extraction
# FileName: TASK-101-09-04-03_Existing_Service_Adapters_and_Installer_Extraction.md

**Priority:** High  
**Category:** Core/Assistant + Domain Services  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-04-02  
**Status:** To Do

---

## Overview

Ten leaf pilnuje najwazniejszej zasady wdrozenia:
- assistant actions maja reuse’owac aktualne mutatory domenowe,
- a tam gdzie obecny site-builder/install ma jedyny sensowny write path, trzeba z niego wyciagnac wspolny helper,
- nie budujemy trzeciej, assistant-only sciezki zapisu.

## Existing Code to Reuse or Extract From

- `core/services/content/typeService.ts`
- `core/services/content/entryService.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/services/content/listingQueriesService.ts`
- `core/services/content/listingTemplatesService.ts`
- `core/services/pages/pageService.ts`
- `core/services/forms/formsService.ts`
- `core/services/kits/solutionKitsInstallService.ts`
- `core/services/kits/kitInstaller.ts`

## Files to Change

- `core/services/assistant/actions/*` (new/update, ~220-340 LOC)
- `core/services/kits/solutionKitsInstallService.ts` (update, ~80-160 LOC)
- `core/services/kits/kitInstaller.ts` (update, ~40-80 LOC)
- relevant domain services above where extracted helper ownership should live

## Pseudocode

```ts
const upsertPageFromBlueprint = sharedPageUpsertHelper(seed, deps);

// used by:
// - site builder / solution kit install
// - generic assistant action executor
```

## Sub-Tasks

1. Identify resource writes still trapped inside install-only DB logic.
2. Extract shared helpers into the owning domain/service module.
3. Make assistant and site-builder depend on the same helper.
4. Delete or stop extending the duplicate legacy path once shared ownership exists.

## Testing Requirements

- Vitest unit for extracted shared helpers only when the extracted helper is Bun-free and import-safe.
- If the helper still imports DB/settings/runtime modules at module load, keep the suite in Bun until refactor lands.
- Bun integration proving assistant and site-builder use equivalent mutation behavior.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
