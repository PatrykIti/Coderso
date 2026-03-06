# Testing Strategy

## Purpose

This document defines the target testing architecture for Nextless.
The system is intentionally WordPress-like at runtime:
- Bun remains the runtime kernel,
- plugin and widget bundles are loaded without rebuilding the whole CMS,
- runtime behavior must stay valid even when the app surface grows through installed bundles.

Because of that, the testing strategy must not force the whole codebase into one runner.
The correct split is:
- Bun for runtime-kernel behavior,
- Vitest for pure TypeScript, SDK, and admin/UI logic that should stay runtime-agnostic.

Current repo state:
- the repo ships both Bun and Vitest lanes,
- Bun remains authoritative for runtime-kernel, perf, security, and broader integration behavior,
- Vitest is now shipped for Bun-free suites under `tests/vitest/*`,
- Bun-free UI integration suites have been moved from `tests/integration/ui/*` into `tests/vitest/ui-integration/*`,
- further migration remains incremental by ownership, not by filename pattern alone.

## Business Rationale

The product goal is not "use Vitest everywhere".
The product goal is:
- keep the CMS runtime dynamic and WordPress-like,
- avoid unnecessary rebuild requirements,
- preserve runtime plugin installation and bundle activation,
- still gain strong source-wide coverage for pure application logic and admin UI.

This means test tooling must follow architecture boundaries, not replace them.

## Core Rule

Use the runner that matches the layer being validated.

If a test proves behavior that depends on:
- `Bun.serve`,
- `Bun.file`,
- runtime bundle loading,
- on-disk plugin activation,
- runtime asset serving,

then that test stays in Bun.

If a test proves behavior that should remain independent from the Bun kernel:
- domain services,
- schema validation,
- DTO mapping,
- admin React components,
- hooks,
- SDK helpers,
- widget normalization/render mapping without runtime adapters,

then that test should move to Vitest.

## Target Test Lanes

| Lane | Primary goal | Runner | Typical scope |
|------|--------------|--------|---------------|
| Runtime kernel | Validate Bun-backed runtime behavior | Bun | `core/server/*`, runtime adapters, plugin loader, bundle activation, public/admin HTTP handling |
| Runtime integration | Prove real CMS flows without rebuild assumptions | Bun | route wiring, install/upgrade/rollback, plugin store/install fixtures, SSR/runtime rendering |
| Performance and security gates | Validate release-blocking runtime budgets and hardening | Bun | `tests/perf/*`, `tests/security/*`, critical public/internal route contracts |
| Pure domain | Validate business logic without runtime kernel dependency | Vitest | `core/services/*` without `Bun.*`, validators, selectors, mappers |
| Admin/UI | Validate React/admin behavior with deterministic DOM tooling | Vitest | `core/admin/*`, `core/ui/*`, UI-facing widget editors, hooks, clients |
| SDK / shared contracts | Validate plugin-facing contracts and manifest helpers | Vitest | `packages/sdk/src/*`, pure manifest/schema helpers |

## Runner Ownership Rules

### Bun Owns

- Runtime server contract.
- File serving and runtime asset reads.
- Plugin bundle lifecycle.
- Store install/revocation integration.
- Public write protection and runtime security hardening.
- Performance budgets.
- Contract tests that must execute against the real Bun runtime.

### Vitest Owns

- Source-wide coverage for selected app code.
- Fast unit suites for domain/services.
- Admin/UI component tests with `jsdom` or `happy-dom`.
- SDK contract tests.
- Pure widget logic that can run without Bun runtime primitives.

### Do Not Do

- Do not move runtime-kernel tests to Vitest only to increase coverage numbers.
- Do not leak `Bun.*` APIs into pure business or UI layers.
- Do not use one global coverage percentage as a quality proxy for all layers.

## Coverage Policy

### Bun Coverage

Use Bun coverage only for Bun-owned suites.

What it is good for:
- showing uncovered lines in executed runtime files,
- emitting `text` and `lcov`,
- validating runtime contract suites in CI.

What it is not good for:
- full source-wide coverage of files never loaded by tests.

This means Bun coverage is a runtime-lane signal, not the primary source-wide coverage signal.

### Vitest Coverage

Use Vitest coverage for pure TS and admin/UI lanes.

Why:
- `coverage.include` can include source files that tests never touched,
- uncovered files can appear as `0%`,
- HTML + JSON + LCOV reporting is richer for refactoring and QA work,
- per-file thresholds are practical for application logic and UI surfaces.

Recommended target configuration shape:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
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
        "tests/**",
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

### Coverage Reporting Rule

Treat coverage as lane-specific:
- Bun coverage answers: "Are runtime files executed and guarded?"
- Vitest coverage answers: "Which pure TS/UI files are still untested?"

Optional report merging is allowed for CI visualization, but release decisions should remain per lane.

## Directory Strategy

The current `tests/` layout already contains useful intent:
- `tests/unit/*`
- `tests/integration/*`
- `tests/perf/*`
- `tests/security/*`

Target ownership:
- `tests/perf/*` -> Bun
- `tests/security/*` -> Bun
- `tests/integration/runtime/*` and Bun-backed route/install suites -> Bun
- `tests/integration/ui/*` -> Vitest-owned integration render suites
- pure domain and admin/UI unit suites -> Vitest

The migration should be done by ownership, not by filename pattern alone.

Example decision matrix:

| Example area | Target runner | Reason |
|-------------|---------------|--------|
| `tests/integration/store/install.test.ts` | Bun | Uses `Bun.serve` and validates runtime install flow |
| `tests/integration/server/mediaDeliveryAccess.test.ts` | Bun | Depends on real Bun HTTP/runtime behavior |
| `tests/unit/ui/*` | Vitest | UI behavior should not depend on Bun kernel |
| `tests/unit/content/*` | Vitest when Bun-free | Domain/service rules should stay runtime-agnostic |
| `tests/unit/sdk/*` | Vitest | SDK contract layer should be Bun-independent |

## Design Constraints For New Code

To make the hybrid strategy sustainable:

1. Keep Bun runtime APIs behind narrow adapters.
2. Make domain services depend on interfaces, not `Bun.*`.
3. Keep admin/UI code independent from runtime kernel details.
4. Test plugin/widget bundles with real built fixtures where runtime behavior matters.
5. Use DB-conditional tests only where DB behavior is part of the contract.

Recommended adapter seams:
- `RuntimeHttpServer`
- `RuntimeFileStore`
- `RuntimePluginLoader`
- `RuntimeAssetResolver`

The wider the Bun surface leaks into application logic, the harder the repo becomes to test and evolve.

## CI And Release Gates

Target CI model:
- `lint` and `lint:types` remain mandatory,
- Vitest lane produces source-wide coverage for pure TS/UI,
- Bun lane validates runtime contracts,
- Bun performance/security suites remain release-blocking,
- optional merged LCOV is publish-only, not architecture-defining.

Current command surface:

```bash
bun --cwd core lint
bun --cwd core lint:types

bun test tests/integration tests/perf tests/security
vitest run --config vitest.config.ts
vitest run --config vitest.config.ts --coverage
bun scripts/run-bun-coverage-baseline.ts
bun test --coverage --coverage-reporter=text --coverage-reporter=lcov --coverage-dir=coverage/bun-full tests/integration tests/perf tests/security
```

Current script split:

```json
{
  "test": "bun run test:bun && bun run test:vitest",
  "test:bun": "bun test tests/integration tests/perf tests/security",
  "test:vitest": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:coverage:bun": "bun scripts/run-bun-coverage-baseline.ts",
  "test:coverage:bun:full": "bun test --coverage tests/integration tests/perf tests/security",
  "test:coverage:all": "bun run test:coverage && bun run test:coverage:bun"
}
```

## Adoption Plan

Implementation is tracked by `TASK-102`.

Recommended order:
1. Document runtime-vs-pure ownership.
2. Add Vitest workspace/config only for pure lanes.
3. Migrate Bun-free unit and admin/UI suites first.
4. Keep Bun as the only runner for runtime/perf/security/plugin lifecycle suites.
5. Add per-lane coverage and CI gates.
6. Enforce new architecture rules for future code.

## Definition Of Done For The Hybrid Model

The target model is complete only when:
- Bun remains the production runtime kernel,
- runtime contract suites still run in Bun,
- Vitest owns pure TS/UI coverage,
- coverage reports reflect layer boundaries instead of hiding them,
- new code follows adapter boundaries and does not leak `Bun.*` into app/UI layers.
