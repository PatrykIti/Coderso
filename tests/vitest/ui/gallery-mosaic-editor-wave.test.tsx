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

const findAllInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
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

afterEach(() => {
  vi.restoreAllMocks();
});

test("GalleryMosaic wizard normalizes the variant selector and seeds deterministic item growth", async () => {
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
    const selects = Array.from(view.container.querySelectorAll("select"));
    expect(selects).toHaveLength(2);
    expect(selects[0]?.value).toBe("mosaic");

    setSelectValue(selects[0], "feature-left");
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("feature-left");
    expect(selects[0]?.value).toBe("feature-left");

    setInputValue(findInputByPlaceholder(view.container, "Gallery highlights"), "Customer stories");
    setSelectValue(selects[1], "3");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.header).toEqual({
      title: "Customer stories",
      description: galleryMosaicDefaults.header?.description,
    });
    expect(latestValue.items).toHaveLength(3);
    expect(latestValue.items.map((item) => item.id)).toEqual([
      "custom-1",
      "gallery-2",
      "gallery-3",
    ]);
    expect(latestValue.items.map((item) => item.caption)).toEqual([
      "Lead story",
      "Visual detail",
      "Story frame",
    ]);
    expect(view.container.textContent).toContain("image/*,video/*");

    await React.act(async () => {
      findButtonByText(view.container, "pick-video-media")?.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latestValue.items[0]?.video).toBe("/media/launch.mp4");
    expect(latestValue.items[0]?.image).toBeUndefined();
    expect(latestValue.items[0]?.caption).toBe("Launch clip");
  } finally {
    view.cleanup();
  }
});

test("GalleryMosaic visual editor covers variant cards, item reordering, removal, addition, and style controls", async () => {
  const { GalleryMosaicVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/GalleryMosaicEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  const confirmSpy = vi.fn(() => true);
  vi.stubGlobal("confirm", confirmSpy);
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
    clickElement(findButtonsByText(mediaPickers[1]!, "pick-video-media")[0]);
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    setInputValue(
      findAllInputsByPlaceholder(view.container, "https://cdn.example.com/clip.mp4")[1],
      "https://cdn.example.com/item-2.mp4"
    );
    setInputValue(findInputByPlaceholder(view.container, "Media 2"), "Motion close-up");
    setInputValue(findAllInputsByPlaceholder(view.container, "#")[1], "/motion-updated");
    setInputValue(findInputByPlaceholder(view.container, "Gallery item 1"), "Lead alt");
    setInputValue(
      findAllInputsByPlaceholder(view.container, "https://cdn.example.com/poster.jpg")[0],
      "https://cdn.example.com/lead-poster.jpg"
    );
    selects = Array.from(view.container.querySelectorAll("select"));
    setSelectValue(selects[1], "right");
    setSelectValue(selects[2], "1:1");
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
      "This item keeps link navigation. Clear the link URL to open it in the lightbox instead."
    );
    expect(view.container.textContent).toContain(
      "linked items still use navigation. Clear each Link URL to open that tile in the lightbox instead."
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
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(latestValue.items.map((item) => item.caption)).toEqual(["Lead frame", "Story frame"]);

    clickElement(findButtonByText(view.container, "Add item"));
    expect(latestValue.items.map((item) => item.caption)).toEqual([
      "Lead frame",
      "Story frame",
      "Media 3",
    ]);

    const refreshedMediaPickers = findMediaPickers(view.container);
    clickElement(findButtonsByText(refreshedMediaPickers[2]!, "pick-unsupported-media")[0]);
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(view.container.textContent).toContain("Item 3: failed to resolve selected media.");

    setSelectValue(selects[0], "1");
    expect(confirmSpy).toHaveBeenCalledTimes(2);
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
      poster: "https://cdn.example.com/lead-poster.jpg",
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
    vi.unstubAllGlobals();
  }
});

test("GalleryMosaic advanced editor keeps diagnostics-only shared style ownership while still supporting normalize and reset", async () => {
  const { GalleryMosaicAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/GalleryMosaicEditors");

  const onChangeSpy = vi.fn();
  let latestValue = {
    items: [
      {
        id: "duplicate",
        caption: "",
        image: "/lead.jpg",
      },
      {
        id: "duplicate",
      },
    ],
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

    const handleChange = (next: GalleryMosaicData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    return (
      <GalleryMosaicAdvancedEditor
        value={value}
        onChange={handleChange}
        variant="mosaic"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Visual owns the current shared style fields.");
    const preview = view.container.querySelector("pre");
    expect(preview?.textContent).toContain('"ratio": "4:3"');
    expect(preview?.textContent).toContain('"gap": "md"');
    expect(preview?.textContent).toContain('"radius": "lg"');
    expect(preview?.textContent).toContain('"captionPosition": "inside"');
    expect(preview?.textContent).toContain('"layoutDensity": "auto"');
    expect(preview?.textContent).toContain('"motionPreset": "none"');
    expect(preview?.textContent).toContain('"id": "gallery-2"');

    clickElement(findButtonByText(view.container, "Normalize now"));
    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.header).toEqual(galleryMosaicDefaults.header);
    expect(latestValue.items).toEqual([
      {
        id: "duplicate",
        image: "/lead.jpg",
        video: undefined,
        alt: undefined,
        poster: undefined,
        caption: "Media highlight",
        href: undefined,
        objectPosition: "center",
        ratio: "inherit",
      },
      {
        id: "gallery-2",
        image: undefined,
        video: undefined,
        alt: undefined,
        poster: undefined,
        caption: "Visual detail",
        href: undefined,
        objectPosition: "center",
        ratio: "inherit",
      },
    ]);
    expect(latestValue.style).toEqual({
      ratio: "4:3",
      gap: "md",
      radius: "lg",
      overlay: undefined,
      captionPosition: "inside",
      layoutDensity: "auto",
      motionPreset: "none",
    });
    expect(view.container.querySelectorAll("select")).toHaveLength(0);
    expect(view.container.querySelector('input[placeholder="rgba(15, 23, 42, 0.35)"]')).toBeNull();

    clickElement(findButtonByText(view.container, "Reset to defaults"));
    expect(latestValue).toEqual(galleryMosaicDefaults);
  } finally {
    view.cleanup();
  }
});

test("GalleryMosaic visual editor updates header title, image field, move-down ordering, and raw overlay token without a variant handler", async () => {
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
    setInputValue(
      findInputByPlaceholder(mediaSection ?? view.container, "https://cdn.example.com/photo.jpg"),
      "https://cdn.example.com/updated-lead.jpg"
    );
    clickElement(findButtonsByText(mediaSection ?? view.container, "Move down")[0]);

    const overlaySection = findSectionByTitle(view.container, "Overlay and caption controls");
    setInputValue(
      findInputByPlaceholder(overlaySection ?? view.container, "rgba(15, 23, 42, 0.35)"),
      "var(--gallery-overlay)"
    );

    expect(latestValue.header).toEqual(
      expect.objectContaining({
        title: "Customer proof",
      })
    );
    expect(latestValue.items[1]).toEqual(
      expect.objectContaining({
        id: "gallery-a",
        image: "https://cdn.example.com/updated-lead.jpg",
        caption: "Lead frame",
      })
    );
    expect(latestValue.style).toEqual(
      expect.objectContaining({
        overlay: "var(--gallery-overlay)",
      })
    );
  } finally {
    view.cleanup();
  }
});
