// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { FeatureGridData } from "../../../core/widgets/core/featureGrid";

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
    type,
    placeholder,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  ),
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
    SelectTrigger: () => null,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  };
});

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    rows,
    className,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={className}
      {...props}
    />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) =>
    values.filter(Boolean).join(" "),
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

const setInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  );
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  );
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
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

const clickByText = (container: ParentNode, text: string, index = 0) => {
  const button = Array.from(container.querySelectorAll("button")).filter((candidate) =>
    candidate.textContent?.includes(text)
  )[index];
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text} (${index})`);
  }
  act(() => {
    button.click();
  });
};

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareasByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).filter(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  );

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("p")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("FeatureGrid editors cover variant changes, card editing, style tokens, and advanced normalization", async () => {
  const {
    FeatureGridAdvancedEditor,
    FeatureGridVisualEditor,
    FeatureGridWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/FeatureGridEditors");

  const onChangeSpy = vi.fn();
  let latestValue: FeatureGridData = {
    items: [
      { id: "same", title: "", description: "", ctaLabel: "", ctaHref: "" },
      { id: "same", title: "Second card" },
    ],
    style: {
      columns: "9" as never,
      gap: "wide" as never,
      borderWidth: "9" as never,
      radius: "round" as never,
      surfaceColor: "var(--surface)",
      borderColor: "bad-token",
    },
  };
  let currentVariant = "cards-3";

  const Harness = () => {
    const [value, setValue] = useState<FeatureGridData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <>
        <FeatureGridWizardEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            currentVariant = next;
            setVariant(next);
          }}
        />
        <FeatureGridVisualEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            currentVariant = next;
            setVariant(next);
          }}
        />
        <FeatureGridAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={() => undefined}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Feature grid style");
    expect(view.container.textContent).toContain("Raw payload snapshot");

    const variantSelect = findSelectsByOptions(view.container, [
      "cards-3",
      "cards-4",
      "highlight-first",
    ])[0];
    setSelectValue(variantSelect, "cards-4");
    expect(currentVariant).toBe("cards-4");

    setInputValue(
      findInputByPlaceholder(view.container, "Everything your team needs"),
      "Core feature set"
    );
    setTextareaValue(
      findTextareasByPlaceholder(
        view.container,
        "Use focused cards to explain your strongest product capabilities."
      )[0],
      "Short proof of platform value."
    );

    const countSelect = findSelectsByOptions(view.container, ["1", "2", "3", "4", "5", "6", "7", "8"])[0];
    setSelectValue(countSelect, "4");
    expect(latestValue.items).toHaveLength(4);

    setInputValue(findInputsByPlaceholder(view.container, "Feature 1")[0], "Automation");
    setTextareaValue(
      findTextareasByPlaceholder(view.container, "Describe this feature in one short paragraph.")[0],
      "Automates repeatable delivery tasks."
    );
    setInputValue(findInputByPlaceholder(view.container, "⚡"), "🤖");
    setInputValue(
      findInputByPlaceholder(view.container, "https://cdn.example.com/feature.jpg"),
      "https://cdn.example.com/automation.jpg"
    );
    setInputValue(findInputByPlaceholder(view.container, "Learn more"), "See automation");
    setInputValue(findInputByPlaceholder(view.container, "/features"), "/automation");

    clickByText(view.container, "Add card");
    expect(latestValue.items).toHaveLength(5);
    clickByText(view.container, "Move down", 0);
    clickByText(view.container, "Remove", 4);
    expect(latestValue.items).toHaveLength(4);

    const layoutSection = findSectionByTitle(view.container, "Variant and layout structure");
    const colorsSection = findSectionByTitle(view.container, "Colors and borders");
    const visualColumnsSelect = findSelectsByOptions(layoutSection as ParentNode, ["2", "3", "4"])[0];
    const gapSelect = findSelectsByOptions(layoutSection as ParentNode, ["sm", "md", "lg"])[0];
    const borderWidthSelect = findSelectsByOptions(colorsSection as ParentNode, ["0", "1", "2", "3"])[0];
    const radiusSelect = findSelectsByOptions(colorsSection as ParentNode, ["none", "md", "lg", "xl"])[0];
    setSelectValue(visualColumnsSelect, "2");
    setSelectValue(gapSelect, "lg");
    setSelectValue(borderWidthSelect, "3");
    setSelectValue(radiusSelect, "xl");

    const colorInputs = Array.from((colorsSection as ParentNode).querySelectorAll("input[type='color']"));
    setInputValue(colorInputs[0], "#111111");
    setInputValue(colorInputs[1], "#222222");

    clickByText(view.container, "Normalize items to variant baseline");
    clickByText(view.container, "Normalize full payload");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(currentVariant).toBe("cards-4");
    expect(latestValue.header).toMatchObject({
      title: "Core feature set",
      description: "Short proof of platform value.",
    });
    expect(latestValue.items).toHaveLength(4);
    expect(latestValue.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Automation",
          description: "Automates repeatable delivery tasks.",
          icon: "🤖",
          image: "https://cdn.example.com/automation.jpg",
          ctaLabel: "See automation",
          ctaHref: "/automation",
        }),
      ])
    );
    expect(latestValue.style).toMatchObject({
      columns: "2",
      gap: "lg",
      borderWidth: "3",
      radius: "xl",
      surfaceColor: "#111111",
      borderColor: "#222222",
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"title": "Core feature set"');
    expect(snapshot?.textContent).toContain('"columns": "2"');
    expect(snapshot?.textContent).toContain('"borderWidth": "3"');
    expect(snapshot?.textContent).toContain('"ctaHref": "/automation"');
  } finally {
    view.cleanup();
  }
});
