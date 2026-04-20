// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  featureGridDefaults,
  type FeatureGridData,
} from "../../../core/widgets/core/featureGrid";

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

const setInputValue = (element: Element | null | undefined, value: string) => {
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

const setTextareaValue = (element: Element | null | undefined, value: string) => {
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

const setSelectValue = (element: Element | null | undefined, value: string) => {
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

const findTextareasByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).filter(
    (element) =>
      element instanceof HTMLTextAreaElement &&
      element.getAttribute("placeholder") === placeholder
  );

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

test("FeatureGrid editors cover variant changes, card editing, style tokens, and advanced normalization", async () => {
  const {
    FeatureGridAdvancedEditor,
    FeatureGridVisualEditor,
    FeatureGridWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/FeatureGridEditors");

  const onChangeSpy = vi.fn();
  let latestValue: FeatureGridData = {
    items: [
      { id: "same", title: "", description: "", ctaLabel: "", ctaHref: "" },
      { id: "same", title: "Second card" },
    ],
    style: {
      columns: "9" as never,
      gap: "wide" as never,
      borderWidth: "9" as never,
      radius: "round" as never,
      surfaceColor: "var(--surface)",
      borderColor: "bad-token",
    },
  };
  let currentVariant = "unexpected-layout";

  const Harness = () => {
    const [value, setValue] = useState<FeatureGridData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <>
        <FeatureGridWizardEditor
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
        <FeatureGridVisualEditor
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
        <FeatureGridAdvancedEditor
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
    expect(view.container.textContent).toContain("Feature grid style");
    expect(view.container.textContent).toContain("Raw payload snapshot");

    const variantSelect = findSelectsByOptions(view.container, [
      "cards-3",
      "cards-4",
      "highlight-first",
    ])[0];
    expect((variantSelect as HTMLSelectElement | null | undefined)?.value).toBe("cards-3");
    setSelectValue(variantSelect, "cards-4");
    expect(currentVariant).toBe("cards-4");

    setInputValue(
      findInputByPlaceholder(view.container, "Everything your team needs"),
      "Core feature set"
    );
    setTextareaValue(
      findTextareasByPlaceholder(
        view.container,
        "Use focused cards to explain your strongest product capabilities."
      )[0],
      "Short proof of platform value."
    );

    const countSelect = findSelectsByOptions(view.container, ["1", "2", "3", "4", "5", "6", "7", "8"])[0];
    setSelectValue(countSelect, "4");
    expect(latestValue.items).toHaveLength(4);
    setInputValue(findInputsByPlaceholder(view.container, "Feature 1")[0], "Wizard automation");

    const layoutSection = findSectionByTitle(view.container, "Variant and layout structure");
    const headerSection = findSectionByTitle(view.container, "Header copy");
    const featureCardsSection = findSectionByTitle(view.container, "Feature cards and actions");
    const colorsSection = findSectionByTitle(view.container, "Colors and borders");
    const advancedSection = findSectionByTitle(view.container, "Layout tokens");

    expect(layoutSection).toBeTruthy();
    expect(headerSection).toBeTruthy();
    expect(featureCardsSection).toBeTruthy();
    expect(colorsSection).toBeTruthy();
    expect(advancedSection).toBeTruthy();

    clickByText(layoutSection as ParentNode, "Highlight First");
    expect(currentVariant).toBe("highlight-first");

    const visualColumnsSelect = findSelectsByOptions(layoutSection as ParentNode, ["2", "3", "4"])[0];
    const visualGapSelect = findSelectsByOptions(layoutSection as ParentNode, ["sm", "md", "lg"])[0];
    const visualCountSelect = findSelectsByOptions(
      layoutSection as ParentNode,
      ["1", "2", "3", "4", "5", "6", "7", "8"]
    )[0];
    setSelectValue(visualColumnsSelect, "2");
    setSelectValue(visualGapSelect, "lg");
    setSelectValue(visualCountSelect, "6");
    expect(latestValue.items).toHaveLength(6);

    setInputValue(
      findInputByPlaceholder(headerSection as ParentNode, "Feature highlights"),
      "Why teams switch"
    );
    setInputValue(
      findInputByPlaceholder(headerSection as ParentNode, "Everything your team needs"),
      "Feature grid overview"
    );
    setTextareaValue(
      findTextareasByPlaceholder(
        headerSection as ParentNode,
        "Use focused cards to explain your strongest product capabilities."
      )[0],
      "Concise visual summary."
    );

    setInputValue(
      findInputsByPlaceholder(featureCardsSection as ParentNode, "Feature 1")[0],
      "Automation"
    );
    setTextareaValue(
      findTextareasByPlaceholder(
        featureCardsSection as ParentNode,
        "Describe this feature in one short paragraph."
      )[0],
      "Automates repeatable delivery tasks."
    );
    setInputValue(findInputByPlaceholder(featureCardsSection as ParentNode, "⚡"), "🤖");
    setInputValue(
      findInputByPlaceholder(featureCardsSection as ParentNode, "https://cdn.example.com/feature.jpg"),
      "https://cdn.example.com/automation.jpg"
    );
    setInputValue(
      findInputByPlaceholder(featureCardsSection as ParentNode, "Learn more"),
      "See automation"
    );
    setInputValue(
      findInputByPlaceholder(featureCardsSection as ParentNode, "/features"),
      "/automation"
    );

    clickByText(featureCardsSection as ParentNode, "Add card");
    expect(latestValue.items).toHaveLength(7);
    clickByText(featureCardsSection as ParentNode, "Move down", 0);
    clickByText(featureCardsSection as ParentNode, "Move up", 1);
    clickByText(featureCardsSection as ParentNode, "Remove", 6);
    expect(latestValue.items).toHaveLength(6);

    const borderWidthSelect = findSelectsByOptions(colorsSection as ParentNode, ["0", "1", "2", "3"])[0];
    const radiusSelect = findSelectsByOptions(colorsSection as ParentNode, ["none", "md", "lg", "xl"])[0];
    setSelectValue(borderWidthSelect, "3");
    setSelectValue(radiusSelect, "xl");

    const colorInputs = Array.from((colorsSection as ParentNode).querySelectorAll("input[type='color']"));
    setInputValue(colorInputs[0], "#111111");
    setInputValue(colorInputs[1], "#222222");
    setInputValue(
      findInputByPlaceholder(colorsSection as ParentNode, "var(--color-bg)"),
      "var(--surface-strong)"
    );
    setInputValue(
      findInputByPlaceholder(colorsSection as ParentNode, "var(--color-border)"),
      "var(--border-strong)"
    );

    const advancedColumnsSelect = findSelectsByOptions(advancedSection as ParentNode, ["2", "3", "4"])[0];
    const advancedGapSelect = findSelectsByOptions(advancedSection as ParentNode, ["sm", "md", "lg"])[0];
    const advancedBorderWidthSelect = findSelectsByOptions(
      advancedSection as ParentNode,
      ["0", "1", "2", "3"]
    )[0];
    const advancedRadiusSelect = findSelectsByOptions(
      advancedSection as ParentNode,
      ["none", "md", "lg", "xl"]
    )[0];
    setSelectValue(advancedColumnsSelect, "4");
    setSelectValue(advancedGapSelect, "sm");
    setSelectValue(advancedBorderWidthSelect, "2");
    setSelectValue(advancedRadiusSelect, "none");

    clickByText(view.container, "Normalize items to variant baseline");
    clickByText(view.container, "Normalize full payload");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(currentVariant).toBe("highlight-first");
    expect(latestValue.header).toMatchObject({
      eyebrow: "Why teams switch",
      title: "Feature grid overview",
      description: "Concise visual summary.",
    });
    expect(latestValue.items).toHaveLength(4);
    expect(latestValue.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Automation",
          description: "Automates repeatable delivery tasks.",
          icon: "🤖",
          image: "https://cdn.example.com/automation.jpg",
          ctaLabel: "See automation",
          ctaHref: "/automation",
        }),
      ])
    );
    expect(latestValue.style).toMatchObject({
      columns: "4",
      gap: "sm",
      borderWidth: "2",
      radius: "none",
      surfaceColor: "var(--surface-strong)",
      borderColor: "var(--border-strong)",
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"eyebrow": "Why teams switch"');
    expect(snapshot?.textContent).toContain('"title": "Feature grid overview"');
    expect(snapshot?.textContent).toContain('"columns": "4"');
    expect(snapshot?.textContent).toContain('"borderWidth": "2"');
    expect(snapshot?.textContent).toContain('"surfaceColor": "var(--surface-strong)"');
    expect(snapshot?.textContent).toContain('"ctaHref": "/automation"');
  } finally {
    view.cleanup();
  }
});

test("FeatureGrid editors render sparse fallback defaults and ignore variant changes when no handler is provided", async () => {
  const {
    FeatureGridAdvancedEditor,
    FeatureGridVisualEditor,
    FeatureGridWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/FeatureGridEditors");

  const sparseValue: FeatureGridData = {
    header: {},
    items: [{} as never],
    style: {},
  };

  const wizardView = mount(
    <FeatureGridWizardEditor
      value={sparseValue}
      onChange={() => undefined}
      variant="cards-3"
    />
  );

  try {
    expect(
      (findInputByPlaceholder(wizardView.container, "Everything your team needs") as
        | HTMLInputElement
        | undefined)?.value
    ).toBe(featureGridDefaults.header?.title);
    expect(
      (findTextareasByPlaceholder(
        wizardView.container,
        "Use focused cards to explain your strongest product capabilities."
      )[0] as HTMLTextAreaElement | null | undefined)?.value
    ).toBe(featureGridDefaults.header?.description);
    expect((findSelectsByOptions(wizardView.container, ["1", "2", "3", "4", "5", "6", "7", "8"])[0] as HTMLSelectElement | null | undefined)?.value).toBe(
      "1"
    );
  } finally {
    wizardView.cleanup();
  }

  const visualView = mount(
    <FeatureGridVisualEditor value={sparseValue} onChange={() => undefined} variant="cards-3" />
  );

  try {
    const layoutSection = findSectionByTitle(visualView.container, "Variant and layout structure");
    const headerSection = findSectionByTitle(visualView.container, "Header copy");
    const featureCardsSection = findSectionByTitle(visualView.container, "Feature cards and actions");
    const colorsSection = findSectionByTitle(visualView.container, "Colors and borders");

    clickByText(layoutSection as ParentNode, "Cards 4");

    expect((findSelectsByOptions(layoutSection as ParentNode, ["2", "3", "4"])[0] as HTMLSelectElement | null | undefined)?.value).toBe(
      "3"
    );
    expect((findSelectsByOptions(layoutSection as ParentNode, ["sm", "md", "lg"])[0] as HTMLSelectElement | null | undefined)?.value).toBe(
      "md"
    );
    expect(
      (findSelectsByOptions(layoutSection as ParentNode, ["1", "2", "3", "4", "5", "6", "7", "8"])[0] as
        | HTMLSelectElement
        | undefined)?.value
    ).toBe("1");
    expect(
      (findInputByPlaceholder(headerSection as ParentNode, "Feature highlights") as HTMLInputElement | null | undefined)?.value
    ).toBe(featureGridDefaults.header?.eyebrow);
    expect(
      (findInputByPlaceholder(featureCardsSection as ParentNode, "Feature 1") as HTMLInputElement | null | undefined)?.value
    ).toBe(featureGridDefaults.items?.[0]?.title);
    expect(
      (findInputByPlaceholder(featureCardsSection as ParentNode, "⚡") as HTMLInputElement | null | undefined)?.value
    ).toBe("");
    expect(
      (findInputByPlaceholder(colorsSection as ParentNode, "var(--color-bg)") as HTMLInputElement | null | undefined)?.value
    ).toBe(featureGridDefaults.style?.surfaceColor);
    expect(
      (findInputByPlaceholder(colorsSection as ParentNode, "var(--color-border)") as HTMLInputElement | null | undefined)?.value
    ).toBe(featureGridDefaults.style?.borderColor);
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <FeatureGridAdvancedEditor
      value={sparseValue}
      onChange={() => undefined}
      variant="cards-3"
    />
  );

  try {
    const layoutSection = findSectionByTitle(advancedView.container, "Layout tokens");
    expect((findSelectsByOptions(layoutSection as ParentNode, ["2", "3", "4"])[0] as HTMLSelectElement | null | undefined)?.value).toBe(
      "3"
    );
    expect((findSelectsByOptions(layoutSection as ParentNode, ["sm", "md", "lg"])[0] as HTMLSelectElement | null | undefined)?.value).toBe(
      "md"
    );
    expect((findSelectsByOptions(layoutSection as ParentNode, ["0", "1", "2", "3"])[0] as HTMLSelectElement | null | undefined)?.value).toBe(
      "1"
    );
    expect((findSelectsByOptions(layoutSection as ParentNode, ["none", "md", "lg", "xl"])[0] as HTMLSelectElement | null | undefined)?.value).toBe(
      "lg"
    );
  } finally {
    advancedView.cleanup();
  }
});

test("FeatureGrid editors fall back to default layout tokens when normalized payload is sparse", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/featureGrid", async () => {
    const actual = await vi.importActual<
      typeof import("../../../core/widgets/core/featureGrid")
    >("../../../core/widgets/core/featureGrid");

    return {
      ...actual,
      normalizeFeatureGridData: (value: FeatureGridData) => ({
        ...actual.normalizeFeatureGridData(value),
        header: {
          eyebrow: undefined,
          title: undefined,
          description: undefined,
        } as FeatureGridData["header"],
        style: {
          columns: undefined,
          gap: undefined,
          borderWidth: undefined,
          radius: undefined,
          surfaceColor: undefined,
          borderColor: undefined,
        } as FeatureGridData["style"],
      }),
      normalizeFeatureGridItems: () =>
        [
          {
            id: undefined,
            title: undefined,
            description: undefined,
            icon: undefined,
            image: undefined,
            ctaLabel: undefined,
            ctaHref: undefined,
          },
        ] as FeatureGridData["items"],
    };
  });

  const { FeatureGridAdvancedEditor, FeatureGridVisualEditor, FeatureGridWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/FeatureGridEditors");

  const sparseValue: FeatureGridData = {
    header: {},
    items: [{} as never],
    style: {},
  };

  const wizardView = mount(
    <FeatureGridWizardEditor
      value={sparseValue}
      onChange={() => undefined}
      variant="legacy-grid"
    />
  );

  try {
    expect(
      (findSelectsByOptions(wizardView.container, ["cards-3", "cards-4", "highlight-first"])[0] as
        | HTMLSelectElement
        | undefined)?.value
    ).toBe("cards-3");
    expect(
      (findInputByPlaceholder(wizardView.container, "Everything your team needs") as HTMLInputElement | null | undefined)
        ?.value
    ).toBe("");
    expect(
      (
        findTextareasByPlaceholder(
          wizardView.container,
          "Use focused cards to explain your strongest product capabilities."
        )[0] as HTMLTextAreaElement | null | undefined
      )?.value
    ).toBe("");
    expect((findInputsByPlaceholder(wizardView.container, "Feature 1")[0] as HTMLInputElement | null | undefined)?.value).toBe(
      ""
    );
  } finally {
    wizardView.cleanup();
  }

  const visualView = mount(
    <FeatureGridVisualEditor value={sparseValue} onChange={() => undefined} variant="legacy-grid" />
  );

  try {
    const layoutSection = findSectionByTitle(visualView.container, "Variant and layout structure");
    const colorsSection = findSectionByTitle(visualView.container, "Colors and borders");
    const cardsSection = findSectionByTitle(visualView.container, "Feature cards and actions");

    expect(
      (findSelectsByOptions(layoutSection as ParentNode, ["2", "3", "4"])[0] as HTMLSelectElement | null | undefined)?.value
    ).toBe("3");
    expect(
      (findSelectsByOptions(layoutSection as ParentNode, ["sm", "md", "lg"])[0] as HTMLSelectElement | null | undefined)?.value
    ).toBe("md");
    expect(
      (
        findSelectsByOptions(layoutSection as ParentNode, ["1", "2", "3", "4", "5", "6", "7", "8"])[0] as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("1");
    expect((findInputsByPlaceholder(cardsSection as ParentNode, "Feature 1")[0] as HTMLInputElement | null | undefined)?.value).toBe(
      ""
    );
    expect((findInputByPlaceholder(cardsSection as ParentNode, "⚡") as HTMLInputElement | null | undefined)?.value).toBe(
      ""
    );
    expect((findInputByPlaceholder(colorsSection as ParentNode, "var(--color-bg)") as HTMLInputElement | null | undefined)?.value).toBe(
      ""
    );
    expect((findInputByPlaceholder(colorsSection as ParentNode, "var(--color-border)") as HTMLInputElement | null | undefined)?.value).toBe(
      ""
    );
    const colorInputs = Array.from((colorsSection as ParentNode).querySelectorAll("input[type='color']"));
    expect((colorInputs[0] as HTMLInputElement | null | undefined)?.value).toBe("#ffffff");
    expect((colorInputs[1] as HTMLInputElement | null | undefined)?.value).toBe("#e2e8f0");
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <FeatureGridAdvancedEditor value={sparseValue} onChange={() => undefined} variant="legacy-grid" />
  );

  try {
    const advancedSection = findSectionByTitle(advancedView.container, "Layout tokens");
    expect(
      (findSelectsByOptions(advancedSection as ParentNode, ["2", "3", "4"])[0] as HTMLSelectElement | null | undefined)?.value
    ).toBe("3");
    expect(
      (findSelectsByOptions(advancedSection as ParentNode, ["sm", "md", "lg"])[0] as HTMLSelectElement | null | undefined)?.value
    ).toBe("md");
    expect(
      (findSelectsByOptions(advancedSection as ParentNode, ["0", "1", "2", "3"])[0] as HTMLSelectElement | null | undefined)?.value
    ).toBe("1");
    expect(
      (findSelectsByOptions(advancedSection as ParentNode, ["none", "md", "lg", "xl"])[0] as HTMLSelectElement | null | undefined)?.value
    ).toBe("lg");
  } finally {
    advancedView.cleanup();
    vi.doUnmock("../../../core/widgets/core/featureGrid");
    vi.resetModules();
  }
});
