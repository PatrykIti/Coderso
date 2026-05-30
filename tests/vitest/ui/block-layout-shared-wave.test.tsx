// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type {
  Block,
  WidgetBlockPatch,
  WidgetDefinition,
  WidgetLayoutDefaults,
} from "../../../core/admin/ui/pages/builder/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} {...props} />,
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode; value: string }) => <>{children}</>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  };
});

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) =>
    value === "visual" ? <div>{children}</div> : null,
}));

const widget: WidgetDefinition = {
  type: "product-compare",
  title: "Product Compare",
  description: "Compare products.",
  category: "content",
  variants: [{ id: "default", label: "Default" }],
  schema: { type: "object", additionalProperties: true },
  defaults: {},
  editor: {
    wizard: () => null,
    visual: () => <div>Widget visual editor</div>,
    advanced: () => <div>Widget advanced editor</div>,
  },
  render: () => <div>Product Compare</div>,
};

const pageDefaults: WidgetLayoutDefaults = {
  container: "full",
  padding: { top: "xl", bottom: "xl" },
  margin: { top: "none", bottom: "lg" },
};

const inheritedBlock: Block = {
  id: "product-compare-1",
  type: "product-compare",
  variant: "default",
  data: {},
  layout: {
    container: "inherit",
    padding: { top: "inherit", bottom: "inherit" },
    margin: { top: "inherit", bottom: "inherit" },
    background: { color: "transparent", image: null },
  },
  visibility: { enabled: true, devices: [] },
};

type MountedView = {
  container: HTMLDivElement;
  cleanup: () => void;
};

const mountedViews: MountedView[] = [];

function mount(node: React.ReactNode): MountedView {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<>{node}</>);
  });
  const view = {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
  mountedViews.push(view);
  return view;
}

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const setSelectValue = (select: HTMLSelectElement | undefined, value: string) => {
  if (!select) throw new Error(`Missing select for ${value}`);
  React.act(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  while (mountedViews.length) {
    mountedViews.pop()?.cleanup();
  }
  vi.restoreAllMocks();
});

test("shared block layout keeps inherited values through first explicit override", async () => {
  const { VisualPanel } = await import("../../../core/admin/ui/pages/builder/VisualPanel");
  let lastPatch: WidgetBlockPatch | null = null;
  const view = mount(
    <VisualPanel
      widget={widget}
      block={inheritedBlock}
      onChange={() => undefined}
      onBlockPatch={(patch) => {
        lastPatch = patch;
      }}
      pageDefaults={pageDefaults}
    />
  );

  await flush();

  expect(
    view.container.querySelector("[data-builder-layout-inheritance-summary]")?.textContent
  ).toContain("Current effective padding is top XL, bottom XL");
  expect(view.container.querySelector("[data-builder-visibility-summary]")?.textContent).toContain(
    "Hidden on all devices. Public rendering is disabled"
  );

  const selects = Array.from(view.container.querySelectorAll("select"));
  expect(selects[0]?.value).toBe("inherit");
  expect(selects[1]?.value).toBe("inherit");

  setSelectValue(selects[0], "narrow");

  expect(lastPatch).toEqual({
    layout: expect.objectContaining({
      container: "narrow",
      padding: { top: "inherit", bottom: "inherit" },
      margin: { top: "inherit", bottom: "inherit" },
    }),
  });
});

test("advanced layout summary distinguishes inherited effective values from saved overrides", async () => {
  const { AdvancedPanel } = await import("../../../core/admin/ui/pages/builder/AdvancedPanel");
  const view = mount(
    <AdvancedPanel
      widget={widget}
      block={inheritedBlock}
      onChange={() => undefined}
      pageDefaults={pageDefaults}
    />
  );

  await flush();

  expect(view.container.textContent).toContain("Inherit page default (XL)");
  expect(view.container.textContent).toContain("Inherit page default (full)");
  expect(view.container.textContent).toContain("Hidden on all devices");
  expect(view.container.textContent).not.toContain("Top MD");
});

test("block settings confirms repeatable slot removal before patching", async () => {
  const { BlockSettings } = await import("../../../core/admin/ui/pages/builder/BlockSettings");
  const { applyWidgetBlockPatch } = await import("../../../core/admin/ui/pages/builder/blockUtils");
  const confirmSpy = vi.fn(() => false);
  Object.defineProperty(window, "confirm", {
    value: confirmSpy,
    configurable: true,
  });
  const tabsWidget: WidgetDefinition = {
    type: "tabs",
    title: "Tabs",
    category: "layout",
    variants: [{ id: "pills", label: "Pills" }],
    schema: { type: "object", additionalProperties: true },
    defaults: {},
    slots: [
      {
        id: "panel",
        label: "Panel",
        kind: "repeatable",
        minItems: 2,
        maxItems: 6,
      },
    ],
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    editor: {
      wizard: () => null,
      visual: () => <div>Tabs visual editor</div>,
      advanced: () => <div>Tabs advanced editor</div>,
    },
    render: () => <div>Tabs</div>,
  };
  const block: Block = {
    id: "tabs-1",
    type: "tabs",
    variant: "pills",
    data: {},
    slots: {
      "panel:1": [{ id: "nested-1", type: "stub", data: {} }],
      "panel:2": [],
      "panel:3": [],
    },
    editor: {
      mode: "visual",
      wizardCompleted: true,
    },
  };
  const onBlockPatch = vi.fn();
  const view = mount(
    <BlockSettings
      widget={tabsWidget}
      block={block}
      onChange={() => undefined}
      onBlockPatch={onBlockPatch}
    />
  );

  await flush();

  const removeButtons = Array.from(view.container.querySelectorAll("button")).filter(
    (button): button is HTMLButtonElement =>
      button instanceof HTMLButtonElement && button.textContent === "Remove"
  );
  expect(removeButtons.length).toBeGreaterThan(0);

  React.act(() => {
    removeButtons[0]?.click();
  });

  expect(confirmSpy).toHaveBeenCalledWith(
    "Remove Panel 1? This removes the panel 1 slot and 1 nested block. This cannot be undone."
  );
  expect(onBlockPatch).not.toHaveBeenCalled();

  confirmSpy.mockReturnValue(true);
  React.act(() => {
    removeButtons[0]?.click();
  });

  expect(onBlockPatch).toHaveBeenCalledTimes(1);
  const patch = onBlockPatch.mock.calls[0]?.[0];
  const nextBlock = patch ? applyWidgetBlockPatch(block, patch) : block;
  expect(nextBlock.slots).not.toHaveProperty("panel:1");
  expect(nextBlock.slots).toHaveProperty("panel:2");
  expect(nextBlock.slots).toHaveProperty("panel:3");
});
