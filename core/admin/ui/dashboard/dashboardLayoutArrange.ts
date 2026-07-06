import {
  DASHBOARD_GRID_COLUMNS,
  DASHBOARD_WIDGET_MAX_H,
  DASHBOARD_WIDGET_MIN_H,
  DASHBOARD_WIDGET_MIN_W,
} from "../../../services/dashboard/dashboardWidgetContract";
import type { DashboardLayout, DashboardWidget } from "../../../services/dashboard/dashboardTypes";

// Pure layout-arrangement helpers shared by the pointer drag-and-drop wiring and
// the keyboard nudge fallback. Every geometry constraint here mirrors the server
// contract's `readPosition` clamp exactly (x in [0, 11]; w in [1, 12 - x]; h in
// [1, 12]) so a dragged/resized draft round-trips through
// `normalizeDashboardLayout` unchanged — no silent server-side re-clamping.

const clampInt = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.trunc(Number.isFinite(value) ? value : min)));

// Grid render order: top-to-bottom then left-to-right, matching the builder's
// `sortedWidgets`. Arrange operates on this visual order, not array order.
export const sortWidgetsByPosition = (widgets: readonly DashboardWidget[]): DashboardWidget[] =>
  [...widgets].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);

// Reorder by dropping `activeId` onto the slot occupied by `overId`. Because the
// grid is a flow of column spans (x/w drive width, y only orders the flow), a drop
// is expressed by resequencing `y` to the new visual index. `x`/`w`/`h` are
// preserved, so per-widget width limits (12 - x) are untouched. Unknown ids or a
// self-drop are no-ops that return the input layout unchanged.
export function moveWidget(
  layout: DashboardLayout,
  activeId: string,
  overId: string
): DashboardLayout {
  if (activeId === overId) return layout;
  const order = sortWidgetsByPosition(layout.widgets);
  const fromIndex = order.findIndex((widget) => widget.id === activeId);
  const toIndex = order.findIndex((widget) => widget.id === overId);
  if (fromIndex === -1 || toIndex === -1) return layout;

  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return {
    ...layout,
    widgets: next.map((widget, index) => ({
      ...widget,
      position: { ...widget.position, y: index },
    })),
  };
}

// Resize a single widget to an absolute (w, h), clamped to the contract range.
// `w` is capped at `12 - x` so a widget can never overflow its column origin;
// this is the same bound the "wider" nudge and the server normalizer use.
export function resizeWidget(
  layout: DashboardLayout,
  id: string,
  w: number,
  h: number
): DashboardLayout {
  let changed = false;
  const widgets = layout.widgets.map((widget) => {
    if (widget.id !== id) return widget;
    const maxW = Math.max(DASHBOARD_WIDGET_MIN_W, DASHBOARD_GRID_COLUMNS - widget.position.x);
    const nextW = clampInt(w, DASHBOARD_WIDGET_MIN_W, maxW);
    const nextH = clampInt(h, DASHBOARD_WIDGET_MIN_H, DASHBOARD_WIDGET_MAX_H);
    if (nextW === widget.position.w && nextH === widget.position.h) return widget;
    changed = true;
    return { ...widget, position: { ...widget.position, w: nextW, h: nextH } };
  });
  return changed ? { ...layout, widgets } : layout;
}
