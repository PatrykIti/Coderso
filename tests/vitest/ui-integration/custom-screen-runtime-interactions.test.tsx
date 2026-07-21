// @vitest-environment happy-dom

import React, { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";

import { ScreenRuntimeRenderer } from "../../../core/admin/ui/custom-screens/ScreenRuntimeRenderer";
import type { ScreenBlockV1 } from "../../../core/services/customScreens/customScreenSchemas";
import type { ScreenInsertTarget } from "../../../core/services/customScreens/screenDocumentOps";
import { doc, fields, mount, render } from "./support/customScreenRuntimeRendererHarness";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

test("block and section roots stay passive while sibling selection handles remain keyboard-clickable", () => {
  const onSelectBlock = vi.fn();
  const onSelectSection = vi.fn();
  const view = render(
    [{ id: "text-select", type: "text", data: { label: "Text", content: "Select me" } }],
    "builder",
    [],
    {},
    {
      onSelectBlock,
      onSelectSection,
      renderBuilderActions: () => <input type="checkbox" aria-label="Nested builder input" />,
    }
  );
  try {
    const block = view.container.querySelector<HTMLElement>(
      '[data-screen-block-id="text-select"]'
    )!;
    const section = view.container.querySelector<HTMLElement>(
      '[data-screen-section-id="section-1"]'
    )!;
    const blockHandle = block.querySelector<HTMLButtonElement>(
      '[data-screen-select-block="text-select"]'
    )!;
    const sectionHandle = section.querySelector<HTMLButtonElement>(
      '[data-screen-select-section="section-1"]'
    )!;

    expect(block.getAttribute("role")).toBeNull();
    expect(block.getAttribute("tabindex")).toBeNull();
    expect(section.getAttribute("role")).toBeNull();
    expect(section.getAttribute("tabindex")).toBeNull();
    expect(section.className).toContain("group/section");
    expect(blockHandle.tagName).toBe("BUTTON");
    expect(blockHandle.parentElement).toBe(block);
    expect(sectionHandle.tagName).toBe("BUTTON");
    expect(sectionHandle.parentElement).toBe(section);

    React.act(() => {
      blockHandle.focus();
      blockHandle.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    });
    expect(onSelectBlock).toHaveBeenLastCalledWith("text-select");

    React.act(() => {
      sectionHandle.focus();
      sectionHandle.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    });
    expect(onSelectSection).toHaveBeenLastCalledWith("section-1");

    onSelectBlock.mockClear();
    onSelectSection.mockClear();
    const nestedInput = block.querySelector<HTMLInputElement>(
      '[aria-label="Nested builder input"]'
    )!;
    React.act(() => nestedInput.click());
    expect(nestedInput.checked).toBe(true);
    expect(onSelectBlock).not.toHaveBeenCalled();
    expect(onSelectSection).not.toHaveBeenCalled();

    React.act(() =>
      block
        .querySelector("p")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    );
    expect(onSelectBlock).toHaveBeenLastCalledWith("text-select");
    expect(onSelectSection).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("entry link activation performs only the link action and never selects its passive wrapper", () => {
  const onSelectBlock = vi.fn();
  const onSelectSection = vi.fn();
  const view = render(
    [
      {
        id: "button-link",
        type: "button",
        data: { label: "Open", action: "link", variant: "primary", href: "/details" },
      },
    ],
    "entry",
    [],
    {},
    { onSelectBlock, onSelectSection }
  );
  try {
    const block = view.container.querySelector<HTMLElement>(
      '[data-screen-block-id="button-link"]'
    )!;
    const link = block.querySelector<HTMLAnchorElement>('a[href="/details"]')!;
    const onLinkAction = vi.fn();
    link.addEventListener("click", onLinkAction);
    expect(block.getAttribute("role")).toBeNull();
    expect(block.getAttribute("tabindex")).toBeNull();
    React.act(() => {
      link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(link.getAttribute("href")).toBe("/details");
    expect(onLinkAction).toHaveBeenCalledOnce();
    expect(onSelectBlock).not.toHaveBeenCalled();
    expect(onSelectSection).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

const tabsBlock = (id = "tabs-1"): ScreenBlockV1 => ({
  id,
  type: "tabs",
  data: {
    label: "Project tabs",
    tabs: [
      { id: "tab-1", label: "Overview" },
      { id: "tab-2", label: "Activity" },
    ],
  },
  slots: {
    "tab-1": [
      { id: `${id}-overview`, type: "text", data: { label: "", content: "Overview panel" } },
    ],
    "tab-2": [
      { id: `${id}-activity`, type: "text", data: { label: "", content: "Activity panel" } },
    ],
  },
});

const getTabs = (container: ParentNode, blockId = "tabs-1") => {
  const block = container.querySelector(`[data-screen-block-id="${blockId}"]`)!;
  const tablist = block.querySelector('[role="tablist"]')!;
  return {
    block,
    tablist,
    tabs: Array.from(tablist.querySelectorAll<HTMLButtonElement>(':scope > [role="tab"]')),
    panels: Array.from(block.querySelectorAll<HTMLElement>(':scope > div > [role="tabpanel"]')),
  };
};

test("Tabs expose unique ARIA relationships, roving tabIndex, and exactly one visible panel", () => {
  const view = render([tabsBlock()], "preview");
  try {
    const { tablist, tabs, panels } = getTabs(view.container);
    expect(tablist.getAttribute("aria-label")).toBe("Project tabs");
    expect(tabs).toHaveLength(2);
    expect(panels).toHaveLength(2);
    expect(new Set([...tabs, ...panels].map((item) => item.id)).size).toBe(4);
    for (let index = 0; index < tabs.length; index += 1) {
      expect(tabs[index]?.getAttribute("aria-controls")).toBe(panels[index]?.id);
      expect(panels[index]?.getAttribute("aria-labelledby")).toBe(tabs[index]?.id);
    }
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]?.tabIndex).toBe(0);
    expect(panels[0]?.hidden).toBe(false);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    expect(tabs[1]?.tabIndex).toBe(-1);
    expect(panels[1]?.hidden).toBe(true);

    React.act(() => tabs[1]?.click());
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("false");
    expect(panels[0]?.hidden).toBe(true);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(panels[1]?.hidden).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("Tabs Arrow/Home/End navigation wraps, activates, and transfers focus inside its renderer root", async () => {
  const view = render([tabsBlock()], "entry");
  try {
    const { tabs } = getTabs(view.container);
    const press = async (tab: HTMLButtonElement, key: string) => {
      await React.act(async () => {
        tab.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
        await Promise.resolve();
      });
    };

    await press(tabs[0]!, "ArrowRight");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[1]);

    await press(tabs[1]!, "Home");
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[0]);

    await press(tabs[0]!, "End");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");

    await press(tabs[1]!, "ArrowRight");
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");

    await press(tabs[0]!, "ArrowLeft");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
  } finally {
    view.cleanup();
  }
});

function BuilderTabsHarness() {
  const [insertPoint, setInsertPoint] = useState<ScreenInsertTarget | null>({
    kind: "slot-index",
    sectionId: "section-1",
    parentId: "tabs-1",
    slotId: "tab-2",
    index: 0,
  });
  return (
    <>
      <output data-builder-insert-point="true">{JSON.stringify(insertPoint)}</output>
      <ScreenRuntimeRenderer
        document={doc([tabsBlock()])}
        bindings={[]}
        values={{}}
        fields={fields}
        mode="builder"
        insertPoint={insertPoint}
        onSetInsertPoint={setInsertPoint}
      />
    </>
  );
}

test("builder Tabs derive visibility from insert and selection host state while activation arms slot-end", () => {
  const activationView = mount(<BuilderTabsHarness />);
  try {
    const { tabs, panels } = getTabs(activationView.container);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(panels[1]?.hidden).toBe(false);

    React.act(() => tabs[0]?.click());
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(panels[0]?.hidden).toBe(false);
    expect(
      activationView.container.querySelector('[data-builder-insert-point="true"]')?.textContent
    ).toBe(
      JSON.stringify({
        kind: "slot-end",
        sectionId: "section-1",
        parentId: "tabs-1",
        slotId: "tab-1",
      })
    );
  } finally {
    activationView.cleanup();
  }

  const selectionView = render(
    [tabsBlock()],
    "builder",
    [],
    {},
    {
      selectedBlockId: "tabs-1-activity",
    }
  );
  try {
    const { tabs, panels } = getTabs(selectionView.container);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(panels[1]?.hidden).toBe(false);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("false");
    expect(panels[0]?.hidden).toBe(true);
    expect(panels[1]?.querySelector('[data-screen-block-id="tabs-1-activity"]')).not.toBeNull();
  } finally {
    selectionView.cleanup();
  }

  const precedenceView = render(
    [tabsBlock()],
    "builder",
    [],
    {},
    {
      selectedBlockId: "tabs-1-activity",
      insertPoint: {
        kind: "slot-end",
        sectionId: "section-1",
        parentId: "tabs-1",
        slotId: "tab-1",
      } satisfies ScreenInsertTarget,
    }
  );
  try {
    const { tabs, panels } = getTabs(precedenceView.container);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(panels[0]?.hidden).toBe(false);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    expect(panels[1]?.hidden).toBe(true);
  } finally {
    precedenceView.cleanup();
  }

  const invalidTargetView = render(
    [tabsBlock()],
    "builder",
    [],
    {},
    {
      selectedBlockId: "tabs-1-activity",
      insertPoint: {
        kind: "slot-end",
        sectionId: "section-1",
        parentId: "tabs-1",
        slotId: "missing-tab",
      } satisfies ScreenInsertTarget,
    }
  );
  try {
    const { tabs, panels } = getTabs(invalidTargetView.container);
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(panels[1]?.hidden).toBe(false);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("false");
    expect(panels[0]?.hidden).toBe(true);
  } finally {
    invalidTargetView.cleanup();
  }
});

function NestedBuilderTabsHarness({
  onSelectBlock,
  onSelectSection,
}: {
  onSelectBlock: (blockId: string) => void;
  onSelectSection: (sectionId: string) => void;
}) {
  const nested = tabsBlock("tabs-nested");
  const outer = tabsBlock();
  outer.slots = {
    ...outer.slots,
    "tab-2": [nested],
  };
  const [insertPoint, setInsertPoint] = useState<ScreenInsertTarget | null>({
    kind: "slot-end",
    sectionId: "section-1",
    parentId: "tabs-1",
    slotId: "tab-2",
  });
  return (
    <>
      <output data-nested-builder-insert-point="true">{JSON.stringify(insertPoint)}</output>
      <ScreenRuntimeRenderer
        document={doc([outer])}
        bindings={[]}
        values={{}}
        fields={fields}
        mode="builder"
        insertPoint={insertPoint}
        onSetInsertPoint={setInsertPoint}
        onSelectBlock={onSelectBlock}
        onSelectSection={onSelectSection}
      />
    </>
  );
}

test("nested builder Tabs keep every ancestor non-first panel visible for click and keyboard activation", async () => {
  const onSelectBlock = vi.fn();
  const onSelectSection = vi.fn();
  const view = mount(
    <NestedBuilderTabsHarness onSelectBlock={onSelectBlock} onSelectSection={onSelectSection} />
  );
  try {
    const outer = getTabs(view.container, "tabs-1");
    const nested = getTabs(view.container, "tabs-nested");
    expect(outer.tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(outer.panels[1]?.hidden).toBe(false);
    expect(nested.tabs[0]?.getAttribute("aria-selected")).toBe("true");

    React.act(() => nested.tabs[1]?.click());
    expect(outer.tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(outer.panels[1]?.hidden).toBe(false);
    expect(nested.tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(nested.panels[1]?.hidden).toBe(false);
    expect(
      view.container.querySelector('[data-nested-builder-insert-point="true"]')?.textContent
    ).toBe(
      JSON.stringify({
        kind: "slot-end",
        sectionId: "section-1",
        parentId: "tabs-nested",
        slotId: "tab-2",
      })
    );
    expect(onSelectBlock).not.toHaveBeenCalled();
    expect(onSelectSection).not.toHaveBeenCalled();

    await React.act(async () => {
      nested.tabs[1]?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });
    expect(outer.tabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(outer.panels[1]?.hidden).toBe(false);
    expect(nested.tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(nested.panels[0]?.hidden).toBe(false);
    expect(document.activeElement).toBe(nested.tabs[0]);
    const rendererRoot = view.container.querySelector(
      '[data-screen-section-id="section-1"]'
    )?.parentElement;
    expect(rendererRoot?.contains(document.activeElement)).toBe(true);
    expect(
      view.container.querySelector('[data-nested-builder-insert-point="true"]')?.textContent
    ).toBe(
      JSON.stringify({
        kind: "slot-end",
        sectionId: "section-1",
        parentId: "tabs-nested",
        slotId: "tab-1",
      })
    );
    expect(onSelectBlock).not.toHaveBeenCalled();
    expect(onSelectSection).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("nested Tabs keep active state independent from their parent", () => {
  const nested = tabsBlock("tabs-nested");
  const outer = tabsBlock();
  outer.slots = {
    ...outer.slots,
    "tab-1": [nested],
  };
  const view = render([outer], "entry");
  try {
    const outerTabs = getTabs(view.container, "tabs-1").tabs;
    const nestedTabs = getTabs(view.container, "tabs-nested").tabs;
    React.act(() => nestedTabs[1]?.click());
    expect(nestedTabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(outerTabs[0]?.getAttribute("aria-selected")).toBe("true");

    React.act(() => outerTabs[1]?.click());
    expect(outerTabs[1]?.getAttribute("aria-selected")).toBe("true");
    expect(nestedTabs[1]?.getAttribute("aria-selected")).toBe("true");
  } finally {
    view.cleanup();
  }
});

function TabModeSwitchHarness({
  initialMode,
  initialInsertPoint,
}: {
  initialMode: "preview" | "entry";
  initialInsertPoint: ScreenInsertTarget | null;
}) {
  const [mode, setMode] = useState<"builder" | "preview" | "entry">(initialMode);
  const [insertPoint, setInsertPoint] = useState<ScreenInsertTarget | null>(initialInsertPoint);
  return (
    <>
      <button type="button" data-switch-tabs-to-builder="true" onClick={() => setMode("builder")}>
        Switch to builder
      </button>
      <ScreenRuntimeRenderer
        document={doc([tabsBlock()])}
        bindings={[]}
        values={{}}
        fields={fields}
        mode={mode}
        insertPoint={insertPoint}
        onSetInsertPoint={setInsertPoint}
      />
    </>
  );
}

for (const scenario of [
  { name: "preview with no insert point", mode: "preview" as const, insertPoint: null },
  {
    name: "entry with an unrelated insert point",
    mode: "entry" as const,
    insertPoint: {
      kind: "slot-end" as const,
      sectionId: "section-1",
      parentId: "other-container",
      slotId: "other-slot",
    },
  },
]) {
  test(`${scenario.name} cannot leak local tab state into builder mode`, () => {
    const view = mount(
      <TabModeSwitchHarness initialMode={scenario.mode} initialInsertPoint={scenario.insertPoint} />
    );
    try {
      let tabs = getTabs(view.container).tabs;
      React.act(() => tabs[1]?.click());
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");

      React.act(() =>
        view.container
          .querySelector<HTMLButtonElement>('[data-switch-tabs-to-builder="true"]')
          ?.click()
      );
      tabs = getTabs(view.container).tabs;
      expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
      expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    } finally {
      view.cleanup();
    }
  });
}

function RemovableTabsHarness() {
  const [block, setBlock] = useState(tabsBlock());
  return (
    <>
      <button
        type="button"
        data-remove-active-tab="true"
        onClick={() =>
          setBlock((current) => ({
            ...current,
            data: { ...current.data, tabs: [{ id: "tab-1", label: "Overview" }] },
            slots: { "tab-1": current.slots?.["tab-1"] ?? [] },
          }))
        }
      >
        Remove active tab
      </button>
      <ScreenRuntimeRenderer
        document={doc([block])}
        bindings={[]}
        values={{}}
        fields={fields}
        mode="preview"
      />
    </>
  );
}

test("removed active Tab derives to the first remaining tab without an effect reset", () => {
  const view = mount(<RemovableTabsHarness />);
  try {
    let tabs = getTabs(view.container).tabs;
    React.act(() => tabs[1]?.click());
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true");
    React.act(() =>
      view.container.querySelector<HTMLButtonElement>('[data-remove-active-tab="true"]')?.click()
    );
    tabs = getTabs(view.container).tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[0]?.tabIndex).toBe(0);
  } finally {
    view.cleanup();
  }
});

test("two concurrent renderer instances namespace identical tab IDs and keep focus/state scoped", async () => {
  const view = mount(
    <div>
      <div data-renderer-host="one">
        <ScreenRuntimeRenderer
          document={doc([tabsBlock()])}
          bindings={[]}
          values={{}}
          mode="entry"
        />
      </div>
      <div data-renderer-host="two">
        <ScreenRuntimeRenderer
          document={doc([tabsBlock()])}
          bindings={[]}
          values={{}}
          mode="entry"
        />
      </div>
    </div>
  );
  try {
    const one = view.container.querySelector('[data-renderer-host="one"]')!;
    const two = view.container.querySelector('[data-renderer-host="two"]')!;
    const first = getTabs(one).tabs;
    const second = getTabs(two).tabs;
    expect(new Set([...first, ...second].map((tab) => tab.id)).size).toBe(4);
    expect(view.container.querySelector("[data-screen-runtime-root]")).toBeNull();

    await React.act(async () => {
      first[0]?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });
    expect(first[1]?.getAttribute("aria-selected")).toBe("true");
    expect(second[0]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(first[1]);
  } finally {
    view.cleanup();
  }
});

test("Tabs encode ambiguous block and tab ID pairs without DOM collisions or cross-block focus", async () => {
  const makeAmbiguousTabs = (blockId: string, firstTabId: string, label: string) => ({
    id: blockId,
    type: "tabs",
    data: {
      label,
      tabs: [
        { id: firstTabId, label: `${label} first` },
        { id: "second", label: `${label} second` },
      ],
    },
    slots: {
      [firstTabId]: [
        { id: `${blockId}-first`, type: "text", data: { content: `${label} first panel` } },
      ],
      second: [
        { id: `${blockId}-second`, type: "text", data: { content: `${label} second panel` } },
      ],
    },
  });
  const view = render(
    [
      makeAmbiguousTabs("alpha-beta", "gamma", "One"),
      makeAmbiguousTabs("alpha", "beta-gamma", "Two"),
    ],
    "entry"
  );
  try {
    const first = getTabs(view.container, "alpha-beta");
    const second = getTabs(view.container, "alpha");
    const identities = [...first.tabs, ...first.panels, ...second.tabs, ...second.panels].map(
      (element) => element.id
    );
    expect(new Set(identities).size).toBe(identities.length);
    for (const group of [first, second]) {
      for (let index = 0; index < group.tabs.length; index += 1) {
        expect(group.tabs[index]?.getAttribute("aria-controls")).toBe(group.panels[index]?.id);
        expect(group.panels[index]?.getAttribute("aria-labelledby")).toBe(group.tabs[index]?.id);
      }
    }

    await React.act(async () => {
      second.tabs[1]?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });
    expect(second.tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(second.tabs[0]);
    expect(first.tabs[0]?.getAttribute("aria-selected")).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("zero Tabs exposes an accessible empty state without an empty tablist", () => {
  const view = render(
    [{ id: "tabs-1", type: "tabs", data: { label: "Empty tabs", tabs: [] }, slots: {} }],
    "preview"
  );
  try {
    const block = view.container.querySelector('[data-screen-block-id="tabs-1"]');
    expect(block?.querySelector('[role="tablist"]')).toBeNull();
    expect(block?.querySelector('[role="tab"]')).toBeNull();
    expect(block?.querySelector('[role="tabpanel"]')).toBeNull();
    const emptyState = block?.querySelector('[data-screen-tabs-empty="true"]');
    expect(emptyState?.getAttribute("role")).toBe("status");
    expect(emptyState?.textContent).toBe("No tabs available.");
  } finally {
    view.cleanup();
  }
});
