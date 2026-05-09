// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { AdvancedPanel } from "../../../core/admin/ui/pages/builder/AdvancedPanel";
import type {
  Block,
  LayoutValue,
  WidgetDefinition,
} from "../../../core/admin/ui/pages/builder/types";
import type { WidgetEditorProps } from "../../../core/widgets/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      data-switch-checked={String(Boolean(checked))}
      onClick={() => onCheckedChange?.(!checked)}
    >
      switch
    </button>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/LayoutPanel", () => ({
  LayoutPanel: ({
    value,
    onChange,
  }: {
    value: LayoutValue;
    onChange: (next: LayoutValue) => void;
  }) => (
    <button
      type="button"
      data-layout-panel="true"
      data-layout-container={value.container}
      data-layout-padding-top={value.padding.top}
      onClick={() =>
        onChange({
          container: "full",
          padding: { top: "sm", bottom: "lg" },
          margin: { top: "none", bottom: "md" },
          background: { color: "transparent", image: null },
        })
      }
    >
      layout-panel
    </button>
  ),
}));

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

test("AdvancedPanel wires editor, layout, and visibility callbacks", () => {
  const onChange = vi.fn();
  const block: Block = {
    id: "block-1",
    type: "hero",
    variant: "primary",
    data: { title: "Hello" },
    layout: {
      container: "default",
      padding: { top: "xl", bottom: "xl" },
      margin: { top: "none", bottom: "none" },
      background: { color: "transparent", image: null },
    },
    visibility: {
      enabled: true,
      devices: ["desktop", "mobile"],
    },
    editor: {
      mode: "visual",
      wizardCompleted: true,
    },
  };

  const widget = {
    type: "hero",
    title: "Hero",
    description: "Hero block",
    category: "layout",
    complexity: "composite",
    audience: "beginner",
    module: "marketing",
    variants: [
      { id: "primary", label: "Primary" },
      { id: "secondary", label: "Secondary" },
    ],
    defaults: {},
    schema: { type: "object", additionalProperties: true },
    editor: {
      wizard: () => null,
      visual: () => null,
      advanced: ({
        onChange: onDataChange,
        variant,
        onVariantChange,
      }: WidgetEditorProps<Record<string, unknown>>) => (
        <div>
          <span>{variant}</span>
          <button type="button" onClick={() => onDataChange({ title: "Updated" })}>
            change-data
          </button>
          <button type="button" onClick={() => onVariantChange?.("secondary")}>
            change-variant
          </button>
        </div>
      ),
    },
    render: () => null,
  } satisfies WidgetDefinition;

  const { container, cleanup } = mount(
    <AdvancedPanel block={block} widget={widget} onChange={onChange} />
  );

  try {
    const byText = (label: string) =>
      Array.from(container.querySelectorAll("button")).find(
        (element) => element.textContent === label
      );

    React.act(() => {
      byText("change-data")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      byText("change-variant")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      container
        .querySelector("button[data-layout-panel='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const switches = Array.from(container.querySelectorAll("button[data-switch-checked]"));
    React.act(() => {
      switches[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      switches[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith({ ...block, data: { title: "Updated" } });
    expect(onChange).toHaveBeenCalledWith({ ...block, variant: "secondary" });
    expect(onChange).toHaveBeenCalledWith({
      ...block,
      layout: {
        container: "full",
        padding: { top: "sm", bottom: "lg" },
        margin: { top: "none", bottom: "md" },
        background: { color: "transparent", image: null },
      },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...block,
      visibility: {
        enabled: true,
        devices: ["mobile"],
      },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...block,
      visibility: {
        enabled: true,
        devices: ["desktop", "mobile", "tablet"],
      },
    });
  } finally {
    cleanup();
  }
});

test("AdvancedPanel falls back for missing variant, visibility, and invalid layout", () => {
  const onChange = vi.fn();
  const block = {
    id: "block-fallback",
    type: "hero",
    data: { title: "Fallback" },
    layout: {
      container: "invalid",
      padding: { top: "bad", bottom: "bad" },
      margin: { top: "bad", bottom: "bad" },
      background: { color: "transparent", image: null },
    },
    editor: {
      mode: "advanced",
      wizardCompleted: true,
    },
  } as unknown as Block;

  const widget = {
    type: "hero",
    title: "Hero",
    description: "Hero block",
    category: "layout",
    complexity: "composite",
    audience: "beginner",
    module: "marketing",
    variants: [],
    defaults: {},
    schema: { type: "object", additionalProperties: true },
    editor: {
      wizard: () => null,
      visual: () => null,
      advanced: ({ variant }: { variant: string }) => (
        <span data-variant-fallback={variant}>advanced-editor</span>
      ),
    },
    render: () => null,
  } satisfies WidgetDefinition;

  const { container, cleanup } = mount(
    <AdvancedPanel block={block} widget={widget} onChange={onChange} />
  );

  try {
    const layoutButton = container.querySelector("button[data-layout-panel='true']");
    expect(layoutButton?.getAttribute("data-layout-container")).toBe("default");
    expect(layoutButton?.getAttribute("data-layout-padding-top")).toBe("md");
    expect(
      container.querySelector("[data-variant-fallback]")?.getAttribute("data-variant-fallback")
    ).toBe("");

    const switches = Array.from(container.querySelectorAll("button[data-switch-checked]"));
    expect(switches.map((item) => item.getAttribute("data-switch-checked"))).toEqual([
      "true",
      "true",
      "true",
    ]);

    React.act(() => {
      switches[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith({
      ...block,
      visibility: {
        devices: ["desktop", "tablet"],
        enabled: true,
      },
    });
  } finally {
    cleanup();
  }
});
