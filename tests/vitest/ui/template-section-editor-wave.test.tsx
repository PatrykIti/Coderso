// @vitest-environment happy-dom

import React, { act, useState } from "react";
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
      },
      {
        id: "template-2",
        name: "Promo grid",
        status: "draft",
        description: "Draft promotional grid",
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
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
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

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  act(() => {
    descriptor?.set?.call(element, value);
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
      },
      {
        id: "template-2",
        name: "Promo grid",
        status: "draft",
        description: "Draft promotional grid",
      },
    ],
    isLoading: false,
    error: null,
  };
  vi.restoreAllMocks();
});

test("TemplateSection editors cover template selection, draft badge, reset, and advanced payload preview", async () => {
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
    expect(view.container.textContent).toContain("Select a widget template to render in this section.");
    expect(view.container.textContent).toContain("Runtime behavior");

    const selects = Array.from(view.container.querySelectorAll("select"));
    setSelectValue(selects[0], "template-2");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.templateId).toBe("template-2");
    expect(latestValue.templateName).toBe("Promo grid");
    expect(view.container.textContent).toContain("Draft");
    expect(view.container.textContent).toContain("Active template:");
    expect(view.container.textContent).toContain("Promo grid");
    expect(view.container.textContent).toContain("Draft promotional grid");

    const preview = view.container.querySelector("pre");
    expect(preview?.textContent).toContain('"id": "block-1"');
    expect(preview?.textContent).toContain('"error": "template_unpublished"');

    setSelectValue(selects[0], "__no-template__");

    expect(latestValue.templateId).toBe("");
    expect(latestValue.templateName).toBe("");
    expect(latestValue.resolved?.blocks).toHaveLength(1);
    expect(view.container.textContent).toContain("Select a widget template to render in this section.");
  } finally {
    view.cleanup();
  }
});

test("TemplateSection editors surface error state from the template hook while keeping the empty placeholder", async () => {
  templateState.current = {
    items: [],
    isLoading: true,
    error: "Failed to load templates.",
  };

  const { TemplateSectionWizardEditor } = await import(
    "../../../core/admin/ui/widgets/editors/TemplateSectionEditors"
  );

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
    expect(view.container.textContent).toContain("Select a widget template to render in this section.");
  } finally {
    view.cleanup();
  }
});
