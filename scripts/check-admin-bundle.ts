import path from "node:path";

import {
  assertAdminBundleBudget,
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

try {
  const args = parseArgs(Bun.argv.slice(2));
  const report = readAdminBundleReport({
    distDir: args.distDir,
    repoRoot,
  });
  assertAdminBundleBudget(report);

  // TASK-580-04: the v1 widget kernel and admin widget surface are deleted.
  // Fail if any core/widgets or admin/ui/widgets source path still appears in
  // the bundle manifest (built assets can never legitimately contain them).
  const manifest = JSON.stringify(report);
  if (/core\/widgets|admin\/ui\/widgets/.test(manifest)) {
    throw new Error(
      "admin_bundle_legacy_widgets_present:core/widgets or admin/ui/widgets path found in manifest"
    );
  }

  writeAdminBundleReport(args.reportPath, report);
  printReport(args.reportPath, report);
} catch (error) {
  const message = error instanceof Error ? error.message : "admin_bundle_check_failed";
  process.stderr.write(`Admin bundle check failed: ${message}\n`);
  process.stderr.write("Run `bun --cwd core build:admin` before `bun run check:admin-bundle`.\n");
  process.exit(1);
}
