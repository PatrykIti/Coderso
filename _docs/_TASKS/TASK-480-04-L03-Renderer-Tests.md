# TASK-480-04-L03: Renderer & Registry Render-State Tests
# FileName: TASK-480-04-L03-Renderer-Tests.md

**Priority:** High
**Category:** Admin UI / Dashboard / Widgets / Tests
**Estimated Effort:** Medium
**Dependencies:** TASK-480-04-L01 (registry + host) · TASK-480-04-L02 (renderers) · TASK-480-02 (fixtures: type enum + data union shapes)
**Status:** ✅ Done
**Completed:** 2026-07-05
**Parent Subtask:** TASK-480-04

---

## Overview

Add the Vitest render tests that lock the renderer layer: the registry is
**exhaustive**, the host renders the right **state** (loading / empty / error /
mismatch / ready), and every renderer renders both its **normal** data and its
**degenerate-but-valid** edge without throwing. Tests use the existing
server-render harness `renderAdminUi` (string output, no DOM events needed) used
by `tests/vitest/ui/dashboard.test.tsx` and `stat-card.test.tsx`.

- **Goal:** Fast, deterministic coverage that (1) a new `DashboardWidgetType` can
  never be added without a renderer (registry test), and (2) each host state +
  each renderer is asserted against a fixture, so 480-05 can wire the grid against
  a trusted presentation layer.
- **Owning module/service:**
  `tests/vitest/admin/dashboardWidgetRegistry.test.ts` (pure registry contract),
  `tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx` (host states +
  per-renderer render tests).
- **Source-of-truth docs:** `_docs/TESTING_STRATEGY.md` (Vitest UI/domain lane);
  harness `tests/utils/adminRouterRender.tsx` (`renderAdminUi`);
  fixtures from `core/services/dashboard/dashboardTypes.ts` (480-02).
- **Out of scope:** Route/integration tests for the widget-data endpoints (→
  TASK-480-03 Bun suites under `tests/integration/routes` + `tests/security`);
  builder/grid interaction tests (→ 480-05); DB/perf gates (no DB here).

> **Distinct from `core/widgets/*`:** tests cover **admin Dashboard** renderers.

---

## Security Contract

No endpoint or permission model changes — test-only. The registry test does
assert one security-relevant invariant: every renderer key resolves to a defined
component (no `undefined` dispatch), and the host’s mismatch branch renders the
safe error fallback (never throws, never renders foreign data). The
`QuickActions`/`ContentQuery` renderer tests assert links resolve to safe
relative admin hrefs accepted by `AdminLink` and that an unknown action target
renders **disabled/text**, not a live arbitrary URL.

---

## Implementation Pseudocode

### Fixtures (one valid + one degenerate per type)

```ts
// tests/vitest/utils/dashboardWidgetFixtures.ts (new helper, or inline)
import type { DashboardWidget, DashboardWidgetData } from "../../../core/services/dashboard/dashboardTypes";

export const widget = <T extends DashboardWidget["type"]>(type: T, config: object = {}): DashboardWidget =>
  ({ id: `w-${type}`, type, title: `${type} panel`, config, position: { x: 0, y: 0, w: 4, h: 2 } } as DashboardWidget);

export const data = {
  // totals-counters data = { counters: [...] } per 480-04-L02; one StatCard per counter.
  totals:           { type: "totals-counters", counters: [{ key: "pages", label: "Pages", formatted: "86", value: 86, delta: { value: 3, trend: "up", label: "+3" }, spark: [1,2,3,4] }] },
  // content-over-time uses `variant` (area|bar) — NEVER a donut (donut belongs to content-type-counts).
  overTimeArea:     { type: "content-over-time", variant: "area", series: [{ id: "v", label: "Visitors", points: [4,8,6,10] }] },
  overTimeBar:      { type: "content-over-time", variant: "bar", series: [{ id: "v", label: "Visitors", points: [4,8,6,10] }], categories: ["Mon","Tue","Wed","Thu"] },
  recentEdits:      { type: "recent-activity", items: [{ id: "p1", type: "page", title: "Pricing", path: "/pricing", status: "published", updatedAt: new Date().toISOString(), author: { id: null, name: "Maria", email: null } }] },
  // content-type-counts owns the donut breakdown via optional `segments` (folded from old chart.breakdown).
  typeCounts:       { type: "content-type-counts", counts: [{ slug: "post", label: "Posts", count: 26 }, { slug: "page", label: "Pages", count: 48 }], segments: [{ label: "Pages", value: 48, color: "var(--primary)" }] },
  storageNoLimit:   { type: "storage-usage", usedBytes: 1024 * 1024, limitBytes: null, usedPercent: null },
  health:           { type: "site-health", security: { status: "warning", issues: 1, checks: [{ id: "csrf", label: "CSRF", status: "ok", detail: "Enabled." }, { id: "headers", label: "Headers", status: "warning", detail: "Incomplete." }] } },
  // security-summary data wraps the summary under `security` (DashboardSecuritySummary) per 480-04-L02.
  security:         { type: "security-summary", security: { status: "warning", issues: 1, checks: [{ id: "csrf", label: "CSRF", status: "ok", detail: "Enabled." }, { id: "headers", label: "Headers", status: "warning", detail: "Incomplete." }] } },
  actions:          { type: "quick-actions", actions: [{ id: "new-page", label: "New page", target: "pages" }, { id: "bogus", label: "Broken", target: "__unknown__" }] },
  query:            { type: "content-query", columns: [{ key: "title", label: "Title" }], rows: [{ title: "Hello <b>World</b>" }] },
} satisfies Record<string, DashboardWidgetData>;

// degenerate/empty variants for the host empty-state + edge tests
export const emptyData = {
  recentEdits:      { type: "recent-activity", items: [] },
  typeCounts:       { type: "content-type-counts", counts: [] },
  query:            { type: "content-query", columns: [{ key: "title", label: "Title" }], rows: [] },
  actions:          { type: "quick-actions", actions: [] },
  overTimeEmpty:    { type: "content-over-time", variant: "area", series: [{ id: "v", label: "v", points: [] }] },
} satisfies Record<string, DashboardWidgetData>;
```

### Registry contract — `dashboardWidgetRegistry.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { DASHBOARD_WIDGET_CATALOG, DASHBOARD_WIDGET_RENDERERS, isWidgetDataEmpty } from "../../../core/admin/ui/dashboard/widgets/registry";
import { DASHBOARD_WIDGET_TYPES } from "../../../core/services/dashboard/dashboardTypes";
import { data, emptyData } from "../utils/dashboardWidgetFixtures";

describe("dashboard widget registry", () => {
  it("has exactly one renderer per widget type (exhaustive, no extras)", () => {
    expect(Object.keys(DASHBOARD_WIDGET_RENDERERS).sort()).toEqual([...DASHBOARD_WIDGET_TYPES].sort());
  });
  it("has exactly one catalog metadata entry per widget type", () => {
    expect(Object.keys(DASHBOARD_WIDGET_CATALOG).sort()).toEqual([...DASHBOARD_WIDGET_TYPES].sort());
    for (const type of DASHBOARD_WIDGET_TYPES) {
      expect(DASHBOARD_WIDGET_CATALOG[type]).toMatchObject({ type });
      expect(DASHBOARD_WIDGET_CATALOG[type].defaultConfig.kind).toBe(type);
    }
  });
  it("every renderer entry is a defined component", () => {
    for (const type of DASHBOARD_WIDGET_TYPES) expect(DASHBOARD_WIDGET_RENDERERS[type]).toBeTypeOf("function");
  });
  it("isWidgetDataEmpty: true for empty lists/series, false for counters/health", () => {
    expect(isWidgetDataEmpty(emptyData.recentEdits)).toBe(true);
    expect(isWidgetDataEmpty(emptyData.overTimeEmpty)).toBe(true);
    expect(isWidgetDataEmpty(data.totals)).toBe(false);
    expect(isWidgetDataEmpty(data.health)).toBe(false);
  });
});
```

### Host states + renderers — `dashboard-widget-renderers.test.tsx`

```tsx
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { DashboardWidgetHost } from "../../../core/admin/ui/dashboard/widgets/DashboardWidgetHost";
import { widget, data, emptyData } from "../utils/dashboardWidgetFixtures";

// ── Host states ──────────────────────────────────────────────────────────────
test("host: loading → skeleton", () => {
  const html = renderAdminUi(<DashboardWidgetHost widget={widget("totals-counters")} state={{ status: "loading" }} />);
  expect(html).toContain("widget-skeleton");
  expect(html).toContain("aria-busy");
});
test("host: error → message, no throw", () => {
  const html = renderAdminUi(<DashboardWidgetHost widget={widget("totals-counters")} state={{ status: "error", message: "Could not load." }} />);
  expect(html).toContain("widget-error");
  expect(html).toContain("Could not load.");
});
test("host: ready+empty → empty state", () => {
  const html = renderAdminUi(<DashboardWidgetHost widget={widget("recent-activity")} state={{ status: "ready", data: emptyData.recentEdits }} />);
  expect(html).toContain("widget-empty");
});
test("host: data/type mismatch → safe error fallback (no throw)", () => {
  const html = renderAdminUi(<DashboardWidgetHost widget={widget("totals-counters")} state={{ status: "ready", data: data.recentEdits }} />);
  expect(html).toContain("widget-error");          // does not render foreign data, does not throw
});
test("host: ready+valid → renderer output, with title", () => {
  const html = renderAdminUi(<DashboardWidgetHost widget={widget("totals-counters")} state={{ status: "ready", data: data.totals }} />);
  expect(html).toContain("totals-counters panel"); // SectionCard title
  expect(html).toContain("86");                    // TotalsCounters value
});

// ── Per-renderer (normal + degenerate) ───────────────────────────────────────
const ready = (w: Parameters<typeof widget>[0], d: any) =>
  renderAdminUi(<DashboardWidgetHost widget={widget(w)} state={{ status: "ready", data: d }} />);

test("ContentOverTimeWidget: area + bar variants render (content-over-time is never a donut)", () => {
  expect(() => ready("content-over-time", data.overTimeArea)).not.toThrow();
  expect(() => ready("content-over-time", data.overTimeBar)).not.toThrow();
});
// Donut/breakdown is owned by content-type-counts (config.display === "donut", via `segments`).
test("ContentTypeCountsWidget: list shows counts", () => {
  expect(ready("content-type-counts", data.typeCounts)).toContain("Posts");
});
test("RecentActivityWidget: title + author + safe admin href", () => {
  const html = ready("recent-activity", data.recentEdits);
  expect(html).toContain("Pricing");
  expect(html).toContain("Maria");
  expect(html).toContain("/admin");                // AdminLink receives a safe admin href, not the raw /pricing literal.
});
test("StorageUsageWidget: null limit renders '(no limit)', no throw", () => {
  expect(ready("storage-usage", data.storageNoLimit)).toContain("no limit");
});
test("SiteHealthWidget: shows passing ratio + check labels", () => {
  const html = ready("site-health", data.health);
  expect(html).toContain("1/2");
  expect(html).toContain("CSRF");
});
test("SecuritySummaryWidget: shows issue count + check labels", () => {
  const html = ready("security-summary", data.security);
  expect(html).toContain("CSRF");
});
test("QuickActionsWidget: known target links, unknown target disabled", () => {
  const html = ready("quick-actions", data.actions);
  expect(html).toContain("New page");
  expect(html).toContain("disabled");              // the "__unknown__" target renders disabled, not a live URL
});
test("ContentQueryWidget: cell value rendered as TEXT (no HTML injection)", () => {
  const html = ready("content-query", data.query);
  expect(html).toContain("Hello &lt;b&gt;World&lt;/b&gt;"); // escaped — never injected as markup
  expect(html).not.toContain("<b>World</b>");
});
test("ContentQueryWidget: empty rows → host empty state", () => {
  expect(ready("content-query", emptyData.query)).toContain("widget-empty");
});
```

**Data flow:** fixtures (480-01 shapes) → `DashboardWidgetHost` (L01) → renderer
(L02) → `renderAdminUi` returns HTML string → assert markers/values. No network,
no DB, no timers; deterministic.

**Error handling under test:** the mismatch and degenerate-data cases assert the
host/renderers **do not throw** and render a safe fallback; the content-query
case asserts HTML is **escaped** (XSS-safety of untrusted text).

**Regression-test shape:** registry exhaustiveness (compile + runtime),
five host states, one normal render per renderer, and the four security-relevant
edges (mismatch fallback, unknown nav target disabled, null storage limit,
escaped content-query cell).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin/dashboardWidgetRegistry.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/dashboard-widget-renderers.test.tsx`
- Keep existing dashboard suites green:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/dashboard.test.tsx tests/vitest/ui/stat-card.test.tsx`
- No DB tests in this leaf, so no `set -a && source .env && set +a` needed.
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure linking `TASK-480` + `TASK-480-04-L03`.
- `_docs/DASHBOARD_WIDGETS_SPEC.md` — note the renderer test coverage matrix
  (states × renderers) so future widget types add a fixture + a row.
