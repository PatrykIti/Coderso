import path from "node:path";

import {
  assertAdminBundleBudget,
  assertAdminBundleSplitEvidence,
  collectWidgetRegistryEvidence,
  formatBytes,
  readAdminBundleReport,
  writeAdminBundleReport,
} from "./adminBundleReport";

type Args = {
  distDir: string;
  reportPath: string;
};

const repoRoot = path.resolve(import.meta.dir, "..");

const parseArgs = (argv: string[]): Args => {
  const args: Args = {
    distDir: path.join(repoRoot, "core", "dist", "client"),
    reportPath: path.join(repoRoot, ".tmp", "admin-bundle-report.json"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dist") {
      const next = argv[index + 1];
      if (!next) throw new Error("invalid_dist_path");
      args.distDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (arg === "--report") {
      const next = argv[index + 1];
      if (!next) throw new Error("invalid_report_path");
      args.reportPath = path.resolve(next);
      index += 1;
      continue;
    }
    throw new Error(`unknown_arg:${arg}`);
  }

  return args;
};

const printReport = (reportPath: string, report: ReturnType<typeof readAdminBundleReport>) => {
  process.stdout.write("\nAdmin bundle report\n");
  process.stdout.write(`Vite ${report.viteVersion}; Rolldown ${report.rolldownVersion}\n`);
  process.stdout.write(
    `JS chunks: ${report.jsChunkCount} total, ${report.initialStaticJsFiles.length} initial static, ${report.dynamicJsChunkCount} dynamic\n`
  );
  process.stdout.write(
    `Entry gzip: ${formatBytes(report.entryJsGzipBytes)} / budget ${formatBytes(report.budget.entryJsGzipBytes)}\n`
  );
  process.stdout.write(
    `Initial static gzip: ${formatBytes(report.initialStaticJsGzipBytes)} / budget ${formatBytes(report.budget.initialStaticJsGzipBytes)}\n`
  );
  process.stdout.write(
    `Largest dynamic chunk: ${report.largestDynamicChunkFile ?? "none"} (${formatBytes(report.largestDynamicChunkGzipBytes)} gzip)\n`
  );
  process.stdout.write(`Total JS gzip: ${formatBytes(report.totalJsGzipBytes)}\n`);
  process.stdout.write(`Report: ${path.relative(repoRoot, reportPath)}\n\n`);
};

const printSplitEvidence = (evidence: ReturnType<typeof collectWidgetRegistryEvidence>) => {
  process.stdout.write("TASK-467 widget editor registry split evidence\n");
  process.stdout.write(
    `Registry editor barrel imports: ${evidence.registryImportsEditorBarrel ? "FAIL" : "none"}\n`
  );
  process.stdout.write(
    `Widget editor chunks: ${evidence.widgetEditorChunks.length} ` +
      `(${evidence.widgetEditorChunks
        .slice(0, 6)
        .map((chunk) => chunk.file.split("/").at(-1))
        .join(", ")}${evidence.widgetEditorChunks.length > 6 ? ", …" : ""})\n`
  );
  process.stdout.write(
    `Dynamic chunks >= ${formatBytes(500_000)} raw: ${evidence.dynamicOverBudgetChunks.length}\n`
  );
  process.stdout.write(
    `TASK-467-owned over budget: ${evidence.task467OwnedOverBudgetChunks.length}\n`
  );
  process.stdout.write(
    `Invalid dynamic allowlist entries: ${evidence.invalidDynamicBudgetAllowlistChunks.length}\n\n`
  );
};

try {
  const args = parseArgs(Bun.argv.slice(2));
  const report = readAdminBundleReport({
    distDir: args.distDir,
    repoRoot,
  });
  assertAdminBundleBudget(report);
  const evidence = collectWidgetRegistryEvidence(report);
  assertAdminBundleSplitEvidence(evidence);
  writeAdminBundleReport(args.reportPath, report);
  printReport(args.reportPath, report);
  printSplitEvidence(evidence);
} catch (error) {
  const message = error instanceof Error ? error.message : "admin_bundle_check_failed";
  process.stderr.write(`Admin bundle check failed: ${message}\n`);
  process.stderr.write("Run `bun --cwd core build:admin` before `bun run check:admin-bundle`.\n");
  process.exit(1);
}
