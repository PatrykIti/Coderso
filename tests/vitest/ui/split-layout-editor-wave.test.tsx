// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { SplitLayoutData } from "../../../core/widgets/core/splitLayout";

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

const setCheckboxValue = (element: Element | undefined, checked: boolean) => {
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
});

test("SplitLayout editors cover variant changes, mobile behavior, spacing, and advanced token edits", async () => {
  const {
    SplitLayoutAdvancedEditor,
    SplitLayoutVisualEditor,
    SplitLayoutWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/SplitLayoutEditors");

  const onChangeSpy = vi.fn();
  let latestValue: SplitLayoutData = {
    ratio: {
      desktop: "bad" as never,
      tablet: "bad" as never,
    },
    collapseMobile: "bad" as never,
    reverseOnMobile: false,
    gap: "99" as never,
    verticalAlign: "bad" as never,
  };
  let currentVariant = "legacy";

  const Harness = () => {
    const [value, setValue] = useState<SplitLayoutData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <>
        <SplitLayoutWizardEditor
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
        <SplitLayoutVisualEditor
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
        <SplitLayoutAdvancedEditor
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
    const presetSelect = findSelectsByOptions(view.container, ["50-50", "40-60", "60-40"])[0];
    expect((presetSelect as HTMLSelectElement | undefined)?.value).toBe("50-50");
    setSelectValue(presetSelect, "60-40");
    expect(currentVariant).toBe("60-40");

    const collapseSelect = findSelectsByOptions(view.container, ["stack", "keep"])[0];
    const gapSelect = findSelectsByOptions(view.container, ["0", "1", "2", "3", "4", "5", "6", "8", "10", "12"])[0];
    setSelectValue(collapseSelect, "keep");
    setSelectValue(gapSelect, "8");

    expect(latestValue).toMatchObject({
      collapseMobile: "keep",
      gap: "8",
    });

    clickByText(view.container, "40 / 60");
    expect(currentVariant).toBe("40-60");

    const ratioSection = findSectionByTitle(view.container, "Variant and pane ratio");
    const ratioSelects = Array.from((ratioSection as ParentNode).querySelectorAll("select"));
    setSelectValue(ratioSelects[0], "50-50");
    setSelectValue(ratioSelects[1], "60-40");

    const mobileSection = findSectionByTitle(view.container, "Mobile collapse behavior");
    const reverseToggle = Array.from((mobileSection as ParentNode).querySelectorAll('input[type="checkbox"]'))[0];
    setCheckboxValue(reverseToggle, true);

    const spacingSection = findSectionByTitle(view.container, "Spacing and vertical alignment");
    const spacingSelects = Array.from((spacingSection as ParentNode).querySelectorAll("select"));
    setSelectValue(spacingSelects[0], "12");
    setSelectValue(spacingSelects[1], "center");

    const advancedSection = findSectionByTitle(view.container, "Technical split tokens");
    const advancedSelects = Array.from((advancedSection as ParentNode).querySelectorAll("select"));
    setSelectValue(advancedSelects[0], "40-60");
    setSelectValue(advancedSelects[1], "50-50");
    setSelectValue(advancedSelects[2], "stack");
    setSelectValue(advancedSelects[3], "4");
    setSelectValue(advancedSelects[4], "end");
    const advancedToggle = Array.from((advancedSection as ParentNode).querySelectorAll('input[type="checkbox"]'))[0];
    setCheckboxValue(advancedToggle, false);

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue).toMatchObject({
      ratio: {
        desktop: "40-60",
        tablet: "50-50",
      },
      collapseMobile: "stack",
      reverseOnMobile: false,
      gap: "4",
      verticalAlign: "end",
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"desktop": "40-60"');
    expect(snapshot?.textContent).toContain('"tablet": "50-50"');
    expect(snapshot?.textContent).toContain('"collapseMobile": "stack"');
    expect(snapshot?.textContent).toContain('"verticalAlign": "end"');
  } finally {
    view.cleanup();
  }
});
