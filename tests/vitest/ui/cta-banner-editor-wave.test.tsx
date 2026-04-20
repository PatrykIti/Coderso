// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ctaBannerDefaults, type CtaBannerData } from "../../../core/widgets/core/ctaBanner";

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

const setInputValue = (element: Element | null | undefined, value: string) => {
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

const setTextareaValue = (element: Element | null | undefined, value: string) => {
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

const setSelectValue = (element: Element | null | undefined, value: string) => {
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

const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  act(() => {
    element.click();
  });
};

const getInputByPlaceholder = (container: ParentNode, placeholder: string) => {
  const input = Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}"`);
  }
  return input;
};

const getInputsByPlaceholder = (container: ParentNode, placeholder: string) => {
  const inputs = Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );
  if (inputs.length === 0) {
    throw new Error(`Missing inputs with placeholder "${placeholder}"`);
  }
  return inputs;
};

const getTextareaByPlaceholder = (container: ParentNode, placeholder: string) => {
  const textarea = Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  );
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing textarea with placeholder "${placeholder}"`);
  }
  return textarea;
};

const getSelectByOptions = (container: ParentNode, values: string[]) => {
  const select = Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select with options ${values.join(", ")}`);
  }
  return select;
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const getSectionByTitle = (container: ParentNode, title: string) => {
  const section = Array.from(container.querySelectorAll("section")).find((candidate) =>
    Array.from(candidate.querySelectorAll("p")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Missing section "${title}"`);
  }
  return section;
};

const getButtonsByText = (container: ParentNode, text: string) => {
  const buttons = Array.from(container.querySelectorAll("button")).filter(
    (element): element is HTMLButtonElement =>
      element instanceof HTMLButtonElement && element.textContent?.includes(text) === true
  );
  if (buttons.length === 0) {
    throw new Error(`Missing button "${text}"`);
  }
  return buttons;
};

const getColorInputs = (container: ParentNode) =>
  Array.from(container.querySelectorAll("input[type='color']")).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement
  );

const mountCtaBannerHarness = ({
  initialValue,
  initialVariant,
  render,
}: {
  initialValue: CtaBannerData;
  initialVariant: string;
  render: (props: {
    value: CtaBannerData;
    onChange: (next: CtaBannerData) => void;
    variant: string;
    onVariantChange: (next: string) => void;
  }) => React.ReactNode;
}) => {
  let latestValue = initialValue;
  let latestVariant = initialVariant;
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<CtaBannerData>(initialValue);
    const [variant, setVariant] = useState(initialVariant);

    return render({
      value,
      onChange: (next) => {
        latestValue = next;
        onChangeSpy(next);
        setValue(next);
      },
      variant,
      onVariantChange: (next) => {
        latestVariant = next;
        onVariantChangeSpy(next);
        setVariant(next);
      },
    });
  };

  return {
    ...mount(<Harness />),
    getLatestValue: () => latestValue,
    getLatestVariant: () => latestVariant,
    onChangeSpy,
    onVariantChangeSpy,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("CtaBanner wizard covers variant fallback and nested CTA normalization", async () => {
  const { CtaBannerWizardEditor } = await import(
    "../../../core/admin/ui/widgets/editors/CtaBannerEditors"
  );

  const initialValue: CtaBannerData = {
    content: {},
    actions: {
      primaryCta: { href: "/upgrade" },
      secondaryCta: { label: "Talk to sales" },
    },
  };

  const { cleanup, container, getLatestValue, getLatestVariant, onChangeSpy, onVariantChangeSpy } =
    mountCtaBannerHarness({
      initialValue,
      initialVariant: "legacy-layout",
      render: (props) => <CtaBannerWizardEditor {...props} />,
    });

  try {
    const variantSelect = getSelectByOptions(container, ["centered", "split", "with-badge"]);
    expect(variantSelect.value).toBe("centered");
    expect(getInputByPlaceholder(container, "Ready to launch your next campaign?").value).toBe(
      ctaBannerDefaults.content?.title
    );
    expect(getInputByPlaceholder(container, "Get started").value).toBe(
      ctaBannerDefaults.actions?.primaryCta?.label
    );

    setSelectValue(variantSelect, "split");
    expect(getLatestVariant()).toBe("split");
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("split");

    setInputValue(
      getInputByPlaceholder(container, "Ready to launch your next campaign?"),
      "Ship campaigns faster"
    );
    setInputValue(getInputByPlaceholder(container, "Get started"), "Start free trial");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(getLatestValue().content).toMatchObject({
      title: "Ship campaigns faster",
      badge: ctaBannerDefaults.content?.badge,
      description: ctaBannerDefaults.content?.description,
    });
    expect(getLatestValue().actions).toMatchObject({
      primaryCta: {
        label: "Start free trial",
        href: "/upgrade",
      },
      secondaryCta: {
        label: "Talk to sales",
        href: "#",
      },
    });
  } finally {
    cleanup();
  }
});

test("CtaBanner visual covers variant cards, picker fallbacks, action updates, and style selects", async () => {
  const { CtaBannerVisualEditor } = await import(
    "../../../core/admin/ui/widgets/editors/CtaBannerEditors"
  );

  const initialValue: CtaBannerData = {
    content: {
      badge: "",
      title: "",
      description: "",
    },
    actions: {
      primaryCta: { label: "Join now", href: "" },
      secondaryCta: { href: "/contact" },
    },
    style: {
      background: "surface-token",
      text: "#123456",
      badgeBackground: "primary-token",
      border: "outline-token",
      borderWidth: "9" as never,
      radius: "pill" as never,
      padding: "jumbo" as never,
    },
  };

  const { cleanup, container, getLatestValue, getLatestVariant, onChangeSpy, onVariantChangeSpy } =
    mountCtaBannerHarness({
      initialValue,
      initialVariant: "unsupported",
      render: (props) => <CtaBannerVisualEditor {...props} />,
    });

  try {
    const layoutSection = getSectionByTitle(container, "Variant and layout structure");
    const colorsSection = getSectionByTitle(container, "Colors and button styles");
    const spacingSection = getSectionByTitle(container, "Border and spacing");

    const colorInputs = getColorInputs(container);
    expect(colorInputs.map((input) => input.value)).toEqual([
      "#f8fafc",
      "#123456",
      "#1d4ed8",
      "#ffffff",
      "#1d4ed8",
      "#ffffff",
      "#0f172a",
      "#e2e8f0",
    ]);

    const borderWidthSelect = getSelectByOptions(spacingSection, ["0", "1", "2", "3"]);
    const radiusSelect = getSelectByOptions(spacingSection, ["none", "md", "lg", "xl", "2xl"]);
    const paddingSelect = getSelectByOptions(spacingSection, ["sm", "md", "lg", "xl"]);

    expect(borderWidthSelect.value).toBe("1");
    expect(radiusSelect.value).toBe("xl");
    expect(paddingSelect.value).toBe("md");
    expect(getButtonsByText(layoutSection, "Selected")).toHaveLength(1);

    clickButton(getButtonsByText(layoutSection, "With Badge")[0]);
    expect(getLatestVariant()).toBe("with-badge");
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("with-badge");

    setInputValue(getInputByPlaceholder(container, "Limited offer"), "Only this week");
    setInputValue(
      getInputByPlaceholder(container, "Ready to launch your next campaign?"),
      "Scale onboarding faster"
    );
    setTextareaValue(
      getTextareaByPlaceholder(container, "Use reusable sections and publish faster."),
      "Keep CTA copy aligned across launch pages."
    );
    setInputValue(getInputByPlaceholder(container, "Get started"), "Book demo");
    setInputValue(getInputsByPlaceholder(container, "#")[0], "/demo");
    setInputValue(getInputByPlaceholder(container, "Contact sales"), "Talk with team");
    setInputValue(getInputsByPlaceholder(container, "#")[1], "/contact-sales");
    setInputValue(colorInputs[1], "#0f172a");
    setInputValue(colorInputs[2], "#2563eb");
    setInputValue(colorInputs[3], "#f9fafb");
    setInputValue(colorInputs[4], "#7c3aed");
    setInputValue(colorInputs[5], "#f5f5f5");
    setInputValue(colorInputs[6], "#111827");
    setInputValue(getInputsByPlaceholder(colorsSection, "var(--color-surface)")[0], "#101820");
    setInputValue(getInputsByPlaceholder(spacingSection, "var(--color-border)")[0], "#334455");
    setSelectValue(borderWidthSelect, "3");
    setSelectValue(radiusSelect, "2xl");
    setSelectValue(paddingSelect, "xl");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(getLatestValue()).toMatchObject({
      content: {
        badge: "Only this week",
        title: "Scale onboarding faster",
        description: "Keep CTA copy aligned across launch pages.",
      },
      actions: {
        primaryCta: {
          label: "Book demo",
          href: "/demo",
        },
        secondaryCta: {
          label: "Talk with team",
          href: "/contact-sales",
        },
      },
      style: {
        background: "#101820",
        text: "#0f172a",
        badgeBackground: "#2563eb",
        badgeText: "#f9fafb",
        primaryButtonBg: "#7c3aed",
        primaryButtonText: "#f5f5f5",
        secondaryButtonText: "#111827",
        border: "#334455",
        borderWidth: "3",
        radius: "2xl",
        padding: "xl",
      },
    });
  } finally {
    cleanup();
  }
});

test("CtaBanner advanced covers raw token updates, normalize now, reset to defaults, and payload snapshot", async () => {
  const { CtaBannerAdvancedEditor } = await import(
    "../../../core/admin/ui/widgets/editors/CtaBannerEditors"
  );

  const initialValue: CtaBannerData = {
    content: {
      description: "Existing support line.",
    },
    actions: {
      primaryCta: { label: "Launch" },
      secondaryCta: {},
    },
    style: {
      background: "",
      text: "#111111",
      borderWidth: "8" as never,
      radius: "circle" as never,
      padding: "loose" as never,
      primaryButtonBorder: "",
    },
  };

  const { cleanup, container, getLatestValue, onChangeSpy } = mountCtaBannerHarness({
    initialValue,
    initialVariant: "centered",
    render: (props) => <CtaBannerAdvancedEditor {...props} />,
  });

  try {
    setInputValue(getInputByPlaceholder(container, "background token"), "var(--cta-bg)");
    setInputValue(getInputByPlaceholder(container, "text token"), "var(--cta-text)");
    setInputValue(getInputByPlaceholder(container, "border token"), "var(--cta-border)");
    setInputValue(
      getInputByPlaceholder(container, "primary button border token"),
      "var(--cta-primary-border)"
    );
    setInputValue(
      getInputByPlaceholder(container, "secondary button border token"),
      "var(--cta-secondary-border)"
    );

    expect(getLatestValue().style).toMatchObject({
      background: "var(--cta-bg)",
      text: "var(--cta-text)",
      border: "var(--cta-border)",
      primaryButtonBorder: "var(--cta-primary-border)",
      secondaryButtonBorder: "var(--cta-secondary-border)",
    });

    clickButton(getButtonsByText(container, "Normalize now")[0]);

    expect(onChangeSpy).toHaveBeenCalled();
    expect(getLatestValue()).toMatchObject({
      content: {
        badge: ctaBannerDefaults.content?.badge,
        title: ctaBannerDefaults.content?.title,
        description: "Existing support line.",
      },
      actions: {
        primaryCta: {
          label: "Launch",
          href: "#",
        },
        secondaryCta: {
          label: ctaBannerDefaults.actions?.secondaryCta?.label,
          href: "#",
        },
      },
      style: {
        background: "var(--cta-bg)",
        text: "var(--cta-text)",
        border: "var(--cta-border)",
        borderWidth: "1",
        radius: "xl",
        padding: "md",
        primaryButtonBorder: "var(--cta-primary-border)",
        secondaryButtonBorder: "var(--cta-secondary-border)",
      },
    });

    const snapshotAfterNormalize = container.querySelector("pre")?.textContent ?? "";
    expect(snapshotAfterNormalize).toContain('"title": "Ready to launch your next campaign?"');
    expect(snapshotAfterNormalize).toContain('"borderWidth": "1"');
    expect(snapshotAfterNormalize).toContain('"secondaryButtonBorder": "var(--cta-secondary-border)"');

    clickButton(getButtonsByText(container, "Reset to defaults")[0]);

    expect(getLatestValue()).toEqual(ctaBannerDefaults);
    const snapshotAfterReset = container.querySelector("pre")?.textContent ?? "";
    expect(snapshotAfterReset).toContain('"label": "Contact sales"');
    expect(snapshotAfterReset).toContain('"background": "var(--color-surface)"');
  } finally {
    cleanup();
  }
});

test("CtaBanner editors render defensive empty and default fallbacks for sparse normalized fields", async () => {
  vi.resetModules();

  const ctaBannerModule = await import("../../../core/widgets/core/ctaBanner");
  vi.spyOn(ctaBannerModule, "normalizeCtaBannerData").mockReturnValue({
    content: {},
    actions: {
      primaryCta: {},
      secondaryCta: {},
    },
    style: {},
  });

  const {
    CtaBannerWizardEditor,
    CtaBannerVisualEditor,
    CtaBannerAdvancedEditor,
  } = await import("../../../core/admin/ui/widgets/editors/CtaBannerEditors");

  const wizardMount = mount(
    <CtaBannerWizardEditor
      value={{}}
      onChange={vi.fn()}
      variant="split"
      onVariantChange={vi.fn()}
    />
  );

  try {
    expect(
      getInputByPlaceholder(wizardMount.container, "Ready to launch your next campaign?").value
    ).toBe("");
    expect(getInputByPlaceholder(wizardMount.container, "Get started").value).toBe("");
  } finally {
    wizardMount.cleanup();
  }

  const visualMount = mount(
    <CtaBannerVisualEditor
      value={{}}
      onChange={vi.fn()}
      variant="with-badge"
      onVariantChange={vi.fn()}
    />
  );

  try {
    const colorsSection = getSectionByTitle(visualMount.container, "Colors and button styles");
    const spacingSection = getSectionByTitle(visualMount.container, "Border and spacing");

    expect(getInputByPlaceholder(visualMount.container, "Limited offer").value).toBe("");
    expect(
      getInputByPlaceholder(visualMount.container, "Ready to launch your next campaign?").value
    ).toBe("");
    expect(
      getTextareaByPlaceholder(visualMount.container, "Use reusable sections and publish faster.")
        .value
    ).toBe("");
    expect(getInputByPlaceholder(visualMount.container, "Get started").value).toBe("");
    expect(getInputByPlaceholder(visualMount.container, "Contact sales").value).toBe("");
    expect(getInputsByPlaceholder(visualMount.container, "#").map((input) => input.value)).toEqual(
      ["", ""]
    );

    expect(
      getInputsByPlaceholder(colorsSection, "var(--color-surface)").map((input) => input.value)
    ).toEqual([""]);
    expect(
      getInputsByPlaceholder(colorsSection, "var(--color-text)").map((input) => input.value)
    ).toEqual(["", ""]);
    expect(
      getInputsByPlaceholder(colorsSection, "var(--color-primary)").map((input) => input.value)
    ).toEqual(["", ""]);
    expect(getInputsByPlaceholder(colorsSection, "var(--color-bg)").map((input) => input.value)).toEqual(
      ["", ""]
    );
    expect(getInputsByPlaceholder(spacingSection, "var(--color-border)").map((input) => input.value)).toEqual(
      [""]
    );

    expect(getColorInputs(visualMount.container).map((input) => input.value)).toEqual([
      "#f8fafc",
      "#0f172a",
      "#1d4ed8",
      "#ffffff",
      "#1d4ed8",
      "#ffffff",
      "#0f172a",
      "#e2e8f0",
    ]);

    expect(getSelectByOptions(spacingSection, ["0", "1", "2", "3"]).value).toBe("1");
    expect(getSelectByOptions(spacingSection, ["none", "md", "lg", "xl", "2xl"]).value).toBe(
      "xl"
    );
    expect(getSelectByOptions(spacingSection, ["sm", "md", "lg", "xl"]).value).toBe("md");
  } finally {
    visualMount.cleanup();
  }

  const advancedMount = mount(<CtaBannerAdvancedEditor value={{}} onChange={vi.fn()} />);

  try {
    expect(getInputByPlaceholder(advancedMount.container, "background token").value).toBe("");
    expect(getInputByPlaceholder(advancedMount.container, "text token").value).toBe("");
    expect(getInputByPlaceholder(advancedMount.container, "border token").value).toBe("");
    expect(
      getInputByPlaceholder(advancedMount.container, "primary button border token").value
    ).toBe("");
    expect(
      getInputByPlaceholder(advancedMount.container, "secondary button border token").value
    ).toBe("");
  } finally {
    advancedMount.cleanup();
    vi.resetModules();
  }
});
