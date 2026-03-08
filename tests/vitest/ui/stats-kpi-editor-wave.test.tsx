// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { StatsKpiData } from "../../../core/widgets/core/statsKpi";

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
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setTextareaValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const toggleCheckbox = (element: Element | undefined) => {
  if (!(element instanceof HTMLInputElement)) return;
  act(() => {
    element.checked = !element.checked;
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

afterEach(() => {
  vi.restoreAllMocks();
});

test("StatsKpi editors cover variant, count, item editing, layout/style controls, normalize, and reset", async () => {
  const {
    StatsKpiAdvancedEditor,
    StatsKpiVisualEditor,
    StatsKpiWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/StatsKpiEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

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
    expect(view.container.textContent).toContain("Stats layout");
    expect(view.container.textContent).toContain("Metrics content and order");
    expect(view.container.textContent).toContain("Raw payload snapshot");

    act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["cards", "inline", "split-highlight"])[0],
        "split-highlight"
      );
      setSelectValue(
        findSelectsByOptions(view.container, ["1", "2", "3", "4", "5", "6"])[0],
        "3"
      );
      setInputValue(findInputByPlaceholder(view.container, "Metric 1 value"), "120+");
      setInputValue(findInputByPlaceholder(view.container, "Proof in numbers"), "Numbers");
      setTextareaValue(
        view.container.querySelector("textarea[placeholder='Show key performance metrics and outcomes.']"),
        "Metrics description"
      );
    });

    clickByText(view.container, "Add metric");

    act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Projects launched"), "Clients won");
      setTextareaValue(
        view.container.querySelector("textarea[placeholder='Optional supporting context.']"),
        "Updated description"
      );
      setInputValue(findInputByPlaceholder(view.container, "🚀"), "⭐");
    });

    const colorInputs = Array.from(
      view.container.querySelectorAll("input[placeholder='var(--color-text)']")
    ) as HTMLInputElement[];
    act(() => {
      setInputValue(colorInputs[0], "#123456");
      setInputValue(colorInputs[1], "#654321");
      setSelectValue(findSelectsByOptions(view.container, ["start", "center", "end"])[0], "end");
      setSelectValue(findSelectsByOptions(view.container, ["sm", "md", "lg"])[0], "lg");
    });

    const switches = Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    toggleCheckbox(switches[0]);

    clickByText(view.container, "Move down");
    clickByText(view.container, "Remove");

    const latest = onChangeSpy.mock.lastCall?.[0];
    expect(latest).toEqual(
      expect.objectContaining({
        header: expect.objectContaining({
          title: "Numbers",
          description: "Metrics description",
        }),
        style: expect.objectContaining({
          alignment: "end",
          spacing: "lg",
          valueColor: "#123456",
          labelColor: "#654321",
          divider: true,
        }),
      })
    );
    expect(latest.items[0]).toEqual(
      expect.objectContaining({
        value: "120+",
        label: "Clients won",
        description: "Updated description",
        icon: "⭐",
      })
    );
    expect(onVariantChangeSpy).toHaveBeenCalledWith("split-highlight");

    clickByText(view.container, "Normalize now");
    expect(onChangeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ style: expect.any(Object) }));

    clickByText(view.container, "Reset to defaults");
    const resetPayload = onChangeSpy.mock.lastCall?.[0];
    expect(resetPayload.header?.title).toBe("Proof in numbers");
  } finally {
    view.cleanup();
  }
});
