# TASK-054-13-05-01: Wizard Apply Contract and Planner Step Selection
# FileName: TASK-054-13-05-01_Wizard_Apply_Contract_and_Planner_Step_Selection.md

**Priority:** High  
**Category:** Assistant/API  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-13-03, TASK-054-13-04  
**Status:** To Do

---

## Overview
Rozszerzyć kontrakt apply dla solution kits o dane planu z wizarda (wybrane kroki + metadata), tak aby execution był deterministyczny i audytowalny.

## Security Contract
- **Visibility:** `internal` (`/admin/api/solution-kits/*`)
- **Auth path:** session + RBAC (`solution-kits:write`)
- **Rate-limit bucket:** `admin_write`
- **Anti-abuse:** CSRF (`withCsrf: true`) dla apply/rollback
- **Execution safety:** `plan -> review -> confirm -> execute`; backend wykonuje tylko typed payload (bez raw prompt execution)

## Scope
1. Dodać typed step ids i mapowanie step -> resource blueprint.
2. Dodać `plan` payload do `POST /solution-kits/:id/apply`.
3. Przefiltrować `kitDefinitionOverride.resourceBlueprint` wg `enabledStepIds`.
4. Zapisywać wizard metadata do `run.options` (audyt/clone-as-draft).

## Files
- `core/services/kits/solutionKitTypes.ts`
- `core/services/assistant/siteBuilderPlanner.ts`
- `core/server/validation/solutionKitSchemas.ts`
- `core/server/routes/solutionKitsRoutes.ts`
- `core/services/kits/solutionKitsInstallService.ts`
- `core/admin/services/solutionKitsClient.ts`

## Pseudocode
```ts
// route
validate(solutionKitApplyRequestSchema, body)
const enabled = body.plan?.enabledStepIds ?? DEFAULT_STEP_IDS
const baseKit = getSolutionKit(kitId)
const override = filterBlueprintByEnabledSteps(baseKit, enabled)

applySolutionKitInstall({
  kitId,
  actorId,
  dryRun,
  continueOnError,
  kitDefinitionOverride: override,
  runOptions: {
    wizard: {
      enabledStepIds: enabled,
      settingsPatch: body.plan?.settingsPatch ?? {},
      notes: body.plan?.notes ?? [],
    },
  },
})
```

## Testing Requirements
- Unit: planner step selection filtruje blueprint deterministycznie.
- Unit: schema apply akceptuje/odrzuca poprawne i niepoprawne `plan.enabledStepIds`.
- Integration: routes walidują `plan` payload i mapują błędy.
- Unit: admin client wysyła `plan` payload do apply endpoint.

## Documentation Updates Required
- `_docs/CMS_API.md` (apply payload `plan` + semantics)
- `_docs/ARCHITECTURE.md` (wizard execution model i typed filtering)
