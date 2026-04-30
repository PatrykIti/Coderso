// @vitest-environment happy-dom

import React, { act, useState } from "react";
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

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setCheckboxValue = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  act(() => {
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
  act(() => {
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

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.doUnmock("../../../core/widgets/core/stack");
  vi.resetModules();
});

test("Stack editors cover variant changes, responsive direction tokens, wrap, and advanced snapshot updates", async () => {
  const { StackAdvancedEditor, StackVisualEditor, StackWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/StackEditors");

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
      <>
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
        <StackAdvancedEditor
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
    const wizardPreset = findSelectsByOptions(view.container, [
      "vertical",
      "horizontal",
      "responsive",
    ])[0];
    expect((wizardPreset as HTMLSelectElement | null | undefined)?.value).toBe("vertical");
    setSelectValue(wizardPreset, "responsive");
    expect(currentVariant).toBe("responsive");

    const wizardSelects = Array.from(view.container.querySelectorAll("select"));
    expect(
      Array.from((wizardSelects[2] as HTMLSelectElement).options).map((option) => option.value)
    ).toContain("none");
    setSelectValue(wizardSelects[1], "row");
    setSelectValue(wizardSelects[2], "8");
    expect(latestValue.direction?.mobile).toBe("row");
    expect(latestValue.gap).toMatchObject({
      mobile: "8",
      tablet: "8",
      desktop: "8",
    });

    clickByText(view.container, "Horizontal");
    expect(currentVariant).toBe("horizontal");

    const directionSection = findSectionByTitle(view.container, "Responsive direction");
    const directionSelects = Array.from(
      (directionSection as ParentNode).querySelectorAll("select")
    );
    setSelectValue(directionSelects[0], "row");
    setSelectValue(directionSelects[1], "3");
    setSelectValue(directionSelects[2], "row");
    setSelectValue(directionSelects[3], "5");
    setSelectValue(directionSelects[4], "column");
    setSelectValue(directionSelects[5], "2");

    const spacingSection = findSectionByTitle(view.container, "Spacing and distribution");
    const spacingSelects = Array.from((spacingSection as ParentNode).querySelectorAll("select"));
    setSelectValue(spacingSelects[0], "center");
    setSelectValue(spacingSelects[1], "between");

    const wrapSection = findSectionByTitle(view.container, "Wrapping and slot behavior");
    const wrapToggle = Array.from(
      (wrapSection as ParentNode).querySelectorAll('input[type="checkbox"]')
    )[0];
    setCheckboxValue(wrapToggle, true);

    const advancedSection = findSectionByTitle(view.container, "Technical flow tokens");
    const advancedSelects = Array.from((advancedSection as ParentNode).querySelectorAll("select"));
    for (const index of [1, 3, 5]) {
      expect(
        Array.from((advancedSelects[index] as HTMLSelectElement).options).map(
          (option) => option.value
        )
      ).toContain("none");
    }
    setSelectValue(advancedSelects[0], "column");
    setSelectValue(advancedSelects[1], "10");
    setSelectValue(advancedSelects[2], "row");
    setSelectValue(advancedSelects[3], "6");
    setSelectValue(advancedSelects[4], "row");
    setSelectValue(advancedSelects[5], "4");
    setSelectValue(advancedSelects[6], "end");
    setSelectValue(advancedSelects[7], "center");
    const advancedWrapToggle = Array.from(
      (advancedSection as ParentNode).querySelectorAll('input[type="checkbox"]')
    )[0];
    setCheckboxValue(advancedWrapToggle, false);

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue).toMatchObject({
      direction: {
        desktop: "column",
        tablet: "row",
        mobile: "row",
      },
      gap: {
        desktop: "10",
        tablet: "6",
        mobile: "4",
      },
      align: "end",
      justify: "center",
      wrap: false,
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"desktop": "column"');
    expect(snapshot?.textContent).toContain('"tablet": "row"');
    expect(snapshot?.textContent).toContain('"mobile": "row"');
    expect(snapshot?.textContent).toContain('"justify": "center"');
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

    const variantButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (candidate) =>
        candidate.textContent?.includes("Vertical") ||
        candidate.textContent?.includes("Horizontal") ||
        candidate.textContent?.includes("Responsive")
    );
    expect(variantButtons[0]?.textContent).toContain("Selected");
    expect(variantButtons[1]?.textContent).toContain("Pick");
    expect(variantButtons[2]?.textContent).toContain("Pick");

    expect(() => clickByText(view.container, "Responsive")).not.toThrow();
    expect(variantButtons[0]?.textContent).toContain("Selected");
    expect(variantButtons[2]?.textContent).toContain("Pick");

    const directionSection = findSectionByTitle(view.container, "Responsive direction");
    const directionSelects = Array.from(
      (directionSection as ParentNode).querySelectorAll("select")
    );
    expect((directionSelects[0] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((directionSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("6");
    expect((directionSelects[2] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((directionSelects[3] as HTMLSelectElement | null | undefined)?.value).toBe("6");
    expect((directionSelects[4] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((directionSelects[5] as HTMLSelectElement | null | undefined)?.value).toBe("4");

    const spacingSection = findSectionByTitle(view.container, "Spacing and distribution");
    const spacingSelects = Array.from((spacingSection as ParentNode).querySelectorAll("select"));
    expect((spacingSelects[0] as HTMLSelectElement | null | undefined)?.value).toBe("stretch");
    expect((spacingSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("start");

    const wrapSection = findSectionByTitle(view.container, "Wrapping and slot behavior");
    const wrapToggle = Array.from(
      (wrapSection as ParentNode).querySelectorAll('input[type="checkbox"]')
    )[0];
    expect((wrapToggle as HTMLInputElement | null | undefined)?.checked).toBe(false);

    const advancedSection = findSectionByTitle(view.container, "Technical flow tokens");
    const advancedSelects = Array.from((advancedSection as ParentNode).querySelectorAll("select"));
    expect((advancedSelects[0] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((advancedSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("6");
    expect((advancedSelects[2] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((advancedSelects[3] as HTMLSelectElement | null | undefined)?.value).toBe("6");
    expect((advancedSelects[4] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((advancedSelects[5] as HTMLSelectElement | null | undefined)?.value).toBe("4");
    expect((advancedSelects[6] as HTMLSelectElement | null | undefined)?.value).toBe("stretch");
    expect((advancedSelects[7] as HTMLSelectElement | null | undefined)?.value).toBe("start");

    const advancedWrapToggle = Array.from(
      (advancedSection as ParentNode).querySelectorAll('input[type="checkbox"]')
    )[0];
    expect((advancedWrapToggle as HTMLInputElement | null | undefined)?.checked).toBe(false);

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent?.trim()).toBe("{}");
    expect(onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("Stack editors apply per-breakpoint defaults when normalized direction and gap objects are sparse", async () => {
  vi.doMock("../../../core/widgets/core/stack", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/stack")>(
      "../../../core/widgets/core/stack"
    );

    return {
      ...actual,
      normalizeStackData: vi.fn(() => ({
        direction: {},
        gap: {},
        align: "center",
        justify: "between",
        wrap: true,
      })),
    };
  });

  const { StackAdvancedEditor, StackVisualEditor, StackWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/StackEditors");

  const view = mount(
    <>
      <StackWizardEditor value={{}} onChange={() => undefined} variant="vertical" />
      <StackVisualEditor
        value={{}}
        onChange={() => undefined}
        variant="vertical"
        onVariantChange={() => undefined}
      />
      <StackAdvancedEditor value={{}} onChange={() => undefined} variant="vertical" />
    </>
  );

  try {
    const wizardSelects = Array.from(view.container.querySelectorAll("select"));
    expect((wizardSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((wizardSelects[2] as HTMLSelectElement | null | undefined)?.value).toBe("4");

    const directionSection = findSectionByTitle(view.container, "Responsive direction");
    const directionSelects = Array.from(
      (directionSection as ParentNode).querySelectorAll("select")
    );
    expect((directionSelects[0] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((directionSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("6");
    expect((directionSelects[2] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((directionSelects[3] as HTMLSelectElement | null | undefined)?.value).toBe("6");
    expect((directionSelects[4] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((directionSelects[5] as HTMLSelectElement | null | undefined)?.value).toBe("4");

    const spacingSection = findSectionByTitle(view.container, "Spacing and distribution");
    const spacingSelects = Array.from((spacingSection as ParentNode).querySelectorAll("select"));
    expect((spacingSelects[0] as HTMLSelectElement | null | undefined)?.value).toBe("center");
    expect((spacingSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("between");

    const wrapSection = findSectionByTitle(view.container, "Wrapping and slot behavior");
    const wrapToggle = Array.from(
      (wrapSection as ParentNode).querySelectorAll('input[type="checkbox"]')
    )[0];
    expect((wrapToggle as HTMLInputElement | null | undefined)?.checked).toBe(true);

    const advancedSection = findSectionByTitle(view.container, "Technical flow tokens");
    const advancedSelects = Array.from((advancedSection as ParentNode).querySelectorAll("select"));
    expect((advancedSelects[0] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((advancedSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("6");
    expect((advancedSelects[2] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((advancedSelects[3] as HTMLSelectElement | null | undefined)?.value).toBe("6");
    expect((advancedSelects[4] as HTMLSelectElement | null | undefined)?.value).toBe("column");
    expect((advancedSelects[5] as HTMLSelectElement | null | undefined)?.value).toBe("4");
    expect((advancedSelects[6] as HTMLSelectElement | null | undefined)?.value).toBe("center");
    expect((advancedSelects[7] as HTMLSelectElement | null | undefined)?.value).toBe("between");

    const advancedWrapToggle = Array.from(
      (advancedSection as ParentNode).querySelectorAll('input[type="checkbox"]')
    )[0];
    expect((advancedWrapToggle as HTMLInputElement | null | undefined)?.checked).toBe(true);

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"direction": {}');
    expect(snapshot?.textContent).toContain('"gap": {}');
    expect(snapshot?.textContent).toContain('"wrap": true');
  } finally {
    view.cleanup();
  }
});
