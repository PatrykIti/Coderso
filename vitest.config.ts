import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "core/admin"),
    },
  },
  test: {
    name: "coderso-vitest",
    environment: "node",
    execArgv: ["--no-experimental-webstorage"],
    include: ["tests/vitest/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["tests/setup/vitest.ts"],
    // Lane-wide per-test budget. The lane transforms and imports its module graph
    // per worker, so a test's wall clock is dominated by contention rather than by
    // the work it asserts: the slowest boundary test costs 4.4s alone and over 15s
    // inside the full parallel run. Vitest's 5000ms library default is below that
    // floor, which failed tests that pass in isolation. `test:bun` and the coverage
    // lane already declare their own full-suite budgets for the same reason; this
    // gives the plain Vitest lane the one it never had. Assertions are unchanged --
    // a hung test still fails, it just is not raced by a neighbouring worker.
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage/vitest",
      reporter: ["text", "html", "lcov", "json-summary"],
      include: [
        "core/admin/services/**/*.ts",
        "core/admin/utils/**/*.ts",
        "core/admin/ui/**/*.{ts,tsx}",
        "core/services/assistant/actionPlanHeuristics.ts",
        "core/services/assistant/actionPlanSchema.ts",
        "core/services/assistant/actionPlanTypes.ts",
        "core/services/assistant/actionPlannerService.ts",
        "core/services/assistant/adminContextService.ts",
        "core/services/assistant/modelCapabilities.ts",
        "core/services/assistant/operationPolicy/providerGuidance.ts",
        "core/services/assistant/providerPlanningContext.ts",
        "core/services/assistant/providers/**/*.ts",
        "core/services/assistant/blueprints/**/*.ts",
        "core/services/customScreens/**/*.ts",
        "packages/sdk/src/**/*.ts",
      ],
      exclude: ["**/*.d.ts", "**/node_modules/**"],
      skipFull: true,
    },
  },
});
