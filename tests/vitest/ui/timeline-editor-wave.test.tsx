// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { TimelineData } from "../../../core/widgets/core/timeline";

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
    readOnly,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    readOnly?: boolean;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      readOnly={readOnly}
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

const setCheckboxValue = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  React.act(() => {
    element.click();
  });
};

const clickButtonByText = (container: ParentNode, text: string, index = 0) => {
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

test("Timeline wizard editor covers variant selection, normalized step growth, and quick layout toggles", async () => {
  const { TimelineWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/TimelineEditors");

  const onChangeSpy = vi.fn();
  let latestValue: TimelineData = {
    steps: [
      { id: "", title: " " },
      { id: "custom-step", title: "Kickoff" },
    ],
    layout: {},
    guides: {},
  };
  let currentVariant = "milestones";

  const Harness = () => {
    const [value, setValue] = useState<TimelineData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <TimelineWizardEditor
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
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Timeline style");

    const variantSelect = findSelectByOptions(view.container, ["milestones", "cards", "compact"]);
    setSelectValue(variantSelect, "cards");
    expect(currentVariant).toBe("cards");

    const modeSelect = findSelectByOptions(view.container, [
      "process",
      "axis",
      "chronology",
      "alternating",
    ]);
    setSelectValue(modeSelect, "alternating");
    expect(latestValue.mode).toBe("alternating");
    expect(currentVariant).toBe("cards");

    const stepCountSelect = findSelectByOptions(view.container, ["3", "4", "5", "6", "7", "8"]);
    expect((stepCountSelect as HTMLSelectElement | null | undefined)?.value).toBe("3");
    setSelectValue(stepCountSelect, "5");

    expect(latestValue.steps).toHaveLength(5);
    expect(latestValue.steps[0]).toEqual(
      expect.objectContaining({ id: "step-1", title: "Discovery" })
    );
    expect(latestValue.steps[4]).toEqual(
      expect.objectContaining({ id: "step-5", title: "Step 5" })
    );

    setInputValue(findInputByPlaceholder(view.container, "Step 1"), "Explore");
    setInputValue(findInputByPlaceholder(view.container, "Step 4"), "Launch prep");
    expect(findInputByPlaceholder(view.container, "Step 5")).toBeUndefined();

    setSelectValue(findSelectByOptions(view.container, ["horizontal", "vertical"]), "vertical");
    setCheckboxValue(view.container.querySelector("input[type='checkbox']") ?? undefined, false);

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.steps[0]).toEqual(
      expect.objectContaining({ id: "step-1", title: "Explore" })
    );
    expect(latestValue.steps[3]).toEqual(
      expect.objectContaining({ id: "step-4", title: "Launch prep" })
    );
    expect(latestValue.layout).toEqual(expect.objectContaining({ orientation: "vertical" }));
    expect(latestValue.guides).toEqual(expect.objectContaining({ enabled: false }));
  } finally {
    view.cleanup();
  }
});

test("Timeline visual editor covers variant cards, step ordering, color fallbacks, and style controls", async () => {
  const { TimelineVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/TimelineEditors");

  const onChangeSpy = vi.fn();
  let latestValue: TimelineData = {
    steps: [
      {
        id: "alpha",
        title: "Discover",
        description: "Existing intro",
        icon: "📍",
        accent: "not-a-color",
      },
      { id: "beta", title: "Plan" },
      { id: "gamma", title: "Deliver" },
    ],
    style: {
      lineColor: "bad-token",
      titleColor: "#123123",
      descriptionColor: "still-bad",
    },
    background: {
      color: "transparent",
    },
  };
  let currentVariant = "milestones";

  const Harness = () => {
    const [value, setValue] = useState<TimelineData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <TimelineVisualEditor
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
    );
  };

  const view = mount(<Harness />);

  try {
    clickButtonByText(view.container, "Compact");
    expect(currentVariant).toBe("compact");

    const structureSection = findSectionByTitle(view.container, "Variant and timeline structure");
    const contentSection = findSectionByTitle(view.container, "Steps content and order");
    const guidesSection = findSectionByTitle(view.container, "Guides and axis line");
    const markersSection = findSectionByTitle(view.container, "Markers and accents");
    const colorsSection = findSectionByTitle(view.container, "Colors and background");
    const typographySection = findSectionByTitle(view.container, "Typography and spacing");

    setSelectValue(
      findSelectByOptions(structureSection as ParentNode, ["3", "4", "5", "6", "7", "8"]),
      "4"
    );
    setSelectValue(
      findSelectByOptions(structureSection as ParentNode, ["horizontal", "vertical"]),
      "vertical"
    );
    setSelectValue(
      findSelectByOptions(structureSection as ParentNode, ["top", "bottom"]),
      "bottom"
    );
    setSelectValue(
      findSelectByOptions(structureSection as ParentNode, ["start", "center", "end"]),
      "end"
    );

    expect(contentSection?.textContent).toContain("4 steps configured");

    setInputValue(findInputsByPlaceholder(contentSection as ParentNode, "Step title")[0], "Map");
    setTextareaValue(
      findTextareaByPlaceholder(contentSection as ParentNode, "Step description"),
      "Align stakeholders"
    );
    setInputValue(findInputByPlaceholder(contentSection as ParentNode, "2026-05-11"), "2026-05-12");
    setInputValue(
      findInputByPlaceholder(contentSection as ParentNode, "May 11, 2026"),
      "May 12, 2026"
    );
    const statusSelect = findSelectByOptions(contentSection as ParentNode, [
      "upcoming",
      "current",
      "complete",
    ]);
    setSelectValue(statusSelect, "current");
    setInputValue(findInputByPlaceholder(contentSection as ParentNode, "Icon text or emoji"), "🧭");
    setInputValue(findInputByPlaceholder(contentSection as ParentNode, "Step CTA label"), "Open");
    setInputValue(
      findInputByPlaceholder(contentSection as ParentNode, "/timeline-step"),
      "javascript:alert(1)"
    );
    expect(contentSection?.textContent).toContain("Use a relative path, hash, or full URL.");

    clickButtonByText(contentSection as ParentNode, "Down", 0);
    clickButtonByText(contentSection as ParentNode, "Up", 1);
    clickButtonByText(contentSection as ParentNode, "Add step");
    expect(contentSection?.textContent).toContain("5 steps configured");
    expect(latestValue.steps[4]).toEqual(
      expect.objectContaining({ id: "step-5", title: "Step 5" })
    );

    clickButtonByText(contentSection as ParentNode, "Remove", 4);
    expect(latestValue.steps).toHaveLength(4);
    expect(contentSection?.textContent).toContain("4 steps configured");

    setCheckboxValue(guidesSection?.querySelector("input[type='checkbox']") ?? undefined, false);
    const solidDashedSelects = findSelectsByOptions(guidesSection as ParentNode, [
      "solid",
      "dashed",
    ]);
    setSelectValue(solidDashedSelects[0], "solid");
    setSelectValue(findSelectByOptions(guidesSection as ParentNode, ["1", "2", "3", "4"]), "4");
    setSelectValue(solidDashedSelects[1], "dashed");

    setSelectValue(findSelectByOptions(markersSection as ParentNode, ["sm", "md", "lg"]), "lg");
    const accentTextInputs = findInputsByPlaceholder(markersSection as ParentNode, "#1d4ed8");
    setInputValue(accentTextInputs[1], "#00aaee");

    const colorInputs = Array.from(
      (colorsSection as ParentNode).querySelectorAll("input[type='color']")
    ) as HTMLInputElement[];
    expect(colorInputs[0]?.value).toBe("#e2e8f0");
    expect(colorInputs[1]?.value).toBe("#1d4ed8");
    expect(colorInputs[2]?.value).toBe("#123123");
    expect(colorInputs[3]?.value).toBe("#334155");
    expect(colorInputs[4]?.value).toBe("#ffffff");

    setInputValue(colorInputs[0], "#111111");
    setInputValue(colorInputs[1], "#222222");
    setInputValue(colorInputs[2], "#333333");
    setInputValue(colorInputs[3], "#444444");
    setInputValue(colorInputs[4], "#555555");

    setSelectValue(
      findSelectByOptions(typographySection as ParentNode, ["none", "sm", "base", "lg", "xl"]),
      "xl"
    );
    setSelectValue(
      findSelectByOptions(typographySection as ParentNode, ["none", "xs", "sm", "base", "lg"]),
      "lg"
    );
    setSelectValue(
      findSelectByOptions(typographySection as ParentNode, ["none", "sm", "md", "lg", "xl"]),
      "xl"
    );

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.steps.map((step) => step.title)).toEqual([
      "Map",
      "Plan",
      "Deliver",
      "Launch",
    ]);
    expect(latestValue.steps[0]).toEqual(
      expect.objectContaining({
        id: "alpha",
        title: "Map",
        description: "Align stakeholders",
        date: "2026-05-12",
        dateLabel: "May 12, 2026",
        status: "current",
        icon: "🧭",
        cta: expect.objectContaining({
          label: "Open",
          href: "javascript:alert(1)",
        }),
      })
    );
    expect(latestValue.layout).toEqual(
      expect.objectContaining({
        orientation: "vertical",
        labelPosition: "bottom",
        align: "end",
        spacing: "xl",
      })
    );
    expect(latestValue.guides).toEqual(expect.objectContaining({ enabled: false, style: "solid" }));
    expect(latestValue.style).toEqual(
      expect.objectContaining({
        lineStyle: "dashed",
        thickness: "4",
        markerSize: "lg",
        lineColor: "#111111",
        markerColor: "#222222",
        titleColor: "#333333",
        descriptionColor: "#444444",
        titleSize: "xl",
        descriptionSize: "lg",
      })
    );
    expect(latestValue.background).toEqual({ color: "#555555" });
  } finally {
    view.cleanup();
  }
});

test("Timeline advanced editor covers layout-only controls and payload normalization guard rails", async () => {
  const { TimelineAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/TimelineEditors");

  const onChangeSpy = vi.fn();
  let latestValue: TimelineData = {
    steps: [
      { id: " ", title: " " },
      { id: "custom", title: "Plan" },
      { id: "custom", title: " " },
      { id: " ", title: "Review" },
      { id: "custom", title: "Ship" },
      { id: "", title: "" },
      { id: "step-7", title: "Scale" },
      { id: "step-7", title: " " },
      { id: "", title: "Ignored after clamp" },
    ],
    guides: {
      enabled: false,
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<TimelineData>(latestValue);

    return (
      <TimelineAdvancedEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant="milestones"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Current steps: 8.");
    expect(findSelectByOptions(view.container, ["3", "4", "5", "6", "7", "8"])).toBeUndefined();

    const layoutSection = findSectionByTitle(view.container, "Layout tokens");
    setSelectValue(
      findSelectByOptions(layoutSection as ParentNode, ["horizontal", "vertical"]),
      "vertical"
    );
    setSelectValue(findSelectByOptions(layoutSection as ParentNode, ["top", "bottom"]), "bottom");
    setSelectValue(
      findSelectByOptions(layoutSection as ParentNode, ["start", "center", "end"]),
      "start"
    );

    clickButtonByText(view.container, "Normalize timeline payload");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.mode).toBe("axis");
    expect(latestValue.steps).toHaveLength(8);
    expect(latestValue.steps.map((step) => step.id)).toEqual([
      "step-1",
      "custom",
      "step-2",
      "step-4",
      "step-3",
      "step-6",
      "step-7",
      "step-5",
    ]);
    expect(latestValue.steps.map((step) => step.title)).toEqual([
      "Discovery",
      "Plan",
      "Build",
      "Review",
      "Ship",
      "Step 6",
      "Scale",
      "Step 8",
    ]);
    expect(latestValue.layout).toEqual({
      orientation: "vertical",
      align: "start",
      spacing: "md",
      labelPosition: "bottom",
    });
    expect(latestValue.guides).toEqual({
      enabled: false,
      style: "dashed",
    });
  } finally {
    view.cleanup();
  }
});
