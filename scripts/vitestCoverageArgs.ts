export const VITEST_COVERAGE_TEST_TIMEOUT_MS = 15_000;

export const buildVitestCoverageArgs = (vitestBin: string, coverageDir: string): string[] => [
  vitestBin,
  "run",
  "--config",
  "vitest.config.ts",
  "--coverage",
  `--testTimeout=${VITEST_COVERAGE_TEST_TIMEOUT_MS}`,
  "--coverage.clean=false",
  `--coverage.reportsDirectory=${coverageDir}`,
];
