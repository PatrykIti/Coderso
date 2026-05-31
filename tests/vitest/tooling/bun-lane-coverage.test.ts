import { describe, expect, test } from "vitest";

import {
  formatBunLaneCoverageSummary,
  formatCoverageMetric,
  summarizeLcov,
} from "../../../scripts/bun-lane-coverage";

describe("bun lane coverage helpers", () => {
  test("summarizeLcov totals lines, functions, and branches across records", () => {
    const totals = summarizeLcov(
      [
        "TN:",
        "SF:core/server/routes/example.ts",
        "FNF:4",
        "FNH:3",
        "LF:10",
        "LH:7",
        "BRF:2",
        "BRH:1",
        "end_of_record",
        "SF:core/server/routes/other.ts",
        "FNF:1",
        "FNH:1",
        "LF:5",
        "LH:5",
        "BRF:2",
        "BRH:2",
        "end_of_record",
      ].join("\n")
    );

    expect(totals).toEqual({
      lines: { found: 15, hit: 12 },
      functions: { found: 5, hit: 4 },
      branches: { found: 4, hit: 3 },
    });
  });

  test("formatCoverageMetric keeps zero totals explicit", () => {
    expect(formatCoverageMetric({ found: 0, hit: 0 })).toBe("n/a");
  });

  test("formatBunLaneCoverageSummary prints a compact CI-safe summary", () => {
    expect(
      formatBunLaneCoverageSummary({
        lines: { found: 15, hit: 12 },
        functions: { found: 5, hit: 4 },
        branches: { found: 0, hit: 0 },
      })
    ).toBe("[bun-lane] coverage totals: lines 80.00% (12/15) / functions 80.00% (4/5)");
  });
});
