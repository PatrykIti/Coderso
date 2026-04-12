# 622. TASK-175 solution kit screens and module focus convergence

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-175

## Key Changes

### Coderso IA
- Kept `Coderso > Screens` visible under active Solution Kit focus for kits that include the content authoring stack.
- Expanded active kit focus from the module registry dependency graph, so dependent modules are not hidden.
- Added `custom-screens` and missing dependency modules to current Solution Kit recommended module scopes.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/solutionKitSelection.test.ts tests/vitest/admin/coderso-modules.test.ts`
  - `bun test tests/unit/kits/solutionKitsCatalog.test.ts`
