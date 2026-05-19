// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  normalizePricingPlans,
  normalizePricingPlansData,
  pricingPlansDefaults,
  type PricingPlansData,
} from "../../../core/widgets/core/pricingPlans";

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
  Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ value, onChange, disabled, placeholder, type, className, ...props }, ref) => (
      <input
        ref={ref}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        type={type}
        className={className}
        {...props}
      />
    )
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

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
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

const clickElement = (element: Element | null | undefined) => {
  if (!element) return;
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickButtonByText = (container: ParentNode, text: string, index = 0) => {
  const button = Array.from(container.querySelectorAll("button")).filter((candidate) =>
    candidate.textContent?.includes(text)
  )[index];

  if (!button) {
    throw new Error(`Missing button: ${text} (${index})`);
  }

  clickElement(button);
};

const findButtonsByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).filter((candidate) =>
    candidate.textContent?.includes(text)
  );

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

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const getPlanCards = (container: ParentNode) =>
  Array.from(container.querySelectorAll("div.space-y-3.rounded-lg.border.p-3")).filter((element) =>
    element.textContent?.includes("Highlight this plan")
  );

const getFeatureRows = (container: ParentNode) =>
  Array.from(container.querySelectorAll("div.space-y-2.rounded-md.border.p-2"));

afterEach(() => {
  vi.restoreAllMocks();
});

test("PricingPlans wizard editor covers variant changes, publishable plan fields, and fixed-count guidance", async () => {
  const { PricingPlansWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/PricingPlansEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue: PricingPlansData = {
    plans: [],
  };

  const Harness = () => {
    const [value, setValue] = useState<PricingPlansData>(latestValue);
    const [variant, setVariant] = useState("three-plans");

    return (
      <PricingPlansWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          onVariantChangeSpy(next);
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    setSelectValue(
      findSelectByOptions(view.container, [
        "two-plans",
        "three-plans",
        "four-plans",
        "comparison-rows",
      ]),
      "two-plans"
    );
    setInputValue(
      findInputByPlaceholder(
        view.container,
        pricingPlansDefaults.header?.title ?? "Choose the plan that fits your workflow"
      ),
      "Simple pricing"
    );
    const firstPlanCard = Array.from(
      view.container.querySelectorAll("div.space-y-3.rounded-lg.border.p-3")
    )[0];
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "Plan 1"), "Solo");
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "Most popular"), "New");
    setInputValue(findInputsByPlaceholder(firstPlanCard ?? view.container, "$49")[0], "$29");
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "/month"), "/seat");
    setInputValue(
      findInputByPlaceholder(firstPlanCard ?? view.container, "Choose plan"),
      "Start free"
    );
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "/checkout"), "/solo");
    clickButtonByText(firstPlanCard ?? view.container, "Add feature");
    await Promise.resolve();
    const newFeatureInput = findInputByPlaceholder(firstPlanCard ?? view.container, "Feature 1");
    expect(document.activeElement).toBe(newFeatureInput);
    setInputValue(newFeatureInput, "Email support");
    setSelectValue(
      findSelectByOptions(view.container, [
        "two-plans",
        "three-plans",
        "four-plans",
        "comparison-rows",
      ]),
      "three-plans"
    );

    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("three-plans");
    expect(onChangeSpy).toHaveBeenCalled();
    expect(
      (
        findSelectByOptions(view.container, [
          "two-plans",
          "three-plans",
          "four-plans",
          "comparison-rows",
        ]) as HTMLSelectElement | null | undefined
      )?.value
    ).toBe("three-plans");
    expect(view.container.textContent).toContain("Three Plans shows 3 plans.");
    expect(view.container.textContent).not.toContain("1 preserved plan is hidden");
    expect(latestValue.header?.title).toBe("Simple pricing");
    expect(latestValue.plans).toHaveLength(3);
    expect(latestValue.plans[0]).toMatchObject({
      name: "Solo",
      badge: "New",
      price: "$29",
      period: "/seat",
      ctaLabel: "Start free",
      ctaHref: "/solo",
      features: [{ text: "Email support", status: "included" }],
    });
  } finally {
    view.cleanup();
  }
});

test("PricingPlans visual editor covers variant cards, plan and feature management, highlight exclusivity, and style tokens", async () => {
  const { PricingPlansVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/PricingPlansEditors");

  const originalConfirm = window.confirm;
  Object.defineProperty(window, "confirm", {
    value: vi.fn(() => true),
    configurable: true,
    writable: true,
  });
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue: PricingPlansData = {
    header: {
      title: "Pricing overview",
      description: "Compare plans",
    },
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "$19",
        period: "/month",
        badge: "For individuals",
        features: [],
        ctaLabel: "Start now",
        ctaHref: "/starter",
        highlighted: true,
      },
      {
        id: "growth",
        name: "Growth",
        price: "$49",
        period: "/month",
        badge: "Most popular",
        features: ["Analytics"],
        ctaLabel: "Choose growth",
        ctaHref: "/growth",
        highlighted: true,
      },
      {
        id: "scale",
        name: "Scale",
        price: "$99",
        period: "/month",
        badge: "For teams",
        features: ["Audit logs", "SSO"],
        ctaLabel: "Contact sales",
        ctaHref: "/scale",
        highlighted: false,
      },
    ],
    style: {
      cardSurface: "var(--color-bg)",
      cardBorder: "var(--color-border)",
      highlightRing: "var(--color-primary)",
      spacing: "md",
      radius: "lg",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<PricingPlansData>(latestValue);
    const [variant, setVariant] = useState("three-plans");

    return (
      <PricingPlansVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          onVariantChangeSpy(next);
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("No features yet.");

    const initialHighlightSwitches = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];
    expect(initialHighlightSwitches.length).toBeGreaterThanOrEqual(4);
    expect(initialHighlightSwitches[1]?.checked).toBe(true);
    expect(initialHighlightSwitches[2]?.checked).toBe(false);

    const initialColorPickers = Array.from(
      view.container.querySelectorAll("input[type='color']")
    ) as HTMLInputElement[];
    expect(initialColorPickers[0]?.value).toBe("#ffffff");

    clickButtonByText(view.container, "Four Plans");
    clickElement(initialHighlightSwitches[0]);
    setInputValue(findInputByPlaceholder(view.container, "Monthly"), "Monthly");
    setInputValue(findInputByPlaceholder(view.container, "Annual"), "Yearly");
    setSelectValue(findSelectByOptions(view.container, ["monthly", "annual"]), "annual");
    setInputValue(
      findInputByPlaceholder(
        view.container,
        pricingPlansDefaults.header?.title ?? "Choose the plan that fits your workflow"
      ),
      "Scale with your team"
    );
    setTextareaValue(
      findTextareaByPlaceholder(
        view.container,
        pricingPlansDefaults.header?.description ??
          "Compare pricing tiers and pick the option matching your team stage."
      ),
      "Pick the tier that matches your launch stage."
    );

    let firstPlanCard = getPlanCards(view.container)[0];
    expect(firstPlanCard?.textContent).toContain("No features yet.");

    clickButtonByText(firstPlanCard ?? view.container, "Add feature");
    await Promise.resolve();
    expect(document.activeElement).toBe(
      findInputByPlaceholder(firstPlanCard ?? view.container, "Feature 1")
    );
    setInputValue(
      findInputByPlaceholder(firstPlanCard ?? view.container, "Feature 1"),
      "Email support"
    );
    clickButtonByText(firstPlanCard ?? view.container, "Add feature");
    firstPlanCard = getPlanCards(view.container)[0];
    setInputValue(
      findInputByPlaceholder(firstPlanCard ?? view.container, "Feature 2"),
      "API access"
    );

    let featureRows = getFeatureRows(firstPlanCard ?? view.container);
    clickButtonByText(featureRows[1] ?? firstPlanCard ?? view.container, "Move up");
    expect(latestValue.plans[0]?.features).toEqual([
      { text: "API access", status: "included" },
      { text: "Email support", status: "included" },
    ]);

    firstPlanCard = getPlanCards(view.container)[0];
    featureRows = getFeatureRows(firstPlanCard ?? view.container);
    clickButtonByText(featureRows[0] ?? firstPlanCard ?? view.container, "Remove");

    firstPlanCard = getPlanCards(view.container)[0];
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "Plan 1"), "Solo");
    setInputValue(findInputsByPlaceholder(firstPlanCard ?? view.container, "$49")[0], "$29");
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "$490"), "$290");
    setInputValue(
      findInputByPlaceholder(firstPlanCard ?? view.container, "Most popular"),
      "Best value"
    );
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "/month"), "/seat");
    setInputValue(
      findInputByPlaceholder(firstPlanCard ?? view.container, "Choose plan"),
      "Try now"
    );
    setInputValue(
      findInputByPlaceholder(firstPlanCard ?? view.container, "/checkout"),
      "/try-solo"
    );
    setSelectValue(
      findSelectByOptions(firstPlanCard ?? view.container, [
        "legacy",
        "structured",
        "free",
        "custom",
      ]),
      "structured"
    );
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "49"), "29");
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "490"), "290");
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "USD"), "EUR");
    setInputValue(
      findInputByPlaceholder(firstPlanCard ?? view.container, "2 months free"),
      "Save 20%"
    );
    setSelectValue(
      findSelectByOptions(firstPlanCard ?? view.container, ["outline", "filled", "ghost"]),
      "filled"
    );
    setSelectValue(
      findSelectByOptions(firstPlanCard ?? view.container, ["neutral", "accent", "highlight"]),
      "accent"
    );

    clickButtonByText(firstPlanCard ?? view.container, "Move down");

    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("four-plans");
    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.header).toMatchObject({
      title: "Scale with your team",
      description: "Pick the tier that matches your launch stage.",
    });
    expect(latestValue.billingToggle).toMatchObject({
      enabled: true,
      monthlyLabel: "Monthly",
      annualLabel: "Yearly",
      defaultCycle: "annual",
    });
    expect(latestValue.plans.map((plan) => plan.id)).toEqual(["growth", "starter", "scale"]);
    expect(latestValue.plans[1]).toMatchObject({
      name: "Solo",
      price: "$29",
      prices: expect.objectContaining({
        annual: "$290",
      }),
      badge: "Best value",
      period: "/seat",
      ctaLabel: "Try now",
      ctaHref: "/try-solo",
      ctaStyle: "filled",
      badgeTone: "accent",
      priceDisplay: expect.objectContaining({
        mode: "structured",
        amount: 29,
        annualAmount: 290,
        currency: "EUR",
        annualSavingsLabel: "Save 20%",
      }),
      features: [{ text: "Email support", status: "included" }],
      highlighted: true,
    });

    const highlightSwitchesAfterMove = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];
    clickElement(highlightSwitchesAfterMove[1]);

    expect(latestValue.plans.map((plan) => plan.highlighted)).toEqual([true, false, false]);

    const scalePlanCard = getPlanCards(view.container)[2];
    clickButtonByText(scalePlanCard ?? view.container, "Remove");
    expect(latestValue.plans).toHaveLength(2);

    clickButtonByText(view.container, "Add plan");
    expect(latestValue.plans).toHaveLength(3);
    expect(latestValue.plans[2]).toMatchObject({
      name: "Plan 3",
      price: "$0",
      features: [],
      highlighted: false,
    });

    const colorPickersBeforeUpdate = Array.from(
      view.container.querySelectorAll("input[type='color']")
    ) as HTMLInputElement[];
    setInputValue(colorPickersBeforeUpdate[0], "#112233");
    setInputValue(findInputByPlaceholder(view.container, "var(--color-border)"), "#223344");
    setInputValue(findInputByPlaceholder(view.container, "var(--color-primary)"), "#334455");
    setSelectValue(findSelectByOptions(view.container, ["none", "sm", "md", "lg"]), "lg");
    setSelectValue(findSelectByOptions(view.container, ["none", "md", "lg", "xl"]), "xl");
    setSelectValue(findSelectByOptions(view.container, ["bullet", "check", "status"]), "status");
    setSelectValue(findSelectByOptions(view.container, ["narrow", "default", "wide"]), "wide");
    setSelectValue(
      findSelectByOptions(view.container, ["compact", "balanced", "prominent"]),
      "prominent"
    );
    setTextareaValue(
      findTextareaByPlaceholder(
        view.container,
        "All prices exclude VAT. Contact us for enterprise pricing."
      ),
      "All prices exclude VAT."
    );

    const colorPickersAfterUpdate = Array.from(
      view.container.querySelectorAll("input[type='color']")
    ) as HTMLInputElement[];
    expect(latestValue.style).toMatchObject({
      cardBorder: "#223344",
      highlightRing: "#334455",
      spacing: "lg",
      radius: "xl",
      featureMarker: "status",
    });
    expect(latestValue.layout).toMatchObject({
      maxWidth: "wide",
      typography: "prominent",
      footerNote: "All prices exclude VAT.",
    });

    clickElement(findButtonsByText(view.container, "Clear").at(-1));
    expect(latestValue.style?.highlightRing).toBe("var(--color-primary)");
  } finally {
    Object.defineProperty(window, "confirm", {
      value: originalConfirm,
      configurable: true,
      writable: true,
    });
    view.cleanup();
  }
});

test("PricingPlans advanced editor exposes diagnostics and clearer fix/reset actions", async () => {
  const { PricingPlansAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/PricingPlansEditors");

  const onChangeSpy = vi.fn();
  let latestValue: PricingPlansData = {
    plans: [
      {
        id: "dup",
        name: "",
        price: "",
        highlighted: true,
        features: ["  Team workspace  ", ""],
      },
      {
        id: "dup",
        highlighted: true,
        features: ["Priority support"],
      },
    ],
    style: {
      spacing: "bogus" as never,
      radius: "bogus" as never,
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<PricingPlansData>(latestValue);

    return (
      <PricingPlansAdvancedEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant="four-plans"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const previewBeforeActions = view.container.querySelector("pre");
    expect(previewBeforeActions?.textContent).toContain('"spacing": "bogus"');
    expect(previewBeforeActions?.textContent).toContain('"radius": "bogus"');
    expect(previewBeforeActions?.textContent).toContain('"id": "dup"');
    expect(view.container.textContent).toContain("Visual-owned tokens");
    expect(view.container.textContent).toContain("Fix and reset");
    expect(view.container.textContent).toContain("Align plan list to current layout count");
    expect(view.container.textContent).toContain("Clean payload and fill missing defaults");

    clickButtonByText(view.container, "Clean payload and fill missing defaults");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.header).toMatchObject({
      title: pricingPlansDefaults.header?.title,
      description: pricingPlansDefaults.header?.description,
    });
    expect(latestValue.plans).toHaveLength(2);
    expect(latestValue.plans[0]).toMatchObject({
      id: "dup",
      name: "Starter",
      price: "$19",
      features: [{ text: "Team workspace", status: "included" }],
      highlighted: true,
    });
    expect(latestValue.plans[1]).toMatchObject({
      id: "plan-2",
      name: "Growth",
      price: "$49",
      features: [{ text: "Priority support", status: "included" }],
      highlighted: false,
    });
    expect(latestValue.style).toMatchObject({
      cardSurface: undefined,
      cardBorder: undefined,
      highlightRing: "var(--color-primary)",
      spacing: "md",
      radius: "lg",
    });

    clickButtonByText(view.container, "Align plan list to current layout count");

    expect(latestValue.plans).toHaveLength(4);
    expect(latestValue.plans[3]).toMatchObject({
      id: "plan-4",
      name: "Business",
      price: "$199",
    });

    const previewAfterActions = view.container.querySelector("pre");
    expect(previewAfterActions?.textContent).toContain('"spacing": "md"');
    expect(previewAfterActions?.textContent).toContain('"radius": "lg"');
    expect(previewAfterActions?.textContent).toContain('"name": "Business"');
  } finally {
    view.cleanup();
  }
});

test("PricingPlans visual editor preserves hidden plans across fixed-count variant changes", async () => {
  const { PricingPlansVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/PricingPlansEditors");

  let latestValue: PricingPlansData = {
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "$19",
        features: ["Email support"],
      },
      {
        id: "growth",
        name: "Growth",
        price: "$49",
        features: ["API", "Automation"],
      },
      {
        id: "scale",
        name: "Scale",
        price: "$99",
        features: ["SSO"],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "$199",
        features: ["Dedicated support"],
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<PricingPlansData>(latestValue);
    const [variant, setVariant] = useState("four-plans");

    return (
      <PricingPlansVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => setVariant(next)}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Four Plans shows 4 plans.");

    clickButtonByText(view.container, "Three Plans");
    expect(view.container.textContent).toContain("Three Plans shows 3 plans.");
    expect(view.container.textContent).toContain("1 preserved plan is hidden");

    const hiddenPlanCard = getPlanCards(view.container)[3];
    expect(hiddenPlanCard?.textContent).toContain("Hidden in this layout");
    setInputValue(
      findInputByPlaceholder(hiddenPlanCard ?? view.container, "Plan 4"),
      "Enterprise Plus"
    );
    expect(latestValue.plans[3]).toMatchObject({
      id: "enterprise",
      name: "Enterprise Plus",
      price: "$199",
    });

    clickButtonByText(view.container, "Four Plans");
    expect(
      (
        findInputByPlaceholder(getPlanCards(view.container)[3] ?? view.container, "Plan 4") as
          | HTMLInputElement
          | undefined
      )?.value
    ).toBe("Enterprise Plus");
  } finally {
    view.cleanup();
  }
});

test("PricingPlans editors render sparse defaults and ignore variant changes without a handler", async () => {
  const { PricingPlansAdvancedEditor, PricingPlansVisualEditor, PricingPlansWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/PricingPlansEditors");

  const sparseValue: PricingPlansData = {
    header: {},
    plans: [{}, {}] as never,
    style: {},
  };

  const wizardView = mount(
    <PricingPlansWizardEditor
      value={sparseValue}
      onChange={() => undefined}
      variant="three-plans"
    />
  );

  try {
    expect(
      (
        findInputByPlaceholder(
          wizardView.container,
          pricingPlansDefaults.header?.title ?? "Choose the plan that fits your workflow"
        ) as HTMLInputElement | null | undefined
      )?.value
    ).toBe(pricingPlansDefaults.header?.title);
    expect(wizardView.container.textContent).toContain("Three Plans shows 3 plans.");
    expect(
      (
        findInputByPlaceholder(wizardView.container, "Plan 1") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("Starter");
    expect(
      (
        findInputsByPlaceholder(wizardView.container, "$49")[0] as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("$19");

    setSelectValue(
      findSelectByOptions(wizardView.container, [
        "two-plans",
        "three-plans",
        "four-plans",
        "comparison-rows",
      ]),
      "comparison-rows"
    );
    expect(
      (
        findSelectByOptions(wizardView.container, [
          "two-plans",
          "three-plans",
          "four-plans",
          "comparison-rows",
        ]) as HTMLSelectElement | undefined
      )?.value
    ).toBe("three-plans");
  } finally {
    wizardView.cleanup();
  }

  const visualView = mount(
    <PricingPlansVisualEditor
      value={sparseValue}
      onChange={() => undefined}
      variant="three-plans"
    />
  );

  try {
    expect(
      (
        findInputByPlaceholder(
          visualView.container,
          pricingPlansDefaults.header?.title ?? "Choose the plan that fits your workflow"
        ) as HTMLInputElement | null | undefined
      )?.value
    ).toBe(pricingPlansDefaults.header?.title);
    expect(
      (
        findTextareaByPlaceholder(
          visualView.container,
          pricingPlansDefaults.header?.description ??
            "Compare pricing tiers and pick the option matching your team stage."
        ) as HTMLTextAreaElement | null | undefined
      )?.value
    ).toBe(pricingPlansDefaults.header?.description);
    expect(visualView.container.textContent).toContain("Three Plans shows 3 plans.");
    expect(visualView.container.textContent).toContain("No features yet.");

    clickButtonByText(visualView.container, "Four Plans");
    expect(visualView.container.textContent).toContain("Selected");
    expect(visualView.container.textContent).toContain("Three Plans shows 3 plans.");
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <PricingPlansAdvancedEditor
      value={sparseValue}
      onChange={() => undefined}
      variant="three-plans"
    />
  );

  try {
    expect(advancedView.container.textContent).toContain("Visual-owned tokens");
    expect(advancedView.container.textContent).toContain("Fix and reset");
    expect(advancedView.container.textContent).toContain("Align plan list to current layout count");
  } finally {
    advancedView.cleanup();
  }
});

test("PricingPlans advanced editor confirms before trimming preserved hidden plans", async () => {
  const { PricingPlansAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/PricingPlansEditors");

  const originalConfirm = window.confirm;
  let latestValue: PricingPlansData = {
    plans: [
      { id: "starter", name: "Starter", price: "$19", features: ["Email support"] },
      { id: "growth", name: "Growth", price: "$49", features: ["Analytics"] },
      { id: "scale", name: "Scale", price: "$99", features: ["SLA"] },
      { id: "enterprise", name: "Enterprise", price: "$199", features: ["Dedicated support"] },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<PricingPlansData>(latestValue);

    return (
      <PricingPlansAdvancedEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="three-plans"
      />
    );
  };

  try {
    Object.defineProperty(window, "confirm", {
      value: vi.fn(() => false),
      configurable: true,
      writable: true,
    });

    const cancelView = mount(<Harness />);
    try {
      clickButtonByText(cancelView.container, "Align plan list to current layout count");
      expect(latestValue.plans).toHaveLength(4);
    } finally {
      cancelView.cleanup();
    }

    Object.defineProperty(window, "confirm", {
      value: vi.fn(() => true),
      configurable: true,
      writable: true,
    });

    const confirmView = mount(<Harness />);
    try {
      clickButtonByText(confirmView.container, "Align plan list to current layout count");
      expect(latestValue.plans).toHaveLength(3);
      expect(latestValue.plans[2]?.id).toBe("scale");
    } finally {
      confirmView.cleanup();
    }
  } finally {
    Object.defineProperty(window, "confirm", {
      value: originalConfirm,
      configurable: true,
      writable: true,
    });
  }
});

test("PricingPlans visual editor keeps payload stable when guard actions are triggered at bounds", async () => {
  const { PricingPlansVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/PricingPlansEditors");

  let latestValue: PricingPlansData = {
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "$19",
        features: ["Email support"],
      },
      {
        id: "growth",
        name: "Growth",
        price: "$49",
        features: ["API", "Automation"],
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<PricingPlansData>(latestValue);

    return (
      <PricingPlansVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="three-plans"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const before = structuredClone(
      normalizePricingPlansData({
        ...latestValue,
        plans: normalizePricingPlans(latestValue.plans, 3),
      })
    );
    const planCards = getPlanCards(view.container);

    clickButtonByText(planCards[0] ?? view.container, "Move up");
    clickButtonByText(planCards[0] ?? view.container, "Remove");
    clickButtonByText(planCards[1] ?? view.container, "Move down");

    const secondPlanCard = getPlanCards(view.container)[1];
    const featureRows = getFeatureRows(secondPlanCard ?? view.container);
    clickButtonByText(featureRows[1] ?? secondPlanCard ?? view.container, "Move down");

    expect(latestValue).toEqual(before);
  } finally {
    view.cleanup();
  }

  latestValue = {
    plans: [
      { id: "one", name: "One", price: "$1", features: [] },
      { id: "two", name: "Two", price: "$2", features: [] },
      { id: "three", name: "Three", price: "$3", features: [] },
      { id: "four", name: "Four", price: "$4", features: [] },
      { id: "five", name: "Five", price: "$5", features: [] },
      { id: "six", name: "Six", price: "$6", features: [] },
    ],
  };

  const maxView = mount(<Harness />);

  try {
    const beforeMax = structuredClone(latestValue);
    clickButtonByText(maxView.container, "Add plan");
    expect(latestValue).toEqual(beforeMax);
  } finally {
    maxView.cleanup();
  }
});
