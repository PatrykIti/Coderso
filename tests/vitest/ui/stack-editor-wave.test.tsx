// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { StackData } from "../../../core/widgets/core/stack";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
    Array.from(section.querySelectorAll("p, h3")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );

const findByDataAttr = (container: ParentNode, attr: string, value: string) =>
  container.querySelector(`[${attr}="${value}"]`);

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.doUnmock("../../../core/widgets/core/stack");
  vi.resetModules();
});

test("StackWizardEditor keeps setup to the preset and slot guidance", async () => {
  const { StackWizardEditor } = await import("../../../core/admin/ui/widgets/editors/StackEditors");

  const onChangeSpy = vi.fn();
  let latestValue: StackData = {
    direction: {
      desktop: "bad" as never,
      tablet: "bad" as never,
      mobile: "bad" as never,
    },
    gap: {
      desktop: "99" as never,
      tablet: "99" as never,
      mobile: "99" as never,
    },
    align: "bad" as never,
    justify: "bad" as never,
    wrap: false,
  };
  let currentVariant = "legacy";

  const Harness = () => {
    const [value, setValue] = useState<StackData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <StackWizardEditor
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
    expect(view.container.textContent).toContain(
      "Visual owns breakpoint spacing, alignment, distribution, and wrapping after setup."
    );
    expect(view.container.textContent).toContain("`content` slot");
    expect(view.container.textContent).not.toContain("Gap on all breakpoints");
    expect(view.container.textContent).not.toContain("Align on all breakpoints");
    expect(view.container.textContent).not.toContain("Justify on all breakpoints");
    expect(view.container.querySelector('[data-widget-control-path="variant"]')).toBeTruthy();

    const selects = Array.from(view.container.querySelectorAll("select"));
    expect(selects).toHaveLength(1);
    expect((selects[0] as HTMLSelectElement | null | undefined)?.value).toBe("vertical");

    setSelectValue(selects[0], "responsive");
    expect(currentVariant).toBe("responsive");
    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.direction).toMatchObject({
      desktop: "row",
      tablet: "row",
      mobile: "column",
    });
    expect(latestValue.gap).toMatchObject({
      desktop: "6",
      tablet: "6",
      mobile: "4",
    });
    expect(latestValue.align).toEqual({
      desktop: "stretch",
      tablet: "stretch",
      mobile: "stretch",
    });
    expect(latestValue.justify).toEqual({
      desktop: "start",
      tablet: "start",
      mobile: "start",
    });
    expect(view.container.textContent).toContain(
      "Picking a preset sets the starting desktop, tablet, and mobile flow directions."
    );
  } finally {
    view.cleanup();
  }
});

test("StackVisualEditor renders miniatures and writes responsive direction, axis, and wrap", async () => {
  const { StackVisualEditor } = await import("../../../core/admin/ui/widgets/editors/StackEditors");

  const onChangeSpy = vi.fn();
  let latestValue: StackData = {};
  let currentVariant = "vertical";

  const Harness = () => {
    const [value, setValue] = useState<StackData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <StackVisualEditor
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
    expect(findByDataAttr(view.container, "data-stack-variant-miniature", "vertical")).toBeTruthy();
    expect(
      findByDataAttr(view.container, "data-stack-variant-miniature", "horizontal")
    ).toBeTruthy();
    expect(
      findByDataAttr(view.container, "data-stack-variant-miniature", "responsive")
    ).toBeTruthy();
    expect(view.container.textContent).toContain(
      "Picking a preset updates the saved desktop, tablet, and mobile flow directions."
    );

    clickByText(view.container, "Horizontal");
    expect(currentVariant).toBe("horizontal");

    for (const [breakpoint, directionValue, gapValue] of [
      ["desktop", "row", "none"],
      ["tablet", "row", "6"],
      ["mobile", "column", "4"],
    ] as const) {
      const card = findByDataAttr(view.container, "data-stack-direction-card", breakpoint);
      const selects = Array.from((card as ParentNode).querySelectorAll("select"));
      setSelectValue(selects[0], directionValue);
      setSelectValue(selects[1], gapValue);
    }

    for (const [breakpoint, alignValue, justifyValue, wrapValue] of [
      ["desktop", "baseline", "evenly", true],
      ["tablet", "center", "around", false],
      ["mobile", "stretch", "start", true],
    ] as const) {
      const card = findByDataAttr(view.container, "data-stack-axis-card", breakpoint);
      const selects = Array.from((card as ParentNode).querySelectorAll("select"));
      const toggle = (card as ParentNode).querySelector('input[type="checkbox"]');
      setSelectValue(selects[0], alignValue);
      setSelectValue(selects[1], justifyValue);
      setCheckboxValue(toggle, wrapValue);
    }

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.direction).toMatchObject({
      desktop: "row",
      tablet: "row",
      mobile: "column",
    });
    expect(latestValue.gap).toMatchObject({
      desktop: "none",
      tablet: "6",
      mobile: "4",
    });
    expect(latestValue.align).toEqual({
      desktop: "baseline",
      tablet: "center",
      mobile: "stretch",
    });
    expect(latestValue.justify).toEqual({
      desktop: "evenly",
      tablet: "around",
      mobile: "start",
    });
    expect(latestValue.wrap).toEqual({
      desktop: true,
      tablet: false,
      mobile: true,
    });
    expect(view.container.textContent).toContain("Stack keeps one fixed content slot");
  } finally {
    view.cleanup();
  }
});

test("StackAdvancedEditor shows read-only summaries without hidden mutators or raw payload", async () => {
  const { StackAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/StackEditors");

  const onChangeSpy = vi.fn();
  const value: StackData = {
    direction: {
      desktop: "column",
      tablet: "column",
      mobile: "column",
    },
    gap: {
      desktop: "6",
      tablet: "6",
      mobile: "4",
    },
    align: "center",
    justify: "between",
    wrap: false,
  };

  const Harness = () => {
    return <StackAdvancedEditor value={value} onChange={onChangeSpy} variant="responsive" />;
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Runtime stack summary");
    expect(view.container.textContent).toContain("Support summary");
    expect(view.container.textContent).toContain("Stack vertically");
    expect(view.container.textContent).toContain("Balanced desktop spacing");
    expect(view.container.textContent).toContain(
      "Legacy single-value axis settings normalize for desktop, tablet, and mobile."
    );
    expect(view.container.textContent).toContain(
      "Use Visual to adjust flow, spacing, alignment, distribution, and wrapping."
    );
    expect(view.container.textContent).not.toContain("Technical flow tokens");
    expect(view.container.textContent).not.toContain("Raw payload snapshot");
    expect(view.container.querySelectorAll("select")).toHaveLength(0);
    expect(view.container.querySelectorAll("button")).toHaveLength(0);
    expect(view.container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(view.container.querySelector("pre")).toBeNull();
    expect(findByDataAttr(view.container, "data-stack-direction-card", "desktop")).toBeNull();
    expect(findByDataAttr(view.container, "data-stack-axis-card", "desktop")).toBeNull();
    expect(onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("Stack editors fall back to safe defaults when normalization is partial and variant handlers are absent", async () => {
  vi.doMock("../../../core/widgets/core/stack", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/stack")>(
      "../../../core/widgets/core/stack"
    );

    return {
      ...actual,
      normalizeStackData: vi.fn(() => ({
        direction: undefined,
        gap: undefined,
        align: undefined,
        justify: undefined,
        wrap: undefined,
      })),
    };
  });

  const { StackAdvancedEditor, StackVisualEditor, StackWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/StackEditors");

  const onChangeSpy = vi.fn();
  const view = mount(
    <>
      <StackWizardEditor value={{}} onChange={onChangeSpy} variant="legacy" />
      <StackVisualEditor value={{}} onChange={onChangeSpy} variant="legacy" />
      <StackAdvancedEditor value={{}} onChange={onChangeSpy} variant="legacy" />
    </>
  );

  try {
    const wizardPreset = findSelectsByOptions(view.container, [
      "vertical",
      "horizontal",
      "responsive",
    ])[0];
    expect((wizardPreset as HTMLSelectElement | null | undefined)?.value).toBe("vertical");
    expect(() => setSelectValue(wizardPreset, "responsive")).not.toThrow();
    expect((wizardPreset as HTMLSelectElement | null | undefined)?.value).toBe("vertical");

    const wizardSection = findSectionByTitle(view.container, "Stack quick start");
    expect(wizardSection?.querySelectorAll("select")).toHaveLength(1);

    expect(findByDataAttr(view.container, "data-stack-variant-miniature", "vertical")).toBeTruthy();
    expect(
      findByDataAttr(view.container, "data-stack-variant-miniature", "horizontal")
    ).toBeTruthy();
    expect(
      findByDataAttr(view.container, "data-stack-variant-miniature", "responsive")
    ).toBeTruthy();

    expect(() => clickByText(view.container, "Responsive")).not.toThrow();

    const visualSection = findSectionByTitle(view.container, "Responsive alignment and wrap");
    const desktopAxisCard = findByDataAttr(
      visualSection as ParentNode,
      "data-stack-axis-card",
      "desktop"
    );
    const desktopAxisSelects = Array.from(
      (desktopAxisCard as ParentNode).querySelectorAll("select")
    );
    const desktopWrapToggle = (desktopAxisCard as ParentNode).querySelector(
      'input[type="checkbox"]'
    );
    expect((desktopAxisSelects[0] as HTMLSelectElement | null | undefined)?.value).toBe("stretch");
    expect((desktopAxisSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("start");
    expect((desktopWrapToggle as HTMLInputElement | null | undefined)?.checked).toBe(false);

    const advancedSection = findSectionByTitle(view.container, "Runtime stack summary");
    expect(advancedSection?.textContent).toContain("Stack vertically");
    expect(advancedSection?.querySelectorAll("select")).toHaveLength(0);
    expect(
      findByDataAttr(advancedSection as ParentNode, "data-stack-direction-card", "desktop")
    ).toBeNull();
    expect(view.container.querySelector("pre")).toBeNull();
    expect(onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
