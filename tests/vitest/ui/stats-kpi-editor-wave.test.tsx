// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  statsKpiDefaults,
  type StatsKpiData,
  type StatsKpiItem,
} from "../../../core/widgets/core/statsKpi";

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
    disabled,
    placeholder,
    type,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    placeholder?: string;
    type?: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      type={type}
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

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  React.act(() => {
    element.click();
  });
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

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

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const getTextareaByPlaceholder = (container: ParentNode, placeholder: string) => {
  const textarea = Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing textarea with placeholder "${placeholder}"`);
  }
  return textarea;
};

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const getSelectByOptions = (container: ParentNode, values: string[]) => {
  const select = findSelectsByOptions(container, values)[0];
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select with options ${values.join(", ")}`);
  }
  return select;
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

const findColorInputByControl = (container: ParentNode, controlId: string) => {
  const input = container.querySelector(`[data-widget-control="${controlId}"] input[type="color"]`);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing color input for control "${controlId}"`);
  }
  return input;
};

const getControlById = (container: ParentNode, controlId: string) => {
  const control = container.querySelector(`[data-widget-control="${controlId}"]`);
  if (!(control instanceof HTMLElement)) {
    throw new Error(`Missing control "${controlId}"`);
  }
  return control;
};

const getWritableControlPaths = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-widget-control-path]"))
    .filter((element) => element.getAttribute("data-widget-control-readonly") !== "true")
    .map((element) => element.getAttribute("data-widget-control-path"))
    .filter((path): path is string => typeof path === "string" && path.length > 0);

const mountStatsKpiHarness = ({
  initialValue,
  initialVariant,
  render,
}: {
  initialValue: StatsKpiData;
  initialVariant: string;
  render: (props: {
    value: StatsKpiData;
    onChange: (next: StatsKpiData) => void;
    variant: string;
    onVariantChange: (next: string) => void;
  }) => React.ReactNode;
}) => {
  let latestValue = initialValue;
  let latestVariant = initialVariant;
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState(initialValue);
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
  vi.restoreAllMocks();
});

test("StatsKpi editors cover variant, count, item editing, layout/style controls, normalize, and reset", async () => {
  const { StatsKpiAdvancedEditor, StatsKpiVisualEditor, StatsKpiWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/StatsKpiEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  const previousConfirm = window.confirm;
  const confirmSpy = vi.fn(() => true);
  Object.defineProperty(window, "confirm", {
    configurable: true,
    writable: true,
    value: confirmSpy,
  });

  const Harness = () => {
    const [value, setValue] = useState<StatsKpiData>({} as StatsKpiData);
    const [variant, setVariant] = useState("cards");
    return (
      <>
        <StatsKpiWizardEditor
          value={value}
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            onVariantChangeSpy(next);
            setVariant(next);
          }}
        />
        <StatsKpiVisualEditor
          value={value}
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            onVariantChangeSpy(next);
            setVariant(next);
          }}
        />
        <StatsKpiAdvancedEditor
          value={value}
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            onVariantChangeSpy(next);
            setVariant(next);
          }}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Layout overview");
    expect(view.container.textContent).toContain("Metrics content and links");
    expect(view.container.textContent).toContain("Runtime summary");
    expect(
      view.container.querySelector('[data-widget-editor-section="stats-kpi.wizard.layout-seed"]')
    ).not.toBeNull();
    expect(view.container.textContent).toContain(
      "Use Visual to change the KPI layout, visible count, section title, and supporting header copy"
    );
    expect(view.container.textContent).toContain(
      "Visual owns metric values, labels, descriptions, icons, trends, and links after the starter layout is chosen."
    );

    clickByText(view.container, "Split Highlight");

    React.act(() => {
      const wizardRoot = view.container.querySelector(
        '[data-widget-editor-mode="wizard"]'
      ) as ParentNode | null;
      setSelectValue(findSelectsByOptions(view.container, ["1", "2", "3", "4", "5", "6"])[0], "3");
      expect((wizardRoot ?? view.container).querySelectorAll("select")).toHaveLength(0);
      expect(
        findInputByPlaceholder(wizardRoot ?? view.container, "Proof in numbers")
      ).toBeUndefined();
      expect(
        (wizardRoot ?? view.container).querySelector(
          'textarea[placeholder="Show key performance metrics and outcomes."]'
        )
      ).toBeNull();
      expect(
        findInputByPlaceholder(wizardRoot ?? view.container, "Metric 1 value")
      ).toBeUndefined();
      expect(
        findInputByPlaceholder(wizardRoot ?? view.container, "Metric 1 label")
      ).toBeUndefined();
    });

    clickByText(view.container, "Add metric");

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "120"), "240");
      setInputValue(findInputByPlaceholder(view.container, "Projects launched"), "Launches");
      setInputValue(findInputByPlaceholder(view.container, "$"), "$");
      setInputValue(findInputByPlaceholder(view.container, "%"), "+");
      setInputValue(
        findColorInputByControl(view.container, "stats-kpi.items.0.accentColor"),
        "#aa5500"
      );
      setInputValue(findInputByPlaceholder(view.container, "+12% MoM"), "+30% QoQ");
      setInputValue(findInputByPlaceholder(view.container, "/work"), "/case-studies");
      setInputValue(
        findInputByPlaceholder(view.container, "See launch examples"),
        "Read case studies"
      );
    });

    expect(findInputsByPlaceholder(view.container, "var(--color-text)")).toHaveLength(0);
    React.act(() => {
      setInputValue(
        findColorInputByControl(view.container, "stats-kpi.style.valueColor"),
        "#123456"
      );
      setInputValue(
        findColorInputByControl(view.container, "stats-kpi.style.labelColor"),
        "#654321"
      );
      setInputValue(
        findColorInputByControl(view.container, "stats-kpi.style.descriptionColor"),
        "#334455"
      );
      setSelectValue(findSelectsByOptions(view.container, ["start", "center", "end"])[0], "end");
      const densitySelects = findSelectsByOptions(view.container, ["none", "sm", "md", "lg"]);
      setSelectValue(densitySelects[0], "lg");
      setSelectValue(densitySelects[1], "lg");
    });

    const removeButtons = getButtonsByText(view.container, "Remove");
    clickButton(removeButtons[removeButtons.length - 1]);
    expect(confirmSpy).toHaveBeenCalled();

    const latest = onChangeSpy.mock.lastCall?.[0];
    expect(latest).toEqual(
      expect.objectContaining({
        header: expect.objectContaining({
          title: statsKpiDefaults.header?.title,
          description: statsKpiDefaults.header?.description,
        }),
        style: expect.objectContaining({
          alignment: "end",
          spacing: "lg",
          valueColor: "#123456",
          labelColor: "#654321",
          descriptionColor: "#334455",
        }),
      })
    );
    expect(latest.items).toHaveLength(3);
    expect(latest.items[0]).toEqual(
      expect.objectContaining({
        value: "240",
        label: "Launches",
        prefix: "$",
        suffix: "+",
        accentColor: "#aa5500",
        trend: expect.objectContaining({
          label: "+30% QoQ",
        }),
        link: expect.objectContaining({
          href: "/case-studies",
          label: "Read case studies",
        }),
      })
    );
    expect(onVariantChangeSpy).toHaveBeenCalledWith("split-highlight");

    clickByText(view.container, "Normalize now");
    expect(view.container.textContent).toContain("Stats KPI payload normalized.");
    expect(onChangeSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ style: expect.any(Object) })
    );

    clickByText(view.container, "Reset to defaults");
    const resetPayload = onChangeSpy.mock.lastCall?.[0];
    expect(resetPayload.header?.title).toBe("Proof in numbers");
    expect(onVariantChangeSpy).toHaveBeenCalledWith("cards");
    expect(view.container.textContent).toContain(
      "Stats KPI defaults restored; layout reset to Cards."
    );

    const advancedSection = view.container.querySelector(
      '[data-widget-editor-section="stats-kpi.advanced.runtime-diagnostics"]'
    );
    expect(advancedSection).not.toBeNull();
    expect(getWritableControlPaths(advancedSection ?? view.container)).toEqual([]);
  } finally {
    Object.defineProperty(window, "confirm", {
      configurable: true,
      writable: true,
      value: previousConfirm,
    });
    view.cleanup();
  }
});

test("StatsKpi visual and advanced editors cover isolated variant-card, direct item value, swatch, and saved custom color updates", async () => {
  const { StatsKpiAdvancedEditor, StatsKpiVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/StatsKpiEditors");

  const visualHarness = mountStatsKpiHarness({
    initialValue: {
      header: {
        title: "Baseline metrics",
        description: "Existing stat header",
      },
      items: [
        {
          id: "metric-a",
          value: "10",
          label: "Initial label",
          description: "Initial description",
          icon: "A",
        },
        {
          id: "metric-b",
          value: "20",
          label: "Second label",
          description: "Second description",
          icon: "B",
        },
      ],
      style: {
        valueColor: "var(--metric-value)",
        labelColor: "#445566",
        divider: false,
      },
    },
    initialVariant: "cards",
    render: (props) => <StatsKpiVisualEditor {...props} />,
  });

  try {
    const colorInputValues = getColorInputs(visualHarness.container).map((input) => input.value);

    expect(colorInputValues).toContain("#445566");
    expect(colorInputValues.filter((value) => value === "#0f172a").length).toBeGreaterThan(0);
    expect(visualHarness.container.textContent).toContain("Saved custom color");
    expect(findInputsByPlaceholder(visualHarness.container, "var(--metric-value)")).toHaveLength(0);
    expect(findInputsByPlaceholder(visualHarness.container, "var(--color-text)")).toHaveLength(0);

    clickButton(
      getButtonsByText(
        getControlById(visualHarness.container, "stats-kpi.style.valueColor"),
        "Clear"
      )[0]
    );
    expect(visualHarness.getLatestValue().style?.valueColor).toBeUndefined();
    expect(visualHarness.container.textContent).toContain(
      "Dividers render only in Inline. Saved divider settings are preserved, but this variant renders no divider output."
    );

    clickByText(visualHarness.container, "Inline");
    expect(visualHarness.getLatestVariant()).toBe("inline");
    expect(visualHarness.onVariantChangeSpy).toHaveBeenLastCalledWith("inline");
    expect(visualHarness.container.textContent).toContain("Inline has no card boxes.");

    const inlineCardBackgroundControl = getControlById(
      visualHarness.container,
      "stats-kpi.style.cardBackground"
    );
    const inlineCardBorderControl = getControlById(
      visualHarness.container,
      "stats-kpi.style.cardBorderColor"
    );
    expect(inlineCardBackgroundControl.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(inlineCardBorderControl.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(
      findColorInputByControl(visualHarness.container, "stats-kpi.style.cardBackground").disabled
    ).toBe(true);

    setInputValue(getInputByPlaceholder(visualHarness.container, "120"), "300%");
    setInputValue(
      findColorInputByControl(visualHarness.container, "stats-kpi.style.valueColor"),
      "#112233"
    );
    setSelectValue(
      getSelectByOptions(visualHarness.container, [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
      ]),
      "3"
    );
    clickButton(getButtonsByText(visualHarness.container, "Move up")[1]);

    expect(visualHarness.getLatestValue()).toMatchObject({
      items: [
        expect.objectContaining({
          value: "20",
          label: "Second label",
        }),
        expect.objectContaining({
          value: "300%",
          label: "Initial label",
        }),
        expect.objectContaining({
          value: "3",
          suffix: "x",
          label: "Faster iteration",
        }),
      ],
      style: expect.objectContaining({
        valueColor: "#112233",
      }),
    });
  } finally {
    visualHarness.cleanup();
  }

  const advancedHarness = mountStatsKpiHarness({
    initialValue: {
      items: [
        {
          id: "advanced-metric",
          value: "88%",
          label: "Coverage",
        },
      ],
      style: {},
    },
    initialVariant: "inline",
    render: (props) => <StatsKpiAdvancedEditor {...props} />,
  });

  try {
    expect(advancedHarness.container.textContent).toContain("Runtime diagnostics");
    expect(advancedHarness.container.textContent).toContain("Style diagnostics");
    expect(advancedHarness.container.textContent).toContain("Runtime summary");
    expect(advancedHarness.container.querySelector("pre")).toBeNull();
    expect(advancedHarness.container.textContent).toContain("Metric count");
    expect(getWritableControlPaths(advancedHarness.container)).toEqual([]);
    expect(
      advancedHarness.container.querySelector(
        '[data-widget-control-path="style.alignment"]:not([data-widget-control-readonly="true"])'
      )
    ).toBeNull();
    expect(
      advancedHarness.container.querySelector(
        '[data-widget-control-path="style.valueColor"]:not([data-widget-control-readonly="true"])'
      )
    ).toBeNull();
    expect(advancedHarness.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    advancedHarness.cleanup();
  }
});

test("StatsKpi editors render sparse normalized fallbacks for missing header, item, and style fields", async () => {
  vi.resetModules();

  const statsKpiModule = await import("../../../core/widgets/core/statsKpi");
  vi.spyOn(statsKpiModule, "normalizeStatsKpiData").mockReturnValue({
    header: {},
    items: [{} as StatsKpiItem, {} as StatsKpiItem],
    style: {},
  } as StatsKpiData);
  vi.spyOn(statsKpiModule, "normalizeStatsKpiItems").mockReturnValue([
    {} as StatsKpiItem,
    {} as StatsKpiItem,
  ]);

  const { StatsKpiAdvancedEditor, StatsKpiVisualEditor, StatsKpiWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/StatsKpiEditors");

  const wizardView = mount(
    <StatsKpiWizardEditor
      value={{ items: [] }}
      onChange={vi.fn()}
      variant="inline"
      onVariantChange={vi.fn()}
    />
  );

  try {
    expect(wizardView.container.textContent).toContain("Layout overview");
    expect(wizardView.container.textContent).toContain("Inline");
    expect(wizardView.container.textContent).toContain("2 metrics");
    expect(wizardView.container.querySelector("select")).toBeNull();
    expect(findInputByPlaceholder(wizardView.container, "Metric 1 value")).toBeUndefined();
    expect(findInputByPlaceholder(wizardView.container, "Metric 2 value")).toBeUndefined();
  } finally {
    wizardView.cleanup();
  }

  const visualView = mount(
    <StatsKpiVisualEditor value={{ items: [] }} onChange={vi.fn()} variant="cards" />
  );

  try {
    expect(getInputByPlaceholder(visualView.container, "Proof in numbers").value).toBe("");
    expect(
      getTextareaByPlaceholder(visualView.container, "Show key performance metrics and outcomes.")
        .value
    ).toBe("");
    expect(getInputByPlaceholder(visualView.container, "120").value).toBe("");
    expect(getInputByPlaceholder(visualView.container, "Projects launched").value).toBe("");
    expect(getInputByPlaceholder(visualView.container, "$").value).toBe("");
    expect(getInputByPlaceholder(visualView.container, "%").value).toBe("");
    expect(
      getTextareaByPlaceholder(visualView.container, "Optional supporting context.").value
    ).toBe("");
    expect(getInputByPlaceholder(visualView.container, "🚀").value).toBe("");
    expect(findInputsByPlaceholder(visualView.container, "var(--color-text)")).toHaveLength(0);
    expect(findInputsByPlaceholder(visualView.container, "var(--color-bg)")).toHaveLength(0);
    expect(findInputsByPlaceholder(visualView.container, "var(--color-border)")).toHaveLength(0);
    expect(getColorInputs(visualView.container)).toHaveLength(10);
    expect(getColorInputs(visualView.container).map((input) => input.value)).toEqual(
      expect.arrayContaining(["#1d4ed8", "#0f172a", "#ffffff", "#e2e8f0", "#f8fafc"])
    );
    expect(getSelectByOptions(visualView.container, ["start", "center", "end"]).value).toBe(
      "center"
    );
    expect(getSelectByOptions(visualView.container, ["none", "sm", "md", "lg"]).value).toBe("md");

    clickByText(visualView.container, "Inline");
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <StatsKpiAdvancedEditor value={{ items: [] }} onChange={vi.fn()} variant="cards" />
  );

  try {
    expect(advancedView.container.textContent).toContain("Runtime diagnostics");
    expect(advancedView.container.textContent).toContain("Style diagnostics");
    expect(advancedView.container.textContent).toContain("Runtime summary");
    expect(advancedView.container.querySelector("pre")).toBeNull();
    expect(getWritableControlPaths(advancedView.container)).toEqual([]);
    expect(advancedView.container.querySelectorAll("select")).toHaveLength(0);
    expect(advancedView.container.querySelectorAll("input")).toHaveLength(0);
  } finally {
    advancedView.cleanup();
    vi.resetModules();
  }
});

test("StatsKpi visual count and divider controls update isolated stateful paths", async () => {
  const { StatsKpiVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/StatsKpiEditors");

  let latestVisualValue: StatsKpiData = {
    items: [
      { id: "metric-a", value: "88%", label: "Coverage" },
      { id: "metric-b", value: "12m", label: "Runtime" },
    ],
    style: {
      divider: false,
    },
  };

  const VisualHarness = () => {
    const [value, setValue] = useState<StatsKpiData>(latestVisualValue);

    return (
      <StatsKpiVisualEditor
        value={value}
        onChange={(next) => {
          latestVisualValue = next;
          setValue(next);
        }}
        variant="inline"
      />
    );
  };

  const visualView = mount(<VisualHarness />);

  try {
    setSelectValue(
      getSelectByOptions(visualView.container, [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
      ]),
      "3"
    );
    expect(latestVisualValue.items).toHaveLength(3);
    expect(latestVisualValue.items?.[1]).toMatchObject({
      value: "12m",
      label: "Runtime",
    });

    const checkboxes = Array.from(
      visualView.container.querySelectorAll("input[type='checkbox']")
    ).filter((element): element is HTMLInputElement => element instanceof HTMLInputElement);
    const dividerToggle = checkboxes[checkboxes.length - 1];
    if (!(dividerToggle instanceof HTMLInputElement)) {
      throw new Error("Missing divider toggle");
    }

    React.act(() => {
      dividerToggle.click();
    });
    setSelectValue(
      getSelectByOptions(visualView.container, ["soft", "default", "strong"]),
      "strong"
    );

    expect(latestVisualValue.style).toMatchObject({
      divider: true,
      dividerIntensity: "strong",
    });
  } finally {
    visualView.cleanup();
  }
});
