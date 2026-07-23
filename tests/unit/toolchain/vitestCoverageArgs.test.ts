import { expect, test } from "bun:test";

import {
  VITEST_COVERAGE_TEST_TIMEOUT_MS,
  buildVitestCoverageArgs,
} from "../../../scripts/vitestCoverageArgs";

test("Vitest coverage receives a coverage-only timeout budget", () => {
  const args = buildVitestCoverageArgs("/repo/node_modules/.bin/vitest", "/repo/coverage/vitest");

  expect(VITEST_COVERAGE_TEST_TIMEOUT_MS).toBe(15_000);
  expect(args).toEqual([
    "/repo/node_modules/.bin/vitest",
    "run",
    "--config",
    "vitest.config.ts",
    "--coverage",
    "--testTimeout=15000",
    "--coverage.clean=false",
    "--coverage.reportsDirectory=/repo/coverage/vitest",
  ]);
});
