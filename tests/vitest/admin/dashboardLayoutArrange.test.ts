import { expect, test } from "vitest";

// TASK-480-05-L01: pure geometry helpers behind the pointer drag-and-drop
// arrange/resize. Every clamp must mirror the server contract's `readPosition`
// so a dragged draft round-trips through `normalizeDashboardLayout` unchanged.

import {
  moveWidget,
  resizeWidget,
  sortWidgetsByPosition,
} from "../../../core/admin/ui/dashboard/dashboardLayoutArrange";
import { createDashboardWidget } from "../../../core/admin/ui/dashboard/widgetRegistry";
import {
  DASHBOARD_LAYOUT_VERSION,
  normalizeDashboardLayout,
} from "../../../core/services/dashboard/dashboardWidgetContract";
import type {
  DashboardLayout,
  DashboardWidget,
  DashboardWidgetType,
} from "../../../core/services/dashboard/dashboardTypes";

const widget = (
  id: string,
  position: { x: number; y: number; w: number; h: number },
  type: DashboardWidgetType = "site-health"
): DashboardWidget => ({ ...createDashboardWidget(type, position.y), id, position });

const layout = (...widgets: DashboardWidget[]): DashboardLayout => ({
  version: DASHBOARD_LAYOUT_VERSION,
  widgets,
});

const order = (result: DashboardLayout) =>
  sortWidgetsByPosition(result.widgets).map((entry) => entry.id);

test("sortWidgetsByPosition orders by y then x", () => {
  const result = sortWidgetsByPosition([
    widget("b", { x: 4, y: 1, w: 4, h: 2 }),
    widget("a", { x: 0, y: 1, w: 4, h: 2 }),
    widget("top", { x: 0, y: 0, w: 12, h: 1 }),
  ]);
  expect(result.map((entry) => entry.id)).toEqual(["top", "a", "b"]);
});

test("moveWidget drops the active widget into the target slot (resequences y)", () => {
  const result = moveWidget(
    layout(
      widget("a", { x: 0, y: 0, w: 4, h: 2 }),
      widget("b", { x: 0, y: 1, w: 4, h: 2 }),
      widget("c", { x: 0, y: 2, w: 4, h: 2 })
    ),
    "c",
    "a"
  );
  expect(order(result)).toEqual(["c", "a", "b"]);
  // y is resequenced to a dense unique 0..n-1 so the flow order is deterministic.
  expect(result.widgets.map((w) => w.position.y).sort()).toEqual([0, 1, 2]);
});

test("moveWidget preserves x/w/h so per-widget width limits are untouched", () => {
  const result = moveWidget(
    layout(
      widget("wide", { x: 0, y: 0, w: 12, h: 1 }),
      widget("right", { x: 8, y: 1, w: 4, h: 2 })
    ),
    "right",
    "wide"
  );
  const right = result.widgets.find((w) => w.id === "right");
  expect(right?.position).toMatchObject({ x: 8, w: 4, h: 2 });
});

test("moveWidget is a no-op on self-drop or unknown ids", () => {
  const source = layout(
    widget("a", { x: 0, y: 0, w: 4, h: 2 }),
    widget("b", { x: 0, y: 1, w: 4, h: 2 })
  );
  expect(moveWidget(source, "a", "a")).toBe(source);
  expect(moveWidget(source, "a", "ghost")).toBe(source);
  expect(moveWidget(source, "ghost", "b")).toBe(source);
});

test("resizeWidget clamps w to (12 - x) and h to 12", () => {
  const result = resizeWidget(layout(widget("a", { x: 8, y: 0, w: 4, h: 2 })), "a", 12, 99);
  expect(result.widgets[0].position).toMatchObject({ x: 8, w: 4, h: 12 });
});

test("resizeWidget floors w/h at 1 and truncates fractional input", () => {
  const result = resizeWidget(layout(widget("a", { x: 0, y: 0, w: 6, h: 3 })), "a", 0, 2.9);
  expect(result.widgets[0].position).toMatchObject({ w: 1, h: 2 });
});

test("resizeWidget returns the SAME layout reference when nothing changes", () => {
  const source = layout(widget("a", { x: 0, y: 0, w: 6, h: 3 }));
  // Target already exceeds the max, so the clamped value equals the current one.
  expect(resizeWidget(source, "a", 6, 3)).toBe(source);
  expect(resizeWidget(source, "ghost", 2, 2)).toBe(source);
});

test("arranged + resized drafts survive the server normalizer unchanged", () => {
  const moved = moveWidget(
    layout(
      widget("a", { x: 0, y: 0, w: 8, h: 3 }, "content-over-time"),
      widget("b", { x: 8, y: 1, w: 4, h: 2 }, "storage-usage")
    ),
    "b",
    "a"
  );
  const resized = resizeWidget(moved, "b", 2, 5);
  const normalized = normalizeDashboardLayout(resized);
  const before = resized.widgets
    .map((w) => ({ id: w.id, ...w.position }))
    .sort((x, y) => (x.id < y.id ? -1 : 1));
  const after = normalized.widgets
    .map((w) => ({ id: w.id, ...w.position }))
    .sort((x, y) => (x.id < y.id ? -1 : 1));
  expect(after).toEqual(before);
});
