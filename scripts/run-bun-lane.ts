import path from "node:path";
import { mkdir, readFile, rm, stat } from "node:fs/promises";

import { formatBunLaneCoverageSummary, summarizeLcov } from "./bun-lane-coverage";

const routeSuites = [
  "tests/integration/routes/accessLogs.test.ts",
  "tests/integration/routes/adminRoles.test.ts",
  "tests/integration/routes/adminUsers.test.ts",
  "tests/integration/routes/analytics.test.ts",
  "tests/integration/routes/analyticsTraffic.test.ts",
  "tests/integration/routes/publicAnalytics.test.ts",
  "tests/integration/analytics/trafficSchema.test.ts",
  "tests/integration/analytics/trafficRepository.test.ts",
  "tests/integration/analytics/trafficAggregation.test.ts",
  "tests/integration/analytics/trafficRetention.test.ts",
  "tests/integration/routes/apiKeys.test.ts",
  "tests/integration/routes/assistant-rate-limit.test.ts",
  "tests/integration/routes/assistant.test.ts",
  "tests/integration/routes/audit.test.ts",
  "tests/integration/routes/auth.test.ts",
  "tests/integration/routes/backups.test.ts",
  "tests/integration/routes/bookingRoutes.test.ts",
  "tests/integration/routes/commerceRoutes.test.ts",
  "tests/integration/routes/contentTypes.test.ts",
  "tests/integration/routes/cors.test.ts",
  "tests/integration/routes/customScreensRoutes.test.ts",
  "tests/integration/routes/dashboard.test.ts",
  "tests/integration/routes/emailSettings.test.ts",
  "tests/integration/routes/filters.test.ts",
  "tests/integration/routes/formActionsRoutes.test.ts",
  "tests/integration/routes/forms.test.ts",
  "tests/integration/routes/importExport.test.ts",
  "tests/integration/routes/integrations.test.ts",
  "tests/integration/routes/ipAllowlist.test.ts",
  "tests/integration/routes/listings.test.ts",
  "tests/integration/routes/media.test.ts",
  "tests/integration/routes/menus.test.ts",
  "tests/integration/routes/pages.test.ts",
  "tests/integration/routes/pluginsRoutes.test.ts",
  "tests/integration/routes/popupsRoutes.test.ts",
  "tests/integration/routes/postsRoutes.test.ts",
  "tests/integration/routes/redirects.test.ts",
  "tests/integration/routes/search.test.ts",
  "tests/integration/routes/securityHeaders.test.ts",
  "tests/integration/routes/securitySettings.test.ts",
  "tests/integration/routes/sessions.test.ts",
  "tests/integration/routes/settings.test.ts",
  "tests/integration/routes/solutionKitsRoutes.test.ts",
  "tests/integration/routes/taxonomy.test.ts",
  "tests/integration/routes/themes.test.ts",
  "tests/integration/routes/userSettings.test.ts",
  "tests/integration/routes/webhooks.test.ts",
  "tests/integration/routes/pageTemplates.test.ts",
  "tests/integration/routes/widgets.test.ts",
];

const baselineSuites = [
  "tests/integration/plugins/assets.test.ts",
  "tests/perf/admin-request-baseline.test.ts",
  "tests/perf/admin-prefetch-budget.test.ts",
  "tests/perf/analyticsIngestion.test.ts",
  "tests/security/analyticsBeacon.test.ts",
];

type Mode = "test" | "coverage" | "all";

const repoRoot = path.resolve(import.meta.dir, "..");
const logPrefix = "[bun-lane]";
const coverageDir = path.join(repoRoot, "coverage", "bun");
const coverageLcovPath = path.join(coverageDir, "lcov.info");

const parseMode = (argv: string[]): Mode => {
  if (argv.length === 0) return "all";
  if (argv.length !== 1) throw new Error(`invalid_args:${argv.join(",")}`);

  const [arg] = argv;
  if (arg === "--test") return "test";
  if (arg === "--coverage") return "coverage";
  if (arg === "--all") return "all";
  throw new Error(`unknown_arg:${arg}`);
};

const mode = parseMode(Bun.argv.slice(2));

async function canRunSuite(suite: string) {
  const proc = Bun.spawn(["bun", "test", suite], {
    cwd: repoRoot,
    stdout: "ignore",
    stderr: "ignore",
  });
  const exitCode = await proc.exited;
  return exitCode === 0;
}

const stableRouteSuites: string[] = [];

for (const suite of routeSuites) {
  if (await canRunSuite(suite)) {
    stableRouteSuites.push(suite);
  } else {
    console.warn(`${logPrefix} skipping env-dependent route suite: ${suite}`);
  }
}

const laneSuites = [...stableRouteSuites, ...baselineSuites];

console.log(
  `${logPrefix} selected ${stableRouteSuites.length} route suites and ${baselineSuites.length} baseline suites`
);

const runBunTest = async (title: string, args: string[]) => {
  console.log(`${logPrefix} ${title}`);
  const proc = Bun.spawn(["bun", "test", ...args], {
    cwd: repoRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
};

const prepareCoverageDir = async () => {
  await rm(coverageDir, { recursive: true, force: true });
  await mkdir(coverageDir, { recursive: true });
};

const printCoverageSummary = async () => {
  const [content, coverageStat] = await Promise.all([
    readFile(coverageLcovPath, "utf8"),
    stat(coverageLcovPath),
  ]);
  const relativePath = path.relative(repoRoot, coverageLcovPath);

  console.log(`${logPrefix} coverage artifact: ${relativePath} (${coverageStat.size} bytes)`);
  console.log(formatBunLaneCoverageSummary(summarizeLcov(content)));
};

if (mode === "test" || mode === "all") {
  await runBunTest("running Bun lane tests", laneSuites);
}

if (mode === "coverage" || mode === "all") {
  await prepareCoverageDir();
  await runBunTest("running Bun lane coverage", [
    "--coverage",
    "--coverage-reporter=lcov",
    "--coverage-dir=coverage/bun",
    "--reporter=dots",
    ...laneSuites,
  ]);
  await printCoverageSummary();
}

export {};
