// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  richTextBlockMax,
  richTextSectionDefaults,
  type RichTextSectionData,
} from "../../../core/widgets/core/richTextSection";

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
    className,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
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
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
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
  act(() => {
    if (element.checked !== checked) {
      element.click();
    }
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

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("p")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );

const findInputByPlaceholder = (container: ParentNode, placeholder: string, index = 0) => {
  const input = Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  )[index];
  return input instanceof HTMLInputElement ? input : undefined;
};

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string, index = 0) => {
  const textarea = Array.from(container.querySelectorAll("textarea")).filter(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  )[index];
  return textarea instanceof HTMLTextAreaElement ? textarea : undefined;
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("RichTextSection wizard editor normalizes the variant and updates copy fields", async () => {
  const { RichTextSectionWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/RichTextSectionEditors");

  let latestValue: RichTextSectionData = {};
  let latestVariant = "legacy-layout";

  const Harness = () => {
    const [value, setValue] = useState<RichTextSectionData>(latestValue);
    const [variant, setVariant] = useState(latestVariant);

    return (
      <RichTextSectionWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          latestVariant = next;
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const selects = Array.from(view.container.querySelectorAll("select"));
    expect((selects[0] as HTMLSelectElement | null | undefined)?.value).toBe("single-column");

    setSelectValue(selects[0], "article");
    expect(latestVariant).toBe("article");

    setInputValue(findInputByPlaceholder(view.container, "Editorial"), "Analysis");
    setInputValue(
      findInputByPlaceholder(view.container, "Long-form content section"),
      "Quarterly narrative"
    );
    setInputValue(findInputByPlaceholder(view.container, "Heading 1"), "Inside the release");
    await act(async () => {
      await Promise.resolve();
    });
    setTextareaValue(findTextareaByPlaceholder(view.container, "Paragraph 1"), "Structured update");

    expect(latestValue.titleBlock?.eyebrow).toBe("Analysis");
    expect(latestValue.titleBlock?.title).toBe("Quarterly narrative");
    expect(latestValue.body?.blocks?.[0]?.heading).toBe("Inside the release");
    expect(latestValue.body?.blocks?.[0]?.content).toBe("Structured update");
    expect(latestValue.options?.outputMode).toBe("blocks");
  } finally {
    view.cleanup();
  }
});

test("RichTextSection visual editor covers variant cards, fallback blocks, reader toggles, and color safeguards", async () => {
  const { RichTextSectionVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/RichTextSectionEditors");

  let latestValue: RichTextSectionData = {
    titleBlock: {
      eyebrow: "Guide",
      title: "Readable content",
    },
    body: {
      html: "<p>Existing body</p>",
      blocks: [
        {
          id: "dup",
          heading: "First section",
          content: "Alpha copy",
        },
        {
          id: "dup",
          heading: "Second section",
          content: "Beta copy",
        },
      ],
    },
    options: {
      dropcap: false,
      toc: false,
      maxWidth: "md",
      outputMode: "blocks-fallback",
    },
    style: {
      fontScale: "md",
      lineHeight: "normal",
      textColor: "var(--brand-foreground)",
      background: "paper",
      spacing: "md",
    },
  };
  let latestVariant = "unknown-layout";

  const Harness = () => {
    const [value, setValue] = useState<RichTextSectionData>(latestValue);
    const [variant, setVariant] = useState(latestVariant);

    return (
      <RichTextSectionVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          latestVariant = next;
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Single Column");
    expect(view.container.textContent).toContain("Selected");

    clickByText(view.container, "Two Column");
    expect(latestVariant).toBe("two-column");

    const layoutSection = findSectionByTitle(view.container, "Variant and layout structure");
    const layoutSelects = Array.from(layoutSection?.querySelectorAll("select") ?? []);
    setSelectValue(layoutSelects[0], "full");
    expect(latestValue.options?.maxWidth).toBe("full");

    const titleSection = findSectionByTitle(view.container, "Title block copy");
    setInputValue(
      findInputByPlaceholder(titleSection ?? view.container, "Editorial"),
      "Perspective"
    );
    setInputValue(
      findInputByPlaceholder(titleSection ?? view.container, "Long-form content section"),
      "Deeper narrative"
    );
    expect(latestValue.titleBlock?.eyebrow).toBe("Perspective");
    expect(latestValue.titleBlock?.title).toBe("Deeper narrative");

    const bodySection = findSectionByTitle(view.container, "Body content");
    setTextareaValue(
      findTextareaByPlaceholder(
        bodySection ?? view.container,
        "<h2>Section heading</h2><p>Paragraph content...</p>"
      ),
      "<p>Updated body</p>"
    );
    expect(latestValue.body?.html).toBe("<p>Updated body</p>");

    const blockSection = findSectionByTitle(view.container, "Structured fallback blocks");
    const blockCountSelect = blockSection?.querySelector("select");
    clickByText(blockSection ?? view.container, "Add fallback block");

    expect(latestValue.body?.blocks).toHaveLength(3);
    expect(latestValue.body?.blocks?.[2]?.id).toBe("block-3");
    expect(latestValue.body?.blocks?.[2]?.heading).toBe("Heading 3");
    expect(latestValue.body?.blocks?.[2]?.content).toBe("Paragraph content.");

    setInputValue(
      findInputByPlaceholder(blockSection ?? view.container, "Heading", 2),
      "Third section"
    );
    setTextareaValue(
      findTextareaByPlaceholder(blockSection ?? view.container, "Paragraph content", 2),
      "Gamma copy"
    );

    expect(latestValue.body?.blocks?.[2]?.heading).toBe("Third section");
    expect(latestValue.body?.blocks?.[2]?.content).toBe("Gamma copy");

    clickByText(blockSection ?? view.container, "Move down", 1);
    expect(latestValue.body?.blocks?.[2]?.heading).toBe("Second section");

    clickByText(blockSection ?? view.container, "Move up", 2);
    expect(latestValue.body?.blocks?.[1]?.heading).toBe("Second section");
    expect(latestValue.body?.blocks?.[2]?.heading).toBe("Third section");

    clickByText(blockSection ?? view.container, "Remove", 2);
    expect(latestValue.body?.blocks).toHaveLength(2);
    expect(latestValue.body?.blocks?.[1]?.heading).toBe("Second section");

    setSelectValue(blockCountSelect, String(richTextBlockMax));
    const addButton = Array.from((blockSection ?? view.container).querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Add fallback block")
    );
    const moveUpButtons = Array.from(
      (blockSection ?? view.container).querySelectorAll("button")
    ).filter((button) => button.textContent?.includes("Move up"));
    const moveDownButtons = Array.from(
      (blockSection ?? view.container).querySelectorAll("button")
    ).filter((button) => button.textContent?.includes("Move down"));

    expect(latestValue.body?.blocks).toHaveLength(richTextBlockMax);
    expect((addButton as HTMLButtonElement | null | undefined)?.disabled).toBe(true);
    expect((moveUpButtons[0] as HTMLButtonElement | null | undefined)?.disabled).toBe(true);
    expect((moveDownButtons.at(-1) as HTMLButtonElement | null | undefined)?.disabled).toBe(true);

    const readerSection = findSectionByTitle(view.container, "Reader options");
    const readerToggles = Array.from(
      readerSection?.querySelectorAll('input[type="checkbox"]') ?? []
    );
    setCheckboxValue(readerToggles[0], true);
    setCheckboxValue(readerToggles[1], true);

    expect(latestValue.options?.dropcap).toBe(true);
    expect(latestValue.options?.toc).toBe(true);

    const typographySection = findSectionByTitle(view.container, "Typography and colors");
    const typographySelects = Array.from(typographySection?.querySelectorAll("select") ?? []);
    setSelectValue(typographySelects[0], "lg");
    setSelectValue(typographySelects[1], "relaxed");
    setSelectValue(typographySelects[2], "sm");

    expect(latestValue.style?.fontScale).toBe("lg");
    expect(latestValue.style?.lineHeight).toBe("relaxed");
    expect(latestValue.style?.spacing).toBe("sm");

    setInputValue(
      findInputByPlaceholder(typographySection ?? view.container, "var(--color-text)"),
      "var(--editor-foreground)"
    );
    setInputValue(
      findInputByPlaceholder(typographySection ?? view.container, "transparent"),
      "rgba(255,255,255,0.6)"
    );

    expect(latestValue.style?.textColor).toBe("var(--editor-foreground)");
    expect(latestValue.style?.background).toBe("rgba(255,255,255,0.6)");

    const colorInputs = Array.from(
      typographySection?.querySelectorAll('input[type="color"]') ?? []
    );
    expect((colorInputs[0] as HTMLInputElement | null | undefined)?.value).toBe("#0f172a");
    expect((colorInputs[1] as HTMLInputElement | null | undefined)?.value).toBe("#ffffff");

    setInputValue(colorInputs[0], "#112233");
    setInputValue(colorInputs[1], "#445566");

    expect(latestValue.style?.textColor).toBe("#112233");
    expect(latestValue.style?.background).toBe("#445566");
  } finally {
    view.cleanup();
  }
});

test("RichTextSection editors render sparse normalized fallbacks across wizard, visual, and advanced flows", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/richTextSection", async () => {
    const actual = await vi.importActual<
      typeof import("../../../core/widgets/core/richTextSection")
    >("../../../core/widgets/core/richTextSection");

    return {
      ...actual,
      normalizeRichTextSectionData: vi.fn((value: RichTextSectionData) => ({
        ...value,
        titleBlock: undefined,
        body: undefined,
        options: undefined,
        style: undefined,
      })),
    };
  });

  const {
    RichTextSectionAdvancedEditor,
    RichTextSectionVisualEditor,
    RichTextSectionWizardEditor,
  } = await import("../../../core/admin/ui/widgets/editors/RichTextSectionEditors");

  const view = mount(
    <>
      <RichTextSectionWizardEditor
        value={{}}
        onChange={() => undefined}
        variant="legacy-layout"
        onVariantChange={() => undefined}
      />
      <RichTextSectionVisualEditor
        value={{}}
        onChange={() => undefined}
        variant="legacy-layout"
        onVariantChange={() => undefined}
      />
      <RichTextSectionAdvancedEditor
        value={{}}
        onChange={() => undefined}
        variant="legacy-layout"
        onVariantChange={() => undefined}
      />
    </>
  );

  try {
    const wizardSelect = view.container.querySelector("select");
    expect((wizardSelect as HTMLSelectElement | null)?.value).toBe("single-column");
    expect(findInputByPlaceholder(view.container, "Editorial", 0)?.value).toBe("");
    expect(findInputByPlaceholder(view.container, "Long-form content section", 0)?.value).toBe("");
    expect(findTextareaByPlaceholder(view.container, "Paragraph 1")?.value).toBe("");

    const layoutSection = findSectionByTitle(view.container, "Variant and layout structure");
    const layoutSelect = layoutSection?.querySelector("select");
    expect((layoutSelect as HTMLSelectElement | null)?.value).toBe("lg");

    const titleSection = findSectionByTitle(view.container, "Title block copy");
    expect(findInputByPlaceholder(titleSection ?? view.container, "Editorial")?.value).toBe("");
    expect(
      findInputByPlaceholder(titleSection ?? view.container, "Long-form content section")?.value
    ).toBe("");

    const bodySection = findSectionByTitle(view.container, "Body content");
    expect(
      findTextareaByPlaceholder(
        bodySection ?? view.container,
        "<h2>Section heading</h2><p>Paragraph content...</p>"
      )?.value
    ).toBe("");

    const blocksSection = findSectionByTitle(view.container, "Structured fallback blocks");
    expect((blocksSection?.querySelector("select") as HTMLSelectElement | null)?.value).toBe("0");

    const readerSection = findSectionByTitle(view.container, "Reader options");
    const readerToggles = Array.from(
      readerSection?.querySelectorAll('input[type="checkbox"]') ?? []
    );
    expect((readerToggles[0] as HTMLInputElement | null | undefined)?.checked).toBe(false);
    expect((readerToggles[1] as HTMLInputElement | null | undefined)?.checked).toBe(false);

    const typographySection = findSectionByTitle(view.container, "Typography and colors");
    const typographySelects = Array.from(typographySection?.querySelectorAll("select") ?? []);
    for (const select of typographySelects.slice(0, 3)) {
      expect(Array.from(select.options).map((option) => option.value)).toContain("none");
    }
    expect((typographySelects[0] as HTMLSelectElement | null | undefined)?.value).toBe("md");
    expect((typographySelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("normal");
    expect((typographySelects[2] as HTMLSelectElement | null | undefined)?.value).toBe("md");
    expect(
      findInputByPlaceholder(typographySection ?? view.container, "var(--color-text)")?.value
    ).toBe("");
    expect(findInputByPlaceholder(typographySection ?? view.container, "transparent")?.value).toBe(
      ""
    );

    const colorInputs = Array.from(
      typographySection?.querySelectorAll<HTMLInputElement>('input[type="color"]') ?? []
    );
    expect(colorInputs.map((input) => input.value)).toEqual(["#0f172a", "#ffffff"]);

    const outputSection = findSectionByTitle(view.container, "Output mode and fallback");
    expect((outputSection?.querySelector("select") as HTMLSelectElement | null)?.value).toBe(
      "blocks-fallback"
    );
    expect(outputSection?.textContent).toContain("Current structured fallback block count: 0");

    const tokensSection = findSectionByTitle(view.container, "Technical typography tokens");
    const tokenSelects = Array.from(tokensSection?.querySelectorAll("select") ?? []);
    for (const select of tokenSelects.slice(0, 3)) {
      expect(Array.from(select.options).map((option) => option.value)).toContain("none");
    }
    expect((tokenSelects[0] as HTMLSelectElement | null | undefined)?.value).toBe("md");
    expect((tokenSelects[1] as HTMLSelectElement | null | undefined)?.value).toBe("normal");
    expect((tokenSelects[2] as HTMLSelectElement | null | undefined)?.value).toBe("md");
  } finally {
    view.cleanup();
    vi.doUnmock("../../../core/widgets/core/richTextSection");
    vi.resetModules();
  }
});

test("RichTextSection advanced editor normalizes incomplete payloads, updates output tokens, and resets defaults", async () => {
  const { RichTextSectionAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/RichTextSectionEditors");

  let latestValue: RichTextSectionData = {
    body: {
      blocks: [
        {
          id: "dup",
          heading: "Intro",
          content: "Alpha",
        },
        {
          id: "dup",
          content: "Beta",
        },
      ],
    },
    options: {
      outputMode: "html",
    },
    style: {
      textColor: "#222222",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<RichTextSectionData>(latestValue);

    return (
      <RichTextSectionAdvancedEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="single-column"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Current structured fallback block count: 2");
    const preview = view.container.querySelector("pre");
    expect(preview?.textContent).toContain('"id": "dup"');
    expect(preview?.textContent).toContain('"id": "block-2"');

    const outputSection = findSectionByTitle(view.container, "Output mode and fallback");
    const outputModeSelect = outputSection?.querySelector("select");
    setSelectValue(outputModeSelect, "blocks");
    expect(latestValue.options?.outputMode).toBe("blocks");

    const tokensSection = findSectionByTitle(view.container, "Technical typography tokens");
    const tokenSelects = Array.from(tokensSection?.querySelectorAll("select") ?? []);
    setSelectValue(tokenSelects[0], "lg");
    setSelectValue(tokenSelects[1], "tight");
    setSelectValue(tokenSelects[2], "sm");

    expect(latestValue.style?.fontScale).toBe("lg");
    expect(latestValue.style?.lineHeight).toBe("tight");
    expect(latestValue.style?.spacing).toBe("sm");

    clickByText(view.container, "Normalize now");
    expect(latestValue.titleBlock?.eyebrow).toBe(richTextSectionDefaults.titleBlock?.eyebrow);
    expect(latestValue.titleBlock?.title).toBe(richTextSectionDefaults.titleBlock?.title);
    expect(latestValue.body?.html).toBe(richTextSectionDefaults.body?.html);
    expect(latestValue.body?.blocks?.[1]?.id).toBe("block-2");
    expect(latestValue.style?.background).toBe(richTextSectionDefaults.style?.background);

    clickByText(view.container, "Reset to defaults");
    expect(latestValue).toEqual(richTextSectionDefaults);
    expect(view.container.querySelector("pre")?.textContent).toContain(
      '"outputMode": "blocks-fallback"'
    );
  } finally {
    view.cleanup();
  }
});
