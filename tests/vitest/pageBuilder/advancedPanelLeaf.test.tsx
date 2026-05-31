// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { AdvancedPanel } from "../../../core/admin/ui/pages/builder/AdvancedPanel";
import type { Block, WidgetDefinition } from "../../../core/admin/ui/pages/builder/types";
import type { WidgetEditorProps } from "../../../core/widgets/types";

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

test("AdvancedPanel wires editor callbacks and renders layout visibility summaries", () => {
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
    expect(container.innerHTML).toContain('data-widget-editor="hero"');
    expect(container.innerHTML).toContain('data-widget-editor-mode="advanced"');
    const byText = (label: string) =>
      Array.from(container.querySelectorAll("button")).find(
        (element) => element.textContent === label
      );

    React.act(() => {
      byText("change-data")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      byText("change-variant")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith({ ...block, data: { title: "Updated" } });
    expect(onChange).toHaveBeenCalledWith({ ...block, variant: "secondary" });
    expect(container.textContent).toContain("Block layout summary");
    expect(container.textContent).toContain("Visibility summary");
    expect(container.textContent).toContain("Desktop, Mobile");
    expect(container.querySelectorAll("button")).toHaveLength(2);
    expect(container.querySelector("[data-layout-panel='true']")).toBeNull();
    expect(container.querySelector("[data-switch-checked]")).toBeNull();
  } finally {
    cleanup();
  }
});

test("AdvancedPanel routes data and variant edits through block patches", () => {
  const onChange = vi.fn();
  const onBlockPatch = vi.fn();
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
    <AdvancedPanel block={block} widget={widget} onChange={onChange} onBlockPatch={onBlockPatch} />
  );

  try {
    const byText = (label: string) =>
      Array.from(container.querySelectorAll("button")).find(
        (element) => element.textContent === label
      );

    React.act(() => {
      byText("change-data")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      byText("change-variant")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(onBlockPatch).toHaveBeenCalledTimes(2);
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
    expect(container.innerHTML).toContain('data-widget-editor="hero"');
    expect(container.innerHTML).toContain('data-widget-editor-mode="advanced"');
    expect(container.textContent).toContain("Content width");
    expect(container.textContent).toContain("default");
    expect(container.textContent).toContain("Top MD, bottom MD");
    expect(container.textContent).toContain("Desktop, Tablet, Mobile");
    expect(
      container.querySelector("[data-variant-fallback]")?.getAttribute("data-variant-fallback")
    ).toBe("");
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  } finally {
    cleanup();
  }
});
