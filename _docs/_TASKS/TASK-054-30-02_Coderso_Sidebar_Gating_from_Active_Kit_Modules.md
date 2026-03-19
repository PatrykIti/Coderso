# TASK-054-30-02: Coderso Sidebar Gating from Active Kit Modules
# FileName: TASK-054-30-02_Coderso_Sidebar_Gating_from_Active_Kit_Modules.md

**Priority:** High  
**Category:** Admin/UI + Navigation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-30-01  
**Status:** Done (2026-03-19)

---

## Overview

Po zapisaniu aktywnego kitu trzeba przełożyć go na realne ograniczenie lewej
nawigacji `Coderso`.

## Scope

1. `AdminShell` odczytuje aktywny kit i jego summary/manifest.
2. Z helpera budowane sa `CodersoFeatureFlags`.
3. `buildDefaultNavSections(flags)` renderuje tylko moduly aktywnego kitu.
4. `Solution Kits` (`ai-kit-wizard`) pozostaje zawsze widoczny, zeby user mogl zmienic kit.
5. Brak aktywnego kitu = zero gatingu, pelny domyslny sidebar.

## Architecture

Rekomendowany helper:
```ts
buildCodersoFeatureFlagsForSolutionKit(kit: SolutionKitSummary | null): CodersoFeatureFlags
```

Rules:
- `true` dla modulow z `recommendedModules`, `manifest.requiredModules`, `manifest.optionalModules`
- `false` dla pozostalych `CodersoModuleId` z nav
- hard allowlist: `ai-kit-wizard`
- nie dotykamy top-level `Main`, `Tools`, `Admin`

## Sub-Tasks

1. Dodać helper mapujący kit modules na `CodersoFeatureFlags`.
2. Przepiąć `AdminShell` z `defaultNavSections` na dynamiczne `buildDefaultNavSections(flags)`.
3. Utrzymać custom screen shortcuts i pozostałe nav append flows bez regresji.
4. Dodać testy nav gatingu.

## Files to Create / Change

- `core/admin/services/solutionKitSelection.ts`
- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/navigation/sidebarConfig.ts`
- `core/admin/ui/navigation/codersoModules.ts` (if helper/types need export)
- `tests/vitest/ui/admin-shell-nav.test.tsx`
- `tests/vitest/admin/coderso-modules.test.ts`

## Testing Requirements

- `bun run vitest run tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/admin/coderso-modules.test.ts`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_NAVIGATION.md`
- `_docs/CODERSO_MODULES.md`

## Completion Notes (2026-03-19)

- `AdminShell` now reads the active solution kit and rebuilds `buildDefaultNavSections(flags)` dynamically.
- Coderso sidebar narrows to active-kit modules while `Solution Kits` remains visible.
- Default nav remains unchanged when no active kit is selected.
