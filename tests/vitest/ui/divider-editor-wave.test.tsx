// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { DividerData } from "../../../core/widgets/core/divider";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui.input", () => ({}));

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

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
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
  React.act(() => {
    button.click();
  });
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findColorInputForPlaceholder = (container: ParentNode, placeholder: string) => {
  const textInput = findInputByPlaceholder(container, placeholder);
  if (!(textInput instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}"`);
  }
  const colorInput = textInput.parentElement?.querySelector('input[type="color"]');
  if (!(colorInput instanceof HTMLInputElement)) {
    throw new Error(`Missing color input for "${placeholder}"`);
  }
  return colorInput;
};

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

test("Divider editors cover variant changes, width modes, spacing tokens, and advanced snapshot updates", async () => {
  const { DividerAdvancedEditor, DividerVisualEditor, DividerWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/DividerEditors");

  const onChangeSpy = vi.fn();
  let latestValue: DividerData = {
    thickness: 99,
    width: "bad" as never,
    customWidth: "bad-width",
    color: "brand-token",
    marginTop: "bad",
    marginBottom: "bad",
  };
  let currentVariant = "legacy";

  const Harness = () => {
    const [value, setValue] = useState<DividerData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <>
        <DividerWizardEditor
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
        <DividerVisualEditor
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
        <DividerAdvancedEditor
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
    const wizardStyle = findSelectsByOptions(view.container, ["line", "dashed", "label-center"])[0];
    expect((wizardStyle as HTMLSelectElement | null | undefined)?.value).toBe("line");
    setSelectValue(wizardStyle, "label-center");
    expect(currentVariant).toBe("label-center");

    setInputValue(findInputByPlaceholder(view.container, "Optional label"), "Milestone");
    const wizardThickness = findSelectsByOptions(view.container, [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ])[0];
    setSelectValue(wizardThickness, "4");

    expect(latestValue).toMatchObject({
      label: "Milestone",
      thickness: 4,
    });

    clickByText(view.container, "Dashed");
    expect(currentVariant).toBe("dashed");

    const lineSection = findSectionByTitle(view.container, "Line style and width");
    const widthModeSelect = findSelectsByOptions(lineSection as ParentNode, [
      "full",
      "container",
      "custom",
    ])[0];
    const thicknessSelect = findSelectsByOptions(lineSection as ParentNode, [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ])[0];
    setSelectValue(thicknessSelect, "2");
    setSelectValue(widthModeSelect, "custom");
    setInputValue(findInputByPlaceholder(lineSection as ParentNode, "e.g. 320px or 60%"), "60%");
    setInputValue(
      findInputByPlaceholder(lineSection as ParentNode, "var(--color-border)"),
      "#334155"
    );

    const spacingSection = findSectionByTitle(view.container, "Spacing around divider");
    const spacingSelects = Array.from((spacingSection as ParentNode).querySelectorAll("select"));
    setSelectValue(spacingSelects[0], "12");
    setSelectValue(spacingSelects[1], "8");

    const advancedSection = findSectionByTitle(view.container, "Technical divider tokens");
    const advancedWidthMode = findSelectsByOptions(advancedSection as ParentNode, [
      "full",
      "container",
      "custom",
    ])[0];
    setSelectValue(advancedWidthMode, "container");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue).toMatchObject({
      thickness: 2,
      width: "container",
      customWidth: "60%",
      color: "#334155",
      marginTop: "12",
      marginBottom: "8",
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"width": "container"');
    expect(snapshot?.textContent).toContain('"color": "#334155"');
    expect(snapshot?.textContent).toContain('"marginTop": "12"');
    expect(snapshot?.textContent).toContain('"marginBottom": "8"');
  } finally {
    view.cleanup();
  }
});

test("Divider editors cover visual label input, color picker changes, custom spacing text input, and disabled advanced variant control", async () => {
  const { DividerAdvancedEditor, DividerVisualEditor, DividerWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/DividerEditors");

  let latestValue: DividerData = {
    color: "var(--color-border)",
    width: "container",
    marginTop: "custom-margin",
    marginBottom: "bad",
  };
  let currentVariant = "label-center";

  const Harness = () => {
    const [value, setValue] = useState<DividerData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <>
        <DividerWizardEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            currentVariant = next;
            setVariant(next);
          }}
        />
        <DividerVisualEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            currentVariant = next;
            setVariant(next);
          }}
        />
        <DividerAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
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
    const visualVariant = findSectionByTitle(view.container, "Variant and label");
    setInputValue(
      findInputByPlaceholder(visualVariant as ParentNode, "Optional label"),
      "Chapter break"
    );

    const lineSection = findSectionByTitle(view.container, "Line style and width");
    setInputValue(
      findColorInputForPlaceholder(lineSection as ParentNode, "var(--color-border)"),
      "#94a3b8"
    );
    expect(latestValue.color).toBe("var(--color-border)");
    expect(normalizeText((lineSection as ParentNode).textContent)).toContain("custom token active");
    setInputValue(
      findInputByPlaceholder(lineSection as ParentNode, "var(--color-border)"),
      "#94a3b8"
    );
    const widthModeSelect = findSelectsByOptions(lineSection as ParentNode, [
      "full",
      "container",
      "custom",
    ])[0];
    setSelectValue(widthModeSelect, "custom");
    setInputValue(findInputByPlaceholder(lineSection as ParentNode, "e.g. 320px or 60%"), "55%");

    const spacingSection = findSectionByTitle(view.container, "Spacing around divider");
    const spacingSelects = Array.from((spacingSection as ParentNode).querySelectorAll("select"));
    setSelectValue(spacingSelects[0], "custom");
    expect(spacingSelects[0]?.value).toBe("custom");
    expect(normalizeText((spacingSection as ParentNode).textContent)).toContain(
      "enter a custom px value"
    );
    setInputValue(findInputByPlaceholder(spacingSection as ParentNode, "e.g. 32px"), "bad-value");
    expect(latestValue.marginTop).toBe("6");
    expect(normalizeText((spacingSection as ParentNode).textContent)).toContain(
      "invalid custom value"
    );
    setInputValue(findInputByPlaceholder(spacingSection as ParentNode, "e.g. 32px"), "40px");

    const advancedSection = findSectionByTitle(view.container, "Technical divider tokens");
    const variantSelect = findSelectsByOptions(advancedSection as ParentNode, [
      "line",
      "dashed",
      "label-center",
    ])[0];
    expect(variantSelect?.disabled).toBe(true);
    setSelectValue(variantSelect, "line");
    const advancedSpacingInputs = Array.from(
      (advancedSection as ParentNode).querySelectorAll("input[placeholder='e.g. 32px']")
    );
    setInputValue(advancedSpacingInputs[0], "24px");
    setInputValue(advancedSpacingInputs[1], "18px");

    expect(currentVariant).toBe("label-center");
    expect(latestValue).toMatchObject({
      label: "Chapter break",
      width: "custom",
      customWidth: "55%",
      color: "#94a3b8",
      marginTop: "24px",
      marginBottom: "18px",
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"label": "Chapter break"');
    expect(snapshot?.textContent).toContain('"customWidth": "55%"');
    expect(snapshot?.textContent).toContain('"marginTop": "24px"');
    expect(snapshot?.textContent).toContain('"marginBottom": "18px"');
  } finally {
    view.cleanup();
  }
});
