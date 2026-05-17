// @vitest-environment happy-dom

import React from "react";
import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { WizardPanel } from "../../../core/admin/ui/pages/builder/WizardPanel";
import type { Block } from "../../../core/admin/ui/pages/builder/types";
import type { WidgetDefinition, WidgetEditorProps } from "../../../core/widgets/types";

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

const StubEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = ({
  variant,
  onChange,
  onVariantChange,
}) => (
  <div>
    <div>{`Wizard editor variant: ${variant}`}</div>
    <button type="button" onClick={() => onChange({ title: "Updated data" })}>
      change-data
    </button>
    <button type="button" onClick={() => onVariantChange?.("beta")}>
      change-variant
    </button>
  </div>
);

const widget: WidgetDefinition = {
  type: "dummy",
  title: "Dummy Widget",
  description: "Test widget",
  category: "content",
  variants: [{ id: "alpha", label: "Alpha" }],
  schema: { type: "object" },
  defaults: {},
  editor: {
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  },
  render: () => null,
};

const block: Block = {
  id: "block-1",
  type: "dummy",
  variant: "alpha",
  data: {},
  layout: {
    container: "default",
    padding: { top: "md", bottom: "md" },
    margin: { top: "none", bottom: "none" },
    background: { color: "transparent" },
  },
  visibility: { enabled: true, devices: ["desktop"] },
  editor: { mode: "wizard", wizardCompleted: false },
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
});

test("WizardPanel renders widget editor and metadata", () => {
  const view = mount(
    <WizardPanel widget={widget} block={block} onChange={() => {}} onComplete={() => {}} />
  );

  try {
    expect(view.container.textContent).toContain("Wizard editor variant: alpha");
    expect(view.container.textContent).toContain("Dummy Widget");
    expect(view.container.textContent).toContain("Widget type");
    expect(view.container.textContent).toContain("dummy");
    expect(view.container.innerHTML).toContain('data-widget-editor="dummy"');
    expect(view.container.innerHTML).toContain('data-widget-editor-mode="wizard"');
    expect(view.container.innerHTML).toContain('aria-label="Dummy Widget widget information"');
    expect(view.container.textContent).toContain("Continue to layout and styling");
  } finally {
    view.cleanup();
  }
});

test("WizardPanel forwards editor data, variant updates, and completion", () => {
  const onChange = vi.fn();
  const onComplete = vi.fn();

  const view = mount(
    <WizardPanel widget={widget} block={block} onChange={onChange} onComplete={onComplete} />
  );

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "change-data")?.click();
      buttons.find((button) => button.textContent === "change-variant")?.click();
      buttons.find((button) => button.textContent === "Continue to layout and styling")?.click();
    });

    expect(onChange).toHaveBeenCalledWith({
      ...block,
      data: { title: "Updated data" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...block,
      variant: "beta",
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("WizardPanel prefers atomic block patches when provided", () => {
  const onChange = vi.fn();
  const onBlockPatch = vi.fn();

  const view = mount(
    <WizardPanel
      widget={widget}
      block={block}
      onChange={onChange}
      onBlockPatch={onBlockPatch}
      onComplete={() => {}}
    />
  );

  try {
    const buttons = Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      buttons.find((button) => button.textContent === "change-data")?.click();
      buttons.find((button) => button.textContent === "change-variant")?.click();
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(onBlockPatch).toHaveBeenCalledTimes(2);
    expect(onBlockPatch).toHaveBeenNthCalledWith(1, expect.any(Function));
    expect(onBlockPatch).toHaveBeenNthCalledWith(2, { variant: "beta" });
  } finally {
    view.cleanup();
  }
});

test("WizardPanel falls back to first widget variant or empty string", () => {
  const variantlessBlock: Block = {
    ...block,
    variant: undefined,
  };

  const emptyVariantWidget: WidgetDefinition = {
    ...widget,
    description: undefined,
    variants: [],
  };

  const emptyVariantView = mount(
    <WizardPanel
      widget={emptyVariantWidget}
      block={variantlessBlock}
      onChange={() => {}}
      onComplete={() => {}}
    />
  );

  try {
    expect(emptyVariantView.container.textContent).toContain("Wizard editor variant: ");
    expect(emptyVariantView.container.textContent).not.toContain("Test widget");
  } finally {
    emptyVariantView.cleanup();
  }
});
