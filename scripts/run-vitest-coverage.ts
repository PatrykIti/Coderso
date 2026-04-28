import { mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

type CoverageSummary = {
  total?: {
    lines?: { pct?: number };
    statements?: { pct?: number };
    functions?: { pct?: number };
    branches?: { pct?: number };
  };
};

const repoRoot = path.resolve(import.meta.dir, "..");
const coverageDir = path.join(repoRoot, "coverage", "vitest");
const summaryPath = path.join(coverageDir, "coverage-summary.json");
const vitestBin = path.join(repoRoot, "node_modules", ".bin", "vitest");

await rm(coverageDir, { recursive: true, force: true });
await mkdir(path.join(coverageDir, ".tmp"), { recursive: true });

const proc = Bun.spawn(
  [
    vitestBin,
    "run",
    "--config",
    "vitest.config.ts",
    "--coverage",
    "--coverage.clean=false",
    `--coverage.reportsDirectory=${coverageDir}`,
  ],
  {
    cwd: repoRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }
);

const exitCode = await proc.exited;
if (exitCode !== 0) {
  process.exit(exitCode);
}

const summaryStat = await stat(summaryPath);
const summary = JSON.parse(
  await readFile(summaryPath, "utf8")
) as CoverageSummary;

const totals = summary.total ?? {};
const statements = totals.statements?.pct ?? 0;
const branches = totals.branches?.pct ?? 0;
const functions = totals.functions?.pct ?? 0;
const lines = totals.lines?.pct ?? 0;

console.log(`[vitest-coverage] summary: ${path.relative(repoRoot, summaryPath)}`);
console.log(`[vitest-coverage] updated: ${summaryStat.mtime.toISOString()}`);
console.log(
  `[vitest-coverage] totals: ${statements.toFixed(2)} stmts / ${branches.toFixed(2)} branch / ${functions.toFixed(2)} funcs / ${lines.toFixed(2)} lines`
);
