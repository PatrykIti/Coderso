import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "nextless-vitest",
    environment: "node",
    include: ["tests/vitest/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage/vitest",
      reporter: ["text", "lcov", "json-summary"],
      include: [
        "core/admin/lib/**/*.ts",
        "core/admin/utils/**/*.ts",
        "packages/sdk/src/**/*.ts",
      ],
      exclude: ["**/*.d.ts", "**/node_modules/**"],
      skipFull: true,
    },
  },
});
