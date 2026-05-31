// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { TemplateSectionData } from "../../../core/widgets/core/templateSection";

const templateState = vi.hoisted(() => ({
  current: {
    items: [
      {
        id: "template-1",
        name: "Hero banner",
        status: "published",
        description: "Published hero template",
        blocks: [{ id: "hero-1", type: "hero" }],
      },
      {
        id: "template-2",
        name: "Promo grid",
        status: "draft",
        description: "Draft promotional grid",
        blocks: [{ id: "grid-1", type: "feature-grid" }],
      },
    ],
    isLoading: false,
    error: null as string | null,
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string; disabled: boolean }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
            disabled: Boolean(child.props.disabled),
          },
        ];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
      disabled,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
      disabled?: boolean;
    }) => (
      <>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange?.(event.target.value)}
        >
          {collectOptions(children).map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {children}
      </>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
      <span {...props}>{children ?? null}</span>
    ),
    SelectValue: ({
      children,
      placeholder,
    }: {
      children?: React.ReactNode;
      placeholder?: string;
    }) => <>{children ?? placeholder ?? null}</>,
  };
});

vi.mock("../../../core/admin/ui/widgets/hooks/useWidgetTemplates", () => ({
  useWidgetTemplates: () => templateState.current,
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

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  templateState.current = {
    items: [
      {
        id: "template-1",
        name: "Hero banner",
        status: "published",
        description: "Published hero template",
        blocks: [{ id: "hero-1", type: "hero" }],
      },
      {
        id: "template-2",
        name: "Promo grid",
        status: "draft",
        description: "Draft promotional grid",
        blocks: [{ id: "grid-1", type: "feature-grid" }],
      },
    ],
    isLoading: false,
    error: null,
  };
  vi.restoreAllMocks();
});

test("TemplateSection editors cover template selection, draft badge, reset, and advanced summaries", async () => {
  const {
    TemplateSectionAdvancedEditor,
    TemplateSectionVisualEditor,
    TemplateSectionWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/TemplateSectionEditors");

  const onChangeSpy = vi.fn();
  let latestValue: TemplateSectionData = {
    resolved: {
      blocks: [
        {
          id: "block-1",
          type: "rich-text",
          data: {
            content: "Hello",
          },
        } as never,
      ],
      error: "template_unpublished",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<TemplateSectionData>(latestValue);

    const handleChange = (next: TemplateSectionData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    return (
      <>
        <TemplateSectionWizardEditor
          value={value}
          onChange={handleChange}
          variant="default"
          onVariantChange={() => undefined}
        />
        <TemplateSectionVisualEditor
          value={value}
          onChange={handleChange}
          variant="default"
          onVariantChange={() => undefined}
        />
        <TemplateSectionAdvancedEditor
          value={value}
          onChange={handleChange}
          variant="default"
          onVariantChange={() => undefined}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain(
      "Select a widget template to render in this section."
    );
    expect(view.container.textContent).toContain("Runtime behavior");
    expect(view.container.textContent).toContain("Template presentation");
    expect(view.container.querySelector("pre")).toBeNull();
    expect(view.container.textContent).toContain("Resolved content summary");
    expect(view.container.textContent).toContain("1 content block resolved: Rich Text.");
    expect(view.container.textContent).toContain("No template selected.");
    expect(view.container.textContent).not.toContain("Template ID");
    expect(
      view.container
        .querySelector("[data-widget-editor-section='template-section.wizard.template-setup']")
        ?.getAttribute("data-widget-editor-mode")
    ).toBe("wizard");
    const wizardTemplateField = view.container.querySelector(
      "#template-section-wizard-template-id-field"
    );
    expect(wizardTemplateField?.getAttribute("aria-labelledby")).toBe(
      "template-section-wizard-template-id-label"
    );

    const selects = Array.from(view.container.querySelectorAll("select"));
    setSelectValue(selects[0], "template-2");
    const inputs = Array.from(view.container.querySelectorAll("input"));
    const previewLabelInput = inputs.find((input) => input.placeholder === "Homepage Hero Cluster");
    const categoryInput = inputs.find((input) => input.placeholder === "Marketing");

    if (!(previewLabelInput instanceof HTMLInputElement)) {
      throw new Error("Missing preview label input");
    }
    if (!(categoryInput instanceof HTMLInputElement)) {
      throw new Error("Missing category input");
    }

    setInputValue(previewLabelInput, "Landing Hero");
    setInputValue(categoryInput, "Marketing");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.templateId).toBe("template-2");
    expect(latestValue.templateName).toBe("Promo grid");
    expect(latestValue.metadata).toMatchObject({
      previewLabel: "Landing Hero",
      category: "Marketing",
    });
    expect(
      Array.from(view.container.querySelectorAll("[data-widget-control-path]"))
        .filter((element) => element.getAttribute("data-widget-control-readonly") !== "true")
        .map((element) => element.getAttribute("data-widget-control-path"))
    ).toEqual(["templateId", "metadata.previewLabel", "metadata.category"]);
    expect(view.container.textContent).toContain("Draft");
    expect(view.container.textContent).toContain("Active template:");
    expect(view.container.textContent).toContain("Promo grid");
    expect(view.container.textContent).toContain("Draft promotional grid");

    expect(view.container.textContent).toContain("Resolved content summary");
    expect(view.container.textContent).toContain("No content blocks resolved.");
    expect(view.container.textContent).toContain(
      "template_unpublished: selected template is still a draft for public runtime."
    );
    expect(view.container.textContent).toContain("1 source block in the draft template.");
    expect(view.container.textContent).toContain("Category");
    expect(view.container.textContent).toContain("Marketing");
    expect(view.container.textContent).not.toContain("Template ID");
    expect(view.container.textContent).not.toContain("No resolution problem detected.");

    setSelectValue(selects[0], "__no-template__");

    expect(latestValue.templateId).toBe("");
    expect(latestValue.templateName).toBe("");
    expect(latestValue.resolved).toBeUndefined();
    expect(view.container.textContent).toContain(
      "Select a widget template to render in this section."
    );
  } finally {
    view.cleanup();
  }
}, 10000);

test("TemplateSection editors surface error state from the template hook while keeping the empty placeholder", async () => {
  templateState.current = {
    items: [],
    isLoading: true,
    error: "Failed to load templates.",
  };

  const { TemplateSectionWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/TemplateSectionEditors");

  const view = mount(
    <TemplateSectionWizardEditor
      value={{}}
      onChange={() => undefined}
      variant="default"
      onVariantChange={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Failed to load templates.");
    expect(view.container.textContent).toContain("No template");
    expect(view.container.textContent).toContain("Template setup");
    expect(view.container.textContent).not.toContain("Template presentation");
    expect(view.container.textContent).toContain(
      "Select a widget template to render in this section."
    );
  } finally {
    view.cleanup();
  }
});
