# 266 - Solution Kits Internal API and RBAC

- **Date:** 2026-02-19
- **Version:** 0.1.266
- **Tasks:** TASK-054-13, TASK-054-13-03

## Key Changes

### Internal API Expansion
- Extended solution kits internal routes:
  - `GET /solution-kits/runs`
  - `GET /solution-kits/runs/:runId`
  - `POST /solution-kits/:id/apply`
  - `POST /solution-kits/:id/rollback`
- Kept and aligned existing routes:
  - `GET /solution-kits`
  - `GET /solution-kits/:id`
  - `POST /solution-kits/plan`
- Files:
  - `core/server/routes/solutionKitsRoutes.ts`

### RBAC and Error Mapping
- Enforced permission split:
  - read routes: `solution-kits:read`
  - mutate routes (`apply`/`rollback`): `solution-kits:write`
- Added domain error mappings for:
  - `solution_kit_install_run_not_found` (404)
  - `solution_kit_rollback_source_not_found` (404)
  - `solution_kit_rollback_invalid_source` (409)

### Validation Contracts
- Added validation schemas:
  - `solutionKitApplyRequestSchema`
  - `solutionKitRollbackRequestSchema`
  - `solutionKitRunsQuerySchema`
  - `solutionKitRunIdSchema`
- File:
  - `core/server/validation/solutionKitSchemas.ts`

### Tests
- Updated route integration tests:
  - `tests/integration/routes/solutionKitsRoutes.test.ts`
- Added schema validation unit tests:
  - `tests/unit/server/solutionKitSchemas.test.ts`

### Docs
- Updated contracts in:
  - `_docs/CMS_API.md`
  - `_docs/ARCHITECTURE.md`

