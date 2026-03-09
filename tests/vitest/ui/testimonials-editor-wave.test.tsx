// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { TestimonialsData } from "../../../core/widgets/core/testimonials";

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
    SelectTrigger: () => null,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
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

const clickButton = (element: Element | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  act(() => {
    element.click();
  });
};

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareasByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).filter(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  );

const findButtonsByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).filter((button) =>
    button.textContent?.includes(text)
  );

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("Testimonials editors cover variant changes, content edits, ordering, colors, and advanced normalization", async () => {
  const {
    TestimonialsAdvancedEditor,
    TestimonialsVisualEditor,
    TestimonialsWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/TestimonialsEditors");

  const onChangeSpy = vi.fn();
  let latestValue: TestimonialsData = {
    testimonials: [
      {
        id: "same",
        quote: "",
        author: "",
        rating: 9,
      },
      {
        id: "same",
        quote: "Second quote",
        author: "Second author",
        rating: -1,
      },
    ],
  };
  let currentVariant = "grid";

  const Harness = () => {
    const [value, setValue] = useState<TestimonialsData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <>
        <TestimonialsWizardEditor
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
        <TestimonialsVisualEditor
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
        <TestimonialsAdvancedEditor
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
    expect(view.container.textContent).toContain("Testimonials style");
    expect(view.container.textContent).toContain("Raw payload snapshot");

    const variantSelect = findSelectsByOptions(view.container, [
      "grid",
      "spotlight",
      "slider-static",
    ])[0];
    setSelectValue(variantSelect, "spotlight");
    expect(currentVariant).toBe("spotlight");

    const countSelect = findSelectsByOptions(view.container, [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ])[0];
    setSelectValue(countSelect, "4");
    expect(latestValue.testimonials).toHaveLength(4);

    setInputValue(
      findInputsByPlaceholder(view.container, "Trusted by teams that ship fast")[0],
      "Teams trust this product"
    );
    setTextareaValue(
      findTextareasByPlaceholder(view.container, "Customer quote")[0],
      "We shipped faster with fewer handoffs."
    );
    setInputValue(findInputsByPlaceholder(view.container, "Author name")[0], "Alice");
    setInputValue(findInputsByPlaceholder(view.container, "Role or position")[0], "Founder");
    setInputValue(
      findInputsByPlaceholder(view.container, "https://cdn.example.com/avatar.jpg")[0],
      "https://cdn.example.com/alice.jpg"
    );
    setInputValue(findInputsByPlaceholder(view.container, "Acme Studio")[0], "North Labs");

    const ratingSelect = findSelectsByOptions(view.container, ["0", "1", "2", "3", "4", "5"])[0];
    setSelectValue(ratingSelect, "4");

    clickButton(findButtonsByText(view.container, "Add testimonial")[0]);
    expect(latestValue.testimonials).toHaveLength(5);

    clickButton(findButtonsByText(view.container, "Move down")[0]);
    clickButton(findButtonsByText(view.container, "Remove").at(-1));
    expect(latestValue.testimonials).toHaveLength(4);

    setInputValue(findInputsByPlaceholder(view.container, "var(--color-bg)")[0], "#111111");
    setInputValue(findInputsByPlaceholder(view.container, "var(--color-border)")[0], "#222222");
    setInputValue(
      findInputsByPlaceholder(view.container, "var(--color-text)")[0],
      "#f3f4f6"
    );
    setInputValue(
      findInputsByPlaceholder(view.container, "var(--color-primary)")[0],
      "#2563eb"
    );

    const spacingSelect = findSelectsByOptions(view.container, ["sm", "md", "lg"])[0];
    setSelectValue(spacingSelect, "lg");

    clickButton(findButtonsByText(view.container, "Normalize list to variant baseline")[0]);
    clickButton(findButtonsByText(view.container, "Normalize full payload")[0]);

    expect(onChangeSpy).toHaveBeenCalled();
    expect(currentVariant).toBe("spotlight");
    expect(latestValue.header?.title).toBe("Teams trust this product");
    expect(latestValue.testimonials).toHaveLength(2);
    expect(latestValue.testimonials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          quote: "We shipped faster with fewer handoffs.",
          author: "Alice",
          role: "Founder",
          avatar: "https://cdn.example.com/alice.jpg",
          rating: 4,
          sourceLabel: "North Labs",
        }),
      ])
    );
    expect(latestValue.style).toMatchObject({
      cardSurface: "#111111",
      cardBorder: "#222222",
      textColor: "#f3f4f6",
      accentColor: "#2563eb",
      spacing: "lg",
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"title": "Teams trust this product"');
    expect(snapshot?.textContent).toContain('"spacing": "lg"');
    expect(snapshot?.textContent).toContain('"rating": 4');
    expect(snapshot?.textContent).toContain('"sourceLabel": "North Labs"');
  } finally {
    view.cleanup();
  }
});
