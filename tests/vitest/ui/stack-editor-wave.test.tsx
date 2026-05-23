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
    Array.from(section.querySelectorAll("p")).some(
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

test("StackWizardEditor writes variant, gap, align, and justify across breakpoints", async () => {
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
      "Writes desktop, tablet, and mobile spacing together."
    );
    expect(view.container.textContent).toContain(
      "Writes desktop, tablet, and mobile alignment together."
    );
    expect(view.container.textContent).toContain("`content` slot");

    const selects = Array.from(view.container.querySelectorAll("select"));
    expect((selects[0] as HTMLSelectElement | null | undefined)?.value).toBe("vertical");
    const gapOptionValues = Array.from((selects[2] as HTMLSelectElement).options).map(
      (option) => option.value
    );
    expect(gapOptionValues).toContain("none");
    expect(gapOptionValues).not.toContain("0");

    setSelectValue(selects[0], "responsive");
    expect(currentVariant).toBe("responsive");

    setSelectValue(selects[1], "row");
    setSelectValue(selects[2], "8");
    setSelectValue(selects[3], "baseline");
    setSelectValue(selects[4], "around");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.direction?.mobile).toBe("row");
    expect(latestValue.gap).toMatchObject({
      desktop: "8",
      tablet: "8",
      mobile: "8",
    });
    expect(latestValue.align).toEqual({
      desktop: "baseline",
      tablet: "baseline",
      mobile: "baseline",
    });
    expect(latestValue.justify).toEqual({
      desktop: "around",
      tablet: "around",
      mobile: "around",
    });
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

test("StackAdvancedEditor upgrades legacy scalar axis values and updates the snapshot", async () => {
  const { StackAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/StackEditors");

  let latestValue: StackData = {
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
    const [value, setValue] = useState<StackData>(latestValue);

    return (
      <StackAdvancedEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="responsive"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const desktopDirectionCard = findByDataAttr(
      view.container,
      "data-stack-direction-card",
      "desktop"
    );
    const desktopDirectionSelects = Array.from(
      (desktopDirectionCard as ParentNode).querySelectorAll("select")
    );
    setSelectValue(desktopDirectionSelects[0], "row");
    setSelectValue(desktopDirectionSelects[1], "10");

    const desktopAxisCard = findByDataAttr(view.container, "data-stack-axis-card", "desktop");
    const desktopAxisSelects = Array.from(
      (desktopAxisCard as ParentNode).querySelectorAll("select")
    );
    const desktopWrapToggle = (desktopAxisCard as ParentNode).querySelector(
      'input[type="checkbox"]'
    );
    setSelectValue(desktopAxisSelects[0], "baseline");
    setSelectValue(desktopAxisSelects[1], "evenly");
    setCheckboxValue(desktopWrapToggle, true);

    const mobileAxisCard = findByDataAttr(view.container, "data-stack-axis-card", "mobile");
    const mobileAxisSelects = Array.from((mobileAxisCard as ParentNode).querySelectorAll("select"));
    setSelectValue(mobileAxisSelects[0], "stretch");
    setSelectValue(mobileAxisSelects[1], "start");

    expect(latestValue.direction).toMatchObject({
      desktop: "row",
      tablet: "column",
      mobile: "column",
    });
    expect(latestValue.gap).toMatchObject({
      desktop: "10",
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
      tablet: "between",
      mobile: "start",
    });
    expect(latestValue.wrap).toEqual({
      desktop: true,
      tablet: false,
      mobile: false,
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"align": {');
    expect(snapshot?.textContent).toContain('"desktop": "baseline"');
    expect(snapshot?.textContent).toContain('"justify": {');
    expect(snapshot?.textContent).toContain('"wrap": {');
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

    const wizardSelects = Array.from(view.container.querySelectorAll("select"));
    expect((wizardSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((wizardSelects[2] as HTMLSelectElement | null | undefined)?.value).toBe("4");
    expect((wizardSelects[3] as HTMLSelectElement | null | undefined)?.value).toBe("stretch");
    expect((wizardSelects[4] as HTMLSelectElement | null | undefined)?.value).toBe("start");

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

    const advancedSection = findSectionByTitle(view.container, "Technical flow tokens");
    const advancedDirectionCard = findByDataAttr(
      advancedSection as ParentNode,
      "data-stack-direction-card",
      "desktop"
    );
    const advancedDirectionSelects = Array.from(
      (advancedDirectionCard as ParentNode).querySelectorAll("select")
    );
    expect((advancedDirectionSelects[0] as HTMLSelectElement | null | undefined)?.value).toBe(
      "column"
    );
    expect((advancedDirectionSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("6");

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent?.trim()).toBe("{}");
    expect(onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
