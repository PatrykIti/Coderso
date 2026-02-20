import { expect, test } from "bun:test";

import { executeListingQuery } from "../../core/services/content/queryBuilderService";
import {
  isAdminHrefActive,
  resolveAdminHref,
  resolveAdminRoutePath,
} from "../../core/admin/utils/adminPaths";

type ListingRow = Record<string, unknown>;

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

const makeRows = (count: number, seed: number): ListingRow[] => {
  const rows: ListingRow[] = [];
  for (let index = 0; index < count; index += 1) {
    const ordinal = seed * count + index;
    rows.push({
      id: `post-${seed}-${index}`,
      title: `Service ${ordinal}`,
      slug: `service-${ordinal}`,
      status: ordinal % 4 === 0 ? "draft" : "published",
      updatedAt: new Date(1_700_000_000_000 + ordinal * 30_000).toISOString(),
      data: {
        price: (ordinal % 500) + 49,
        rating: (ordinal % 5) + 1,
      },
    });
  }
  return rows;
};

const listingQuery = {
  source: "posts",
  sourceConfig: {
    includeDrafts: true,
  },
  filters: [
    {
      field: "status",
      op: "eq",
      value: "published",
    },
    {
      field: "title",
      op: "contains",
      value: "Service",
    },
    {
      field: "data.price",
      op: "between",
      value: [120, 360],
    },
  ],
  sort: [
    {
      field: "updatedAt",
      dir: "desc",
    },
  ],
  pagination: {
    limit: 24,
    offset: 0,
  },
  fields: ["id", "title", "slug", "status", "updatedAt", "data.price"],
} as const;

const runListingScenario = async (params: {
  iterations: number;
  resolver: (iteration: number) => Promise<ListingRow[]>;
}) => {
  const samples: number[] = [];

  for (let iteration = 0; iteration < params.iterations; iteration += 1) {
    const startedAt = performance.now();
    await executeListingQuery(listingQuery, {
      rowsResolver: async () => params.resolver(iteration),
    });
    samples.push(performance.now() - startedAt);
  }

  return {
    p95: percentile(samples, 95),
    p50: percentile(samples, 50),
  };
};

test("performance gate: listing/filter cached p95 stays within budget", async () => {
  const cachedBudgetMs = readBudget("CODERSO_PERF_LISTING_P95_CACHED_MS", 300);
  const rows = makeRows(3_000, 1);

  const result = await runListingScenario({
    iterations: 35,
    resolver: async () => rows,
  });

  expect(result.p95).toBeLessThan(cachedBudgetMs);
});

test("performance gate: listing/filter cold p95 stays within budget", async () => {
  const coldBudgetMs = readBudget("CODERSO_PERF_LISTING_P95_COLD_MS", 900);

  const result = await runListingScenario({
    iterations: 20,
    resolver: async (iteration) => makeRows(3_000, iteration + 10),
  });

  expect(result.p95).toBeLessThan(coldBudgetMs);
});

test("performance gate: admin route transition helpers p95 stay within budget", () => {
  const routeBudgetMs = readBudget("CODERSO_PERF_ADMIN_NAV_P95_MS", 150);
  const basePath = "/admin";
  const hrefs = [
    "/admin/dashboard",
    "/admin/content-types",
    "/admin/content-types/ct-1/schema",
    "/admin/content",
    "/admin/widgets",
    "/admin/forms",
    "/admin/booking",
    "/admin/solution-kits",
    "/admin/coderso/engine",
    "/admin/coderso/entries?type=posts",
    "/admin/coderso/widgets#favorite",
    "/admin/coderso/listings",
    "/admin/coderso/commerce",
    "/admin/coderso/reviews",
    "/admin/coderso/popups",
    "/admin/settings/security",
  ];

  const samples: number[] = [];

  for (let iteration = 0; iteration < 120; iteration += 1) {
    const startedAt = performance.now();

    for (const href of hrefs) {
      const canonical = resolveAdminHref(basePath, href);
      const route = resolveAdminRoutePath(canonical.replace(basePath, "") || "/");
      const active = resolveAdminHref(basePath, route);
      isAdminHrefActive(basePath, href, active);
    }

    samples.push(performance.now() - startedAt);
  }

  const p95 = percentile(samples, 95);
  expect(p95).toBeLessThan(routeBudgetMs);
});
