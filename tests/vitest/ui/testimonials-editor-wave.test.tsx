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

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  findInputsByPlaceholder(container, placeholder)[0];

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  findTextareasByPlaceholder(container, placeholder)[0];

const findSelectByOptions = (container: ParentNode, values: string[]) => {
  const select = findSelectsByOptions(container, values)[0];
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select with options ${values.join(", ")}`);
  }
  return select;
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("p")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );

const findColorInputForPlaceholder = (
  container: ParentNode,
  placeholder: string,
  index = 0
) => {
  const textInput = findInputsByPlaceholder(container, placeholder)[index];
  if (!(textInput instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}" (${index})`);
  }
  const colorInput = textInput.parentElement?.querySelector('input[type="color"]');
  if (!(colorInput instanceof HTMLInputElement)) {
    throw new Error(`Missing color input for placeholder "${placeholder}" (${index})`);
  }
  return colorInput;
};

const findButtonsByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).filter((button) =>
    button.textContent?.includes(text)
  );

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const renderEditors = async ({
  initialValue,
  initialVariant = "grid",
  withVariantChange = true,
}: {
  initialValue: TestimonialsData;
  initialVariant?: string;
  withVariantChange?: boolean;
}) => {
  const {
    TestimonialsAdvancedEditor,
    TestimonialsVisualEditor,
    TestimonialsWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/TestimonialsEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState<TestimonialsData>(initialValue);
    const [variant, setVariant] = useState(initialVariant);

    const handleChange = (next: TestimonialsData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    const handleVariantChange = withVariantChange
      ? (next: string) => {
          latestVariant = next;
          onVariantChangeSpy(next);
          setVariant(next);
        }
      : undefined;

    return (
      <>
        <TestimonialsWizardEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
        />
        <TestimonialsVisualEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
        />
        <TestimonialsAdvancedEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
        />
      </>
    );
  };

  return {
    ...mount(<Harness />),
    onChangeSpy,
    onVariantChangeSpy,
    getLatestValue: () => latestValue,
    getLatestVariant: () => latestVariant,
  };
};

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

test("Testimonials editors normalize sparse payloads, preserve token colors, and ignore variant changes without a handler", async () => {
  const view = await renderEditors({
    initialValue: {
      testimonials: [
        {
          id: "same",
          quote: "   ",
          author: "   ",
          rating: Number.POSITIVE_INFINITY,
        },
        {
          id: "same",
          quote: "Second quote",
          author: "Second author",
          rating: -8,
        },
      ],
      style: {
        cardSurface: "surface-token",
        cardBorder: "border-token",
        textColor: "text-token",
        accentColor: "accent-token",
        spacing: "wide" as never,
      },
    },
    initialVariant: "legacy",
    withVariantChange: false,
  });

  try {
    const variantSelect = findSelectByOptions(view.container, [
      "grid",
      "spotlight",
      "slider-static",
    ]);
    expect(variantSelect.value).toBe("grid");

    const variantSection = findSectionByTitle(view.container, "Variant and layout structure");
    if (!(variantSection instanceof HTMLElement)) {
      throw new Error("Missing variant section");
    }

    clickButton(findButtonsByText(variantSection, "Spotlight")[0]);
    setSelectValue(variantSelect, "spotlight");
    expect(view.getLatestVariant()).toBe("legacy");
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();

    const headerSection = findSectionByTitle(view.container, "Header copy");
    if (!(headerSection instanceof HTMLElement)) {
      throw new Error("Missing header section");
    }

    expect(findInputByPlaceholder(headerSection, "Customer stories")?.value).toBe(
      "Customer stories"
    );
    expect(
      findTextareaByPlaceholder(
        headerSection,
        "Use real customer voices to build trust and reduce hesitation."
      )?.value
    ).toBe("Use real customer voices to build trust and reduce hesitation.");

    const contentSection = findSectionByTitle(view.container, "Testimonials content and ratings");
    if (!(contentSection instanceof HTMLElement)) {
      throw new Error("Missing content section");
    }

    expect(findTextareasByPlaceholder(contentSection, "Customer quote")[0]?.value).toBe(
      "We launched our marketing site in two days and kept full control over future edits."
    );
    expect(findInputsByPlaceholder(contentSection, "Author name")[0]?.value).toBe("Customer One");

    const ratingSelects = findSelectsByOptions(contentSection, ["0", "1", "2", "3", "4", "5"]);
    expect(ratingSelects[0]?.value).toBe("5");
    expect(ratingSelects[1]?.value).toBe("0");
    expect(findButtonsByText(contentSection, "Move up")[0]).toHaveProperty("disabled", true);
    expect(findButtonsByText(contentSection, "Move down").at(-1)).toHaveProperty(
      "disabled",
      true
    );
    expect(findButtonsByText(contentSection, "Remove")[0]).toHaveProperty("disabled", true);

    const colorsSection = findSectionByTitle(view.container, "Colors and emphasis");
    if (!(colorsSection instanceof HTMLElement)) {
      throw new Error("Missing colors section");
    }

    expect(findInputByPlaceholder(colorsSection, "var(--color-bg)")?.value).toBe("surface-token");
    expect(findColorInputForPlaceholder(colorsSection, "var(--color-bg)").value).toBe("#ffffff");
    expect(findInputByPlaceholder(colorsSection, "var(--color-border)")?.value).toBe(
      "border-token"
    );
    expect(findColorInputForPlaceholder(colorsSection, "var(--color-border)").value).toBe(
      "#e2e8f0"
    );
    expect(findInputByPlaceholder(colorsSection, "var(--color-text)")?.value).toBe("text-token");
    expect(findColorInputForPlaceholder(colorsSection, "var(--color-text)").value).toBe(
      "#0f172a"
    );
    expect(findInputByPlaceholder(colorsSection, "var(--color-primary)")?.value).toBe(
      "accent-token"
    );
    expect(findColorInputForPlaceholder(colorsSection, "var(--color-primary)").value).toBe(
      "#1d4ed8"
    );

    const advancedSection = findSectionByTitle(view.container, "Display tokens");
    if (!(advancedSection instanceof HTMLElement)) {
      throw new Error("Missing advanced display section");
    }

    const advancedSpacingSelect = findSelectByOptions(advancedSection, ["sm", "md", "lg"]);
    expect(advancedSpacingSelect.value).toBe("md");
    setSelectValue(advancedSpacingSelect, "lg");

    expect(view.onChangeSpy).toHaveBeenCalled();
    expect(view.getLatestValue().style).toMatchObject({
      cardSurface: "surface-token",
      cardBorder: "border-token",
      textColor: "text-token",
      accentColor: "accent-token",
      spacing: "lg",
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"spacing": "lg"');
    expect(snapshot?.textContent).toContain('"quote": "Second quote"');
  } finally {
    view.cleanup();
  }
});

test("Testimonials visual editor covers header copy, card field updates, picker colors, and max-count normalization", async () => {
  const view = await renderEditors({
    initialValue: {
      header: {
        eyebrow: "",
        title: "",
        description: "",
      },
      testimonials: [
        { id: "testimonial-a", quote: "Quote A", author: "Author A", rating: 2 },
        { id: "testimonial-b", quote: "Quote B", author: "Author B", rating: 3 },
        { id: "testimonial-c", quote: "Quote C", author: "Author C", rating: 4 },
        { id: "testimonial-d", quote: "Quote D", author: "Author D", rating: 1 },
        { id: "testimonial-e", quote: "Quote E", author: "Author E", rating: 5 },
        { id: "testimonial-f", quote: "Quote F", author: "Author F", rating: 0 },
      ],
      style: {
        cardSurface: "#101010",
        cardBorder: "#202020",
        textColor: "#303030",
        accentColor: "#404040",
        spacing: "sm",
      },
    },
  });

  try {
    const variantSection = findSectionByTitle(view.container, "Variant and layout structure");
    if (!(variantSection instanceof HTMLElement)) {
      throw new Error("Missing variant section");
    }

    clickButton(findButtonsByText(variantSection, "Slider Static")[0]);
    expect(view.getLatestVariant()).toBe("slider-static");

    const visualCountSelect = findSelectByOptions(variantSection, [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    setSelectValue(visualCountSelect, "7");
    expect(view.getLatestValue().testimonials).toHaveLength(7);

    const headerSection = findSectionByTitle(view.container, "Header copy");
    if (!(headerSection instanceof HTMLElement)) {
      throw new Error("Missing header section");
    }

    setInputValue(findInputByPlaceholder(headerSection, "Customer stories"), "What customers say");
    setInputValue(
      findInputByPlaceholder(headerSection, "Trusted by teams that ship fast"),
      "Proof from customers"
    );
    setTextareaValue(
      findTextareaByPlaceholder(
        headerSection,
        "Use real customer voices to build trust and reduce hesitation."
      ),
      "Detailed proof copy for the testimonials section."
    );

    const contentSection = findSectionByTitle(view.container, "Testimonials content and ratings");
    if (!(contentSection instanceof HTMLElement)) {
      throw new Error("Missing content section");
    }

    setTextareaValue(
      findTextareasByPlaceholder(contentSection, "Customer quote")[0],
      "Visual editor quote update"
    );
    setInputValue(findInputsByPlaceholder(contentSection, "Author name")[0], "Jordan");
    setInputValue(findInputsByPlaceholder(contentSection, "Role or position")[0], "CEO");
    setInputValue(
      findInputsByPlaceholder(contentSection, "https://cdn.example.com/avatar.jpg")[0],
      "https://cdn.example.com/jordan.jpg"
    );
    setInputValue(findInputsByPlaceholder(contentSection, "Acme Studio")[0], "Peak Labs");

    const ratingSelects = findSelectsByOptions(contentSection, ["0", "1", "2", "3", "4", "5"]);
    setSelectValue(ratingSelects[0], "1");

    clickButton(findButtonsByText(contentSection, "Move up")[1]);
    expect(view.getLatestValue().testimonials[0]?.author).toBe("Author B");
    expect(view.getLatestValue().testimonials[1]?.author).toBe("Jordan");

    clickButton(findButtonsByText(contentSection, "Add testimonial")[0]);
    expect(view.getLatestValue().testimonials).toHaveLength(8);
    expect(findButtonsByText(contentSection, "Add testimonial")[0]).toHaveProperty(
      "disabled",
      true
    );

    const colorsSection = findSectionByTitle(view.container, "Colors and emphasis");
    if (!(colorsSection instanceof HTMLElement)) {
      throw new Error("Missing colors section");
    }

    setInputValue(findColorInputForPlaceholder(colorsSection, "var(--color-bg)"), "#111111");
    setInputValue(findColorInputForPlaceholder(colorsSection, "var(--color-border)"), "#222222");
    setInputValue(findColorInputForPlaceholder(colorsSection, "var(--color-text)"), "#f5f5f5");
    setInputValue(findColorInputForPlaceholder(colorsSection, "var(--color-primary)"), "#2563eb");

    expect(view.getLatestValue().header).toMatchObject({
      eyebrow: "What customers say",
      title: "Proof from customers",
      description: "Detailed proof copy for the testimonials section.",
    });
    expect(view.getLatestValue().testimonials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          quote: "Visual editor quote update",
          author: "Jordan",
          role: "CEO",
          avatar: "https://cdn.example.com/jordan.jpg",
          rating: 1,
          sourceLabel: "Peak Labs",
        }),
      ])
    );
    expect(view.getLatestValue().style).toMatchObject({
      cardSurface: "#111111",
      cardBorder: "#222222",
      textColor: "#f5f5f5",
      accentColor: "#2563eb",
    });

    const fallbackSection = findSectionByTitle(view.container, "Normalization and fallback");
    if (!(fallbackSection instanceof HTMLElement)) {
      throw new Error("Missing normalization section");
    }

    clickButton(findButtonsByText(fallbackSection, "Normalize list to variant baseline")[0]);
    clickButton(findButtonsByText(fallbackSection, "Normalize full payload")[0]);

    expect(view.getLatestValue().testimonials).toHaveLength(3);
    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"eyebrow": "What customers say"');
    expect(snapshot?.textContent).toContain('"title": "Proof from customers"');
    expect(snapshot?.textContent).toContain('"spacing": "sm"');
    expect(snapshot?.textContent).toContain('"rating": 1');
  } finally {
    view.cleanup();
  }
});

test("Testimonials editors fall back when normalized header, style, and item fields are sparse", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/testimonials", async () => {
    const actual = await vi.importActual<
      typeof import("../../../core/widgets/core/testimonials")
    >("../../../core/widgets/core/testimonials");

    return {
      ...actual,
      normalizeTestimonialsData: (value: TestimonialsData) => ({
        ...actual.normalizeTestimonialsData(value),
        header: {
          eyebrow: undefined,
          title: undefined,
          description: undefined,
        } as TestimonialsData["header"],
        testimonials: [
          {
            id: undefined,
            quote: undefined,
            author: undefined,
            role: undefined,
            avatar: undefined,
            sourceLabel: undefined,
            rating: undefined,
          },
          {
            id: undefined,
            quote: undefined,
            author: undefined,
            role: undefined,
            avatar: undefined,
            sourceLabel: undefined,
            rating: undefined,
          },
        ] as TestimonialsData["testimonials"],
        style: {
          spacing: undefined,
          cardSurface: undefined,
          cardBorder: undefined,
          textColor: undefined,
          accentColor: undefined,
        } as TestimonialsData["style"],
      }),
      normalizeTestimonialsItems: () =>
        [
          {
            id: undefined,
            quote: undefined,
            author: undefined,
            role: undefined,
            avatar: undefined,
            sourceLabel: undefined,
            rating: undefined,
          },
          {
            id: undefined,
            quote: undefined,
            author: undefined,
            role: undefined,
            avatar: undefined,
            sourceLabel: undefined,
            rating: undefined,
          },
        ] as TestimonialsData["testimonials"],
    };
  });

  const { TestimonialsAdvancedEditor, TestimonialsVisualEditor, TestimonialsWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/TestimonialsEditors");

  const view = mount(
    <>
      <TestimonialsWizardEditor
        value={{} as TestimonialsData}
        onChange={() => undefined}
        variant="legacy"
      />
      <TestimonialsVisualEditor
        value={{} as TestimonialsData}
        onChange={() => undefined}
        variant="legacy"
      />
      <TestimonialsAdvancedEditor
        value={{} as TestimonialsData}
        onChange={() => undefined}
        variant="legacy"
      />
    </>
  );

  try {
    expect(
      (findSelectByOptions(view.container, ["grid", "spotlight", "slider-static"]) as
        | HTMLSelectElement
        | undefined)?.value
    ).toBe("grid");
    expect(
      (
        findInputByPlaceholder(view.container, "Trusted by teams that ship fast") as
          | HTMLInputElement
          | undefined
      )?.value
    ).toBe("");
    expect(
      (findTextareaByPlaceholder(view.container, "Customer quote") as HTMLTextAreaElement | undefined)
        ?.value
    ).toBe("");
    expect(
      (findInputByPlaceholder(view.container, "Author name") as HTMLInputElement | undefined)?.value
    ).toBe("");
    expect(
      (findInputByPlaceholder(view.container, "Role or position") as HTMLInputElement | undefined)?.value
    ).toBe("");
    expect(
      (
        findInputByPlaceholder(view.container, "https://cdn.example.com/avatar.jpg") as
          | HTMLInputElement
          | undefined
      )?.value
    ).toBe("");
    expect(
      (findInputByPlaceholder(view.container, "Acme Studio") as HTMLInputElement | undefined)?.value
    ).toBe("");
    expect(
      (findSelectByOptions(view.container, ["0", "1", "2", "3", "4", "5"])[0] as
        | HTMLSelectElement
        | undefined)?.value
    ).toBe("0");
    expect(
      (findSelectByOptions(view.container, ["sm", "md", "lg"])[0] as HTMLSelectElement | undefined)
        ?.value
    ).toBe("sm");
    expect(findColorInputForPlaceholder(view.container, "var(--color-bg)").value).toBe("#ffffff");
    expect(findColorInputForPlaceholder(view.container, "var(--color-border)").value).toBe(
      "#e2e8f0"
    );
    expect(findColorInputForPlaceholder(view.container, "var(--color-text)").value).toBe(
      "#0f172a"
    );
    expect(findColorInputForPlaceholder(view.container, "var(--color-primary)").value).toBe(
      "#1d4ed8"
    );
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/widgets/core/testimonials");
    vi.resetModules();
  }
});
