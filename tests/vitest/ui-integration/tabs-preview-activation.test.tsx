// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test } from "vitest";

import { TabsBlock, normalizeTabsData } from "../../../core/widgets/core/tabs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const slots = {
  "panel:1": [],
  "panel:2": [],
  "panel:3": [],
};

const baseData = normalizeTabsData(
  {
    items: [
      { id: "overview", label: "Overview", panelIntro: "Overview copy." },
      { id: "details", label: "Details", panelIntro: "Detailed copy." },
      { id: "faq", label: "FAQ", disabled: true },
    ],
    options: {
      defaultItemId: "details",
      activeId: "details",
      orientation: "horizontal",
    },
  },
  3
);

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

const clickElement = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLElement)) return;
  React.act(() => {
    element.click();
  });
};

const keydownElement = (element: Element | null | undefined, key: string) => {
  if (!(element instanceof HTMLElement)) return;
  React.act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
};

const findTab = (container: ParentNode, id: string) => {
  const tab = container.querySelector(`[data-coderso-tabs-trigger][data-coderso-tabs-id="${id}"]`);
  if (!(tab instanceof HTMLButtonElement)) {
    throw new Error(`Missing tab ${id}`);
  }
  return tab;
};

const findPanel = (container: ParentNode, id: string) => {
  const panel = container.querySelector(`[data-coderso-tabs-panel][data-coderso-tabs-id="${id}"]`);
  if (!(panel instanceof HTMLDivElement)) {
    throw new Error(`Missing panel ${id}`);
  }
  return panel;
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("tabs admin preview activates the saved custom-id default and skips disabled tabs", () => {
  const view = mount(
    <TabsBlock
      data={baseData}
      variant="pills"
      slots={slots}
      renderContext={{ mode: "editor-preview" }}
    />
  );

  try {
    const root = view.container.querySelector('[data-coderso-tabs="1"]');
    const overview = findTab(view.container, "overview");
    const details = findTab(view.container, "details");
    const faq = findTab(view.container, "faq");

    expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("details");
    expect(details.getAttribute("aria-selected")).toBe("true");
    expect(findPanel(view.container, "details").hidden).toBe(false);
    expect(findPanel(view.container, "overview").hidden).toBe(true);

    clickElement(overview);
    expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("overview");
    expect(findPanel(view.container, "overview").hidden).toBe(false);

    keydownElement(overview, "End");
    expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("details");

    keydownElement(details, "ArrowRight");
    expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("overview");

    clickElement(faq);
    expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("overview");
    expect(faq.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("tabs public runtime activation preserves custom ids and skips disabled tabs", () => {
  document.body.innerHTML = renderToString(
    <TabsBlock data={baseData} variant="pills" slots={slots} />
  );

  const script = document.querySelector("script");
  if (!script?.textContent) {
    throw new Error("Missing tabs runtime script");
  }

  // eslint-disable-next-line no-eval
  eval(script.textContent);

  const root = document.querySelector('[data-coderso-tabs="1"]');
  const overview = findTab(document, "overview");
  const details = findTab(document, "details");
  const faq = findTab(document, "faq");

  expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("details");
  expect(details.getAttribute("aria-selected")).toBe("true");
  expect(findPanel(document, "details").hidden).toBe(false);

  clickElement(overview);
  expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("overview");
  expect(findPanel(document, "overview").hidden).toBe(false);

  keydownElement(overview, "End");
  expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("details");

  keydownElement(details, "ArrowRight");
  expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("overview");

  clickElement(faq);
  expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("overview");
});
