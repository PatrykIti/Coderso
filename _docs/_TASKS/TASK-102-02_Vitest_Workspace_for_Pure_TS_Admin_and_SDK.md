# TASK-102-02: Vitest Workspace for Pure TS, Admin, and SDK
# FileName: TASK-102-02_Vitest_Workspace_for_Pure_TS_Admin_and_SDK.md

**Priority:** High  
**Category:** Platform + QA + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-102, TASK-102-01  
**Status:** To Do

---

## Overview

Introduce Vitest only where it matches architecture:
- pure domain/services,
- admin/UI,
- SDK contracts,
- Bun-free widget logic.

This is the main coverage-enabling lane.

## Scope

1. Create a `vitest.config.ts` with explicit lane ownership.
2. Configure environment per project:
   - `node` for pure domain and SDK,
   - `jsdom` or `happy-dom` for admin/UI.
3. Define `coverage.include` and `coverage.exclude`.
4. Add initial script surface for Vitest execution.

## Planned Config Shape

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    workspace: [],
    coverage: {
      provider: "v8",
      include: [
        "core/admin/**/*.{ts,tsx}",
        "core/ui/**/*.{ts,tsx}",
        "core/services/**/*.{ts,tsx}",
        "packages/sdk/src/**/*.ts",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "tests/integration/**",
        "tests/perf/**",
        "tests/security/**",
        "_docs/**",
        "core/dist/**",
      ],
      reporter: ["text", "html", "lcov", "json-summary"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
        perFile: true,
      },
      skipFull: true,
    },
  },
});
```

## Files to Create / Change

- `vitest.config.ts`
- `package.json`
- optional `tests/setup/vitest-admin.ts`
- optional `tests/setup/vitest-node.ts`

## Migration Targets (Wave 1)

- `tests/unit/ui/*`
- `tests/unit/sdk/*`
- selected `tests/unit/content/*` and `tests/unit/services/*` with no `Bun.*`
- Bun-free widget editor and validation suites

## Pseudocode

```ts
for (const suite of unitSuites) {
  if (usesBunRuntimeApi(suite)) continue;
  if (targetsAdminUi(suite)) moveToVitestProject(suite, "admin-ui");
  else if (targetsSdkOrPureDomain(suite)) moveToVitestProject(suite, "pure-domain");
}
```

## Acceptance Criteria

1. Vitest config exists without claiming ownership of runtime-kernel suites.
2. Coverage include/exclude patterns describe Bun-free application code only.
3. The chosen environments match actual suite needs.
4. Wave 1 migration targets are explicitly listed.

## Testing Requirements

- Config parsing and command examples must be valid.
- First migrated suites must pass under Vitest before expanding lane ownership.

## Documentation Updates Required

- `_docs/TESTING_STRATEGY.md`
- `README.md`
- `_docs/README.md`
