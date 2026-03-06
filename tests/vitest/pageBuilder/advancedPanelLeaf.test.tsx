// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { AdvancedPanel } from "../../../core/admin/ui/pages/builder/AdvancedPanel";
import type { Block, LayoutValue, WidgetDefinition } from "../../../core/admin/ui/pages/builder/types";

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
  LayoutPanel: ({ onChange }: { onChange: (next: LayoutValue) => void }) => (
    <button
      type="button"
      data-layout-panel="true"
      onClick={() =>
        onChange({
          container: "wide",
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

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
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
      }: {
        onChange: (value: Record<string, unknown>) => void;
        variant: string;
        onVariantChange: (next: string) => void;
      }) => (
        <div>
          <span>{variant}</span>
          <button type="button" onClick={() => onDataChange({ title: "Updated" })}>
            change-data
          </button>
          <button type="button" onClick={() => onVariantChange("secondary")}>
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

    act(() => {
      byText("change-data")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      byText("change-variant")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      container
        .querySelector("button[data-layout-panel='true']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const switches = Array.from(container.querySelectorAll("button[data-switch-checked]"));
    act(() => {
      switches[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      switches[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith({ ...block, data: { title: "Updated" } });
    expect(onChange).toHaveBeenCalledWith({ ...block, variant: "secondary" });
    expect(onChange).toHaveBeenCalledWith({
      ...block,
      layout: {
        container: "wide",
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
