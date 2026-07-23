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
