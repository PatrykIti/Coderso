// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  galleryMosaicDefaults,
  type GalleryMosaicData,
} from "../../../core/widgets/core/galleryMosaic";

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

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    children,
    onOpenChange,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    children?: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-confirm-dialog="true">
        <p>{title}</p>
        {description ? <p>{description}</p> : null}
        <div>{children}</div>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          cancel-action
        </button>
        <button type="button" onClick={onConfirm}>
          confirm-action {confirmLabel}
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    type,
    placeholder,
    disabled,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      disabled={disabled}
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

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    rows,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    [key: string]: unknown;
  }) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} {...props} />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async () => [
    {
      id: "media-1",
      key: "media/hero.jpg",
      url: "/media/hero.jpg",
      originalName: "hero.jpg",
      type: "image",
      mimeType: "image/jpeg",
      size: 1024,
      title: "Hero media",
      caption: null,
      createdAt: "2026-04-26T00:00:00.000Z",
    },
    {
      id: "media-2",
      key: "media/launch.mp4",
      url: "/media/launch.mp4",
      originalName: "launch.mp4",
      type: "file",
      mimeType: "video/mp4",
      size: 2048,
      title: "Launch clip",
      caption: null,
      createdAt: "2026-04-26T00:00:00.000Z",
    },
    {
      id: "media-3",
      key: "media/brochure.pdf",
      url: "/media/brochure.pdf",
      originalName: "brochure.pdf",
      type: "file",
      mimeType: "application/pdf",
      size: 1024,
      title: "Brochure",
      caption: null,
      createdAt: "2026-04-26T00:00:00.000Z",
    },
  ]),
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "lead-page",
      title: "Lead page",
      slug: "lead",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
  ]),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({
    value,
    onChange,
    accept,
    multiple,
  }: {
    value: unknown;
    onChange: (value: unknown) => void;
    accept?: string[];
    multiple?: boolean;
  }) => (
    <div data-media-picker="true">
      <button type="button" onClick={() => onChange(multiple ? ["media-1"] : "media-1")}>
        pick-image-media
      </button>
      <button type="button" onClick={() => onChange(multiple ? ["media-2"] : "media-2")}>
        pick-video-media
      </button>
      <button type="button" onClick={() => onChange(multiple ? ["media-3"] : "media-3")}>
        pick-unsupported-media
      </button>
      <button type="button" onClick={() => onChange(multiple ? [] : null)}>
        clear-media
      </button>
      <span>
        {Array.isArray(value) ? value.join(",") : typeof value === "string" ? value : "none"}
      </span>
      <span>{(accept ?? []).join(",")}</span>
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

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error("Expected HTMLInputElement");
  }

  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error("Expected HTMLTextAreaElement");
  }

  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error("Expected HTMLSelectElement");
  }

  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickElement = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLElement)) {
    throw new Error("Expected HTMLElement");
  }

  React.act(() => {
    element.click();
  });
};

const dispatchDragEvent = (target: Element, type: string, options: { clientY?: number } = {}) => {
  const dragStore = new Map<string, string>();
  const event = new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    clientY: options.clientY ?? 0,
  });
  Object.defineProperty(event, "dataTransfer", {
    configurable: true,
    value: {
      effectAllowed: "",
      dropEffect: "move",
      setDragImage: vi.fn(),
      setData: vi.fn((key: string, value: string) => {
        dragStore.set(key, value);
      }),
      getData: vi.fn((key: string) => dragStore.get(key) ?? ""),
    },
  });
  Object.defineProperty(event, "clientY", {
    configurable: true,
    value: options.clientY ?? 0,
  });
  React.act(() => {
    target.dispatchEvent(event);
  });
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) => element.getAttribute("placeholder") === placeholder
  );

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) => element.getAttribute("placeholder") === placeholder
  );

const findButtonByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((element) =>
    normalizeText(element.textContent).includes(normalizeText(text))
  );

const findMediaPickers = (container: ParentNode) =>
  Array.from(container.querySelectorAll('[data-media-picker="true"]'));

const findDragHandles = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-gallery-drag-handle]"));

const findButtonsByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).filter(
    (element) => normalizeText(element.textContent) === normalizeText(text)
  );

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    normalizeText(section.textContent).includes(normalizeText(title))
  );

const findAllSelectsByOption = (container: ParentNode, optionText: string) =>
  Array.from(container.querySelectorAll("select")).filter((element) =>
    normalizeText(element.textContent).includes(normalizeText(optionText))
  );

afterEach(() => {
  vi.restoreAllMocks();
});

test("GalleryMosaic wizard seeds layout selection and deterministic item growth", async () => {
  const { GalleryMosaicWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/GalleryMosaicEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue: GalleryMosaicData = {
    header: {},
    items: [{ id: "custom-1", caption: "Lead story" }],
  };

  const Harness = () => {
    const [value, setValue] = useState<GalleryMosaicData>(latestValue);
    const [variant, setVariant] = useState("unsupported-layout");

    const handleChange = (next: GalleryMosaicData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    const handleVariantChange = (next: string) => {
      onVariantChangeSpy(next);
      setVariant(next);
    };

    return (
      <GalleryMosaicWizardEditor
        value={value}
        onChange={handleChange}
        variant={variant}
        onVariantChange={handleVariantChange}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(
      findSectionByTitle(view.container, "Starter media")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("gallery-mosaic.wizard.starter-media");
    expect(view.container.textContent).toContain("Mosaic");
    expect(view.container.textContent).toContain("Uniform Grid");
    expect(view.container.textContent).toContain("Feature Left");
    expect(view.container.textContent).toContain("1 item");
    expect(latestValue.header).toEqual({});
    expect(latestValue.items).toHaveLength(1);
    expect(latestValue.items.map((item) => item.id)).toEqual(["custom-1"]);
    expect(latestValue.items.map((item) => item.caption)).toEqual(["Lead story"]);
    expect(view.container.textContent).toContain("Configured media");
    expect(view.container.textContent).toContain(
      "After Wizard, use Visual for section title, media selection, captions, destinations, alt text, posters, lightbox, overlay, density, and motion controls."
    );
    expect(findInputByPlaceholder(view.container, "Gallery highlights")).toBeUndefined();
    expect(findButtonByText(view.container, "pick-video-media")).toBeUndefined();

    clickElement(findButtonByText(view.container, "Feature Left"));
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("feature-left");

    const countSelect = view.container.querySelector("select");
    setSelectValue(countSelect, "4");
    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.items).toHaveLength(4);

    const callsBeforeReduction = onChangeSpy.mock.calls.length;
    setSelectValue(view.container.querySelector("select"), "2");
    expect(onChangeSpy).toHaveBeenCalledTimes(callsBeforeReduction);
    expect(latestValue.items).toHaveLength(4);
    expect(view.container.textContent).toContain("Reduce gallery items");
    expect(view.container.textContent).toContain(
      "Increasing the count again creates new placeholder tiles; removed content is not restored."
    );
    clickElement(findButtonByText(view.container, "confirm-action"));
    expect(latestValue.items).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("GalleryMosaic visual editor covers variant cards, item reordering, removal, addition, and style controls", async () => {
  const { GalleryMosaicVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/GalleryMosaicEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue: GalleryMosaicData = {
    header: {
      title: "Launch assets",
      description: "Existing summary",
    },
    items: [
      {
        id: "gallery-a",
        image: "/lead.jpg",
        caption: "Lead frame",
        href: "/lead",
      },
      {
        id: "gallery-b",
        caption: "Motion draft",
        href: "/motion",
      },
    ],
    style: {
      ratio: "4:3",
      gap: "md",
      radius: "lg",
      overlay: "rgba(1, 2, 3, 0.5)",
      captionPosition: "inside",
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<GalleryMosaicData>(latestValue);
    const [variant, setVariant] = useState("mosaic");

    const handleChange = (next: GalleryMosaicData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    const handleVariantChange = (next: string) => {
      onVariantChangeSpy(next);
      setVariant(next);
    };

    return (
      <GalleryMosaicVisualEditor
        value={value}
        onChange={handleChange}
        variant={variant}
        onVariantChange={handleVariantChange}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(
      findSectionByTitle(view.container, "Variant and media structure")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("gallery-mosaic.visual.variant-media-structure");
    expect(
      findSectionByTitle(view.container, "Header copy")?.getAttribute("data-widget-editor-section")
    ).toBe("gallery-mosaic.visual.header-copy");
    expect(
      findSectionByTitle(view.container, "Media items and links")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("gallery-mosaic.visual.media-items-links");
    expect(
      findSectionByTitle(view.container, "Interaction")?.getAttribute("data-widget-editor-section")
    ).toBe("gallery-mosaic.visual.interaction");
    expect(
      findSectionByTitle(view.container, "Overlay and caption controls")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("gallery-mosaic.visual.overlay-caption-controls");
    expect(
      findSectionByTitle(view.container, "Layout style")?.getAttribute("data-widget-editor-section")
    ).toBe("gallery-mosaic.visual.layout-style");
    expect(
      findSectionByTitle(view.container, "Density and motion")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("gallery-mosaic.visual.density-motion");
    expect(view.container.textContent).toContain("Current media: Image");
    expect(view.container.textContent).toContain("Current media: Placeholder");
    expect(view.container.textContent).toContain("Image preview");
    expect(view.container.textContent).toContain("Placeholder preview");

    clickElement(findButtonByText(view.container, "Feature Left"));
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("feature-left");

    let selects = Array.from(view.container.querySelectorAll("select"));
    expect(selects.length).toBeGreaterThanOrEqual(5);
    setSelectValue(selects[0], "3");
    expect(view.container.textContent).toContain("Item count grows or trims from the end.");

    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Visual storytelling block with media tiles."),
      "Updated supporting copy"
    );

    const colorPicker = view.container.querySelector('input[type="color"]');
    expect(colorPicker).toBeInstanceOf(HTMLInputElement);
    expect((colorPicker as HTMLInputElement).value).toBe("#010203");

    const mediaPickers = findMediaPickers(view.container);
    expect(mediaPickers).toHaveLength(3);
    expect(view.container.textContent).toContain(
      "Saved image asset is configured. Browse media to replace it or clear media and poster."
    );
    clickElement(findButtonsByText(mediaPickers[1]!, "pick-video-media")[0]);
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const mediaPickersAfterVideo = findMediaPickers(view.container);
    expect(mediaPickersAfterVideo).toHaveLength(4);
    clickElement(findButtonsByText(mediaPickersAfterVideo[2]!, "pick-image-media")[0]);
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latestValue.items[1]).toEqual(
      expect.objectContaining({
        video: "/media/launch.mp4",
        poster: "/media/hero.jpg",
      })
    );
    clickElement(findButtonByText(view.container, "Clear poster"));
    expect(latestValue.items[1]?.poster).toBeUndefined();

    setInputValue(findInputByPlaceholder(view.container, "Media 2"), "Motion close-up");
    setInputValue(findInputByPlaceholder(view.container, "Gallery item 1"), "Lead alt");
    selects = Array.from(view.container.querySelectorAll("select"));
    setSelectValue(findAllSelectsByOption(view.container, "Right")[0], "right");
    setSelectValue(findAllSelectsByOption(view.container, "Inherit section ratio")[0], "1:1");
    expect(view.container.textContent).toContain("Current media: Video");
    expect(view.container.textContent).toContain("Video preview");
    const interactionSection = findSectionByTitle(view.container, "Interaction");
    const interactionSelects = Array.from(
      interactionSection?.querySelectorAll("select") ?? []
    ) as HTMLSelectElement[];
    expect(interactionSelects).toHaveLength(2);
    setSelectValue(interactionSelects[0], "lightbox");
    setSelectValue(interactionSelects[1], "fill");
    expect(view.container.textContent).toContain(
      "Admin preview shows lightbox markup as static. Published pages bind the lightbox script;"
    );
    expect(view.container.textContent).toContain(
      "This item keeps link navigation. Clear the destination to open it in the lightbox instead."
    );
    expect(view.container.textContent).toContain(
      "linked items still use navigation. Clear each destination to open that tile in the lightbox instead."
    );

    const dragHandles = findDragHandles(view.container);
    expect(dragHandles).toHaveLength(3);
    vi.spyOn(dragHandles[1]!, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 200,
      height: 40,
      top: 0,
      left: 0,
      right: 200,
      bottom: 40,
      toJSON: () => ({}),
    } as DOMRect);
    dispatchDragEvent(dragHandles[0]!, "dragstart");
    dispatchDragEvent(dragHandles[1]!, "dragover", { clientY: 32 });
    dispatchDragEvent(dragHandles[1]!, "drop", { clientY: 32 });

    expect(latestValue.items.map((item) => item.id)).toEqual([
      "gallery-b",
      "gallery-a",
      "gallery-3",
    ]);

    clickElement(findButtonsByText(view.container, "Move up")[1]);
    expect(latestValue.items.map((item) => item.caption)).toEqual([
      "Lead frame",
      "Motion close-up",
      "Story frame",
    ]);

    clickElement(findButtonsByText(view.container, "Remove")[1]);
    expect(latestValue.items.map((item) => item.caption)).toEqual([
      "Lead frame",
      "Motion close-up",
      "Story frame",
    ]);
    expect(view.container.textContent).toContain("Remove gallery item");
    expect(view.container.textContent).toContain(
      "This removes the saved media, caption, poster, and destination for Motion close-up."
    );
    clickElement(findButtonByText(view.container, "cancel-action"));
    expect(latestValue.items.map((item) => item.caption)).toEqual([
      "Lead frame",
      "Motion close-up",
      "Story frame",
    ]);
    expect(view.container.textContent).not.toContain("Remove gallery item");

    clickElement(findButtonsByText(view.container, "Remove")[1]);
    clickElement(findButtonByText(view.container, "confirm-action"));
    expect(latestValue.items.map((item) => item.caption)).toEqual(["Lead frame", "Story frame"]);

    clickElement(findButtonByText(view.container, "Add item"));
    expect(latestValue.items.map((item) => item.caption)).toEqual([
      "Lead frame",
      "Story frame",
      "Media 3",
    ]);

    const refreshedMediaPickers = findMediaPickers(view.container);
    clickElement(
      findButtonsByText(
        refreshedMediaPickers[refreshedMediaPickers.length - 1]!,
        "pick-unsupported-media"
      )[0]
    );
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Item 3: failed to resolve selected media.");

    setSelectValue(Array.from(view.container.querySelectorAll("select"))[0], "1");
    expect(latestValue.items).toHaveLength(3);
    expect(view.container.textContent).toContain("Reduce gallery items");
    expect(view.container.textContent).toContain(
      "Increasing the count again creates new placeholder tiles; removed content is not restored."
    );
    clickElement(findButtonByText(view.container, "confirm-action"));
    expect(latestValue.items).toHaveLength(1);
    expect(view.container.textContent).toContain(
      "Feature Left works best with one lead tile plus at least one supporting item."
    );

    const overlaySection = findSectionByTitle(view.container, "Overlay and caption controls");
    const overlaySelect = overlaySection?.querySelector("select");
    setSelectValue(overlaySelect, "hover");
    setInputValue(colorPicker, "#112233");
    const layoutStyleSection = findSectionByTitle(view.container, "Layout style");
    const layoutStyleSelects = Array.from(
      layoutStyleSection?.querySelectorAll("select") ?? []
    ) as HTMLSelectElement[];
    expect(layoutStyleSelects).toHaveLength(3);
    setSelectValue(layoutStyleSelects[0], "16:9");
    setSelectValue(layoutStyleSelects[1], "lg");
    setSelectValue(layoutStyleSelects[2], "xl");
    const densitySection = findSectionByTitle(view.container, "Density and motion");
    const densitySelects = Array.from(densitySection?.querySelectorAll("select") ?? []) as
      | HTMLSelectElement[]
      | [];
    expect(densitySelects).toHaveLength(2);
    setSelectValue(densitySelects[0], "dense");
    setSelectValue(densitySelects[1], "slide-up");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.header).toEqual({
      title: "Launch assets",
      description: "Updated supporting copy",
    });
    expect(latestValue.items).toHaveLength(1);
    expect(latestValue.items[0]).toMatchObject({
      id: "gallery-a",
      image: "/lead.jpg",
      alt: "Lead alt",
      objectPosition: "right",
      ratio: "1:1",
      caption: "Lead frame",
      href: "/lead",
    });
    expect(latestValue.interaction).toEqual({
      mode: "lightbox",
      zoom: "fill",
    });
    expect(latestValue.style).toEqual({
      ratio: "16:9",
      gap: "lg",
      radius: "xl",
      overlay: "rgba(17, 34, 51, 0.5)",
      captionPosition: "hover",
      layoutDensity: "dense",
      motionPreset: "slide-up",
    });
    expect((view.container.querySelector('input[type="color"]') as HTMLInputElement).value).toBe(
      "#112233"
    );
  } finally {
    view.cleanup();
  }
});

test("GalleryMosaic advanced editor keeps diagnostics read-only with truthful summary sections", async () => {
  const { GalleryMosaicAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/GalleryMosaicEditors");

  let latestValue = {
    items: [
      {
        id: "duplicate",
        caption: "",
        image: "/lead.jpg",
      },
      {
        id: "duplicate",
        href: "/lead",
      },
    ],
    interaction: {
      mode: "lightbox",
      zoom: "fit",
    },
    style: {
      ratio: "cinematic",
      gap: "wide",
      radius: "round",
      overlay: "",
      captionPosition: "floating",
      layoutDensity: "fluid",
      motionPreset: "bounce",
    },
  } as unknown as GalleryMosaicData;

  const Harness = () => {
    const [value, setValue] = useState<GalleryMosaicData>(latestValue);

    return (
      <GalleryMosaicAdvancedEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="mosaic"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain(
      "Advanced mode is read-only. Use Visual for public-facing Gallery Mosaic media, captions, links, interaction, overlay, density, and layout changes."
    );
    expect(view.container.textContent).toContain("Runtime summary");
    expect(view.container.textContent).toContain(
      "Lightbox on unlinked items; 1 linked item keeps navigation"
    );
    expect(view.container.textContent).toContain("Style summary");
    expect(view.container.textContent).toContain("Accessibility diagnostics");
    expect(view.container.textContent).toContain("Contract summary");
    expect(view.container.querySelector("pre")).toBeNull();
    expect(
      findSectionByTitle(view.container, "Runtime summary")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("gallery-mosaic.advanced.runtime-summary");
    expect(
      findSectionByTitle(view.container, "Style summary")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("gallery-mosaic.advanced.style-summary");
    expect(
      findSectionByTitle(view.container, "Accessibility diagnostics")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("gallery-mosaic.advanced.accessibility-diagnostics");
    expect(
      findSectionByTitle(view.container, "Contract summary")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("gallery-mosaic.advanced.contract-summary");
    expect(
      view.container.querySelectorAll(
        '[data-widget-control-path]:not([data-widget-control-readonly="true"])'
      )
    ).toHaveLength(0);
    expect(view.container.querySelectorAll("select")).toHaveLength(0);
    expect(view.container.querySelectorAll("button")).toHaveLength(0);
    expect(view.container.textContent).toContain("Section heading");
    expect(view.container.textContent).toContain("Helper copy");
    expect(view.container.textContent).toContain("Alt text coverage");
    expect(view.container.textContent).toContain("Poster coverage");
    expect(view.container.textContent).toContain("Wizard owns");
    expect(view.container.textContent).toContain("Visual owns");
    expect(view.container.textContent).toContain("Advanced owns");
    expect(view.container.textContent).toContain(
      "Read-only runtime diagnostics, style summaries, accessibility checks, and contract ownership."
    );
    expect(latestValue).toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ id: "duplicate", image: "/lead.jpg" }),
        ]),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("GalleryMosaic advanced editor reports selected lightbox mode as inactive when no media can open", async () => {
  const { GalleryMosaicAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/GalleryMosaicEditors");

  const view = mount(
    <GalleryMosaicAdvancedEditor
      value={{
        items: [
          {
            id: "empty-media",
            caption: "Empty media tile",
          },
        ],
        interaction: {
          mode: "lightbox",
          zoom: "fill",
        },
      }}
      onChange={() => undefined}
      variant="mosaic"
      onVariantChange={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain(
      "Lightbox selected; no media tiles currently open"
    );
    expect(view.container.textContent).not.toContain("Lightbox, fill zoom");
  } finally {
    view.cleanup();
  }
});

test("GalleryMosaic visual editor updates header title, media picker, ordering, and swatch-only overlay without a variant handler", async () => {
  const { GalleryMosaicVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/GalleryMosaicEditors");

  let latestValue: GalleryMosaicData = {
    header: {},
    items: [
      { id: "gallery-a", caption: "Lead frame", image: "/lead.jpg" },
      { id: "gallery-b", caption: "Motion draft" },
      { id: "gallery-c", caption: "Detail still" },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<GalleryMosaicData>(latestValue);

    return (
      <GalleryMosaicVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="mosaic"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const headerSection = findSectionByTitle(view.container, "Header copy");
    setInputValue(
      findInputByPlaceholder(headerSection ?? view.container, "Gallery highlights"),
      "Customer proof"
    );

    const mediaSection = findSectionByTitle(view.container, "Media items and links");
    expect(mediaSection?.textContent).not.toContain("Image URL");
    expect(mediaSection?.textContent).not.toContain("Video URL");
    expect(mediaSection?.textContent).not.toContain("Poster image URL");
    expect(mediaSection?.textContent).not.toContain("Link URL");
    expect(mediaSection?.textContent).toContain(
      "Saved image asset is configured. Browse media to replace it or clear media and poster."
    );
    clickElement(findButtonsByText(mediaSection ?? view.container, "Clear media and poster")[0]);
    expect(latestValue.items[0]?.image).toBeUndefined();
    const mediaPicker = findMediaPickers(view.container)[0];
    clickElement(findButtonByText(mediaPicker ?? view.container, "pick-image-media"));
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    clickElement(findButtonsByText(mediaSection ?? view.container, "Move down")[0]);

    const overlaySection = findSectionByTitle(view.container, "Overlay and caption controls");
    const overlaySwatch = (overlaySection ?? view.container).querySelector(
      '[data-widget-control="gallery-mosaic.style.overlay"] input[type="color"]'
    );
    expect(overlaySwatch).toBeInstanceOf(HTMLInputElement);
    expect(overlaySection?.textContent).toContain("The default overlay strength is 35%.");
    expect(findInputByPlaceholder(overlaySection ?? view.container, "rgba(15, 23, 42, 0.35)")).toBe(
      undefined
    );
    setInputValue(overlaySwatch, "#112233");

    expect(latestValue.header).toEqual(
      expect.objectContaining({
        title: "Customer proof",
      })
    );
    expect(latestValue.items[1]).toEqual(
      expect.objectContaining({
        id: "gallery-a",
        image: "/media/hero.jpg",
        caption: "Lead frame",
      })
    );
    expect(latestValue.style).toEqual(
      expect.objectContaining({
        overlay: "rgba(17, 34, 51, 0.35)",
      })
    );
  } finally {
    view.cleanup();
  }
});
