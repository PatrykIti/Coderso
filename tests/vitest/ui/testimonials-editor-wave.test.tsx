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
    Array.from(section.querySelectorAll("p")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );

const findMediaPickers = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-media-picker-value]"));

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

test("TestimonialsWizardEditor covers header copy, social proof fields, and avatar media picking", async () => {
  const view = renderEditor(TestimonialsWizardEditor, { initialValue: testimonialsDefaults });

  try {
    const variantSelect = findSelectByOptions(view.container, [
      "grid",
      "spotlight",
      "slider-static",
    ]);
    setSelectValue(variantSelect, "spotlight");
    expect(view.getLatestVariant()).toBe("spotlight");
    expect(view.getLatestValue().testimonials).toHaveLength(2);

    setInputValue(findInputsByPlaceholder(view.container, "Customer stories")[0], "Proof");
    setInputValue(
      findInputsByPlaceholder(view.container, "Trusted by teams that ship fast")[0],
      "Trusted across launches"
    );
    setTextareaValue(
      findTextareasByPlaceholder(
        view.container,
        "Use real customer voices to build trust and reduce hesitation."
      )[0],
      "Detailed trust copy"
    );

    setInputValue(findInputsByPlaceholder(view.container, "Role or position")[0], "Founder");
    setInputValue(findInputsByPlaceholder(view.container, "Acme Studio")[0], "North Labs");
    setSelectValue(findSelectByOptions(view.container, ["0", "1", "2", "3", "4", "5"]), "4");

    const avatarInput = findInputsByPlaceholder(
      view.container,
      "https://cdn.example.com/avatar.jpg"
    )[0];
    setInputValue(avatarInput, "javascript:alert(1)");
    expect(view.container.textContent).toContain("Unsafe avatar URLs are not rendered publicly");
    expect(view.getLatestValue().testimonials[0]?.avatar).toBeUndefined();

    setInputValue(avatarInput, "/media/safe-avatar.jpg");
    expect(view.getLatestValue().testimonials[0]?.avatar).toBe("/media/safe-avatar.jpg");

    setInputValue(avatarInput, "//cdn.example.com/avatar.jpg");
    expect(view.getLatestValue().testimonials[0]?.avatar).toBe("/media/safe-avatar.jpg");

    const firstPicker = findMediaPickers(view.container)[0];
    clickButton(findButtonsByText(firstPicker ?? view.container, "pick-avatar-media")[0]);
    await flushPromises();

    expect(view.getLatestValue().header).toMatchObject({
      eyebrow: "Proof",
      title: "Trusted across launches",
      description: "Detailed trust copy",
    });
    expect(view.getLatestValue().testimonials[0]).toMatchObject({
      role: "Founder",
      sourceLabel: "North Labs",
      rating: 4,
      avatar: "https://cdn.example.com/avatar-picked.jpg",
    });
    expect(mediaClient.listMediaCached).toHaveBeenCalledWith({ force: false });
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

    const avatarInput = findInputsByPlaceholder(
      contentSection,
      "https://cdn.example.com/avatar.jpg"
    )[0];
    setInputValue(avatarInput, "data:text/plain;base64,Zm9v");
    expect(view.container.textContent).toContain("Unsafe avatar URLs are not rendered publicly");
    expect(view.getLatestValue().testimonials[0]?.avatar).toBeUndefined();

    setInputValue(avatarInput, "/media/visual-avatar.jpg");
    expect(view.getLatestValue().testimonials[0]?.avatar).toBe("/media/visual-avatar.jpg");

    setInputValue(avatarInput, "//cdn.example.com/avatar.jpg");
    expect(view.getLatestValue().testimonials[0]?.avatar).toBe("/media/visual-avatar.jpg");

    const avatarPicker = findMediaPickers(contentSection)[0];
    clickButton(findButtonsByText(avatarPicker ?? contentSection, "pick-unsupported-media")[0]);
    await flushPromises();
    expect(view.container.textContent).toContain("selected media must be an image asset");
    expect(view.getLatestValue().testimonials[0]?.avatar).toBe("/media/visual-avatar.jpg");

    clickButton(findButtonsByText(avatarPicker ?? contentSection, "pick-missing-media")[0]);
    await flushPromises();
    expect(view.container.textContent).toContain("failed to resolve selected media");

    clickButton(findButtonsByText(avatarPicker ?? contentSection, "pick-avatar-media")[0]);
    await flushPromises();
    expect(view.getLatestValue().testimonials[0]?.avatar).toBe(
      "https://cdn.example.com/avatar-picked.jpg"
    );
    expect((avatarInput as HTMLInputElement).value).toBe(
      "https://cdn.example.com/avatar-picked.jpg"
    );

    clickButton(findButtonsByText(avatarPicker ?? contentSection, "clear-media")[0]);
    await flushPromises();
    expect(view.getLatestValue().testimonials[0]?.avatar).toBeUndefined();
    expect((avatarInput as HTMLInputElement).value).toBe("");

    clickButton(findButtonsByText(contentSection, "Set spotlight")[0]);
    expect(view.getLatestValue().layout?.spotlightItemId).toBe("t-2");
    clickButton(findButtonsByText(contentSection, "Set spotlight")[0]);
    expect(view.getLatestValue().layout?.spotlightItemId).toBe("t-1");

    const richQuoteArea = view.container.querySelector('[data-rich-text-adapter="true"]');
    setTextareaValue(richQuoteArea, '<p><strong>Proof</strong> <a href="/story">more</a></p>');

    const surfaceSection = findSectionByTitle(view.container, "Section surface and typography");
    if (!(surfaceSection instanceof HTMLElement)) throw new Error("Missing surface section");

    const backgroundUrlInput = findInputsByPlaceholder(
      surfaceSection,
      "https://cdn.example.com/section-bg.jpg"
    )[0];
    setInputValue(backgroundUrlInput, "data:text/plain,hello");
    expect(view.container.textContent).toContain("Unsafe background URLs are ignored at runtime");

    const backgroundPicker = view.container.querySelector(
      '[data-testimonials-background-picker="true"]'
    );
    const backgroundPickerState = backgroundPicker?.querySelector("[data-media-picker-value]");
    clickButton(findButtonsByText(backgroundPicker ?? view.container, "pick-background-media")[0]);
    await flushPromises();
    expect(view.getLatestValue().style?.backgroundImage).toBe("/media/testimonials-bg.jpg");
    expect(backgroundPickerState?.getAttribute("data-media-picker-value")).toBe("media-background");

    setInputValue(backgroundUrlInput, "/media/manual-bg.jpg");
    expect(view.getLatestValue().style?.backgroundImage).toBe("/media/manual-bg.jpg");
    expect(backgroundPickerState?.getAttribute("data-media-picker-value")).toBe("");

    setSelectValue(findSelectByOptions(surfaceSection, ["none", "soft", "warm", "cool"]), "cool");
    setSelectValue(findSelectByOptions(surfaceSection, ["plain", "soft", "contrast"]), "contrast");
    setSelectValue(findSelectByOptions(surfaceSection, ["left", "center", "right"]), "right");
    setSelectValue(findSelectByOptions(surfaceSection, ["sm", "md", "lg"]), "lg");
    setSelectValue(findSelectByOptions(surfaceSection, ["none", "sm", "md", "lg", "xl"]), "xl");
    setSelectValue(findSelectsByOptions(surfaceSection, ["none", "sm", "md"])[1], "md");

    setInputValue(findInputsByPlaceholder(view.container, "var(--color-bg)")[0], "#ffffff");
    setInputValue(findInputsByPlaceholder(view.container, "var(--color-text)")[0], "#ffffff");
    setInputValue(findInputsByPlaceholder(view.container, "var(--color-primary)")[0], "#ffffff");
    expect(view.container.textContent).toContain("Text contrast advisory");
    expect(view.container.textContent).toContain("Accent contrast advisory");

    const ctaVisibilitySelect = findSelectByOptions(view.container, ["disabled", "enabled"]);
    setSelectValue(ctaVisibilitySelect, "enabled");
    setInputValue(findInputsByPlaceholder(view.container, "/case-studies")[0], "/stories");
    setInputValue(findInputsByPlaceholder(view.container, "Read more stories")[0], "Read proof");
    setSelectValue(findSelectByOptions(view.container, ["same-tab", "new-tab"]), "new-tab");
    setSelectValue(findSelectByOptions(view.container, ["primary", "secondary", "link"]), "link");
    setSelectValue(findSelectByOptions(view.container, ["none", "dots"]), "dots");
    setSelectValue(
      findSelectByOptions(view.container, ["hide-empty", "label-empty", "stars"]),
      "label-empty"
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
      backgroundImage: "/media/manual-bg.jpg",
      sectionGradient: "cool",
      backgroundTone: "contrast",
      headerAlign: "right",
      titleSize: "lg",
      cardRadius: "xl",
      cardBorderWidth: "md",
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
  } finally {
    view.cleanup();
  }
});

test("TestimonialsAdvancedEditor previews invalid imports, applies valid imports, and generates exports", () => {
  const view = renderEditor(TestimonialsAdvancedEditor, {
    initialValue: {
      ...testimonialsDefaults,
      testimonials: [
        { id: "t-1", quote: "A", author: "Alice", rating: 5 },
        { id: "t-2", quote: "B", author: "Bob", rating: 4 },
        { id: "t-3", quote: "C", author: "Cara", rating: 3 },
        { id: "t-4", quote: "D", author: "Drew", rating: 5 },
      ],
      layout: { spotlightItemId: "missing" },
    },
    initialVariant: "spotlight",
  });

  try {
    setSelectValue(findSelectByOptions(view.container, ["none", "load-more"]), "load-more");
    setSelectValue(
      findSelectByOptions(view.container, [
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
      findInputsByPlaceholder(view.container, "Load more testimonials")[0],
      "More proof"
    );
    setSelectValue(
      findSelectByOptions(view.container, ["hide-empty", "label-empty", "stars"]),
      "stars"
    );
    setSelectValue(findSelectByOptions(view.container, ["none", "dots"]), "dots");
    setSelectValue(findSelectByOptions(view.container, ["none", "sm", "md", "lg"]), "lg");

    clickButton(findButtonsByText(view.container, "Normalize list to variant baseline")[0]);
    expect(view.getLatestValue().testimonials).toHaveLength(2);

    clickButton(findButtonsByText(view.container, "Normalize full payload")[0]);
    expect(view.getLatestValue().layout?.spotlightItemId).toBe("t-1");

    const importArea = findTextareasByPlaceholder(
      view.container,
      '[{"quote":"Great support","author":"Alex"}]'
    )[0];
    setTextareaValue(importArea, JSON.stringify([{ quote: "Only one", author: "Alex" }]));
    clickButton(findButtonsByText(view.container, "Preview import")[0]);
    expect(view.container.textContent).toContain("Import requires at least 2 testimonials");
    expect(view.getLatestValue().testimonials).toHaveLength(2);

    setTextareaValue(
      importArea,
      JSON.stringify([{ quote: "Bad row", author: "Alex", unknownField: true }])
    );
    clickButton(findButtonsByText(view.container, "Preview import")[0]);
    expect(view.container.textContent).toContain("Unknown field unknownField");
    expect(view.getLatestValue().testimonials).toHaveLength(2);

    setTextareaValue(
      importArea,
      JSON.stringify([
        { quote: "Great support", author: "Alex", rating: 4, sourceLabel: "Acme" },
        { quote: "Fast setup", author: "Riley", rating: 5 },
      ])
    );
    clickButton(findButtonsByText(view.container, "Apply import")[0]);
    expect(view.getLatestValue().testimonials).toHaveLength(2);
    expect(view.getLatestValue().testimonials[0]).toMatchObject({
      author: "Alex",
      sourceLabel: "Acme",
      rating: 4,
    });
    expect(view.getLatestValue().pagination).toMatchObject({
      mode: "load-more",
      pageSize: 4,
      loadMoreLabel: "More proof",
    });
    expect(view.getLatestValue().behavior).toMatchObject({
      ratingDisplay: "stars",
      sliderNavigation: "dots",
    });
    expect(view.getLatestValue().style?.spacing).toBe("lg");

    setSelectValue(findSelectByOptions(view.container, ["json", "csv"]), "csv");
    clickButton(findButtonsByText(view.container, "Generate export")[0]);
    const exportArea = findTextareasByPlaceholder(
      view.container,
      "Generated export will appear here."
    )[0];
    expect(exportArea?.value).toContain("id,quote,quoteHtml,author,role,avatar,rating,sourceLabel");
    expect(exportArea?.value).toContain("Alex");
  } finally {
    view.cleanup();
  }
});
