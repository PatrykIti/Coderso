// Gap analysis for TASK-105-08 planning. Run: bun scripts/analyze-vitest-gaps.ts
import { readFileSync } from "node:fs";

const summary = JSON.parse(readFileSync("coverage/vitest/coverage-summary.json", "utf8")) as Record<
  string,
  {
    lines?: { total: number; covered: number; pct: number };
    statements?: { total: number; covered: number; pct: number };
    functions?: { total: number; covered: number; pct: number };
    branches?: { total: number; covered: number; pct: number };
  }
>;

type Row = {
  file: string;
  cluster: string;
  linesTotal: number;
  linesCovered: number;
  branchPct: number;
  funcPct: number;
};

const rows: Row[] = [];
for (const [key, v] of Object.entries(summary)) {
  if (key === "total") continue;
  const rel = key.replace(/^\/home\/coder\/project\/Coderso-105\//, "");
  const lines = v.lines ?? { total: 0, covered: 0, pct: 0 };
  const cluster = rel.startsWith("core/admin/services")
    ? "admin/services"
    : rel.startsWith("core/admin/utils")
      ? "admin/utils"
      : rel.startsWith("core/admin/ui/")
        ? `admin/ui/${rel.split("/")[3] ?? "?"}`
        : rel.startsWith("core/services/assistant")
          ? "assistant"
          : rel.startsWith("core/services/customScreens")
            ? "customScreens"
            : rel.startsWith("packages/sdk")
              ? "sdk"
              : "other";
  rows.push({
    file: rel,
    cluster,
    linesTotal: lines.total,
    linesCovered: lines.covered,
    branchPct: v.branches?.pct ?? 0,
    funcPct: v.functions?.pct ?? 0,
  });
}

const total = summary.total ?? {};
const pct = (n?: number) => (n ?? 0).toFixed(2);
console.log(
  `TOTALS: stmts ${pct(total.statements?.pct)} / branch ${pct(total.branches?.pct)} / funcs ${pct(total.functions?.pct)} / lines ${pct(total.lines?.pct)}`
);

const files = rows.filter((r) => r.linesTotal > 0);
const at100 = files.filter((r) => r.linesCovered === r.linesTotal);
const below = files
  .filter((r) => r.linesCovered < r.linesTotal)
  .sort((a, b) => b.linesTotal - b.linesCovered - (a.linesTotal - a.linesCovered));
const vacuous = rows.filter((r) => r.linesTotal === 0);

console.log(
  `FILES with executable lines: ${files.length}; at 100% lines: ${at100.length}; below 100%: ${below.length}; zero-executable: ${vacuous.length}`
);
console.log(
  `Uncovered lines total: ${below.reduce((s, r) => s + (r.linesTotal - r.linesCovered), 0)}`
);

console.log("\n=== BY CLUSTER (files below 100%, uncovered lines desc) ===");
const byCluster = new Map<string, Row[]>();
for (const r of below) {
  byCluster.set(r.cluster, [...(byCluster.get(r.cluster) ?? []), r]);
}
for (const [cluster, list] of [...byCluster.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const uncovered = list.reduce((s, r) => s + (r.linesTotal - r.linesCovered), 0);
  console.log(`\n## ${cluster} (${list.length} files, ${uncovered} uncovered lines)`);
  for (const r of list.slice(0, 25)) {
    console.log(
      `  ${r.file}  lines ${r.linesCovered}/${r.linesTotal} (${((100 * r.linesCovered) / r.linesTotal).toFixed(1)}%) branch ${r.branchPct.toFixed(1)}% func ${r.funcPct.toFixed(1)}%`
    );
  }
  if (list.length > 25) console.log(`  ... +${list.length - 25} more`);
}

console.log("\n=== WORST 40 FILES ===");
for (const r of below.slice(0, 40)) {
  console.log(
    `  ${(r.linesTotal - r.linesCovered).toString().padStart(5)} uncovered  ${r.file}  (${r.linesCovered}/${r.linesTotal}, branch ${r.branchPct.toFixed(1)}%)`
  );
}

console.log("\n=== ZERO-EXECUTABLE (infra noise candidates) ===");
for (const r of vacuous) console.log(`  ${r.file}`);
