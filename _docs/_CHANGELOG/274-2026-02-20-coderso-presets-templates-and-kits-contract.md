# 274 - Coderso Presets, Templates, and Kits Contract

- **Date:** 2026-02-20
- **Version:** 0.1.274
- **Tasks:** TASK-054-17, TASK-054-17-01, TASK-054-17-02, TASK-054-17-03, TASK-054-17-04

## Key Changes

### Kit Manifest Contract
- Added `SolutionKitManifest` contract and normalization in `core/services/kits/kitManifest.ts`.
- Added manifest generation for every catalog kit (`includes`, `requiredModules`, `postInstallTasks`).
- Kit summaries/details now expose manifest payload for admin API consumers.

### Template Installer Layer
- Added template installer service in `core/services/templates/templateInstaller.ts`.
- Added deterministic collision strategy with ownership marker:
  - marker: `[nextless-kit-template:<kitId>:<key>]`
  - unmanaged collision fallback: `Name`, `Name (2)`, `Name (3)`, ...
- Added template rollback plan model for kit install metadata.

### Kit Orchestrator
- Added `core/services/kits/kitInstaller.ts` orchestration:
  - core resource install via existing install engine,
  - template phase install/rollback,
  - run metadata persisted in `options.manifest` and `options.kitInstaller`.
- `solutionKitsService` now routes apply/rollback through orchestrator.

### Admin/UI + Docs
- Updated `SolutionKitsPage` with manifest-driven details:
  - includes counters,
  - required modules,
  - post-install checklist.
- Updated contracts/docs:
  - `_docs/SOLUTION_KITS.md`
  - `_docs/TEMPLATE_CONTRACTS.md` (new)
  - `_docs/CMS_API.md`

### QA
- Added tests:
  - `tests/unit/kits/kitManifest.test.ts`
  - `tests/unit/kits/kitInstaller.test.ts`
- Extended existing kits tests to assert manifest availability.
- Validation run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/kits`
  - `bun test tests/unit/templates/templateInstaller.test.ts`
  - `bun test tests/unit/admin/solutionKitsClient.test.ts`
  - `bun test tests/unit/ui/solution-kits-page.test.tsx tests/integration/routes/solutionKitsRoutes.test.ts`
