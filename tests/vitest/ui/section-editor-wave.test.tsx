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

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  findInputsByPlaceholder(container, placeholder)[0];

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  );

const findColorInputForPlaceholder = (
  container: ParentNode,
  placeholder: string,
  index = 0
) => {
  const textInput = findInputsByPlaceholder(container, placeholder)[index];
  if (!(textInput instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}" (${index})`);
  }
  const colorInput = textInput.parentElement?.querySelector('input[type="color"]');
  if (!(colorInput instanceof HTMLInputElement)) {
    throw new Error(`Missing color input for placeholder "${placeholder}" (${index})`);
  }
  return colorInput;
};

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findSelectByOptions = (container: ParentNode, values: string[]) => {
  const select = findSelectsByOptions(container, values)[0];
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select with options ${values.join(", ")}`);
  }
  return select;
};

const findNumberInputs = (container: ParentNode) =>
  Array.from(container.querySelectorAll('input[type="number"]')).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement
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

const renderEditors = async ({
  initialValue,
  initialVariant = "legacy",
  withVariantChange = true,
}: {
  initialValue: SectionData;
  initialVariant?: string;
  withVariantChange?: boolean;
}) => {
  const {
    SectionAdvancedEditor,
    SectionVisualEditor,
    SectionWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/SectionEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState<SectionData>(initialValue);
    const [variant, setVariant] = useState(initialVariant);

    const handleChange = (next: SectionData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    const handleVariantChange = withVariantChange
      ? (next: string) => {
          latestVariant = next;
          onVariantChangeSpy(next);
          setVariant(next);
        }
      : undefined;

    return (
      <>
        <SectionWizardEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
        />
        <SectionVisualEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
        />
        <SectionAdvancedEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
        />
      </>
    );
  };

  return {
    ...mount(<Harness />),
    onChangeSpy,
    onVariantChangeSpy,
    getLatestValue: () => latestValue,
    getLatestVariant: () => latestVariant,
  };
};

test("Section editors normalize malformed defaults, preserve token strings, and ignore variant changes without a handler", async () => {
  const view = await renderEditors({
    initialValue: {
      semantics: {
        element: "article" as never,
      },
      style: {
        backgroundColor: "brand-token",
        gradientFrom: "surface-start-token",
        gradientTo: "surface-end-token",
        gradientAngle: 999,
        borderColor: "border-token",
        borderWidth: "9" as never,
        radius: "round" as never,
        overlayColor: "overlay-token",
        overlayOpacity: 150,
      },
    },
    initialVariant: "legacy",
    withVariantChange: false,
  });

  try {
    const variantSelect = findSelectByOptions(view.container, ["default", "contained", "bleed"]);
    expect(variantSelect.value).toBe("default");

    clickByText(view.container, "Contained");
    setSelectValue(variantSelect, "contained");
    expect(view.getLatestVariant()).toBe("legacy");
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();
    expect(view.onChangeSpy).not.toHaveBeenCalled();

    expect(findInputsByPlaceholder(view.container, "transparent")[0]?.value).toBe("brand-token");
    expect(findColorInputForPlaceholder(view.container, "transparent", 0).value).toBe("#ffffff");

    const semanticsSection = findSectionByTitle(view.container, "Semantics and anchor");
    if (!(semanticsSection instanceof HTMLElement)) {
      throw new Error("Missing semantics section");
    }
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    expect(findSelectByOptions(semanticsSection, ["section", "div"]).value).toBe("section");
    expect(findInputByPlaceholder(surfaceSection, "#ffffff")?.value).toBe("surface-start-token");
    expect(findColorInputForPlaceholder(surfaceSection, "#ffffff").value).toBe("#ffffff");
    expect(findInputByPlaceholder(surfaceSection, "#f1f5f9")?.value).toBe("surface-end-token");
    expect(findColorInputForPlaceholder(surfaceSection, "#f1f5f9").value).toBe("#f1f5f9");
    expect(findInputByPlaceholder(surfaceSection, "var(--color-border)")?.value).toBe("border-token");
    expect(findColorInputForPlaceholder(surfaceSection, "var(--color-border)").value).toBe(
      "#e2e8f0"
    );
    expect(findInputByPlaceholder(surfaceSection, "#000000")?.value).toBe("overlay-token");
    expect(findColorInputForPlaceholder(surfaceSection, "#000000").value).toBe("#000000");

    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("1");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe(
      "2xl"
    );

    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    expect(angleInput?.value).toBe("360");
    expect(opacityInput?.value).toBe("100");
  } finally {
    view.cleanup();
  }
});

test("Section editors cover variant changes, semantics, surface tokens, and advanced snapshot updates", async () => {
  const view = await renderEditors({
    initialValue: {
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
    },
  });

  try {
    const variantSelect = findSelectByOptions(view.container, ["default", "contained", "bleed"]);
    expect(variantSelect.value).toBe("default");
    setSelectValue(variantSelect, "contained");
    expect(view.getLatestVariant()).toBe("contained");

    setInputValue(findInputByPlaceholder(view.container, "Section title"), "Platform section");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Short context for the section"),
      "Reusable wrapper for grouped content."
    );
    const wizardColor = Array.from(view.container.querySelectorAll('input[type="color"]'))[0];
    setInputValue(wizardColor, "#f8fafc");

    expect(view.getLatestValue().heading).toMatchObject({
      title: "Platform section",
      description: "Reusable wrapper for grouped content.",
    });
    expect(view.getLatestValue().style?.backgroundColor).toBe("#f8fafc");

    clickByText(view.container, "Bleed");
    expect(view.getLatestVariant()).toBe("bleed");

    setInputValue(findInputsByPlaceholder(view.container, "Section title")[1], "Overview section");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Supportive copy for this section"),
      "Supporting copy from visual editor."
    );
    setInputValue(findInputByPlaceholder(view.container, "Section label"), "Overview");
    setInputValue(findInputByPlaceholder(view.container, "pricing-section"), "overview");
    setInputValue(findInputByPlaceholder(view.container, "Pricing section"), "Overview section");

    const semanticsSection = findSectionByTitle(view.container, "Semantics and anchor");
    if (!(semanticsSection instanceof HTMLElement)) {
      throw new Error("Missing semantics section");
    }
    const elementSelect = findSelectByOptions(semanticsSection, ["section", "div"]);
    setSelectValue(elementSelect, "div");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    const borderWidthSelect = findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]);
    const radiusSelect = findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]);
    setInputValue(findColorInputForPlaceholder(surfaceSection, "transparent"), "#ecfeff");
    setInputValue(findInputByPlaceholder(surfaceSection, "#ffffff"), "#1d4ed8");
    setInputValue(findInputByPlaceholder(surfaceSection, "#f1f5f9"), "#222222");
    setInputValue(findInputByPlaceholder(surfaceSection, "var(--color-border)"), "#0f172a");
    setSelectValue(borderWidthSelect, "2");
    setSelectValue(radiusSelect, "xl");

    setInputValue(findInputByPlaceholder(surfaceSection, "#000000"), "#333333");
    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    setInputValue(angleInput, "270");
    setInputValue(opacityInput, "35");

    expect(view.onChangeSpy).toHaveBeenCalled();
    expect(view.getLatestValue().heading).toMatchObject({
      label: "Overview",
      title: "Overview section",
      description: "Supporting copy from visual editor.",
    });
    expect(view.getLatestValue().semantics).toMatchObject({
      element: "div",
      anchorId: "overview",
      ariaLabel: "Overview section",
    });
    expect(view.getLatestValue().style).toMatchObject({
      backgroundColor: "#ecfeff",
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

test("Section advanced editor clamps non-finite and out-of-range technical token values", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        gradientAngle: Number.NaN,
        overlayOpacity: Number.POSITIVE_INFINITY,
      },
    },
  });

  try {
    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    const [angleInput, opacityInput] = findNumberInputs(technicalTokensSection);
    expect(angleInput?.value).toBe("180");
    expect(opacityInput?.value).toBe("0");

    setInputValue(
      findInputByPlaceholder(technicalTokensSection, "section-anchor"),
      "team-overview"
    );
    setInputValue(
      findInputByPlaceholder(technicalTokensSection, "Descriptive section label"),
      "Team overview section"
    );
    setInputValue(angleInput, "-12");
    setInputValue(opacityInput, "125");

    expect(view.getLatestValue().semantics).toMatchObject({
      anchorId: "team-overview",
      ariaLabel: "Team overview section",
    });
    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 0,
      overlayOpacity: 100,
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"anchorId": "team-overview"');
    expect(snapshot?.textContent).toContain('"ariaLabel": "Team overview section"');
    expect(snapshot?.textContent).toContain('"gradientAngle": 0');
    expect(snapshot?.textContent).toContain('"overlayOpacity": 100');
  } finally {
    view.cleanup();
  }
});
