// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
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
    SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
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

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async () => [
    {
      id: "media-image-1",
      key: "rich-text/story.jpg",
      url: "/media/story.jpg",
      originalName: "story.jpg",
      type: "image",
      mimeType: "image/jpeg",
      size: 1024,
      width: 1280,
      height: 720,
      alt: "Story media alt",
      title: "Story media",
      caption: "Story media caption",
      createdAt: "2026-05-01T00:00:00.000Z",
      createdBy: null,
    },
    {
      id: "media-file-1",
      key: "rich-text/guide.pdf",
      url: "/media/guide.pdf",
      originalName: "guide.pdf",
      type: "file",
      mimeType: "application/pdf",
      size: 4096,
      width: null,
      height: null,
      alt: null,
      title: "Guide PDF",
      caption: null,
      createdAt: "2026-05-02T00:00:00.000Z",
      createdBy: null,
    },
  ]),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({
    onChange,
    accept,
  }: {
    onChange: (value: unknown) => void;
    accept?: string[];
  }) => {
    const acceptsImage = (accept ?? []).includes("image/*");
    return (
      <div>
        <button
          type="button"
          onClick={() => onChange(acceptsImage ? "media-image-1" : "media-file-1")}
        >
          {acceptsImage ? "pick-image" : "pick-file"}
        </button>
        <span>{`media-accept:${(accept ?? []).join("|") || "none"}`}</span>
      </div>
    );
  },
}));

vi.mock("@/ui/posts/editor/richtext/PostRichTextAdapter", () => ({
  PostRichTextAdapter: ({
    value,
    onChange,
    onUnsafeLinkAttempt,
    placeholder,
    ariaLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    onUnsafeLinkAttempt?: (href: string) => void;
    placeholder?: string;
    ariaLabel?: string;
  }) => (
    <div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-rich-text-adapter="true"
      />
      <button type="button" onClick={() => onUnsafeLinkAttempt?.("javascript:alert(1)")}>
        unsafe-link
      </button>
    </div>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel?: string;
    onConfirm: () => void;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div data-confirm-dialog="true">
        <p>{title}</p>
        <div>{description}</div>
        <button type="button" onClick={onConfirm}>
          {confirmLabel ?? "Confirm"}
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          Cancel confirm
        </button>
      </div>
    ) : null,
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

const setCheckboxValue = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  React.act(() => {
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
  React.act(() => {
    button.click();
  });
};

const flushAsyncUpdates = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("h3, p")).some(
      (candidate) => normalizeText(candidate.textContent) === normalizeText(title)
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

const findSelectByOptionValues = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.resetModules();
});

test("RichTextSection wizard editor seeds layout while block previews stay read-only", async () => {
  const { RichTextSectionWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/RichTextSectionEditors");

  let latestValue: RichTextSectionData = {
    body: {
      html: "<p>Existing HTML body</p>",
      blocks: [
        { id: "block-1", heading: "Original", contentHtml: "<p>Alpha from HTML</p>" },
        { id: "block-2", heading: "Second", content: "Beta" },
      ],
    },
    options: {
      outputMode: "html",
    },
  };
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
    expect(view.container.textContent).toContain("Output mode stays untouched in Wizard");
    expect(view.container.textContent).toContain("Single Column");
    expect(view.container.textContent).toContain(
      "Use Visual to edit the eyebrow, title, heading level"
    );
    expect(
      findSectionByTitle(view.container, "Starter copy")?.getAttribute("data-widget-editor-section")
    ).toBe("rich-text-section.wizard.starter-copy");
    expect(latestVariant).toBe("legacy-layout");
    setSelectValue(view.container.querySelector("select"), "two-column");
    expect(latestVariant).toBe("two-column");

    expect(findInputByPlaceholder(view.container, "Editorial")).toBeUndefined();
    expect(findInputByPlaceholder(view.container, "Long-form content section")).toBeUndefined();
    expect(findInputByPlaceholder(view.container, "Heading 1")).toBeUndefined();
    expect(findTextareaByPlaceholder(view.container, "Paragraph 1")).toBeUndefined();
    expect(view.container.textContent).toContain("Original");
    expect(view.container.textContent).toContain("Alpha from HTML");
    expect(view.container.textContent).not.toContain("No paragraph text yet");

    expect(latestValue.titleBlock).toBeUndefined();
    expect(latestValue.body?.blocks?.[0]).toMatchObject({
      heading: "Original",
      contentHtml: "<p>Alpha from HTML</p>",
    });
    expect(latestValue.options?.outputMode).toBe("html");
  } finally {
    view.cleanup();
  }
});

test("RichTextSection visual editor shows source ownership, sanitizes body edits, confirms destructive changes, and clears text color", async () => {
  const { RichTextSectionVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/RichTextSectionEditors");

  let latestValue: RichTextSectionData = {
    titleBlock: {
      eyebrow: "Guide",
      title: "Readable content",
      headingLevel: 2,
    },
    body: {
      html: "<p>Existing body</p>",
      blocks: [
        { id: "block-1", kind: "text", heading: "Intro", contentHtml: "<p>Alpha</p>" },
        { id: "block-2", kind: "text", heading: "Details", contentHtml: "<p>Beta</p>" },
      ],
    },
    options: {
      dropcap: false,
      toc: false,
      maxWidth: "md",
      outputMode: "html",
    },
    style: {
      fontScale: "md",
      lineHeight: "normal",
      textColor: "#112233",
      background: "#ffffff",
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
    expect(
      findSectionByTitle(view.container, "Variant and layout structure")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("rich-text-section.visual.variant-layout-structure");
    expect(
      findSectionByTitle(view.container, "Title block copy")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("rich-text-section.visual.title-block-copy");
    expect(
      findSectionByTitle(view.container, "Body content")?.getAttribute("data-widget-editor-section")
    ).toBe("rich-text-section.visual.body-content");
    expect(
      findSectionByTitle(view.container, "Structured content blocks")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("rich-text-section.visual.structured-content-blocks");
    expect(
      findSectionByTitle(view.container, "Reader options")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("rich-text-section.visual.reader-options");
    expect(
      findSectionByTitle(view.container, "Typography and colors")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("rich-text-section.visual.typography-colors");
    expect(view.container.textContent).toContain(
      "Rich text body is the only rendered source for this preference."
    );
    expect(view.container.textContent).toContain(
      "Body HTML and structured blocks contain different text."
    );

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
    const titleSelects = Array.from(titleSection?.querySelectorAll("select") ?? []);
    setSelectValue(titleSelects[0], "1");
    expect(latestValue.titleBlock?.eyebrow).toBe("Perspective");
    expect(latestValue.titleBlock?.title).toBe("Deeper narrative");
    expect(latestValue.titleBlock?.headingLevel).toBe(1);

    const bodySection = findSectionByTitle(view.container, "Body content");
    clickByText(bodySection ?? view.container, "unsafe-link");
    setTextareaValue(
      findTextareaByPlaceholder(
        bodySection ?? view.container,
        "Write the primary story body here..."
      ),
      '<h1>Bad heading</h1><p>Updated body</p><a href="#">Unsafe link</a><img src="x">'
    );
    expect(latestValue.body?.html).not.toContain("<h1");
    expect(latestValue.body?.html).not.toContain("<img");
    expect(latestValue.body?.sanitizerDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "href_rewritten", attributeName: "href" }),
        expect.objectContaining({ code: "tag_removed", tagName: "h1" }),
        expect.objectContaining({ code: "tag_removed", tagName: "img" }),
      ])
    );
    expect(view.container.textContent).toContain("Sanitizer guidance");

    const sourcePreferenceSelect = bodySection?.querySelector("select");
    setSelectValue(sourcePreferenceSelect, "blocks");
    expect(latestValue.options?.outputMode).toBe("blocks");
    expect(view.container.textContent).toContain(
      "Structured blocks are the only rendered source for this preference."
    );

    const readerSection = findSectionByTitle(view.container, "Reader options");
    expect(readerSection?.textContent).toContain("Dropcap is off until you enable it.");
    const readerSwitches = Array.from(
      readerSection?.querySelectorAll('input[type="checkbox"]') ?? []
    );
    setCheckboxValue(readerSwitches[0], true);
    expect(latestValue.options?.dropcap).toBe(true);
    expect(view.container.textContent).toContain(
      "Dropcap will style the first paragraph from the blocks source."
    );

    const blockSection = findSectionByTitle(view.container, "Structured content blocks");
    const blockCountSelect = blockSection?.querySelector("select");
    setSelectValue(blockCountSelect, "1");
    expect(view.container.textContent).toContain("Reduce structured block count");
    clickByText(view.container, "Cancel confirm");
    expect(latestValue.body?.blocks).toHaveLength(2);

    setSelectValue(blockCountSelect, "1");
    expect(view.container.textContent).toContain("Reduce structured block count");
    clickByText(view.container, "Reduce");
    expect(latestValue.body?.blocks).toHaveLength(1);
    expect(view.container.textContent).toContain("Undo is available");
    clickByText(view.container, "Undo");
    expect(latestValue.body?.blocks).toHaveLength(2);

    clickByText(blockSection ?? view.container, "Remove");
    expect(view.container.textContent).toContain("Remove structured block");
    clickByText(view.container, "Cancel confirm");
    expect(latestValue.body?.blocks).toHaveLength(2);

    clickByText(blockSection ?? view.container, "Remove");
    expect(view.container.textContent).toContain("Remove structured block");
    const removeDialog = view.container.querySelector('[data-confirm-dialog="true"]');
    clickByText(removeDialog ?? view.container, "Remove");
    expect(latestValue.body?.blocks).toHaveLength(1);
    clickByText(view.container, "Undo");
    expect(latestValue.body?.blocks).toHaveLength(2);

    const typographySection = findSectionByTitle(view.container, "Typography and colors");
    expect(
      findInputByPlaceholder(typographySection ?? view.container, "var(--color-text)")
    ).toBeUndefined();
    expect(
      findInputByPlaceholder(typographySection ?? view.container, "transparent")
    ).toBeUndefined();
    clickByText(typographySection ?? view.container, "Clear", 0);
    expect(latestValue.style?.textColor).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("RichTextSection visual editor manages image, attachment, and embed blocks through widget-owned controls", async () => {
  const { RichTextSectionVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/RichTextSectionEditors");

  let latestValue: RichTextSectionData = {
    body: {
      html: "",
      blocks: [{ id: "block-1", kind: "text", heading: "Intro", contentHtml: "<p>Alpha</p>" }],
    },
    options: {
      outputMode: "blocks",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<RichTextSectionData>(latestValue);

    return (
      <RichTextSectionVisualEditor
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
    expect(view.container.textContent).toContain(
      "Structured blocks are the only rendered source for this preference."
    );

    clickByText(view.container, "Add image block");
    expect(latestValue.body?.blocks?.[1]?.kind).toBe("image");
    clickByText(view.container, "pick-image");
    await flushAsyncUpdates();
    expect(latestValue.body?.blocks?.[1]).toMatchObject({
      kind: "image",
      src: "/media/story.jpg",
      mediaId: "media-image-1",
    });

    clickByText(view.container, "Add attachment block");
    expect(latestValue.body?.blocks?.[2]?.kind).toBe("attachment");
    clickByText(view.container, "pick-file");
    await flushAsyncUpdates();
    expect(latestValue.body?.blocks?.[2]).toMatchObject({
      kind: "attachment",
      src: "/media/guide.pdf",
      mediaId: "media-file-1",
      mimeType: "application/pdf",
    });

    clickByText(view.container, "Add embed block");
    expect(latestValue.body?.blocks?.[3]?.kind).toBe("embed");
    setInputValue(
      findInputByPlaceholder(view.container, "https://www.youtube.com/watch?v=..."),
      "https://www.youtube.com/watch?v=abc123"
    );
    setInputValue(
      findInputByPlaceholder(view.container, "Shared link title"),
      "Release walkthrough"
    );
    expect(latestValue.body?.blocks?.[3]).toMatchObject({
      kind: "embed",
      url: "https://www.youtube.com/watch?v=abc123",
      title: "Release walkthrough",
    });
    const aspectRatioSelect = findSelectByOptionValues(view.container, ["16:9", "4:3", "1:1"]);
    expect(aspectRatioSelect).toBeInstanceOf(HTMLSelectElement);
    expect((aspectRatioSelect as HTMLSelectElement).disabled).toBe(true);
    expect(view.container.textContent).toContain(
      "Current embeds render as link cards, so aspect ratio is kept as legacy metadata"
    );
  } finally {
    view.cleanup();
  }
});

test("RichTextSection visual editor pages long block lists and explains unavailable image media", async () => {
  const mediaClient = await import("../../../core/admin/services/mediaClient");
  vi.mocked(mediaClient.listMediaCached).mockResolvedValueOnce([
    {
      id: "media-image-1",
      key: "rich-text/missing.jpg",
      url: "",
      originalName: "missing.jpg",
      type: "image",
      mimeType: "image/jpeg",
      size: 1024,
      width: 1280,
      height: 720,
      alt: null,
      title: "Missing public image",
      caption: null,
      createdAt: "2026-05-03T00:00:00.000Z",
      createdBy: null,
    },
  ]);

  const { RichTextSectionVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/RichTextSectionEditors");

  let latestValue: RichTextSectionData = {
    body: {
      html: "",
      blocks: Array.from({ length: 6 }, (_, index) => ({
        id: `block-${index + 1}`,
        kind: "text" as const,
        heading: `Item ${index + 1}`,
        contentHtml: `<p>${index + 1}</p>`,
      })),
    },
    options: {
      outputMode: "blocks",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<RichTextSectionData>(latestValue);

    return (
      <RichTextSectionVisualEditor
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
    expect(view.container.textContent).toContain("Next");
    expect(view.container.textContent).toContain("position 1 of 6");

    clickByText(view.container, "Next");
    expect(view.container.textContent).toContain("position 6 of 6");

    clickByText(view.container, "Previous");
    expect(view.container.textContent).toContain("position 1 of 6");

    clickByText(view.container, "Add image block");
    expect(latestValue.body?.blocks).toHaveLength(7);
    clickByText(view.container, "pick-image");
    await flushAsyncUpdates();

    expect(view.container.textContent).toContain(
      "Selected image is unavailable or missing a public render URL."
    );
    expect(view.container.textContent).toContain(
      "Pick a public image to render this block. Raw image HTML stays unsupported."
    );
  } finally {
    view.cleanup();
  }
});

test("RichTextSection advanced editor keeps source diagnostics read-only with truthful summary sections", async () => {
  const { RichTextSectionAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/RichTextSectionEditors");

  let latestValue: RichTextSectionData = {
    body: {
      html: "<p>Existing body</p>",
      blocks: [{ id: "block-1", kind: "text", heading: "Intro", contentHtml: "<p>Alpha</p>" }],
      sanitizerDiagnostics: [{ code: "href_rewritten", tagName: "a", attributeName: "href" }],
    },
    options: {
      outputMode: "blocks-fallback",
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
        variant="article"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain(
      "Advanced mode is read-only. Use Visual for public-facing rich content, output preference, structured blocks, reader options, and typography changes."
    );
    expect(view.container.textContent).toContain("Output mode and source diagnostics");
    expect(view.container.textContent).toContain("Sanitizer diagnostics");
    expect(view.container.textContent).toContain("Saved content summary");
    expect(view.container.textContent).toContain("Contract summary");
    expect(view.container.textContent).not.toContain("Raw HTML technical editor");
    expect(view.container.textContent).not.toContain("Raw payload snapshot");
    expect(view.container.textContent).not.toContain("Normalize now");
    expect(view.container.textContent).not.toContain("Reset to defaults");
    expect(view.container.querySelector("pre")).toBeNull();
    expect(view.container.querySelectorAll("select")).toHaveLength(0);
    expect(view.container.querySelectorAll("textarea")).toHaveLength(0);
    expect(
      findSectionByTitle(view.container, "Output mode and source diagnostics")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("rich-text-section.advanced.output-source-diagnostics");
    expect(
      findSectionByTitle(view.container, "Sanitizer diagnostics")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("rich-text-section.advanced.sanitizer-diagnostics");
    expect(
      findSectionByTitle(view.container, "Saved content summary")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("rich-text-section.advanced.saved-content-summary");
    expect(
      findSectionByTitle(view.container, "Contract summary")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("rich-text-section.advanced.contract-summary");

    const outputSection = findSectionByTitle(view.container, "Output mode and source diagnostics");
    expect(outputSection?.textContent).toContain("Rendered source");
    expect(outputSection?.textContent).toContain("Reason:");
    expect(outputSection?.textContent).toContain("blocks-fallback");
    expect(outputSection?.textContent).toContain("Rich content, output preference");
    expect(outputSection?.textContent).toContain(
      "Body HTML and structured blocks contain different text."
    );
    expect(view.container.textContent).toContain("Unsafe link URLs are rewritten");
    expect(view.container.textContent).toContain("Latest editor events: 1");
    expect(view.container.textContent).toContain("Wizard owns");
    expect(view.container.textContent).toContain("Visual owns");
    expect(view.container.textContent).toContain("Advanced owns");
    expect(latestValue.body?.html).toBe("<p>Existing body</p>");
  } finally {
    view.cleanup();
  }
});
