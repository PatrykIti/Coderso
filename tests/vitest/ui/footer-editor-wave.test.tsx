// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { FooterData } from "../../../core/widgets/core/footer";
import type { WidgetBlock } from "../../../core/widgets/types";

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

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(),
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "about-page",
      title: "About",
      slug: "about",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
    {
      id: "privacy-page",
      title: "Privacy",
      slug: "privacy",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
    {
      id: "community-page",
      title: "Community",
      slug: "community",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
  ]),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ value, onChange }: { value: unknown; onChange?: (value: unknown) => void }) => (
    <div>
      <button type="button" onClick={() => onChange?.("footer-logo")}>
        Browse media
      </button>
      {value ? (
        <button type="button" onClick={() => onChange?.(null)}>
          Clear selected media
        </button>
      ) : null}
      <p>{value ? `Selected: ${String(value)}` : "No media selected yet."}</p>
    </div>
  ),
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

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
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
  React.act(() => {
    button.click();
  });
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const hasExactText = (element: Element, text: string) =>
  normalizeText(element.textContent) === normalizeText(text);

const findPanelByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section, div")).find((panel) =>
    Array.from(panel.querySelectorAll("h3, p, span")).some(
      (node) => normalizeText(node.textContent) === normalizeText(title)
    )
  );

const writablePathsForMode = (container: ParentNode, mode: "wizard" | "visual" | "advanced") =>
  Array.from(
    container.querySelectorAll(
      `[data-widget-editor-mode="${mode}"] [data-widget-control-path]:not([data-widget-control-readonly="true"])`
    )
  )
    .map((element) => element.getAttribute("data-widget-control-path"))
    .filter((path): path is string => typeof path === "string");

const unwrappedNativeControlsForMode = (
  container: ParentNode,
  mode: "wizard" | "visual" | "advanced"
) =>
  Array.from(
    container.querySelectorAll(
      `[data-widget-editor-mode="${mode}"] input, [data-widget-editor-mode="${mode}"] select, [data-widget-editor-mode="${mode}"] textarea, [data-widget-editor-mode="${mode}"] button`
    )
  )
    .filter((element) => !element.closest("[data-widget-control]"))
    .map((element) => `${element.tagName.toLowerCase()}:${normalizeText(element.textContent)}`);

const findSectionCard = (container: ParentNode, title: string, index = 0) =>
  Array.from(container.querySelectorAll("div"))
    .filter(
      (candidate) =>
        Array.from(candidate.querySelectorAll("p")).some((paragraph) =>
          hasExactText(paragraph, title)
        ) && Boolean(candidate.querySelector("select") || candidate.querySelector("input"))
    )
    .sort((left, right) => left.querySelectorAll("*").length - right.querySelectorAll("*").length)[
    index
  ];

const findInputByLabel = (container: ParentNode, label: string, index = 0) =>
  Array.from(container.querySelectorAll("label"))
    .filter((candidate) => hasExactText(candidate, label))
    .map((candidate) => candidate.querySelector('input:not([type="color"])'))
    .filter((candidate): candidate is HTMLInputElement => candidate instanceof HTMLInputElement)[
    index
  ];

const findSelectByLabel = (container: ParentNode, label: string, index = 0) =>
  Array.from(container.querySelectorAll("div"))
    .filter((candidate) => {
      const directTextChild = Array.from(candidate.children).find(
        (child) =>
          (child instanceof HTMLParagraphElement || child instanceof HTMLSpanElement) &&
          hasExactText(child, label)
      );
      return Boolean(directTextChild && candidate.querySelector("select"));
    })
    .map((candidate) => candidate.querySelector("select"))
    .filter((candidate): candidate is HTMLSelectElement => candidate instanceof HTMLSelectElement)[
    index
  ];

const findCheckboxByLabel = (container: ParentNode, label: string, index = 0) =>
  Array.from(container.querySelectorAll("div"))
    .filter(
      (candidate) =>
        Boolean(candidate.querySelector('input[type="checkbox"]')) &&
        Array.from(candidate.querySelectorAll("p")).some((paragraph) =>
          hasExactText(paragraph, label)
        )
    )
    .sort((left, right) => left.querySelectorAll("*").length - right.querySelectorAll("*").length)
    .map((candidate) => candidate.querySelector('input[type="checkbox"]'))
    .filter((candidate): candidate is HTMLInputElement => candidate instanceof HTMLInputElement)[
    index
  ];

const findColorFieldByLabel = (container: ParentNode, label: string, index = 0) =>
  Array.from(container.querySelectorAll("div"))
    .filter((candidate) => {
      const labelNode = Array.from(candidate.querySelectorAll("p")).find((paragraph) =>
        hasExactText(paragraph, label)
      );
      return Boolean(labelNode && candidate.querySelector('input[type="color"]'));
    })
    .sort((left, right) => left.querySelectorAll("*").length - right.querySelectorAll("*").length)[
    index
  ];

const findColorInputByLabel = (container: ParentNode, label: string, index = 0) =>
  findColorFieldByLabel(container, label, index)?.querySelector('input[type="color"]');

const findColorTextInputByLabel = (container: ParentNode, label: string, index = 0) =>
  findColorFieldByLabel(container, label, index)?.querySelector('input:not([type="color"])');

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("FooterWizardEditor keeps social setup bounded to visibility while preserving saved profiles", async () => {
  const { FooterWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/FooterEditors");

  let latestValue: FooterData = {
    columns: [
      {
        title: "Company",
        links: [
          { label: "Docs", href: "/docs" },
          { label: "API", href: "/api" },
        ],
      },
      { title: "Resources", links: [] },
      { title: "Hidden", links: [{ label: "Legacy", href: "/legacy" }] },
    ],
    brand: {
      logoText: "Coderso",
      tagline: "Build confidently",
    },
    legal: {
      privacyLabel: "Privacy",
      privacy: "/privacy",
    },
    socialEnabled: true,
    social: [{ type: "custom", href: "/community", label: "Community" }],
  };
  let currentVariant = "columns-2";

  const Harness = () => {
    const [value, setValue] = useState<FooterData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
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
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).not.toContain("Brand basics");
    expect(view.container.textContent).not.toContain("Legal basics");
    expect(view.container.textContent).toContain("Use Visual to edit brand logo");
    expect(view.container.textContent).toContain("Visible columns");
    expect(view.container.textContent).toContain("Company, Resources");
    expect(findInputByLabel(view.container, "Column 1 title")).toBeUndefined();
    expect(findCheckboxByLabel(view.container, "Show social links")).toBeUndefined();

    setSelectValue(findSelectByLabel(view.container, "Footer variant"), "minimal");
    expect(view.container.textContent).toContain("1 saved social profile stays preserved");
    expect(() => clickByText(view.container, "Add social")).toThrow();

    expect(currentVariant).toBe("minimal");
    expect(latestValue.columns?.[0]?.title).toBe("Company");
    expect(latestValue.brand).toMatchObject({
      logoText: "Coderso",
      tagline: "Build confidently",
    });
    expect(latestValue.legal).toMatchObject({
      privacyLabel: "Privacy",
      privacy: "/privacy",
    });
    expect(latestValue.socialEnabled).toBe(true);
    expect(latestValue.social).toEqual([
      { type: "custom", href: "/community", label: "Community" },
    ]);
  } finally {
    view.cleanup();
  }
});

test("FooterVisualEditor keeps link ordering deterministic and exposes beginner-safe visual controls", async () => {
  const { FooterVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/FooterEditors");

  let latestValue: FooterData = {
    columns: [
      {
        title: "Company",
        links: [
          { label: "Docs", href: "/docs", target: "_self" },
          { label: "API", href: "/api", target: "_blank" },
        ],
      },
      { title: "Resources", links: [{ label: "Blog", href: "/blog" }] },
    ],
    legal: {
      enabled: true,
      privacy: "/privacy",
      privacyLabel: "Privacy",
      terms: "/terms",
      termsLabel: "Terms",
    },
    socialEnabled: true,
    social: [{ type: "linkedin", href: "https://linkedin.com/company/example" }],
    style: {
      textColor: "#111827",
      linkColor: "#2563eb",
      surfaceColor: "#ffffff",
      borderColor: "var(--color-border)",
    },
    layout: {},
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
    expect(view.container.textContent).toContain(
      "Reorder columns in the live editor, where each visible footer region stays paired with its saved content."
    );
    expect(writablePathsForMode(view.container, "visual")).toContain("layout.sectionPaddingY");
    expect(writablePathsForMode(view.container, "visual")).toContain("style.linkColor");
    expect(unwrappedNativeControlsForMode(view.container, "visual")).toEqual([]);

    const firstLinkCard = findSectionCard(view.container, "Link 1");
    clickByText(firstLinkCard as ParentNode, "Move down");
    const movedFirstLinkCard = findSectionCard(view.container, "Link 1");
    setSelectValue(findSelectByLabel(movedFirstLinkCard as ParentNode, "Link target"), "_blank");

    const brandPanel = findPanelByTitle(view.container, "Brand and legal");
    setInputValue(findInputByLabel(brandPanel as ParentNode, "Brand name"), "Coderso");
    setInputValue(findInputByLabel(brandPanel as ParentNode, "Privacy label"), "Privacy policy");
    expect(findCheckboxByLabel(brandPanel as ParentNode, "Show legal strip")).toBeInstanceOf(
      HTMLInputElement
    );

    const colorsPanel = findPanelByTitle(view.container, "Colors and borders");
    expect(findColorInputByLabel(colorsPanel as ParentNode, "Text color")).toBeInstanceOf(
      HTMLInputElement
    );
    expect(findColorInputByLabel(colorsPanel as ParentNode, "Link color")).toBeInstanceOf(
      HTMLInputElement
    );
    expect(findColorTextInputByLabel(colorsPanel as ParentNode, "Link color")).toBeFalsy();
    expect(colorsPanel?.textContent).toContain("Saved custom color");
    setInputValue(findColorInputByLabel(colorsPanel as ParentNode, "Link color"), "#1d4ed8");
    clickByText(
      findColorFieldByLabel(colorsPanel as ParentNode, "Text color") as ParentNode,
      "Clear"
    );

    const typographyPanel = findPanelByTitle(view.container, "Typography and link styling");
    setSelectValue(findSelectByLabel(typographyPanel as ParentNode, "Link underline"), "always");
    setSelectValue(
      findSelectByLabel(typographyPanel as ParentNode, "Link font weight"),
      "semibold"
    );
    setSelectValue(findSelectByLabel(typographyPanel as ParentNode, "Link letter spacing"), "wide");
    expect(
      findColorTextInputByLabel(typographyPanel as ParentNode, "Link hover color")
    ).toBeFalsy();
    setInputValue(
      findColorInputByLabel(typographyPanel as ParentNode, "Link hover color"),
      "#2563ec"
    );

    const layoutPanel = findPanelByTitle(view.container, "Layout and spacing");
    setSelectValue(findSelectByLabel(layoutPanel as ParentNode, "Columns alignment"), "center");
    setSelectValue(findSelectByLabel(layoutPanel as ParentNode, "Legal row alignment"), "left");
    setSelectValue(findSelectByLabel(layoutPanel as ParentNode, "Horizontal padding"), "8");
    setSelectValue(findSelectByLabel(layoutPanel as ParentNode, "Column breakpoint"), "lg");
    setSelectValue(findSelectByLabel(layoutPanel as ParentNode, "Section padding"), "12");

    const utilityPanel = findPanelByTitle(view.container, "Utility strip");
    expect(utilityPanel?.textContent).toContain(
      "Footer owns contact details and an optional back-to-top action"
    );
    setInputValue(findInputByLabel(utilityPanel as ParentNode, "Address"), "123 Market Street");
    setInputValue(findInputByLabel(utilityPanel as ParentNode, "Phone"), "+1 415 555 0100");
    setInputValue(findInputByLabel(utilityPanel as ParentNode, "Email"), "hello@example.com");
    const backToTopToggle = findCheckboxByLabel(
      utilityPanel as ParentNode,
      "Show back-to-top action"
    );
    expect(backToTopToggle).toBeInstanceOf(HTMLInputElement);
    React.act(() => {
      backToTopToggle?.click();
    });
    setInputValue(
      findInputByLabel(utilityPanel as ParentNode, "Back-to-top label"),
      "Return to top"
    );

    expect(latestValue.columns[0]?.links[0]).toMatchObject({
      label: "API",
      href: "/api",
      target: "_blank",
    });
    expect(latestValue.brand?.logoText).toBe("Coderso");
    expect(latestValue.legal?.privacyLabel).toBe("Privacy policy");
    expect(latestValue.style).toMatchObject({
      linkColor: "#1d4ed8",
      linkUnderline: "always",
      linkFontWeight: "semibold",
      linkLetterSpacing: "wide",
      linkHoverColor: "#2563ec",
    });
    expect(latestValue.layout).toMatchObject({
      align: "center",
      legalAlign: "left",
      paddingX: "8",
      columnBreakpoint: "lg",
      sectionPaddingY: "12",
    });
    expect(latestValue.contact).toMatchObject({
      address: "123 Market Street",
      phone: "+1 415 555 0100",
      email: "hello@example.com",
    });
    expect(latestValue.backToTop).toMatchObject({
      enabled: true,
      label: "Return to top",
    });
    expect(latestValue.style?.textColor).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("FooterVisualEditor reorders columns through live block patching and keeps slot ownership aligned", async () => {
  const { FooterVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/FooterEditors");

  type FooterEditorBlock = WidgetBlock & {
    variant: string;
    data: FooterData;
    slots: Record<string, WidgetBlock[]>;
  };

  let latestBlock: FooterEditorBlock = {
    id: "footer-live",
    type: "footer",
    variant: "columns-2",
    data: {
      columns: [
        { title: "Company", links: [] },
        { title: "Resources", links: [] },
      ],
    } satisfies FooterData,
    slots: {
      "column-1": [{ id: "company-slot", type: "badge", data: { label: "Company slot" } }],
      "column-2": [{ id: "resources-slot", type: "badge", data: { label: "Resources slot" } }],
    },
  };

  const Harness = () => {
    const [block, setBlock] = useState(latestBlock);

    return (
      <FooterVisualEditor
        value={block.data}
        onChange={() => undefined}
        variant={String(block.variant ?? "columns-2")}
        onBlockPatch={(patch) => {
          const next = (
            typeof patch === "function" ? patch(block) : { ...block, ...patch }
          ) as FooterEditorBlock;
          latestBlock = next;
          setBlock(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("slot payloads move with the visible columns");
    clickByText(view.container, "Move right", 0);

    expect(latestBlock.data.columns.map((column) => column.title)).toEqual([
      "Resources",
      "Company",
    ]);
    expect(latestBlock.slots["column-1"]?.[0]?.id).toBe("resources-slot");
    expect(latestBlock.slots["column-2"]?.[0]?.id).toBe("company-slot");
  } finally {
    view.cleanup();
  }
});

test("FooterAdvancedEditor is read-only diagnostics while Visual owns layout tokens", async () => {
  const { FooterAdvancedEditor, FooterVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/FooterEditors");

  let latestValue: FooterData = {
    columns: [{ title: "Company", links: [] }],
    layout: {},
  };

  const Harness = () => {
    const [value, setValue] = useState<FooterData>(latestValue);

    return (
      <>
        <FooterVisualEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant="minimal"
        />
        <FooterAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            setValue(next);
          }}
          variant="minimal"
          onVariantChange={() => undefined}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect(writablePathsForMode(view.container, "visual")).toContain("layout.sectionPaddingY");
    expect(writablePathsForMode(view.container, "advanced")).toEqual([]);

    const advancedPanel = findPanelByTitle(view.container, "Layout diagnostics");
    expect(advancedPanel?.querySelector("input, select, textarea, button")).toBeNull();
    expect(advancedPanel?.textContent).toContain("Columns alignment");
    expect(advancedPanel?.textContent).toContain("Horizontal padding");

    const visualPanel = findPanelByTitle(view.container, "Layout and spacing");
    setSelectValue(findSelectByLabel(visualPanel as ParentNode, "Columns alignment"), "center");
    setSelectValue(findSelectByLabel(visualPanel as ParentNode, "Legal row alignment"), "left");
    setSelectValue(findSelectByLabel(visualPanel as ParentNode, "Horizontal padding"), "8");
    setSelectValue(findSelectByLabel(visualPanel as ParentNode, "Column breakpoint"), "lg");
    setSelectValue(findSelectByLabel(visualPanel as ParentNode, "Section padding"), "12");

    expect(latestValue.layout).toMatchObject({
      align: "center",
      legalAlign: "left",
      paddingX: "8",
      columnBreakpoint: "lg",
      sectionPaddingY: "12",
    });
  } finally {
    view.cleanup();
  }
});
