# TASK-054-17-03: Solution Kits API and Admin UX Contract
# FileName: TASK-054-17-03_Solution_Kits_API_and_Admin_UX_Contract.md

**Priority:** High  
**Category:** API + Admin UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-17-01, TASK-054-17-02  
**Status:** Done (2026-02-20)

---

## Overview
Wystawic manifest contract przez API i pokazac go w `SolutionKitsPage` jako czytelny plan instalacji.

## Security Contract
- Visibility: `internal` (`/admin/api/solution-kits/*`).
- Auth: session + RBAC (`solution-kits:read`/`solution-kits:write`).
- Rate limit: `admin_read` dla `GET`; `admin_write` dla `POST` (`apply`/`rollback`).
- Anti-abuse: CSRF dla `POST` (wymuszone przez admin API layer).
- Public API: brak zmian.

## Scope
1. API payload:
   - `GET /solution-kits` -> summary z `manifest` preview,
   - `GET /solution-kits/:id` -> full manifest + blueprint.
2. Zaktualizowac walidatory i mapowanie typow clienta.
3. W `SolutionKitsPage` pokazac:
   - sekcje `Includes` (content types/forms/pages/menus/widgets/templates),
   - `requiredModules` i `optionalModules`,
   - `postInstallTasks` z czytelnymi labelami.

## Files
- `core/services/kits/solutionKitsService.ts`
- `core/server/routes/solutionKitsRoutes.ts`
- `core/server/validation/solutionKitSchemas.ts`
- `core/admin/services/solutionKitsClient.ts`
- `core/admin/ui/kits/SolutionKitsPage.tsx`
- `tests/integration/routes/solutionKitsRoutes.test.ts`
- `tests/unit/ui/solution-kits-page.test.tsx`

## Pseudocode
```ts
return {
  ...kit,
  manifest: buildSolutionKitManifest(kit),
};
```

```tsx
<ManifestCard>
  <IncludesList items={manifest.includes} />
  <ModuleBadges required={manifest.requiredModules} optional={manifest.optionalModules} />
  <PostInstallChecklist items={manifest.postInstallTasks} />
</ManifestCard>
```

## Testing Requirements
- Route tests: expected paths + payload shape includes manifest.
- UI tests: manifest sections render from cached/live data.

## Documentation Updates Required
- `_docs/CMS_API.md`
- `_docs/SOLUTION_KITS.md`

## Completion Notes (2026-02-20)
- Exposed manifest in list/detail service payloads used by internal solution kits API.
- Updated admin client contracts and Solution Kits page to render includes/modules/post-install checklist.
- Updated API contract docs (`_docs/CMS_API.md`).
