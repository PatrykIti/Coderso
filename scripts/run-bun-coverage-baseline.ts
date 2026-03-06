const routeSuites = [
  "tests/integration/routes/accessLogs.test.ts",
  "tests/integration/routes/adminRoles.test.ts",
  "tests/integration/routes/adminUsers.test.ts",
  "tests/integration/routes/analytics.test.ts",
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
  "tests/integration/routes/widgetTemplateCategories.test.ts",
  "tests/integration/routes/widgetTemplatePreview.test.ts",
  "tests/integration/routes/widgetTemplates.test.ts",
  "tests/integration/routes/widgets.test.ts",
];

const baselineSuites = [
  "tests/integration/plugins/assets.test.ts",
  "tests/perf/admin-request-baseline.test.ts",
  "tests/perf/admin-prefetch-budget.test.ts",
];

async function canRunSuite(suite: string) {
  const proc = Bun.spawn(["bun", "test", suite], {
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
    console.warn(`[bun-coverage-baseline] skipping env-dependent route suite: ${suite}`);
  }
}

const proc = Bun.spawn(
  [
    "bun",
    "test",
    "--coverage",
    "--coverage-reporter=text",
    "--coverage-reporter=lcov",
    "--coverage-dir=coverage/bun",
    ...stableRouteSuites,
    ...baselineSuites,
  ],
  {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }
);

process.exit(await proc.exited);
