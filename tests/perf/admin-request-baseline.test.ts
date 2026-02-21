import { beforeEach, expect, test } from "bun:test";

import {
  getRequestMetricsSnapshot,
  resetRequestMetrics,
  setRequestMetricsEnabled,
  startRequestMetric,
} from "../../core/admin/utils/requestMetrics";

const percentile = (values: number[], target: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((target / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
};

const readBudget = (envKey: string, fallback: number) => {
  const raw = process.env[envKey];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

beforeEach(() => {
  resetRequestMetrics();
  setRequestMetricsEnabled(true);
});

test("performance gate: request metrics snapshot p95 stays within budget", () => {
  const snapshotBudgetMs = readBudget("CODERSO_PERF_ADMIN_REQUEST_SNAPSHOT_P95_MS", 25);

  const baseTs = 1_000_000;
  for (let index = 0; index < 1_500; index += 1) {
    const close = startRequestMetric({
      path: index % 2 === 0 ? "/content-types" : "/user-settings",
      method: "GET",
      route: index % 3 === 0 ? "/admin/coderso/entries" : "/admin/pages",
      startedAt: baseTs + index * 10,
    });
    close({ status: index % 10 === 0 ? 500 : 200, ok: index % 10 !== 0, endedAt: baseTs + index * 10 + 15 });
  }

  const samples: number[] = [];
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const startedAt = performance.now();
    getRequestMetricsSnapshot({ now: baseTs + 20_000 });
    samples.push(performance.now() - startedAt);
  }

  const p95 = percentile(samples, 95);
  expect(p95).toBeLessThan(snapshotBudgetMs);
});
