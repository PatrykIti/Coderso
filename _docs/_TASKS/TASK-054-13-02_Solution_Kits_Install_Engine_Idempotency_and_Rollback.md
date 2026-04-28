# TASK-054-13-02: Solution Kits Install Engine, Idempotency, and Rollback
# FileName: TASK-054-13-02_Solution_Kits_Install_Engine_Idempotency_and_Rollback.md

**Priority:** High  
**Category:** Domain/DB  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-13-01  
**Status:** Done (2026-02-19)

---

## Overview
Zaimplementować bezpieczny silnik instalacji kitów z idempotencją i możliwością rollbacku per instalacja.

## Scope
1. Tabele install run + install items (traceability).
2. Mechanizm apply:
   - dry-run (plan only),
   - apply (transaction-safe, partial-safe),
   - idempotent upsert (po slug/key/location).
3. Mechanizm rollback ostatniej instalacji (best-effort + log błędów).
4. Audit log zdarzeń apply/rollback.

## Files
- `core/db/schema.ts` (extend)
- `core/db/migrations/0044_solution_kits_installs.sql` (new)
- `core/db/migrations/meta/*` (update)
- `core/services/kits/solutionKitsInstallService.ts` (new)
- `tests/unit/kits/schema.test.ts` (new)
- `tests/unit/kits/installService.test.ts` (new)

## Pseudocode
```ts
const run = await createInstallRun({ kitId, mode });
for (const op of operations) {
  const result = await upsertResource(op);
  await appendRunItem(run.id, { op, result, rollbackHint });
}
await finalizeRun(run.id, "success");
```

## Testing Requirements
- Unit/DB: install run tables + constraints + cascade.
- Unit: apply dry-run nie zapisuje zasobów.
- Unit: apply dwa razy => brak duplikatów (idempotency).
- Unit: rollback przywraca stan lub oznacza precyzyjny błąd.

## Documentation Updates Required
- `_docs/DATA_MODEL.md` (nowe tabele)
- `_docs/CMS_API.md` (status run/install item shape)

## Completion Notes
- Added install-run persistence tables:
  - `solution_kit_install_runs`,
  - `solution_kit_install_items`.
- Added migration artifacts:
  - `core/db/migrations/0044_solution_kits_installs.sql`,
  - `core/db/migrations/meta/0044_snapshot.json`,
  - `core/db/migrations/meta/_journal.json` update.
- Implemented `core/services/kits/solutionKitsInstallService.ts`:
  - `applySolutionKitInstall` with `dry_run` and `apply`,
  - idempotent upsert flow for content types/forms/pages/menus,
  - per-resource operation log + rollback hints,
  - `rollbackSolutionKitInstall` (best-effort restore/delete),
  - audit events for apply/rollback.
- Added tests:
  - `tests/unit/kits/schema.test.ts`,
  - `tests/unit/kits/installService.test.ts`.
