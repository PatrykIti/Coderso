// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// TASK-480-05-L01: the widget host exposes pointer drag + resize handles in edit
// mode (wired to the builder's arrange/resize), while the keyboard-operable nudge
// buttons remain as the a11y fallback — including the new taller/shorter controls
// that give the pointer height-resize a keyboard equivalent.

import { DashboardWidgetHost } from "../../../core/admin/ui/dashboard/DashboardWidgetHost";
import { createDashboardWidget } from "../../../core/admin/ui/dashboard/widgetRegistry";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Array<{ unmount: () => void; container: HTMLElement }> = [];

const widget = createDashboardWidget("storage-usage", 0);

type HostProps = Partial<React.ComponentProps<typeof DashboardWidgetHost>>;

const mount = (props: HostProps = {}) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<DashboardWidgetHost widget={widget} editMode {...props} />);
  });
  roots.push({
    unmount: () => {
      React.act(() => root.unmount());
      container.remove();
    },
    container,
  });
  return container;
};

const byLabel = (container: HTMLElement, label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

afterEach(() => {
  while (roots.length) roots.pop()?.unmount();
});

test("renders the drag + resize handles when the pointer callbacks are provided", () => {
  const onReorderPointerDown = vi.fn();
  const onResizePointerDown = vi.fn();
  const container = mount({ onReorderPointerDown, onResizePointerDown });

  const dragHandle = container.querySelector('[data-testid="widget-drag-handle"]');
  const resizeHandle = container.querySelector('[data-testid="widget-resize-handle"]');
  expect(dragHandle).not.toBeNull();
  expect(resizeHandle).not.toBeNull();

  React.act(() => {
    dragHandle?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    resizeHandle?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  });
  expect(onReorderPointerDown).toHaveBeenCalledTimes(1);
  expect(onResizePointerDown).toHaveBeenCalledTimes(1);
});

test("hides the handles when no pointer callbacks are wired (nudge-only a11y fallback)", () => {
  const container = mount();
  expect(container.querySelector('[data-testid="widget-drag-handle"]')).toBeNull();
  expect(container.querySelector('[data-testid="widget-resize-handle"]')).toBeNull();
  // The keyboard-operable move/resize buttons must still be present.
  for (const label of ["Move left", "Wider", "Narrower", "Taller", "Shorter"]) {
    expect(byLabel(container, label)).not.toBeNull();
  }
});

test("taller/shorter nudge buttons emit the height keyboard actions", () => {
  const onAction = vi.fn();
  const container = mount({ onAction });
  React.act(() => byLabel(container, "Taller")?.click());
  React.act(() => byLabel(container, "Shorter")?.click());
  expect(onAction).toHaveBeenNthCalledWith(1, "taller");
  expect(onAction).toHaveBeenNthCalledWith(2, "shorter");
});

test("marks dragging + drop-target state for styling hooks", () => {
  const container = mount({ dragging: true });
  expect(container.querySelector('[data-dragging="true"]')).not.toBeNull();

  const dropContainer = mount({ dropTarget: true });
  expect(dropContainer.querySelector('[data-drop-target="true"]')).not.toBeNull();
});

test("no handles or edit chrome outside edit mode", () => {
  const container = mount({
    editMode: false,
    onReorderPointerDown: vi.fn(),
    onResizePointerDown: vi.fn(),
  });
  expect(container.querySelector('[data-testid="widget-drag-handle"]')).toBeNull();
  expect(container.querySelector('[data-testid="widget-resize-handle"]')).toBeNull();
  expect(byLabel(container, "Move left")).toBeNull();
});
