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

const setRawInputValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const ownDescriptor = Object.getOwnPropertyDescriptor(element, "value");
  let currentValue = value;
  Object.defineProperty(element, "value", {
    configurable: true,
    get: () => currentValue,
    set: (next: string) => {
      currentValue = next;
    },
  });
  act(() => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  if (ownDescriptor) {
    Object.defineProperty(element, "value", ownDescriptor);
    return;
  }
  delete (element as HTMLInputElement & { value?: string }).value;
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

const mockSectionContract = async ({
  normalizedValue,
  defaults,
}: {
  normalizedValue: SectionData;
  defaults: SectionData;
}) => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/section", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/section")>(
      "../../../core/widgets/core/section"
    );

    return {
      ...actual,
      normalizeSectionData: vi.fn(() => normalizedValue),
      sectionDefaults: defaults,
    };
  });
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

test("Section surface token inputs preserve raw tokens, fall back safely, and resync after valid picker updates", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        backgroundColor: "#0ea5e9",
        gradientFrom: "#38bdf8",
        borderColor: "#0f172a",
      },
    },
  });

  try {
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const backgroundTextInput = findInputByPlaceholder(surfaceSection, "transparent");
    const backgroundColorInput = findColorInputForPlaceholder(surfaceSection, "transparent");
    const gradientStartTextInput = findInputByPlaceholder(surfaceSection, "#ffffff");
    const gradientStartColorInput = findColorInputForPlaceholder(surfaceSection, "#ffffff");
    const borderTextInput = findInputByPlaceholder(surfaceSection, "var(--color-border)");
    const borderColorInput = findColorInputForPlaceholder(
      surfaceSection,
      "var(--color-border)"
    );

    setInputValue(backgroundTextInput, "var(--section-surface)");
    setInputValue(gradientStartTextInput, "surface-start-token");
    setInputValue(borderTextInput, "border-strong-token");

    expect(view.getLatestValue().style).toMatchObject({
      backgroundColor: "var(--section-surface)",
      gradientFrom: "surface-start-token",
      borderColor: "border-strong-token",
    });
    expect(backgroundTextInput?.value).toBe("var(--section-surface)");
    expect(backgroundColorInput.value).toBe("#ffffff");
    expect(gradientStartTextInput?.value).toBe("surface-start-token");
    expect(gradientStartColorInput.value).toBe("#ffffff");
    expect(borderTextInput?.value).toBe("border-strong-token");
    expect(borderColorInput.value).toBe("#e2e8f0");

    setInputValue(backgroundColorInput, "#112233");
    setInputValue(gradientStartColorInput, "#abcdef");
    setInputValue(borderColorInput, "#334455");

    expect(view.getLatestValue().style).toMatchObject({
      backgroundColor: "#112233",
      gradientFrom: "#abcdef",
      borderColor: "#334455",
    });
    expect(backgroundTextInput?.value).toBe("#112233");
    expect(gradientStartTextInput?.value).toBe("#abcdef");
    expect(borderTextInput?.value).toBe("#334455");

    setInputValue(backgroundTextInput, "");

    expect(view.getLatestValue().style?.backgroundColor).toBe("");
    expect(backgroundTextInput?.value).toBe("");
    expect(backgroundColorInput.value).toBe("#ffffff");

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"backgroundColor": ""');
    expect(snapshot?.textContent).toContain('"gradientFrom": "#abcdef"');
    expect(snapshot?.textContent).toContain('"borderColor": "#334455"');
  } finally {
    view.cleanup();
  }
});

test("Section editors coerce invalid numeric text input back to safe angle and opacity defaults", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        gradientAngle: 45,
        overlayOpacity: 55,
      },
    },
  });

  try {
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    setRawInputValue(angleInput, "not-a-number");
    setRawInputValue(opacityInput, "not-a-number");

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 180,
      overlayOpacity: 0,
    });

    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    const [advancedAngleInput, advancedOpacityInput] = findNumberInputs(technicalTokensSection);
    expect(advancedAngleInput?.value).toBe("180");
    expect(advancedOpacityInput?.value).toBe("0");

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"gradientAngle": 180');
    expect(snapshot?.textContent).toContain('"overlayOpacity": 0');
  } finally {
    view.cleanup();
  }
});

test("Section advanced technical tokens round decimals, clamp boundaries, and stay synchronized with surface controls", async () => {
  const view = await renderEditors({
    initialValue: {
      semantics: {
        anchorId: "initial-anchor",
        ariaLabel: "Initial section",
      },
      style: {
        gradientAngle: 12,
        overlayOpacity: 8,
      },
    },
  });

  try {
    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    const [advancedAngleInput, advancedOpacityInput] = findNumberInputs(technicalTokensSection);
    setInputValue(
      findInputByPlaceholder(technicalTokensSection, "section-anchor"),
      "wave-layout"
    );
    setInputValue(
      findInputByPlaceholder(technicalTokensSection, "Descriptive section label"),
      "Wave layout section"
    );
    setInputValue(advancedAngleInput, "44.6");
    setInputValue(advancedOpacityInput, "15.5");

    expect(view.getLatestValue().semantics).toMatchObject({
      anchorId: "wave-layout",
      ariaLabel: "Wave layout section",
    });
    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 45,
      overlayOpacity: 16,
    });

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const [surfaceAngleInput, surfaceOpacityInput] = findNumberInputs(surfaceSection);
    expect(surfaceAngleInput?.value).toBe("45");
    expect(surfaceOpacityInput?.value).toBe("16");

    setInputValue(surfaceAngleInput, "359.6");
    setInputValue(surfaceOpacityInput, "-0.6");

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 360,
      overlayOpacity: 0,
    });
    expect(advancedAngleInput?.value).toBe("360");
    expect(advancedOpacityInput?.value).toBe("0");

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"anchorId": "wave-layout"');
    expect(snapshot?.textContent).toContain('"ariaLabel": "Wave layout section"');
    expect(snapshot?.textContent).toContain('"gradientAngle": 360');
    expect(snapshot?.textContent).toContain('"overlayOpacity": 0');
  } finally {
    view.cleanup();
  }
});

test("Section editors fall back to sparse normalized token fields and contract defaults", async () => {
  await mockSectionContract({
    normalizedValue: {
      heading: {
        label: undefined,
        title: undefined,
        description: undefined,
      },
      semantics: {
        element: undefined,
        anchorId: undefined,
        ariaLabel: undefined,
      },
      style: {
        backgroundColor: undefined,
        gradientFrom: undefined,
        gradientTo: undefined,
        gradientAngle: 180,
        borderColor: undefined,
        borderWidth: undefined,
        radius: undefined,
        overlayColor: undefined,
        overlayOpacity: 0,
      },
    },
    defaults: {
      heading: {},
      semantics: {
        element: "div",
      },
      style: {
        borderWidth: "3",
        radius: "lg",
        gradientAngle: 180,
        overlayOpacity: 0,
      },
    },
  });

  let view: Awaited<ReturnType<typeof renderEditors>> | undefined;

  try {
    view = await renderEditors({
      initialValue: {},
    });

    expect(findInputByPlaceholder(view.container, "Section title")?.value).toBe("");
    expect(
      findTextareaByPlaceholder(view.container, "Short context for the section")?.value
    ).toBe("");
    expect(findInputsByPlaceholder(view.container, "transparent")[0]?.value).toBe("");
    expect(findColorInputForPlaceholder(view.container, "transparent", 0).value).toBe("#ffffff");

    const semanticsSection = findSectionByTitle(view.container, "Semantics and anchor");
    if (!(semanticsSection instanceof HTMLElement)) {
      throw new Error("Missing semantics section");
    }

    expect(findInputByPlaceholder(view.container, "Section label")?.value).toBe("");
    expect(findInputsByPlaceholder(view.container, "Section title")[1]?.value).toBe("");
    expect(
      findTextareaByPlaceholder(view.container, "Supportive copy for this section")?.value
    ).toBe("");
    expect(findSelectByOptions(semanticsSection, ["section", "div"]).value).toBe("div");
    expect(findInputByPlaceholder(semanticsSection, "pricing-section")?.value).toBe("");
    expect(findInputByPlaceholder(semanticsSection, "Pricing section")?.value).toBe("");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    expect(findInputByPlaceholder(surfaceSection, "#ffffff")?.value).toBe("");
    expect(findColorInputForPlaceholder(surfaceSection, "#ffffff").value).toBe("#ffffff");
    expect(findInputByPlaceholder(surfaceSection, "#f1f5f9")?.value).toBe("");
    expect(findColorInputForPlaceholder(surfaceSection, "#f1f5f9").value).toBe("#f1f5f9");
    expect(findInputByPlaceholder(surfaceSection, "var(--color-border)")?.value).toBe("");
    expect(findColorInputForPlaceholder(surfaceSection, "var(--color-border)").value).toBe(
      "#e2e8f0"
    );
    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("3");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("lg");
    expect(findInputByPlaceholder(surfaceSection, "#000000")?.value).toBe("");
    expect(findColorInputForPlaceholder(surfaceSection, "#000000").value).toBe("#000000");

    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    expect(findInputByPlaceholder(technicalTokensSection, "section-anchor")?.value).toBe("");
    expect(
      findInputByPlaceholder(technicalTokensSection, "Descriptive section label")?.value
    ).toBe("");

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"gradientAngle": 180');
    expect(snapshot?.textContent).toContain('"overlayOpacity": 0');
  } finally {
    view?.cleanup();
    vi.doUnmock("../../../core/widgets/core/section");
    vi.resetModules();
  }
});

test("Section editors use hardcoded select fallbacks when sparse defaults omit semantics and surface options", async () => {
  await mockSectionContract({
    normalizedValue: {
      heading: {},
      semantics: {
        element: undefined,
        anchorId: undefined,
        ariaLabel: undefined,
      },
      style: {
        backgroundColor: undefined,
        gradientFrom: undefined,
        gradientTo: undefined,
        gradientAngle: 180,
        borderColor: undefined,
        borderWidth: undefined,
        radius: undefined,
        overlayColor: undefined,
        overlayOpacity: 0,
      },
    },
    defaults: {
      heading: {},
      semantics: {},
      style: {
        gradientAngle: 180,
        overlayOpacity: 0,
      },
    },
  });

  let view: Awaited<ReturnType<typeof renderEditors>> | undefined;

  try {
    view = await renderEditors({
      initialValue: {},
      withVariantChange: false,
    });

    const semanticsSection = findSectionByTitle(view.container, "Semantics and anchor");
    if (!(semanticsSection instanceof HTMLElement)) {
      throw new Error("Missing semantics section");
    }
    expect(findSelectByOptions(semanticsSection, ["section", "div"]).value).toBe("section");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("0");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("none");

    clickByText(view.container, "Contained");
    expect(view.getLatestVariant()).toBe("legacy");
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();
  } finally {
    view?.cleanup();
    vi.doUnmock("../../../core/widgets/core/section");
    vi.resetModules();
  }
});
