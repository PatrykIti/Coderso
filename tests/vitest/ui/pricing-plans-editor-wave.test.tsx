// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
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

const clickElement = (element: Element | undefined) => {
  if (!element) return;
  act(() => {
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
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
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

test("PricingPlans wizard editor covers variant changes, header updates, and plan count expansion", async () => {
  const { PricingPlansWizardEditor } = await import(
    "../../../core/admin/ui/widgets/editors/PricingPlansEditors"
  );

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
      findSelectByOptions(view.container, ["three-plans", "four-plans", "comparison-rows"]),
      "comparison-rows"
    );
    setInputValue(
      findInputByPlaceholder(
        view.container,
        pricingPlansDefaults.header?.title ?? "Choose the plan that fits your workflow"
      ),
      "Simple pricing"
    );
    setSelectValue(findSelectByOptions(view.container, ["2", "3", "4", "5", "6"]), "4");

    setInputValue(findInputByPlaceholder(view.container, "Plan 4"), "Enterprise");
    setInputValue(
      findInputsByPlaceholder(view.container, "$49").at(-1),
      "$249"
    );

    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("comparison-rows");
    expect(onChangeSpy).toHaveBeenCalled();
    expect(
      (
        findSelectByOptions(view.container, [
          "three-plans",
          "four-plans",
          "comparison-rows",
        ]) as HTMLSelectElement | undefined
      )?.value
    ).toBe("comparison-rows");
    expect(latestValue.header?.title).toBe("Simple pricing");
    expect(latestValue.plans).toHaveLength(4);
    expect(latestValue.plans[0]).toMatchObject({
      name: "Starter",
      price: "$19",
    });
    expect(latestValue.plans[3]).toMatchObject({
      name: "Enterprise",
      price: "$249",
    });
  } finally {
    view.cleanup();
  }
});

test("PricingPlans visual editor covers variant cards, plan and feature management, highlight exclusivity, and style tokens", async () => {
  const { PricingPlansVisualEditor } = await import(
    "../../../core/admin/ui/widgets/editors/PricingPlansEditors"
  );

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
    expect(initialHighlightSwitches).toHaveLength(3);
    expect(initialHighlightSwitches[0]?.checked).toBe(true);
    expect(initialHighlightSwitches[1]?.checked).toBe(false);

    const initialColorPickers = Array.from(
      view.container.querySelectorAll("input[type='color']")
    ) as HTMLInputElement[];
    expect(initialColorPickers[0]?.value).toBe("#ffffff");

    clickButtonByText(view.container, "Four Plans");
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
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "Feature 1"), "Email support");
    clickButtonByText(firstPlanCard ?? view.container, "Add feature");
    firstPlanCard = getPlanCards(view.container)[0];
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "Feature 2"), "API access");

    let featureRows = getFeatureRows(firstPlanCard ?? view.container);
    clickButtonByText(featureRows[1] ?? firstPlanCard ?? view.container, "Move up");
    expect(latestValue.plans[0]?.features).toEqual(["API access", "Email support"]);

    firstPlanCard = getPlanCards(view.container)[0];
    featureRows = getFeatureRows(firstPlanCard ?? view.container);
    clickButtonByText(featureRows[0] ?? firstPlanCard ?? view.container, "Remove");

    firstPlanCard = getPlanCards(view.container)[0];
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "Plan 1"), "Solo");
    setInputValue(findInputsByPlaceholder(firstPlanCard ?? view.container, "$49")[0], "$29");
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "Most popular"), "Best value");
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "/month"), "/seat");
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "Choose plan"), "Try now");
    setInputValue(findInputByPlaceholder(firstPlanCard ?? view.container, "/checkout"), "/try-solo");

    clickButtonByText(firstPlanCard ?? view.container, "Move down");

    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("four-plans");
    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.header).toMatchObject({
      title: "Scale with your team",
      description: "Pick the tier that matches your launch stage.",
    });
    expect(latestValue.plans.map((plan) => plan.id)).toEqual(["growth", "starter", "scale"]);
    expect(latestValue.plans[1]).toMatchObject({
      name: "Solo",
      price: "$29",
      badge: "Best value",
      period: "/seat",
      ctaLabel: "Try now",
      ctaHref: "/try-solo",
      features: ["Email support"],
      highlighted: true,
    });

    const highlightSwitchesAfterMove = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];
    clickElement(highlightSwitchesAfterMove[0]);

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

    setInputValue(findInputByPlaceholder(view.container, "var(--color-bg)"), "#112233");
    setInputValue(findInputByPlaceholder(view.container, "var(--color-border)"), "#223344");
    setInputValue(findInputByPlaceholder(view.container, "var(--color-primary)"), "#334455");
    setSelectValue(findSelectByOptions(view.container, ["sm", "md", "lg"]), "lg");
    setSelectValue(findSelectByOptions(view.container, ["none", "md", "lg", "xl"]), "xl");

    const colorPickersAfterUpdate = Array.from(
      view.container.querySelectorAll("input[type='color']")
    ) as HTMLInputElement[];
    expect(colorPickersAfterUpdate[0]?.value).toBe("#112233");
    expect(latestValue.style).toMatchObject({
      cardSurface: "#112233",
      cardBorder: "#223344",
      highlightRing: "#334455",
      spacing: "lg",
      radius: "xl",
    });
  } finally {
    view.cleanup();
  }
});

test("PricingPlans advanced editor covers token overrides and normalization controls", async () => {
  const { PricingPlansAdvancedEditor } = await import(
    "../../../core/admin/ui/widgets/editors/PricingPlansEditors"
  );

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
    expect(previewBeforeActions?.textContent).toContain('"spacing": "md"');
    expect(previewBeforeActions?.textContent).toContain('"radius": "lg"');
    expect(previewBeforeActions?.textContent).toContain('"id": "dup"');

    setSelectValue(findSelectByOptions(view.container, ["sm", "md", "lg"]), "sm");
    setSelectValue(findSelectByOptions(view.container, ["none", "md", "lg", "xl"]), "xl");

    clickButtonByText(view.container, "Normalize full payload");

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
      features: ["Team workspace"],
      highlighted: true,
    });
    expect(latestValue.plans[1]).toMatchObject({
      id: "plan-2",
      name: "Growth",
      price: "$49",
      features: ["Priority support"],
      highlighted: false,
    });
    expect(latestValue.style).toMatchObject({
      cardSurface: "var(--color-bg)",
      cardBorder: "var(--color-border)",
      highlightRing: "var(--color-primary)",
      spacing: "sm",
      radius: "xl",
    });

    clickButtonByText(view.container, "Normalize plans to variant baseline");

    expect(latestValue.plans).toHaveLength(4);
    expect(latestValue.plans[3]).toMatchObject({
      id: "plan-4",
      name: "Business",
      price: "$199",
    });

    const previewAfterActions = view.container.querySelector("pre");
    expect(previewAfterActions?.textContent).toContain('"spacing": "sm"');
    expect(previewAfterActions?.textContent).toContain('"radius": "xl"');
    expect(previewAfterActions?.textContent).toContain('"name": "Business"');
  } finally {
    view.cleanup();
  }
});
