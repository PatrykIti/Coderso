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
        "core/services/assistant/**/*.ts",
        "core/services/customScreens/**/*.ts",
        "packages/sdk/src/**/*.ts",
      ],
      exclude: ["**/*.d.ts", "**/node_modules/**"],
      skipFull: true,
    },
  },
});
