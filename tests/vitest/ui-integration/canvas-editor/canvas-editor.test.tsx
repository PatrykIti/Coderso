// @vitest-environment happy-dom
//
// TASK-496-01: the shared `CanvasEditor` editor-chrome shell (repurposed in
// place from the TASK-479-06-L06 orphan). The shell is presentational and
// CONTROLLED read-only: it READS `panelOpen` to decide whether to render the
// panel + the reopen affordance, and NEVER toggles its own state (no built-in
// "Hide/Show panel" toggle, no `defaultPanelOpen`). These cases pin the slot
// contract — header / card + sub-toolbar / optional device-context strip /
// relative canvas region / right|bottom floating-panel dock.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { CanvasEditor } from "@/ui/shared/CanvasEditor";

import { renderAdminUi } from "../../../utils/adminRouterRender";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const noop = () => {};

afterEach(() => {
  document.body.innerHTML = "";
});

test("(a) emits the header slot, the separated card + sub-toolbar and the device-context strip", () => {
  const html = renderAdminUi(
    <CanvasEditor
      header={<div>header-slot</div>}
      title="Page builder"
      badge={<span>Save only</span>}
      toolbar={<button type="button">toolbar-slot</button>}
      deviceContext={{ value: "desktop", label: "Desktop base view" }}
      canvas={<div>canvas-slot</div>}
      panel={<div>panel-slot</div>}
      panelOpen={false}
      onPanelOpenChange={noop}
    />
  );
  expect(html).toContain("header-slot");
  expect(html).toContain("Page builder");
  expect(html).toContain("Save only");
  expect(html).toContain("toolbar-slot");
  expect(html).toContain("canvas-slot");
  // Separated card chrome.
  expect(html).toContain("rounded-2xl border border-border bg-card shadow-card");
  // Device-context strip carries the data hook + the supplied label.
  expect(html).toContain('data-page-editor-canvas-context="desktop"');
  expect(html).toContain("Desktop base view");
});

test("(a) omits the device-context strip when `deviceContext` is absent", () => {
  const html = renderAdminUi(
    <CanvasEditor
      title="Page builder"
      canvas={<div>c</div>}
      panelOpen={false}
      onPanelOpenChange={noop}
    />
  );
  expect(html).not.toContain("data-page-editor-canvas-context");
});

test("(b) panelOpen=false hides the panel and renders the reopen affordance", () => {
  const html = renderAdminUi(
    <CanvasEditor
      title="Page builder"
      canvas={<div>c</div>}
      panel={<div>panel-body</div>}
      reopenAffordance={<button type="button">Show panel</button>}
      panelOpen={false}
      onPanelOpenChange={noop}
    />
  );
  expect(html).not.toContain("panel-body");
  expect(html).toContain("Show panel");
});

test("(b) panelOpen=true shows the panel and hides the reopen affordance", () => {
  const html = renderAdminUi(
    <CanvasEditor
      title="Page builder"
      canvas={<div>c</div>}
      panel={<div>panel-body</div>}
      reopenAffordance={<button type="button">Show panel</button>}
      panelOpen={true}
      onPanelOpenChange={noop}
    />
  );
  expect(html).toContain("panel-body");
  expect(html).not.toContain("Show panel");
});

test("(c) panelPosition='right' yields the 280px right-rail container", () => {
  const html = renderAdminUi(
    <CanvasEditor
      title="Page builder"
      canvas={<div>c</div>}
      panel={<div>panel-body</div>}
      panelOpen={true}
      panelPosition="right"
      onPanelOpenChange={noop}
    />
  );
  expect(html).toContain("w-[min(280px,calc(100%-2rem))]");
  expect(html).toContain("right-4");
  expect(html).toContain("top-4");
});

test("(c) panelPosition='bottom' yields the centered-bottom container", () => {
  const html = renderAdminUi(
    <CanvasEditor
      title="Page builder"
      canvas={<div>c</div>}
      panel={<div>panel-body</div>}
      panelOpen={true}
      panelPosition="bottom"
      onPanelOpenChange={noop}
    />
  );
  expect(html).toContain("left-1/2");
  expect(html).toContain("-translate-x-1/2");
});

test("(d) panelRef / panelAriaLabel / panelDataProps land on the single rail div", () => {
  const ref = React.createRef<HTMLDivElement>();
  const view = mount(
    <CanvasEditor
      title="Page builder"
      canvas={<div>c</div>}
      panel={<div>panel-body</div>}
      panelOpen={true}
      panelRef={ref}
      panelAriaLabel="Section tools"
      panelDataProps={{
        "data-page-editor-floating-toolbar": "true",
        "data-page-editor-toolbar-collapsed": "false",
      }}
      onPanelOpenChange={noop}
    />
  );
  try {
    const rails = view.container.querySelectorAll("[data-page-editor-floating-toolbar]");
    expect(rails.length).toBe(1);
    const rail = rails[0] as HTMLElement;
    expect(rail).toBe(ref.current);
    expect(rail.getAttribute("data-page-editor-floating-toolbar")).toBe("true");
    expect(rail.getAttribute("data-page-editor-toolbar-collapsed")).toBe("false");
    expect(rail.getAttribute("aria-label")).toBe("Section tools");
  } finally {
    view.cleanup();
  }
});

test("the shell never toggles its own panel state (controlled read-only)", () => {
  // `panelOpen` is a required prop with no default; the shell renders ZERO
  // built-in Hide/Show toggle — both affordances are host-supplied slots.
  const html = renderAdminUi(
    <CanvasEditor
      title="Page builder"
      canvas={<div>c</div>}
      panel={<div>panel-body</div>}
      panelOpen={true}
      onPanelOpenChange={noop}
    />
  );
  expect(html).not.toContain('aria-label="Hide panel"');
  expect(html).not.toContain("aria-pressed");
});
