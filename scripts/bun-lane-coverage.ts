export type CoverageMetric = {
  found: number;
  hit: number;
};

export type LcovCoverageTotals = {
  lines: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
};

const createMetric = (): CoverageMetric => ({ found: 0, hit: 0 });

const addValue = (metric: CoverageMetric, rawValue: string) => {
  const value = Number.parseInt(rawValue, 10);
  if (Number.isFinite(value) && value >= 0) {
    metric.found += value;
  }
};

const addHitValue = (metric: CoverageMetric, rawValue: string) => {
  const value = Number.parseInt(rawValue, 10);
  if (Number.isFinite(value) && value >= 0) {
    metric.hit += value;
  }
};

export function summarizeLcov(content: string): LcovCoverageTotals {
  const totals: LcovCoverageTotals = {
    lines: createMetric(),
    functions: createMetric(),
    branches: createMetric(),
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const separatorIndex = rawLine.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = rawLine.slice(0, separatorIndex);
    const value = rawLine.slice(separatorIndex + 1);

    if (key === "LF") addValue(totals.lines, value);
    if (key === "LH") addHitValue(totals.lines, value);
    if (key === "FNF") addValue(totals.functions, value);
    if (key === "FNH") addHitValue(totals.functions, value);
    if (key === "BRF") addValue(totals.branches, value);
    if (key === "BRH") addHitValue(totals.branches, value);
  }

  return totals;
}

export function formatCoverageMetric(metric: CoverageMetric) {
  if (metric.found === 0) return "n/a";
  return `${((metric.hit / metric.found) * 100).toFixed(2)}% (${metric.hit}/${metric.found})`;
}

export function formatBunLaneCoverageSummary(totals: LcovCoverageTotals) {
  const parts = [
    `lines ${formatCoverageMetric(totals.lines)}`,
    `functions ${formatCoverageMetric(totals.functions)}`,
  ];

  if (totals.branches.found > 0) {
    parts.push(`branches ${formatCoverageMetric(totals.branches)}`);
  }

  return `[bun-lane] coverage totals: ${parts.join(" / ")}`;
}
