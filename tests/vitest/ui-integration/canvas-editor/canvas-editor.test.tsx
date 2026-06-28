// @vitest-environment happy-dom
//
// TASK-479-06-L07: CanvasEditor floating-panel show/hide toggle (L06). Show/hide
// is stateful -> createRoot + React.act; the aria-pressed + bottom-placement
// markers are asserted on the SSR string.

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

const clickButton = (label: string) => {
  const button = Array.from(document.body.querySelectorAll("button")).find((b) =>
    b.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button: ${label}`);
  React.act(() => {
    (button as HTMLButtonElement).click();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("hides the panel and shows the reopen affordance, then restores it", () => {
  const view = mount(
    <CanvasEditor
      canvas={<div>canvas-body</div>}
      panel={<div>panel-body</div>}
      panelTitle="Block"
    />
  );
  const hasText = (t: string) =>
    Array.from(view.container.querySelectorAll("*")).some((n) => n.textContent === t);

  try {
    expect(hasText("panel-body")).toBe(true);

    clickButton("Hide panel");
    expect(hasText("panel-body")).toBe(false);

    clickButton("Show panel");
    expect(hasText("panel-body")).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("the panel toggle starts open (defaultPanelOpen) and reflects aria-pressed", () => {
  const html = renderAdminUi(<CanvasEditor canvas={<div>c</div>} panel={<div>p</div>} />);
  expect(html).toContain('aria-pressed="true"');
});

test("supports panelPosition='bottom' (centered-bottom placement classes)", () => {
  const html = renderAdminUi(
    <CanvasEditor canvas={<div>c</div>} panel={<div>p</div>} panelPosition="bottom" />
  );
  expect(html).toContain("aria-pressed");
  expect(html).toContain("left-1/2");
  expect(html).toContain("-translate-x-1/2");
});

test("absent panel: the toggle still flips aria-pressed without throwing", () => {
  const view = mount(<CanvasEditor canvas={<div>c</div>} />);
  try {
    const toggle = () =>
      Array.from(view.container.querySelectorAll("button")).find(
        (b) =>
          b.getAttribute("aria-label") === "Hide panel" ||
          b.getAttribute("aria-label") === "Show panel"
      );
    expect(toggle()?.getAttribute("aria-pressed")).toBe("true");
    React.act(() => {
      (toggle() as HTMLButtonElement).click();
    });
    expect(toggle()?.getAttribute("aria-pressed")).toBe("false");
  } finally {
    view.cleanup();
  }
});
