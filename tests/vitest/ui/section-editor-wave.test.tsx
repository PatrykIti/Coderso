// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { SectionData } from "../../../core/widgets/core/section";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  );

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

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

test("Section editors cover variant changes, semantics, surface tokens, and advanced normalization", async () => {
  const {
    SectionAdvancedEditor,
    SectionVisualEditor,
    SectionWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/SectionEditors");

  const onChangeSpy = vi.fn();
  let latestValue: SectionData = {
    style: {
      backgroundColor: "brand-token",
      gradientFrom: "",
      gradientTo: "",
      gradientAngle: 999,
      borderColor: "",
      borderWidth: "9" as never,
      radius: "round" as never,
      overlayColor: "",
      overlayOpacity: 150,
    },
  };
  let currentVariant = "legacy";

  const Harness = () => {
    const [value, setValue] = useState<SectionData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <>
        <SectionWizardEditor
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
        <SectionVisualEditor
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
        <SectionAdvancedEditor
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
    const variantSelect = findSelectsByOptions(view.container, ["default", "contained", "bleed"])[0];
    expect((variantSelect as HTMLSelectElement | undefined)?.value).toBe("default");
    setSelectValue(variantSelect, "contained");
    expect(currentVariant).toBe("contained");

    setInputValue(findInputByPlaceholder(view.container, "Section title"), "Platform section");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Short context for the section"),
      "Reusable wrapper for grouped content."
    );
    const wizardColor = Array.from(view.container.querySelectorAll('input[type="color"]'))[0];
    setInputValue(wizardColor, "#f8fafc");

    expect(latestValue.heading).toMatchObject({
      title: "Platform section",
      description: "Reusable wrapper for grouped content.",
    });
    expect(latestValue.style?.backgroundColor).toBe("#f8fafc");

    clickByText(view.container, "Bleed");
    expect(currentVariant).toBe("bleed");

    setInputValue(findInputByPlaceholder(view.container, "Section label"), "Overview");
    setInputValue(findInputByPlaceholder(view.container, "pricing-section"), "overview");
    setInputValue(findInputByPlaceholder(view.container, "Pricing section"), "Overview section");

    const semanticsSection = findSectionByTitle(view.container, "Semantics and anchor");
    const elementSelect = findSelectsByOptions(semanticsSection as ParentNode, ["section", "div"])[0];
    setSelectValue(elementSelect, "div");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    const borderWidthSelect = findSelectsByOptions(surfaceSection as ParentNode, ["0", "1", "2", "3"])[0];
    const radiusSelect = findSelectsByOptions(surfaceSection as ParentNode, ["none", "lg", "xl", "2xl"])[0];
    setInputValue(findInputByPlaceholder(surfaceSection as ParentNode, "transparent"), "#f8fafc");
    setInputValue(findInputByPlaceholder(surfaceSection as ParentNode, "#ffffff"), "#1d4ed8");
    setInputValue(findInputByPlaceholder(surfaceSection as ParentNode, "#f1f5f9"), "#222222");
    setInputValue(findInputByPlaceholder(surfaceSection as ParentNode, "var(--color-border)"), "#0f172a");
    setSelectValue(borderWidthSelect, "2");
    setSelectValue(radiusSelect, "xl");

    setInputValue(findInputByPlaceholder(surfaceSection as ParentNode, "#000000"), "#333333");
    const angleInput = Array.from((surfaceSection as ParentNode).querySelectorAll('input[type="number"]'))[0];
    const opacityInput = Array.from((surfaceSection as ParentNode).querySelectorAll('input[type="number"]'))[1];
    setInputValue(angleInput, "270");
    setInputValue(opacityInput, "35");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.semantics).toMatchObject({
      element: "div",
      anchorId: "overview",
      ariaLabel: "Overview section",
    });
    expect(latestValue.style).toMatchObject({
      backgroundColor: "#f8fafc",
      borderColor: "#0f172a",
      gradientFrom: "#1d4ed8",
      gradientTo: "#222222",
      gradientAngle: 270,
      borderWidth: "2",
      radius: "xl",
      overlayColor: "#333333",
      overlayOpacity: 35,
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"anchorId": "overview"');
    expect(snapshot?.textContent).toContain('"gradientAngle": 270');
    expect(snapshot?.textContent).toContain('"overlayOpacity": 35');
  } finally {
    view.cleanup();
  }
});
