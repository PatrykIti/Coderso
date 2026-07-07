# TASK-480-02-L03: Contract Tests (schema / normalize / legacy / resolvers)
# FileName: TASK-480-02-L03-Contract-Tests.md

**Parent Subtask:** TASK-480-02
**Priority:** High
**Category:** Admin / Dashboard / Tests
**Estimated Effort:** Small
**Dependencies:** TASK-480-02-L01 (schema/normalize/adapter),
TASK-480-02-L02 (registry/resolvers)
**Status:** ✅ Done
**Started:** 2026-07-05
**Completed:** 2026-07-05

---

## Overview

Lock the L01 + L02 contract with **Vitest unit tests** in the pure
domain/service lane. These tests are the regression net the API, cache, and UI
subtasks rely on: they prove the schema rejects unknown fields, normalization
applies defaults/clamps/dedupe, the legacy/empty adapter yields the DEFAULT
widget set, and each resolver shapes data correctly (with injected fake readers,
no DB).

- **Goal:** Make the widget/data-source contract self-verifying so later layers
  can refactor against a stable, asserted shape.
- **Owning module/service:** `tests/vitest/services/` (Vitest lane per
  `_docs/TESTING_STRATEGY.md` — pure domain/services run on Vitest, not Bun).
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md`,
  `_docs/DASHBOARD_WIDGETS_SPEC.md`.
- **Out of scope:** route/integration/security tests (those land with
  `TASK-480-03` in the Bun lanes `tests/integration/routes`, `tests/security`);
  UI tests (`TASK-480-04..05`, `tests/vitest/ui` / `ui-integration`); DB-backed
  reader assertions (Bun lane under `TASK-480-03`).

> Tests target the admin Dashboard widget contract — NOT `core/widgets`. Keep the
> fixtures self-contained; do not import the page/content widget catalog.

---

## Security Contract

No endpoint or permission model changes. These are pure unit tests. They do,
however, **assert security-relevant invariants** the route subtask depends on:

- schema **rejects unknown fields** (no silent passthrough of attacker-injected
  config keys),
- `content-query` `limit` is **clamped** (no unbounded query smuggled via a
  saved widget),
- unknown `contentTypeId` resolves to **empty data** (no broad scan),
- resolvers surface only safe summary data (no raw `SecuritySettings`/secrets in
  a widget payload),
- a failing resolver degrades to a per-widget error, never throws the whole
  board.

---

## Sub-Tasks (leaf checklist)

- [ ] `tests/vitest/services/dashboardWidgetContract.test.ts` — schema /
      normalize / defaults / clamp / dedupe / legacy adapter.
- [ ] `tests/vitest/services/dashboardDataSourceRegistry.test.ts` — registry
      exhaustiveness + resolver shaping + content-query clamp + failure fallback.
- [ ] Run lint, types, and both Vitest specs; record evidence.

---

## Implementation Pseudocode

### File A — `tests/vitest/services/dashboardWidgetContract.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  normalizeDashboardLayout,
  adaptLegacyDashboardLayout,
  DEFAULT_DASHBOARD_LAYOUT,
  DASHBOARD_LAYOUT_VERSION,
  DASHBOARD_MAX_WIDGETS,
  DASHBOARD_CONTENT_QUERY_MAX_LIMIT,
} from "../../../core/services/dashboard/dashboardWidgetContract";

const widget = (over = {}) => ({
  id: "w1", type: "totals-counters",
  config: { kind: "totals-counters" },
  position: { x: 0, y: 0, w: 12, h: 1 }, ...over,
});

describe("normalizeDashboardLayout", () => {
  it("rejects unknown top-level keys", () => {
    expect(() => normalizeDashboardLayout({ widgets: [], bogus: 1 })).toThrow();
  });
  it("rejects unknown widget keys", () => {
    expect(() => normalizeDashboardLayout({ widgets: [widget({ rogue: 1 })] })).toThrow();
  });
  it("rejects unknown per-config keys", () => {
    expect(() => normalizeDashboardLayout({ widgets: [widget({ config: { kind: "totals-counters", x: 1 } })] })).toThrow();
  });
  it("rejects config.kind != type", () => {
    expect(() => normalizeDashboardLayout({ widgets: [widget({ config: { kind: "storage-usage" } })] })).toThrow();
  });
  it("stamps the current version", () => {
    expect(normalizeDashboardLayout({ widgets: [widget()] }).version).toBe(DASHBOARD_LAYOUT_VERSION);
  });
  it("clamps grid geometry", () => {
    const out = normalizeDashboardLayout({ widgets: [widget({ position: { x: 99, y: -3, w: 0, h: 999 } })] });
    expect(out.widgets[0].position).toMatchObject({ x: 11, y: 0, w: 1, h: 12 });
  });
  it("clamps content-query limit", () => {
    const out = normalizeDashboardLayout({ widgets: [widget({
      type: "content-query",
      config: { kind: "content-query", contentTypeId: null, limit: 9999 },
    })] });
    expect(out.widgets[0].config.limit).toBe(DASHBOARD_CONTENT_QUERY_MAX_LIMIT);
  });
  it("dedupes duplicate widget ids", () => {
    const out = normalizeDashboardLayout({ widgets: [widget(), widget()] });
    expect(out.widgets).toHaveLength(1);
  });
  it("rejects more than MAX_WIDGETS", () => {
    const many = Array.from({ length: DASHBOARD_MAX_WIDGETS + 1 }, (_, i) => widget({ id: `w${i}` }));
    expect(() => normalizeDashboardLayout({ widgets: many })).toThrow();
  });
});

describe("adaptLegacyDashboardLayout (non-destructive)", () => {
  it.each([null, undefined, {}, { version: 1, widgets: [] }])(
    "maps empty/missing %# to DEFAULT widget set", (input) => {
      const out = adaptLegacyDashboardLayout(input as any);
      expect(out.widgets.map((w) => w.type).sort()).toEqual(
        ["recent-activity", "security-summary", "storage-usage", "totals-counters"],
      );
      expect(out).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    },
  );
  it("re-validates a real saved layout without discarding it", () => {
    const saved = normalizeDashboardLayout({ widgets: [widget({ id: "keep" })] });
    expect(adaptLegacyDashboardLayout(saved).widgets[0].id).toBe("keep");
  });
});
```

### File B — `tests/vitest/services/dashboardDataSourceRegistry.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import {
  dashboardWidgetResolvers,
  resolveWidgetData,
  resolveDashboardWidgets,
  type DashboardDataReaders,
} from "../../../core/services/dashboard/dashboardDataSources";
import { DASHBOARD_WIDGET_TYPES } from "../../../core/services/dashboard/dashboardTypes";

const fakeReaders = (over: Partial<DashboardDataReaders> = {}): DashboardDataReaders => ({
  totals: vi.fn(async () => ({ pages: 1, entries: 2, media: 3, users: 4 })),
  recentEdits: vi.fn(async () => []),
  storage: vi.fn(async () => ({ usedBytes: 0, limitBytes: null, usedPercent: null })),
  securitySummary: vi.fn(async () => ({ status: "ok", issues: 0, checks: [] })),
  contentTypeCounts: vi.fn(async () => [{ id: "t1", slug: "post", label: "Post", count: 5 }]),
  contentOverTime: vi.fn(async () => [{ bucket: "2026-06-01T00:00:00.000Z", created: 3, updated: 1 }]),
  contentQuery: vi.fn(async () => []),
  ...over,
});

describe("registry", () => {
  it("has exactly one resolver per widget type", () => {
    expect(Object.keys(dashboardWidgetResolvers).sort()).toEqual([...DASHBOARD_WIDGET_TYPES].sort());
  });
});

describe("resolveWidgetData shaping", () => {
  it("totals-counters returns display-ready DashboardWidgetData", async () => {
    const out = await resolveWidgetData(
      { id: "a", type: "totals-counters", config: { kind: "totals-counters" }, position: { x: 0, y: 0, w: 12, h: 1 } },
      fakeReaders(),
    );
    expect(out).toMatchObject({
      type: "totals-counters",
      counters: [expect.objectContaining({ key: "pages", value: 1 })],
    });
    expect(out).not.toHaveProperty("id");
    expect(out).not.toHaveProperty("data");
  });

  it("site-health bundles storage + security", async () => {
    const out = await resolveWidgetData(
      { id: "h", type: "site-health", config: { kind: "site-health" }, position: { x: 0, y: 0, w: 4, h: 2 } },
      fakeReaders(),
    );
    if ("error" in out) throw new Error("expected data");
    expect(out).toHaveProperty("storage");
    expect(out).toHaveProperty("security");
  });

  it("wraps a throwing reader as a per-widget error (keeps id, no throw)", async () => {
    const out = await resolveWidgetData(
      { id: "x", type: "storage-usage", config: { kind: "storage-usage" }, position: { x: 0, y: 0, w: 4, h: 1 } },
      fakeReaders({ storage: vi.fn(async () => { throw new Error("db down"); }) }),
    );
    expect(out).toEqual({ type: "storage-usage", error: "widget_data_unavailable" });
  });

  it("content-query passes clamped config to the reader", async () => {
    const contentQuery = vi.fn(async () => []);
    await resolveWidgetData(
      { id: "q", type: "content-query", config: { kind: "content-query", contentTypeId: "t1", limit: 50 }, position: { x: 0, y: 0, w: 6, h: 2 } },
      fakeReaders({ contentQuery }),
    );
    expect(contentQuery).toHaveBeenCalledWith(expect.objectContaining({ contentTypeId: "t1", limit: 50 }));
  });
});

describe("resolveDashboardWidgets", () => {
  it("preserves order and isolates a single failure", async () => {
    const layout = { version: 1, widgets: [
      { id: "ok",  type: "totals-counters", config: { kind: "totals-counters" }, position: { x: 0, y: 0, w: 12, h: 1 } },
      { id: "bad", type: "storage-usage",   config: { kind: "storage-usage" },   position: { x: 0, y: 1, w: 4,  h: 1 } },
    ] } as const;
    const out = await resolveDashboardWidgets(layout as any,
      fakeReaders({ storage: vi.fn(async () => { throw new Error("x"); }) }));
    expect(out.map((w) => w.type)).toEqual(["totals-counters", "storage-usage"]);
    expect(out[0]).not.toHaveProperty("error");
    expect(out[1]).toHaveProperty("error", "widget_data_unavailable");
  });
});
```

**Regression-test shape (summary):**

- Domain/contract (File A): schema reject-unknown, defaults, grid clamp,
  content-query limit clamp, dedupe, `MAX_WIDGETS` cap, legacy/empty → DEFAULT
  set, real layout round-trip.
- Service/registry (File B): exhaustive registry, resolver output shapes with
  injected fake readers, content-query clamp passthrough, per-widget failure
  fallback, order preservation.

---

## Testing Requirements

Run from the repo root:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/services/dashboardWidgetContract.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/services/dashboardDataSourceRegistry.test.ts`
- (Optional whole-lane sanity: `bun run test:vitest`.)
- No DB needed for these specs (fake readers). For any later DB-backed reader
  test, load env first: `set -a && source .env && set +a`.
- State clearly in the closeout if any test was skipped or could not run.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — link these specs as the contract's
  regression net.
- Board index + changelog on closure.

---

## Closure Checklist

- [ ] Both Vitest specs exist under `tests/vitest/services/` and pass.
- [ ] Reject-unknown, clamp, dedupe, legacy-default, resolver-shape, and
      failure-fallback all asserted.
- [ ] lint + types green.
- [ ] Board index + changelog synced; validation evidence recorded.
