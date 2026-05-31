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

const numericIdData = normalizeTabsData(
  {
    items: [
      { id: "2", label: "Overview", panelIntro: "First slot intro." },
      { id: "1", label: "Details", panelIntro: "Second slot intro." },
    ],
    options: {
      defaultItemId: "2",
      activeId: "2",
      orientation: "horizontal",
    },
  },
  2
);

const numericSlots = {
  "panel:1": [{ id: "slot-one-block", type: "stub", data: {} }],
  "panel:2": [{ id: "slot-two-block", type: "stub", data: {} }],
};

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

test("tabs previewDevice mode preserves numeric custom ids and slot order", () => {
  const view = mount(
    <TabsBlock
      data={numericIdData}
      variant="pills"
      slots={numericSlots}
      previewDevice="desktop"
      renderBlock={(block) => <div>{block.id}</div>}
    />
  );

  try {
    const root = view.container.querySelector('[data-coderso-tabs="1"]');
    const overview = findTab(view.container, "2");
    const details = findTab(view.container, "1");

    expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("2");
    expect(findPanel(view.container, "2").textContent).toContain("First slot intro.");
    expect(findPanel(view.container, "2").textContent).toContain("slot-one-block");
    expect(findPanel(view.container, "1").textContent).toContain("Second slot intro.");
    expect(findPanel(view.container, "1").textContent).toContain("slot-two-block");

    clickElement(details);
    expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("1");
    expect(findPanel(view.container, "1").hidden).toBe(false);

    keydownElement(details, "Home");
    expect(root?.getAttribute("data-coderso-tabs-active-id")).toBe("2");
    expect(overview.getAttribute("aria-selected")).toBe("true");
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

test("tabs public runtime keeps multiple widget roots isolated", () => {
  const alternateData = normalizeTabsData(
    {
      ...baseData,
      options: {
        ...baseData.options,
        defaultItemId: "overview",
        activeId: "overview",
      },
    },
    3
  );

  document.body.innerHTML = renderToString(
    <>
      <TabsBlock data={baseData} variant="pills" slots={slots} blockId="tabs-a" />
      <TabsBlock data={alternateData} variant="pills" slots={slots} blockId="tabs-b" />
    </>
  );

  document.querySelectorAll("script").forEach((script) => {
    if (!script.textContent) {
      throw new Error("Missing tabs runtime script");
    }
    // eslint-disable-next-line no-eval
    eval(script.textContent);
  });

  const roots = Array.from(document.querySelectorAll('[data-coderso-tabs="1"]'));
  const [firstRoot, secondRoot] = roots;

  if (!(firstRoot instanceof HTMLElement) || !(secondRoot instanceof HTMLElement)) {
    throw new Error("Expected two tabs roots");
  }

  expect(firstRoot.getAttribute("data-coderso-tabs-active-id")).toBe("details");
  expect(secondRoot.getAttribute("data-coderso-tabs-active-id")).toBe("overview");

  clickElement(
    firstRoot.querySelector('[data-coderso-tabs-trigger][data-coderso-tabs-id="overview"]')
  );
  expect(firstRoot.getAttribute("data-coderso-tabs-active-id")).toBe("overview");
  expect(secondRoot.getAttribute("data-coderso-tabs-active-id")).toBe("overview");

  clickElement(
    secondRoot.querySelector('[data-coderso-tabs-trigger][data-coderso-tabs-id="details"]')
  );
  expect(firstRoot.getAttribute("data-coderso-tabs-active-id")).toBe("overview");
  expect(secondRoot.getAttribute("data-coderso-tabs-active-id")).toBe("details");
});
