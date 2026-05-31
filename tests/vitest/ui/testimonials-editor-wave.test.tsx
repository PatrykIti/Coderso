// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import * as mediaClient from "../../../core/admin/services/mediaClient";
import {
  TestimonialsAdvancedEditor,
  TestimonialsVisualEditor,
  TestimonialsWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TestimonialsEditors";
import type { TestimonialsData } from "../../../core/widgets/core/testimonials";
import { testimonialsDefaults } from "../../../core/widgets/core/testimonials";

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
    readOnly,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      className={className}
      readOnly={readOnly}
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
    SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectItem: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
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
    readOnly,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    readOnly?: boolean;
    [key: string]: unknown;
  }) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={className}
      readOnly={readOnly}
      {...props}
    />
  ),
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async () => [
    {
      id: "media-avatar",
      url: "https://cdn.example.com/avatar-picked.jpg",
      type: "image",
      mimeType: "image/jpeg",
    },
    {
      id: "media-background",
      url: "/media/testimonials-bg.jpg",
      type: "image",
      mimeType: "image/jpeg",
    },
    {
      id: "media-missing",
      type: "image",
      mimeType: "image/jpeg",
    },
    {
      id: "media-pdf",
      url: "/media/not-image.pdf",
      type: "file",
      mimeType: "application/pdf",
    },
  ]),
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "page-stories",
      title: "Stories",
      slug: "stories",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
  ]),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) => (
    <div data-media-picker-value={String(value ?? "")}>
      <button type="button" onClick={() => onChange("media-avatar")}>
        pick-avatar-media
      </button>
      <button type="button" onClick={() => onChange("media-background")}>
        pick-background-media
      </button>
      <button type="button" onClick={() => onChange("media-missing")}>
        pick-missing-media
      </button>
      <button type="button" onClick={() => onChange("media-pdf")}>
        pick-unsupported-media
      </button>
      <button type="button" onClick={() => onChange(null)}>
        clear-media
      </button>
    </div>
  ),
}));

vi.mock("@/ui/posts/editor/richtext/PostRichTextAdapter", () => ({
  PostRichTextAdapter: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      data-rich-text-adapter="true"
    />
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-confirm-dialog="true">
        <p>{title}</p>
        <p>{description}</p>
        <button type="button" onClick={() => onOpenChange(false)}>
          cancel-remove
        </button>
        <button type="button" onClick={onConfirm}>
          confirm-remove
        </button>
      </div>
    ) : null,
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

const flushPromises = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
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

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
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

const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  React.act(() => {
    element.click();
  });
};

const findButtonsByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).filter((button) =>
    button.textContent?.includes(text)
  );

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareasByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).filter(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const getDestinationSelect = (container: ParentNode, fieldId: string) => {
  const select = container.querySelector(`[data-link-destination-field="${fieldId}"] select`);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing destination select "${fieldId}"`);
  }
  return select;
};

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

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
    Array.from(section.querySelectorAll("h3, p")).some(
      (node) => normalizeText(node.textContent) === normalizeText(title)
    )
  );

const findMediaPickers = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-media-picker-value]"));

const findInputByAriaLabel = (container: ParentNode, label: string) => {
  const input = container.querySelector(`input[aria-label="${label}"]`);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input with aria-label "${label}"`);
  }
  return input;
};

const writableControlPaths = (container: ParentNode) =>
  Array.from(
    container.querySelectorAll(
      '[data-widget-control-path]:not([data-widget-control-readonly="true"])'
    )
  )
    .map((element) => element.getAttribute("data-widget-control-path"))
    .filter((path): path is string => Boolean(path));

const writableControlCount = (container: ParentNode, path: string) =>
  writableControlPaths(container).filter((candidate) => candidate === path).length;

const readonlyControlPaths = (container: ParentNode) =>
  Array.from(container.querySelectorAll('[data-widget-control-readonly="true"]'))
    .map((element) => element.getAttribute("data-widget-control-path"))
    .filter((path): path is string => Boolean(path));

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.mocked(mediaClient.listMediaCached).mockClear();
});

type TestimonialsEditorComponentProps = {
  value: TestimonialsData;
  onChange: (next: TestimonialsData) => void;
  variant: string;
  onVariantChange?: (next: string) => void;
};

const renderEditor = (
  Component: React.ComponentType<TestimonialsEditorComponentProps>,
  {
    initialValue,
    initialVariant = "grid",
    withVariantChange = true,
  }: {
    initialValue: TestimonialsData;
    initialVariant?: string;
    withVariantChange?: boolean;
  }
) => {
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
      <Component
        value={value}
        onChange={handleChange}
        variant={variant}
        onVariantChange={handleVariantChange}
      />
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

test("TestimonialsWizardEditor is now a read-only starter summary", async () => {
  const view = renderEditor(TestimonialsWizardEditor, { initialValue: testimonialsDefaults });

  try {
    expect(view.container.textContent).toContain("Testimonials style");
    expect(view.container.textContent).toContain("Grid");
    expect(view.container.querySelector("select")).toBeNull();
    expect(view.getLatestVariant()).toBe("grid");
    expect(view.getLatestValue().testimonials).toHaveLength(
      testimonialsDefaults.testimonials.length
    );
    expect(writableControlPaths(view.container)).toEqual([]);
    expect(writableControlCount(view.container, "testimonials.count")).toBe(0);
    expect(readonlyControlPaths(view.container)).toEqual(
      expect.arrayContaining(["variant", "testimonials.count"])
    );
    expect(view.container.textContent).toContain(
      "Use Visual to write the section eyebrow, title, description, quotes, author names, ratings, avatars, pagination, and CTA."
    );
    expect(findInputsByPlaceholder(view.container, "Customer stories")[0]).toBeUndefined();
    expect(
      findInputsByPlaceholder(view.container, "Trusted by teams that ship fast")[0]
    ).toBeUndefined();
    expect(
      findTextareasByPlaceholder(
        view.container,
        "Use real customer voices to build trust and reduce hesitation."
      )[0]
    ).toBeUndefined();
    expect(findInputsByPlaceholder(view.container, "Role or position")[0]).toBeUndefined();
    expect(findInputsByPlaceholder(view.container, "Acme Studio")[0]).toBeUndefined();
    expect(
      findSelectsByOptions(view.container, [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
      ])
    ).toHaveLength(0);
    expect(view.getLatestValue()).toEqual(testimonialsDefaults);
  } finally {
    view.cleanup();
  }
});

test("TestimonialsVisualEditor syncs testimonial count when Visual changes the variant owner", () => {
  const view = renderEditor(TestimonialsVisualEditor, {
    initialValue: testimonialsDefaults,
    initialVariant: "grid",
  });

  try {
    const variantSection = findSectionByTitle(view.container, "Variant and layout structure");
    if (!(variantSection instanceof HTMLElement)) throw new Error("Missing variant section");
    expect(variantSection.getAttribute("data-widget-editor-section")).toBe(
      "testimonials.visual.variant-layout"
    );

    clickButton(findButtonsByText(variantSection, "Spotlight")[0]);
    expect(view.getLatestVariant()).toBe("spotlight");
    expect(view.getLatestValue().testimonials).toHaveLength(2);

    clickButton(findButtonsByText(variantSection, "Grid")[0]);
    expect(view.getLatestVariant()).toBe("grid");
    expect(view.getLatestValue().testimonials).toHaveLength(3);
  } finally {
    view.cleanup();
  }
});

test("TestimonialsVisualEditor handles spotlight pinning, remove confirmation, background media, rich quote, CTA, and slider behavior", async () => {
  const view = renderEditor(TestimonialsVisualEditor, {
    initialValue: {
      ...testimonialsDefaults,
      testimonials: [
        { id: "t-1", quote: "Quote A", author: "Alice", rating: 5 },
        { id: "t-2", quote: "Quote B", author: "Bob", rating: 4 },
        { id: "t-3", quote: "Quote C", author: "Cara", rating: 0 },
      ],
    },
    initialVariant: "spotlight",
  });

  try {
    const contentSection = findSectionByTitle(view.container, "Testimonials content and ratings");
    if (!(contentSection instanceof HTMLElement)) throw new Error("Missing content section");
    expect(contentSection.getAttribute("data-widget-editor-section")).toBe(
      "testimonials.visual.content-ratings"
    );

    expect(
      findInputsByPlaceholder(contentSection, "https://cdn.example.com/avatar.jpg")
    ).toHaveLength(0);
    expect(view.getLatestValue().testimonials[0]?.avatar).toBeUndefined();

    const avatarPicker = findMediaPickers(contentSection)[0];
    clickButton(findButtonsByText(avatarPicker ?? contentSection, "pick-unsupported-media")[0]);
    await flushPromises();
    expect(view.container.textContent).toContain("selected media must be an image asset");
    expect(view.getLatestValue().testimonials[0]?.avatar).toBeUndefined();

    clickButton(findButtonsByText(avatarPicker ?? contentSection, "pick-missing-media")[0]);
    await flushPromises();
    expect(view.container.textContent).toContain("failed to resolve selected media");

    clickButton(findButtonsByText(avatarPicker ?? contentSection, "pick-avatar-media")[0]);
    await flushPromises();
    expect(view.getLatestValue().testimonials[0]?.avatar).toBe(
      "https://cdn.example.com/avatar-picked.jpg"
    );

    clickButton(findButtonsByText(avatarPicker ?? contentSection, "clear-media")[0]);
    await flushPromises();
    expect(view.getLatestValue().testimonials[0]?.avatar).toBeUndefined();

    clickButton(findButtonsByText(contentSection, "Set spotlight")[0]);
    expect(view.getLatestValue().layout?.spotlightItemId).toBe("t-2");
    clickButton(findButtonsByText(contentSection, "Set spotlight")[0]);
    expect(view.getLatestValue().layout?.spotlightItemId).toBe("t-1");

    const richQuoteArea = view.container.querySelector('[data-rich-text-adapter="true"]');
    setTextareaValue(richQuoteArea, '<p><strong>Proof</strong> <a href="/story">more</a></p>');

    const surfaceSection = findSectionByTitle(view.container, "Section surface and typography");
    if (!(surfaceSection instanceof HTMLElement)) throw new Error("Missing surface section");
    expect(surfaceSection.getAttribute("data-widget-editor-section")).toBe(
      "testimonials.visual.surface-typography"
    );
    expect(writableControlPaths(view.container)).toEqual(
      expect.arrayContaining([
        "variant",
        "header.eyebrow",
        "header.title",
        "header.description",
        "testimonials.count",
        "testimonials",
        "testimonials.quote",
        "testimonials.quoteHtml",
        "testimonials.author",
        "testimonials.role",
        "testimonials.avatar",
        "testimonials.rating",
        "testimonials.sourceLabel",
        "style.sectionBackground",
        "style.cardSurface",
        "style.textColor",
        "cta.href",
        "pagination.mode",
        "pagination.pageSize",
        "pagination.loadMoreLabel",
      ])
    );
    expect(writableControlCount(view.container, "testimonials.quote")).toBe(3);
    expect(writableControlCount(view.container, "testimonials.avatar")).toBe(3);

    expect(
      findInputsByPlaceholder(surfaceSection, "https://cdn.example.com/section-bg.jpg")
    ).toHaveLength(0);

    const backgroundPicker = view.container.querySelector(
      '[data-testimonials-background-picker="true"]'
    );
    const backgroundPickerState = backgroundPicker?.querySelector("[data-media-picker-value]");
    clickButton(findButtonsByText(backgroundPicker ?? view.container, "pick-background-media")[0]);
    await flushPromises();
    expect(view.getLatestValue().style?.backgroundImage).toBe("/media/testimonials-bg.jpg");
    expect(backgroundPickerState?.getAttribute("data-media-picker-value")).toBe("media-background");

    setSelectValue(findSelectByOptions(surfaceSection, ["none", "soft", "warm", "cool"]), "cool");
    setSelectValue(findSelectByOptions(surfaceSection, ["plain", "soft", "contrast"]), "contrast");
    setSelectValue(findSelectByOptions(surfaceSection, ["left", "center", "right"]), "right");
    setSelectValue(findSelectByOptions(surfaceSection, ["sm", "md", "lg"]), "lg");
    setSelectValue(findSelectByOptions(surfaceSection, ["none", "sm", "md", "lg", "xl"]), "xl");
    setSelectValue(findSelectsByOptions(surfaceSection, ["none", "sm", "md"])[1], "md");

    const rawColorInputs = Array.from(view.container.querySelectorAll("input")).filter((input) =>
      input.getAttribute("placeholder")?.includes("var(")
    );
    expect(rawColorInputs).toHaveLength(0);
    setInputValue(findInputByAriaLabel(view.container, "Card background swatch"), "#fefefe");
    setInputValue(findInputByAriaLabel(view.container, "Text color swatch"), "#ffffff");
    setInputValue(findInputByAriaLabel(view.container, "Accent color swatch"), "#ffffff");
    expect(view.container.textContent).toContain("Text contrast advisory");
    expect(view.container.textContent).toContain("Accent contrast advisory");

    const ctaVisibilitySelect = findSelectByOptions(view.container, ["disabled", "enabled"]);
    setSelectValue(ctaVisibilitySelect, "enabled");
    await flushPromises();
    expect(findInputsByPlaceholder(view.container, "/case-studies")).toHaveLength(0);
    setSelectValue(
      getDestinationSelect(view.container, "testimonials-cta-destination"),
      "page-stories"
    );
    setInputValue(findInputsByPlaceholder(view.container, "Read more stories")[0], "Read proof");
    setSelectValue(findSelectByOptions(view.container, ["same-tab", "new-tab"]), "new-tab");
    setSelectValue(findSelectByOptions(view.container, ["primary", "secondary", "link"]), "link");
    setSelectValue(findSelectByOptions(view.container, ["none", "dots"]), "dots");
    setSelectValue(
      findSelectByOptions(view.container, ["hide-empty", "label-empty", "stars"]),
      "label-empty"
    );
    const paginationSection = findSectionByTitle(view.container, "Pagination and load more");
    if (!(paginationSection instanceof HTMLElement)) throw new Error("Missing pagination section");
    expect(paginationSection.getAttribute("data-widget-editor-section")).toBe(
      "testimonials.visual.pagination-load-more"
    );
    setSelectValue(findSelectByOptions(paginationSection, ["none", "load-more"]), "load-more");
    setSelectValue(
      findSelectByOptions(paginationSection, [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
      ]),
      "4"
    );
    setInputValue(
      findInputsByPlaceholder(paginationSection, "Load more testimonials")[0],
      "More proof"
    );

    clickButton(findButtonsByText(contentSection, "Remove")[2]);
    expect(view.getLatestValue().testimonials).toHaveLength(3);
    expect(view.container.textContent).toContain("Remove testimonial");
    clickButton(findButtonsByText(view.container, "cancel-remove")[0]);
    expect(view.getLatestValue().testimonials).toHaveLength(3);

    clickButton(findButtonsByText(contentSection, "Remove")[2]);
    clickButton(findButtonsByText(view.container, "confirm-remove")[0]);
    expect(view.getLatestValue().testimonials).toHaveLength(2);

    expect(view.getLatestValue().testimonials[0]).toMatchObject({
      quoteHtml: '<p><strong>Proof</strong> <a href="/story">more</a></p>',
    });
    expect(view.getLatestValue().style).toMatchObject({
      backgroundImage: "/media/testimonials-bg.jpg",
      sectionGradient: "cool",
      backgroundTone: "contrast",
      headerAlign: "right",
      titleSize: "lg",
      cardRadius: "xl",
      cardBorderWidth: "md",
      cardSurface: "#fefefe",
      textColor: "#ffffff",
      accentColor: "#ffffff",
    });
    expect(view.getLatestValue().cta).toMatchObject({
      enabled: true,
      label: "Read proof",
      href: "/stories",
      target: "new-tab",
      style: "link",
    });
    expect(view.getLatestValue().behavior).toMatchObject({
      sliderNavigation: "dots",
      ratingDisplay: "label-empty",
    });
    expect(view.getLatestValue().pagination).toMatchObject({
      mode: "load-more",
      pageSize: 4,
      loadMoreLabel: "More proof",
    });
  } finally {
    view.cleanup();
  }
});

test("TestimonialsAdvancedEditor is read-only diagnostics without authoring inputs", () => {
  const view = renderEditor(TestimonialsAdvancedEditor, {
    initialValue: {
      ...testimonialsDefaults,
      testimonials: [
        { id: "t-1", quote: "A", author: "Alice", avatar: "/media/a.jpg", rating: 5 },
        { id: "t-2", quote: "B", author: "Bob", rating: 0 },
        { id: "t-3", quote: "C", author: "Cara", rating: 4 },
      ],
      pagination: {
        mode: "load-more",
        pageSize: 3,
        loadMoreLabel: "More proof",
      },
      behavior: {
        sliderNavigation: "dots",
        ratingDisplay: "stars",
      },
      style: {
        ...testimonialsDefaults.style,
        spacing: "lg",
      },
    },
    initialVariant: "grid",
  });

  try {
    expect(view.container.textContent).toContain("Runtime summary");
    expect(view.container.textContent).toContain("Display settings");
    expect(view.container.textContent).toContain("Content health");
    expect(
      findSectionByTitle(view.container, "Runtime summary")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("testimonials.advanced.runtime-summary");
    expect(
      findSectionByTitle(view.container, "Display settings")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("testimonials.advanced.display-settings");
    expect(
      findSectionByTitle(view.container, "Content health")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("testimonials.advanced.content-health");
    expect(view.container.textContent).toContain("lg");
    expect(view.container.textContent).toContain("stars");
    expect(view.container.textContent).toContain("dots (inactive outside slider-static)");
    expect(view.container.textContent).toContain("load-more");
    expect(view.container.textContent).toContain("More proof");
    expect(view.container.querySelectorAll("input, select, textarea, button, pre")).toHaveLength(0);
    expect(writableControlPaths(view.container)).toHaveLength(0);
    expect(readonlyControlPaths(view.container)).toEqual(
      expect.arrayContaining([
        "variant",
        "testimonials",
        "layout.spotlightItemId",
        "style.spacing",
        "behavior.ratingDisplay",
        "behavior.sliderNavigation",
        "pagination.mode",
        "pagination.pageSize",
        "pagination.loadMoreLabel",
        "testimonials.avatar",
        "testimonials.rating",
        "cta.enabled",
      ])
    );
    expect(findSelectsByOptions(view.container, ["none", "sm", "md", "lg"])).toHaveLength(0);
    expect(
      findSelectsByOptions(view.container, ["hide-empty", "label-empty", "stars"])
    ).toHaveLength(0);
    expect(findSelectsByOptions(view.container, ["none", "dots"])).toHaveLength(0);
    expect(view.container.textContent).not.toMatch(/\b(JSON|CSV|HTML)\b/);
    expect(view.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
