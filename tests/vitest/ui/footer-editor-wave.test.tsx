// @vitest-environment happy-dom

import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { FooterData } from "../../../core/widgets/core/footer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    placeholder,
    type,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    [key: string]: unknown;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} {...props} />
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

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
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

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findPanelByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("div")).find((panel) =>
    Array.from(panel.querySelectorAll("p")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("Footer editors cover quick setup, visual content edits, social links, and advanced layout tokens", async () => {
  const { FooterAdvancedEditor, FooterVisualEditor, FooterWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/FooterEditors");

  const onChangeSpy = vi.fn();
  let latestValue: FooterData = {
    columns: [
      { title: "", links: [{ label: "", href: "" }] },
      { title: "", links: [] },
      { title: "Hidden", links: [{ label: "Legacy", href: "/legacy" }] },
    ],
    social: [],
  };
  let currentVariant = "columns-2";

  const Harness = () => {
    const [value, setValue] = useState<FooterData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <>
        <FooterWizardEditor
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
        <FooterVisualEditor
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
        <FooterAdvancedEditor
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
    const variantSelect = findSelectsByOptions(view.container, [
      "columns-2",
      "columns-3",
      "minimal",
    ])[0];
    setSelectValue(variantSelect, "minimal");
    expect(currentVariant).toBe("minimal");

    setInputValue(findInputByPlaceholder(view.container, "Column 1 title"), "Company");
    setInputValue(findInputByPlaceholder(view.container, "First link label"), "Docs");
    setInputValue(findInputByPlaceholder(view.container, "First link URL"), "/docs");
    setInputValue(findInputByPlaceholder(view.container, "© 2026 Company name"), "© 2026 Example");
    setInputValue(findInputByPlaceholder(view.container, "Privacy URL"), "/privacy");
    setInputValue(findInputByPlaceholder(view.container, "Terms URL"), "/terms");

    clickByText(view.container, "Add social");
    setSelectValue(
      findSelectsByOptions(view.container, [
        "linkedin",
        "twitter",
        "github",
        "youtube",
        "facebook",
        "instagram",
      ])[0],
      "github"
    );
    setInputValue(
      findInputByPlaceholder(view.container, "Social URL"),
      "https://github.com/example"
    );

    expect(latestValue.legal).toMatchObject({
      copyright: "© 2026 Example",
      privacy: "/privacy",
      terms: "/terms",
    });
    expect(latestValue.social?.[0]).toEqual({
      type: "github",
      href: "https://github.com/example",
    });

    setSelectValue(variantSelect, "columns-3");
    expect(currentVariant).toBe("columns-3");

    const columnsPanel = findPanelByTitle(view.container, "Columns and links");
    clickByText(columnsPanel as ParentNode, "Add link", 1);
    setInputValue(findInputsByPlaceholder(columnsPanel as ParentNode, "Label").at(-1), "API");
    setInputValue(findInputsByPlaceholder(columnsPanel as ParentNode, "URL").at(-1), "/api");
    clickByText(columnsPanel as ParentNode, "Remove", 0);

    const socialPanel = findPanelByTitle(view.container, "Social links and icon style");
    clickByText(socialPanel as ParentNode, "Add social");
    setSelectValue(
      findSelectsByOptions(socialPanel as ParentNode, [
        "linkedin",
        "twitter",
        "github",
        "youtube",
        "facebook",
        "instagram",
      ]).at(-1),
      "youtube"
    );
    setInputValue(
      findInputsByPlaceholder(socialPanel as ParentNode, "Social URL").at(-1),
      "https://youtube.com/example"
    );
    setInputValue(
      findInputByPlaceholder(socialPanel as ParentNode, "Social color (e.g. #0f172a)"),
      "#111111"
    );

    const colorsPanel = findPanelByTitle(view.container, "Colors and borders");
    setInputValue(findInputByPlaceholder(colorsPanel as ParentNode, "Surface color"), "#ffffff");
    setInputValue(findInputByPlaceholder(colorsPanel as ParentNode, "Border color"), "#e5e7eb");
    setInputValue(findInputByPlaceholder(colorsPanel as ParentNode, "Text color"), "#0f172a");
    setInputValue(findInputByPlaceholder(colorsPanel as ParentNode, "Link color"), "#2563eb");
    setSelectValue(findSelectsByOptions(colorsPanel as ParentNode, ["0", "1", "2", "3"])[0], "2");

    const typoPanel = findPanelByTitle(view.container, "Typography and spacing");
    setInputValue(findInputByPlaceholder(typoPanel as ParentNode, "Heading color"), "#111827");
    setInputValue(findInputByPlaceholder(typoPanel as ParentNode, "Legal text color"), "#6b7280");
    setSelectValue(
      findSelectsByOptions(typoPanel as ParentNode, ["none", "xs", "sm", "base"])[0],
      "base"
    );
    setSelectValue(
      findSelectsByOptions(typoPanel as ParentNode, ["none", "uppercase", "capitalize"])[0],
      "capitalize"
    );
    setSelectValue(
      findSelectsByOptions(typoPanel as ParentNode, ["none", "8", "10", "12"])[0],
      "12"
    );

    const layoutPanel = findPanelByTitle(view.container, "Layout tokens");
    const alignSelects = findSelectsByOptions(layoutPanel as ParentNode, [
      "left",
      "center",
      "right",
    ]);
    setSelectValue(alignSelects[0], "center");
    setSelectValue(alignSelects[1], "left");
    setSelectValue(
      findSelectsByOptions(layoutPanel as ParentNode, ["none", "5xl", "6xl", "7xl"])[0],
      "7xl"
    );
    setSelectValue(
      findSelectsByOptions(layoutPanel as ParentNode, ["none", "4", "6", "8"])[0],
      "8"
    );
    setSelectValue(
      findSelectsByOptions(layoutPanel as ParentNode, ["none", "8", "10", "12"])[0],
      "8"
    );

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.columns[0]).toMatchObject({
      title: "Company",
    });
    expect(
      latestValue.columns.some((column) =>
        column.links.some((link) => link.label === "API" && link.href === "/api")
      )
    ).toBe(true);
    expect(latestValue.social).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "github", href: "https://github.com/example" }),
        expect.objectContaining({ type: "youtube", href: "https://youtube.com/example" }),
      ])
    );
    expect(latestValue.style).toMatchObject({
      socialColor: "#111111",
      surfaceColor: "#ffffff",
      borderColor: "#e5e7eb",
      textColor: "#0f172a",
      linkColor: "#2563eb",
      borderTopWidth: "2",
      headingColor: "#111827",
      legalTextColor: "#6b7280",
      fontSize: "base",
      headingTransform: "capitalize",
    });
    expect(latestValue.layout).toMatchObject({
      align: "center",
      legalAlign: "left",
      maxWidth: "7xl",
      columnGap: "8",
      sectionPaddingY: "8",
    });
  } finally {
    view.cleanup();
  }
});

test("Footer visual editor updates visible column titles and removes social links", async () => {
  const { FooterVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/FooterEditors");

  let latestValue: FooterData = {
    columns: [
      { title: "Company", links: [{ label: "Docs", href: "/docs" }] },
      { title: "Product", links: [{ label: "API", href: "/api" }] },
    ],
    social: [
      { type: "linkedin", href: "https://linkedin.com/company/example" },
      { type: "github", href: "https://github.com/example" },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<FooterData>(latestValue);

    return (
      <FooterVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="columns-2"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    setInputValue(findInputByPlaceholder(view.container, "Column 1 title"), "Platform");

    const firstSocialUrlInput = findInputsByPlaceholder(view.container, "Social URL")[0];
    const firstSocialRow = firstSocialUrlInput?.closest("div.grid");
    const socialRemoveButton = firstSocialRow?.querySelector("button");
    if (!(socialRemoveButton instanceof HTMLButtonElement)) {
      throw new Error("Missing social remove button");
    }
    act(() => {
      socialRemoveButton.click();
    });

    expect(latestValue.columns[0]).toMatchObject({
      title: "Platform",
    });
    expect(latestValue.social).toEqual([
      {
        type: "github",
        href: "https://github.com/example",
      },
    ]);
  } finally {
    view.cleanup();
  }
});

test("Footer editors fall back safely for sparse columns, social, layout, and style data", async () => {
  const { FooterAdvancedEditor, FooterVisualEditor, FooterWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/FooterEditors");

  let latestValue: FooterData = {
    columns: [{ title: "", links: [] }],
  };
  let currentVariant = "minimal";

  const Harness = () => {
    const [value, setValue] = useState<FooterData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <>
        <FooterWizardEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            currentVariant = next;
            setVariant(next);
          }}
        />
        <FooterVisualEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant={variant}
          onVariantChange={(next) => {
            currentVariant = next;
            setVariant(next);
          }}
        />
        <FooterAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
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
    expect(
      (
        findSelectsByOptions(view.container, ["columns-2", "columns-3", "minimal"])[0] as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("minimal");
    expect(
      (
        findInputByPlaceholder(view.container, "Column 1 title") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("Column 1");
    expect(view.container.textContent).toContain("No social links configured.");

    const visualColumnsPanel = findPanelByTitle(view.container, "Columns and links");
    clickByText(visualColumnsPanel as ParentNode, "Add link");
    setInputValue(findInputByPlaceholder(visualColumnsPanel as ParentNode, "Label"), "Docs");
    setInputValue(findInputByPlaceholder(visualColumnsPanel as ParentNode, "URL"), "/docs");

    expect(latestValue.columns[0]?.links).toEqual([{ label: "Docs", href: "/docs" }]);

    clickByText(visualColumnsPanel as ParentNode, "Remove");
    expect(latestValue.columns[0]?.links).toEqual([]);

    const socialPanel = findPanelByTitle(view.container, "Social links and icon style");
    clickByText(socialPanel as ParentNode, "Add social");
    const socialTypeSelect = findSelectsByOptions(socialPanel as ParentNode, [
      "linkedin",
      "twitter",
      "github",
      "youtube",
      "facebook",
      "instagram",
    ])[0];
    setSelectValue(socialTypeSelect, "twitter");
    setInputValue(
      findInputByPlaceholder(socialPanel as ParentNode, "Social URL"),
      "https://x.com/example"
    );

    expect(latestValue.social).toEqual([
      {
        type: "twitter",
        href: "https://x.com/example",
      },
    ]);

    const advancedLayoutPanel = findPanelByTitle(view.container, "Layout tokens");
    const selects = findSelectsByOptions(advancedLayoutPanel as ParentNode, [
      "left",
      "center",
      "right",
    ]);
    expect((selects[0] as HTMLSelectElement | null | undefined)?.value).toBe("left");
    expect((selects[1] as HTMLSelectElement | null | undefined)?.value).toBe("right");
    expect(
      (
        findSelectsByOptions(advancedLayoutPanel as ParentNode, [
          "none",
          "5xl",
          "6xl",
          "7xl",
        ])[0] as HTMLSelectElement | null | undefined
      )?.value
    ).toBe("6xl");
    expect(
      (
        findSelectsByOptions(advancedLayoutPanel as ParentNode, ["none", "4", "6", "8"])[0] as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("6");
    expect(
      (
        findSelectsByOptions(advancedLayoutPanel as ParentNode, ["none", "8", "10", "12"])[0] as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("10");
  } finally {
    view.cleanup();
  }
});
