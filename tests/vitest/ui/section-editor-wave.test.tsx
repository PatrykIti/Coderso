// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { SectionData } from "../../../core/widgets/core/section";

const sectionMediaState = vi.hoisted(() => {
  const createMediaItems = () => [
    {
      id: "asset-image",
      url: "/media/section-background.jpg",
      title: "Section background",
      originalName: "section-background.jpg",
    },
    {
      id: "asset-video",
      url: "https://cdn.example.com/section-demo.mp4",
      title: "Section demo video",
      originalName: "section-demo.mp4",
    },
    {
      id: "asset-poster",
      url: "/media/section-poster.jpg",
      title: "Section poster",
      originalName: "section-poster.jpg",
    },
  ];

  return {
    mediaItems: createMediaItems(),
    mediaError: null as unknown,
    reset() {
      this.mediaItems = createMediaItems();
      this.mediaError = null;
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(async () => {
    if (sectionMediaState.mediaError) throw sectionMediaState.mediaError;
    return sectionMediaState.mediaItems;
  }),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({
    value,
    onChange,
    accept,
  }: {
    value: string | null;
    onChange: (value: unknown) => void;
    accept?: string[];
  }) => (
    <div data-media-picker={(accept ?? []).join(",") || "all"}>
      <button
        type="button"
        onClick={() => onChange((accept ?? []).includes("video/*") ? "asset-video" : "asset-image")}
      >
        {(accept ?? []).includes("video/*") ? "pick-video-asset" : "pick-image-asset"}
      </button>
      <button type="button" onClick={() => onChange("asset-poster")}>
        pick-poster-asset
      </button>
      <button type="button" onClick={() => onChange("missing-asset")}>
        pick-missing-asset
      </button>
      <button type="button" onClick={() => onChange(null)}>
        clear-media-selection
      </button>
      <span>{value ?? "none"}</span>
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

const setRawInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const ownDescriptor = Object.getOwnPropertyDescriptor(element, "value");
  let currentValue = value;
  Object.defineProperty(element, "value", {
    configurable: true,
    get: () => currentValue,
    set: (next: string) => {
      currentValue = next;
    },
  });
  React.act(() => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  if (ownDescriptor) {
    Object.defineProperty(element, "value", ownDescriptor);
    return;
  }
  Reflect.deleteProperty(element as HTMLInputElement & { value?: string }, "value");
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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
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

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  findInputsByPlaceholder(container, placeholder)[0];

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findColorInputForPlaceholder = (container: ParentNode, placeholder: string, index = 0) => {
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

const findNumberInputs = (container: ParentNode) =>
  Array.from(container.querySelectorAll('input[type="number"]')).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement
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
  sectionMediaState.reset();
  vi.restoreAllMocks();
});

const renderEditors = async ({
  initialValue,
  initialVariant = "legacy",
  withVariantChange = true,
}: {
  initialValue: SectionData;
  initialVariant?: string;
  withVariantChange?: boolean;
}) => {
  const { SectionAdvancedEditor, SectionVisualEditor, SectionWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/SectionEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState<SectionData>(initialValue);
    const [variant, setVariant] = useState(initialVariant);

    const handleChange = (next: SectionData) => {
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
        <SectionWizardEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
        />
        <SectionVisualEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
        />
        <SectionAdvancedEditor
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

const mockSectionContract = async ({
  normalizedValue,
  defaults,
}: {
  normalizedValue: SectionData;
  defaults: SectionData;
}) => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/section", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/section")>(
      "../../../core/widgets/core/section"
    );

    return {
      ...actual,
      normalizeSectionData: vi.fn(() => normalizedValue),
      sectionDefaults: defaults,
    };
  });
};

test("Section editors normalize malformed defaults, preserve token strings, and ignore variant changes without a handler", async () => {
  const view = await renderEditors({
    initialValue: {
      semantics: {
        element: "article" as never,
      },
      style: {
        backgroundColor: "brand-token",
        gradientFrom: "surface-start-token",
        gradientTo: "surface-end-token",
        gradientAngle: 999,
        borderColor: "border-token",
        borderWidth: "9" as never,
        radius: "round" as never,
        overlayColor: "overlay-token",
        overlayOpacity: 150,
      },
    },
    initialVariant: "legacy",
    withVariantChange: false,
  });

  try {
    const variantSelect = findSelectByOptions(view.container, ["default", "contained", "bleed"]);
    expect(variantSelect.value).toBe("default");

    clickByText(view.container, "Contained");
    setSelectValue(variantSelect, "contained");
    expect(view.getLatestVariant()).toBe("legacy");
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();
    expect(view.onChangeSpy).not.toHaveBeenCalled();

    expect(findInputsByPlaceholder(view.container, "transparent")[0]?.value).toBe("brand-token");
    expect(findColorInputForPlaceholder(view.container, "transparent", 0).value).toBe("#ffffff");

    const semanticsSection = findSectionByTitle(view.container, "Semantics and anchor");
    if (!(semanticsSection instanceof HTMLElement)) {
      throw new Error("Missing semantics section");
    }
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }
    expect(semanticsSection.getAttribute("data-widget-editor-section")).toBe(
      "section.semantics-anchor"
    );
    expect(
      semanticsSection.querySelector('[data-widget-control="section.semantics.anchorId"]')
    ).not.toBeNull();
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    expect(surfaceSection.getAttribute("data-widget-editor-section")).toBe(
      "section.surface-borders"
    );
    expect(spacingSection.getAttribute("data-widget-editor-section")).toBe("section.width-spacing");

    expect(findSelectByOptions(semanticsSection, ["section", "div"]).value).toBe("section");
    expect(findInputByPlaceholder(surfaceSection, "#ffffff")?.value).toBe("surface-start-token");
    expect(findColorInputForPlaceholder(surfaceSection, "#ffffff").value).toBe("#ffffff");
    expect(findInputByPlaceholder(surfaceSection, "#f1f5f9")?.value).toBe("surface-end-token");
    expect(findColorInputForPlaceholder(surfaceSection, "#f1f5f9").value).toBe("#f1f5f9");
    expect(findInputByPlaceholder(surfaceSection, "var(--color-border)")?.value).toBe(
      "border-token"
    );
    expect(findColorInputForPlaceholder(surfaceSection, "var(--color-border)").value).toBe(
      "#e2e8f0"
    );
    expect(findInputByPlaceholder(surfaceSection, "#000000")?.value).toBe("overlay-token");
    expect(findColorInputForPlaceholder(surfaceSection, "#000000").value).toBe("#000000");

    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("1");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("2xl");

    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    expect(angleInput?.value).toBe("360");
    expect(opacityInput?.value).toBe("100");
  } finally {
    view.cleanup();
  }
});

test("Section editors cover variant changes, semantics, surface tokens, and advanced snapshot updates", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        backgroundColor: "brand-token",
        gradientFrom: "",
        gradientTo: "",
        gradientAngle: 999,
        borderColor: "",
        borderWidth: "9" as never,
        radius: "round" as never,
        overlayColor: "",
        overlayOpacity: 150,
      },
    },
  });

  try {
    const variantSelect = findSelectByOptions(view.container, ["default", "contained", "bleed"]);
    expect(variantSelect.value).toBe("default");
    setSelectValue(variantSelect, "contained");
    expect(view.getLatestVariant()).toBe("contained");

    setInputValue(findInputByPlaceholder(view.container, "Section title"), "Platform section");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Short context for the section"),
      "Reusable wrapper for grouped content."
    );
    const wizardColor = Array.from(view.container.querySelectorAll('input[type="color"]'))[0];
    setInputValue(wizardColor, "#f8fafc");

    expect(view.getLatestValue().heading).toMatchObject({
      title: "Platform section",
      description: "Reusable wrapper for grouped content.",
    });
    expect(view.getLatestValue().style?.backgroundColor).toBe("#f8fafc");

    clickByText(view.container, "Bleed");
    expect(view.getLatestVariant()).toBe("bleed");

    setInputValue(findInputsByPlaceholder(view.container, "Section title")[1], "Overview section");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Supportive copy for this section"),
      "Supporting copy from visual editor."
    );
    setInputValue(findInputByPlaceholder(view.container, "Section label"), "Overview");
    setInputValue(findInputByPlaceholder(view.container, "pricing-section"), "overview");
    setInputValue(findInputByPlaceholder(view.container, "Pricing section"), "Overview section");

    const semanticsSection = findSectionByTitle(view.container, "Semantics and anchor");
    if (!(semanticsSection instanceof HTMLElement)) {
      throw new Error("Missing semantics section");
    }
    const elementSelect = findSelectByOptions(semanticsSection, ["section", "div"]);
    setSelectValue(elementSelect, "div");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }
    const borderWidthSelect = findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]);
    const radiusSelect = findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]);
    const spacingSelects = findSelectsByOptions(spacingSection, ["content", "wide", "full"]);
    setSelectValue(spacingSelects[0], "wide");
    setSelectValue(
      findSelectByOptions(spacingSection, ["none", "4xl", "5xl", "6xl", "7xl"]),
      "7xl"
    );
    setSelectValue(
      findSelectByOptions(spacingSection, ["none", "compact", "hero", "screen"]),
      "hero"
    );
    setSelectValue(findSelectByOptions(spacingSection, ["stack", "row", "grid"]), "grid");
    const regionColumnsSelect = findSelectByOptions(spacingSection, [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    expect(regionColumnsSelect.disabled).toBe(false);
    setSelectValue(regionColumnsSelect, "4");
    setSelectValue(findSelectByOptions(spacingSection, ["sm", "md", "lg", "xl"]), "xl");
    setSelectValue(findSelectByOptions(spacingSection, ["none", "sm", "md", "lg"]), "lg");
    setSelectValue(findSelectByOptions(spacingSection, ["none", "sm", "md", "lg", "xl"]), "lg");
    setSelectValue(
      findSelectByOptions(spacingSection, ["__match_variant__", "none", "sm", "md", "lg", "xl"]),
      "xl"
    );
    setInputValue(findColorInputForPlaceholder(surfaceSection, "transparent"), "#ecfeff");
    setInputValue(findInputByPlaceholder(surfaceSection, "#ffffff"), "#1d4ed8");
    setInputValue(findInputByPlaceholder(surfaceSection, "#f1f5f9"), "#222222");
    setInputValue(findInputByPlaceholder(surfaceSection, "var(--color-border)"), "#0f172a");
    setSelectValue(borderWidthSelect, "2");
    setSelectValue(radiusSelect, "xl");

    setInputValue(findInputByPlaceholder(surfaceSection, "#000000"), "#333333");
    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    setInputValue(angleInput, "270");
    setInputValue(opacityInput, "35");

    expect(view.onChangeSpy).toHaveBeenCalled();
    expect(view.getLatestValue().heading).toMatchObject({
      label: "Overview",
      title: "Overview section",
      description: "Supporting copy from visual editor.",
    });
    expect(view.getLatestValue().layout).toMatchObject({
      containerWidth: "wide",
      maxWidth: "7xl",
      minHeight: "hero",
      regionFlow: "grid",
      regionColumns: "4",
      paddingBlock: "xl",
      paddingInline: "lg",
      headingGap: "lg",
      regionGap: "xl",
    });
    expect(view.getLatestValue().semantics).toMatchObject({
      element: "div",
      anchorId: "overview",
      ariaLabel: "Overview section",
    });
    expect(view.getLatestValue().style).toMatchObject({
      backgroundColor: "#ecfeff",
      borderColor: "#0f172a",
      gradientFrom: "#1d4ed8",
      gradientTo: "#222222",
      gradientAngle: 270,
      borderWidth: "2",
      radius: "xl",
      overlayColor: "#333333",
      overlayOpacity: 35,
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"anchorId": "overview"');
    expect(snapshot?.textContent).toContain('"gradientAngle": 270');
    expect(snapshot?.textContent).toContain('"overlayOpacity": 35');
  } finally {
    view.cleanup();
  }
});

test("Section visual editor keeps grid columns disabled until grid flow is selected and restores match-variant spacing", async () => {
  const view = await renderEditors({
    initialValue: {},
    initialVariant: "default",
  });

  try {
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }

    const regionFlowSelect = findSelectByOptions(spacingSection, ["stack", "row", "grid"]);
    const regionColumnsSelect = findSelectByOptions(spacingSection, [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    const regionGapSelect = findSelectByOptions(spacingSection, [
      "__match_variant__",
      "none",
      "sm",
      "md",
      "lg",
      "xl",
    ]);

    expect(spacingSection.textContent).toContain(
      "Grid columns stay inactive until Region flow is set to Grid."
    );
    expect(regionColumnsSelect.disabled).toBe(true);
    expect(regionColumnsSelect.value).toBe("1");
    expect(regionGapSelect.value).toBe("__match_variant__");

    setSelectValue(regionFlowSelect, "grid");
    expect(view.getLatestValue().layout?.regionFlow).toBe("grid");
    expect(regionColumnsSelect.disabled).toBe(false);

    setSelectValue(regionColumnsSelect, "5");
    expect(view.getLatestValue().layout?.regionColumns).toBe("5");

    setSelectValue(regionGapSelect, "lg");
    expect(view.getLatestValue().layout?.regionGap).toBe("lg");

    setSelectValue(regionGapSelect, "__match_variant__");
    expect(view.getLatestValue().layout?.regionGap).toBeUndefined();

    setSelectValue(regionFlowSelect, "row");
    expect(view.getLatestValue().layout).toMatchObject({
      regionFlow: "row",
      regionColumns: "1",
    });
    expect(regionColumnsSelect.disabled).toBe(true);
    expect(regionColumnsSelect.value).toBe("1");
  } finally {
    view.cleanup();
  }
});

test("Section visual editor resolves decorative background image assets and bounded layer controls", async () => {
  const view = await renderEditors({
    initialValue: {},
    initialVariant: "default",
  });

  try {
    const backgroundSection = findSectionByTitle(view.container, "Background media and layers");
    if (!(backgroundSection instanceof HTMLElement)) {
      throw new Error("Missing background media section");
    }

    setSelectValue(findSelectByOptions(backgroundSection, ["none", "image", "video"]), "image");
    setSelectValue(findSelectByOptions(backgroundSection, ["library", "external"]), "library");
    clickByText(backgroundSection, "pick-image-asset");
    await flush();

    setSelectValue(findSelectByOptions(backgroundSection, ["cover", "contain"]), "contain");
    setSelectValue(
      findSelectByOptions(backgroundSection, ["center", "top", "bottom", "left", "right"]),
      "top"
    );
    setSelectValue(
      findSelectByOptions(backgroundSection, ["normal", "multiply", "screen", "overlay"]),
      "overlay"
    );
    setSelectValue(
      findSelectByOptions(backgroundSection, ["media-under-overlay", "overlay-under-media"]),
      "overlay-under-media"
    );
    setInputValue(findNumberInputs(backgroundSection)[0], "45");

    expect(view.getLatestValue().style?.backgroundMedia).toMatchObject({
      type: "image",
      source: "library",
      assetId: "asset-image",
      src: "/media/section-background.jpg",
      fit: "contain",
      position: "top",
      opacity: 45,
      blendMode: "overlay",
      layerOrder: "overlay-under-media",
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"backgroundMedia"');
    expect(snapshot?.textContent).toContain('"assetId": "asset-image"');
    expect(snapshot?.textContent).toContain('"blendMode": "overlay"');
    expect(snapshot?.textContent).toContain('"layerOrder": "overlay-under-media"');
  } finally {
    view.cleanup();
  }
});

test("Section visual editor resolves decorative background video and poster assets", async () => {
  const view = await renderEditors({
    initialValue: {},
    initialVariant: "default",
  });

  try {
    const backgroundSection = findSectionByTitle(view.container, "Background media and layers");
    if (!(backgroundSection instanceof HTMLElement)) {
      throw new Error("Missing background media section");
    }

    setSelectValue(findSelectByOptions(backgroundSection, ["none", "image", "video"]), "video");
    setSelectValue(findSelectByOptions(backgroundSection, ["library", "external"]), "library");
    clickByText(backgroundSection, "pick-video-asset");
    await flush();

    setInputValue(
      findInputByPlaceholder(backgroundSection, "Ambient background video"),
      "Ambient loop"
    );
    setTextareaValue(
      findTextareaByPlaceholder(backgroundSection, "Optional notes for this decorative video"),
      "Muted decorative video loop."
    );
    const backgroundSourceSelects = findSelectsByOptions(backgroundSection, [
      "library",
      "external",
    ]);
    const posterSourceSelect = backgroundSourceSelects[1];
    if (!(posterSourceSelect instanceof HTMLSelectElement)) {
      throw new Error("Missing poster source select");
    }
    setSelectValue(posterSourceSelect, "library");
    await flush();

    const posterPicker = Array.from(backgroundSection.querySelectorAll("[data-media-picker]")).find(
      (node) => node.getAttribute("data-media-picker") === "image/*"
    );
    if (!(posterPicker instanceof HTMLElement)) {
      throw new Error("Missing poster media picker");
    }
    clickByText(posterPicker, "pick-poster-asset");
    await flush();
    setInputValue(findNumberInputs(backgroundSection)[0], "55");

    expect(view.getLatestValue().style?.backgroundMedia).toMatchObject({
      type: "video",
      source: "library",
      assetId: "asset-video",
      src: "https://cdn.example.com/section-demo.mp4",
      title: "Ambient loop",
      description: "Muted decorative video loop.",
      posterSource: "library",
      posterAssetId: "asset-poster",
      posterSrc: "/media/section-poster.jpg",
      opacity: 55,
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"assetId": "asset-video"');
    expect(snapshot?.textContent).toContain('"posterAssetId": "asset-poster"');
    expect(snapshot?.textContent).toContain('"title": "Ambient loop"');
  } finally {
    view.cleanup();
  }
});

test("Section advanced editor clamps non-finite and out-of-range technical token values", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        gradientAngle: Number.NaN,
        overlayOpacity: Number.POSITIVE_INFINITY,
      },
    },
  });

  try {
    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    const [angleInput, opacityInput] = findNumberInputs(technicalTokensSection);
    expect(angleInput?.value).toBe("180");
    expect(opacityInput?.value).toBe("0");

    setInputValue(
      findInputByPlaceholder(technicalTokensSection, "section-anchor"),
      "team-overview"
    );
    setInputValue(
      findInputByPlaceholder(technicalTokensSection, "Descriptive section label"),
      "Team overview section"
    );
    setInputValue(angleInput, "-12");
    setInputValue(opacityInput, "125");

    expect(view.getLatestValue().semantics).toMatchObject({
      anchorId: "team-overview",
      ariaLabel: "Team overview section",
    });
    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 0,
      overlayOpacity: 100,
    });

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"anchorId": "team-overview"');
    expect(snapshot?.textContent).toContain('"ariaLabel": "Team overview section"');
    expect(snapshot?.textContent).toContain('"gradientAngle": 0');
    expect(snapshot?.textContent).toContain('"overlayOpacity": 100');
  } finally {
    view.cleanup();
  }
});

test("Section surface token inputs preserve raw tokens, fall back safely, and resync after valid picker updates", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        backgroundColor: "#0ea5e9",
        gradientFrom: "#38bdf8",
        borderColor: "#0f172a",
      },
    },
  });

  try {
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const backgroundTextInput = findInputByPlaceholder(surfaceSection, "transparent");
    const backgroundColorInput = findColorInputForPlaceholder(surfaceSection, "transparent");
    const gradientStartTextInput = findInputByPlaceholder(surfaceSection, "#ffffff");
    const gradientStartColorInput = findColorInputForPlaceholder(surfaceSection, "#ffffff");
    const borderTextInput = findInputByPlaceholder(surfaceSection, "var(--color-border)");
    const borderColorInput = findColorInputForPlaceholder(surfaceSection, "var(--color-border)");

    setInputValue(backgroundTextInput, "var(--section-surface)");
    setInputValue(gradientStartTextInput, "surface-start-token");
    setInputValue(borderTextInput, "border-strong-token");

    expect(view.getLatestValue().style).toMatchObject({
      backgroundColor: "var(--section-surface)",
      gradientFrom: "surface-start-token",
      borderColor: "border-strong-token",
    });
    expect(backgroundTextInput?.value).toBe("var(--section-surface)");
    expect(backgroundColorInput.value).toBe("#ffffff");
    expect(gradientStartTextInput?.value).toBe("surface-start-token");
    expect(gradientStartColorInput.value).toBe("#ffffff");
    expect(borderTextInput?.value).toBe("border-strong-token");
    expect(borderColorInput.value).toBe("#e2e8f0");

    setInputValue(backgroundColorInput, "#112233");
    setInputValue(gradientStartColorInput, "#abcdef");
    setInputValue(borderColorInput, "#334455");

    expect(view.getLatestValue().style).toMatchObject({
      backgroundColor: "#112233",
      gradientFrom: "#abcdef",
      borderColor: "#334455",
    });
    expect(backgroundTextInput?.value).toBe("#112233");
    expect(gradientStartTextInput?.value).toBe("#abcdef");
    expect(borderTextInput?.value).toBe("#334455");

    setInputValue(backgroundTextInput, "");

    expect(view.getLatestValue().style?.backgroundColor).toBeUndefined();
    expect(backgroundTextInput?.value).toBe("");
    expect(backgroundColorInput.value).toBe("#ffffff");

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).not.toContain('"backgroundColor"');
    expect(snapshot?.textContent).toContain('"gradientFrom": "#abcdef"');
    expect(snapshot?.textContent).toContain('"borderColor": "#334455"');
  } finally {
    view.cleanup();
  }
});

test("Section editors coerce invalid numeric text input back to safe angle and opacity defaults", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        gradientAngle: 45,
        overlayOpacity: 55,
      },
    },
  });

  try {
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    setRawInputValue(angleInput, "not-a-number");
    setRawInputValue(opacityInput, "not-a-number");

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 180,
      overlayOpacity: 0,
    });

    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    const [advancedAngleInput, advancedOpacityInput] = findNumberInputs(technicalTokensSection);
    expect(advancedAngleInput?.value).toBe("180");
    expect(advancedOpacityInput?.value).toBe("0");

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"gradientAngle": 180');
    expect(snapshot?.textContent).toContain('"overlayOpacity": 0');
  } finally {
    view.cleanup();
  }
});

test("Section advanced technical tokens round decimals, clamp boundaries, and stay synchronized with surface controls", async () => {
  const view = await renderEditors({
    initialValue: {
      semantics: {
        anchorId: "initial-anchor",
        ariaLabel: "Initial section",
      },
      style: {
        gradientAngle: 12,
        overlayOpacity: 8,
      },
    },
  });

  try {
    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    const [advancedAngleInput, advancedOpacityInput] = findNumberInputs(technicalTokensSection);
    setInputValue(findInputByPlaceholder(technicalTokensSection, "section-anchor"), "wave-layout");
    setInputValue(
      findInputByPlaceholder(technicalTokensSection, "Descriptive section label"),
      "Wave layout section"
    );
    setInputValue(advancedAngleInput, "44.6");
    setInputValue(advancedOpacityInput, "15.5");

    expect(view.getLatestValue().semantics).toMatchObject({
      anchorId: "wave-layout",
      ariaLabel: "Wave layout section",
    });
    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 45,
      overlayOpacity: 16,
    });

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const [surfaceAngleInput, surfaceOpacityInput] = findNumberInputs(surfaceSection);
    expect(surfaceAngleInput?.value).toBe("45");
    expect(surfaceOpacityInput?.value).toBe("16");

    setInputValue(surfaceAngleInput, "359.6");
    setInputValue(surfaceOpacityInput, "-0.6");

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 360,
      overlayOpacity: 0,
    });
    expect(advancedAngleInput?.value).toBe("360");
    expect(advancedOpacityInput?.value).toBe("0");

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"anchorId": "wave-layout"');
    expect(snapshot?.textContent).toContain('"ariaLabel": "Wave layout section"');
    expect(snapshot?.textContent).toContain('"gradientAngle": 360');
    expect(snapshot?.textContent).toContain('"overlayOpacity": 0');
  } finally {
    view.cleanup();
  }
});

test("Section editors fall back to sparse normalized token fields and contract defaults", async () => {
  await mockSectionContract({
    normalizedValue: {
      heading: {
        label: undefined,
        title: undefined,
        description: undefined,
      },
      semantics: {
        element: undefined,
        anchorId: undefined,
        ariaLabel: undefined,
      },
      style: {
        backgroundColor: undefined,
        gradientFrom: undefined,
        gradientTo: undefined,
        gradientAngle: 180,
        borderColor: undefined,
        borderWidth: undefined,
        radius: undefined,
        overlayColor: undefined,
        overlayOpacity: 0,
      },
    },
    defaults: {
      heading: {},
      semantics: {
        element: "div",
      },
      style: {
        borderWidth: "3",
        radius: "lg",
        gradientAngle: 180,
        overlayOpacity: 0,
      },
    },
  });

  let view: Awaited<ReturnType<typeof renderEditors>> | undefined;

  try {
    view = await renderEditors({
      initialValue: {},
    });

    expect(findInputByPlaceholder(view.container, "Section title")?.value).toBe("");
    expect(findTextareaByPlaceholder(view.container, "Short context for the section")?.value).toBe(
      ""
    );
    expect(findInputsByPlaceholder(view.container, "transparent")[0]?.value).toBe("");
    expect(findColorInputForPlaceholder(view.container, "transparent", 0).value).toBe("#ffffff");

    const semanticsSection = findSectionByTitle(view.container, "Semantics and anchor");
    if (!(semanticsSection instanceof HTMLElement)) {
      throw new Error("Missing semantics section");
    }
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }

    expect(findInputByPlaceholder(view.container, "Section label")?.value).toBe("");
    expect(findInputsByPlaceholder(view.container, "Section title")[1]?.value).toBe("");
    expect(
      findTextareaByPlaceholder(view.container, "Supportive copy for this section")?.value
    ).toBe("");
    expect(findSelectByOptions(semanticsSection, ["section", "div"]).value).toBe("div");
    expect(findInputByPlaceholder(semanticsSection, "pricing-section")?.value).toBe("");
    expect(findInputByPlaceholder(semanticsSection, "Pricing section")?.value).toBe("");
    expect(findSelectByOptions(spacingSection, ["none", "compact", "hero", "screen"]).value).toBe(
      "none"
    );
    expect(findSelectByOptions(spacingSection, ["stack", "row", "grid"]).value).toBe("stack");
    const sparseColumnsSelect = findSelectByOptions(spacingSection, [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    expect(sparseColumnsSelect.value).toBe("1");
    expect(sparseColumnsSelect.disabled).toBe(true);
    expect(findSelectByOptions(spacingSection, ["none", "sm", "md", "lg", "xl"]).value).toBe("md");
    expect(
      findSelectByOptions(spacingSection, ["__match_variant__", "none", "sm", "md", "lg", "xl"])
        .value
    ).toBe("__match_variant__");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    expect(findInputByPlaceholder(surfaceSection, "#ffffff")?.value).toBe("");
    expect(findColorInputForPlaceholder(surfaceSection, "#ffffff").value).toBe("#ffffff");
    expect(findInputByPlaceholder(surfaceSection, "#f1f5f9")?.value).toBe("");
    expect(findColorInputForPlaceholder(surfaceSection, "#f1f5f9").value).toBe("#f1f5f9");
    expect(findInputByPlaceholder(surfaceSection, "var(--color-border)")?.value).toBe("");
    expect(findColorInputForPlaceholder(surfaceSection, "var(--color-border)").value).toBe(
      "#e2e8f0"
    );
    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("3");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("lg");
    expect(findInputByPlaceholder(surfaceSection, "#000000")?.value).toBe("");
    expect(findColorInputForPlaceholder(surfaceSection, "#000000").value).toBe("#000000");

    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    expect(findInputByPlaceholder(technicalTokensSection, "section-anchor")?.value).toBe("");
    expect(findInputByPlaceholder(technicalTokensSection, "Descriptive section label")?.value).toBe(
      ""
    );

    const snapshot = view.container.querySelector("pre");
    expect(snapshot?.textContent).toContain('"gradientAngle": 180');
    expect(snapshot?.textContent).toContain('"overlayOpacity": 0');
  } finally {
    view?.cleanup();
    vi.doUnmock("../../../core/widgets/core/section");
    vi.resetModules();
  }
});

test("Section editors sanitize invalid anchor characters before persisting", async () => {
  const view = await renderEditors({
    initialValue: {},
    initialVariant: "default",
  });

  try {
    const semanticsSection = findSectionByTitle(view.container, "Semantics and anchor");
    setInputValue(
      findInputByPlaceholder(semanticsSection ?? view.container, "pricing-section"),
      " team overview / 2026 "
    );

    expect(view.getLatestValue().semantics?.anchorId).toBe("team-overview-2026");
  } finally {
    view.cleanup();
  }
});

test("Section editors use hardcoded select fallbacks when sparse defaults omit semantics and surface options", async () => {
  await mockSectionContract({
    normalizedValue: {
      heading: {},
      semantics: {
        element: undefined,
        anchorId: undefined,
        ariaLabel: undefined,
      },
      style: {
        backgroundColor: undefined,
        gradientFrom: undefined,
        gradientTo: undefined,
        gradientAngle: 180,
        borderColor: undefined,
        borderWidth: undefined,
        radius: undefined,
        overlayColor: undefined,
        overlayOpacity: 0,
      },
    },
    defaults: {
      heading: {},
      semantics: {},
      style: {
        gradientAngle: 180,
        overlayOpacity: 0,
      },
    },
  });

  let view: Awaited<ReturnType<typeof renderEditors>> | undefined;

  try {
    view = await renderEditors({
      initialValue: {},
      withVariantChange: false,
    });

    const semanticsSection = findSectionByTitle(view.container, "Semantics and anchor");
    if (!(semanticsSection instanceof HTMLElement)) {
      throw new Error("Missing semantics section");
    }
    expect(findSelectByOptions(semanticsSection, ["section", "div"]).value).toBe("section");

    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }
    expect(findSelectByOptions(spacingSection, ["none", "compact", "hero", "screen"]).value).toBe(
      "none"
    );
    expect(findSelectByOptions(spacingSection, ["stack", "row", "grid"]).value).toBe("stack");
    const hardcodedColumnsSelect = findSelectByOptions(spacingSection, [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]);
    expect(hardcodedColumnsSelect.value).toBe("1");
    expect(hardcodedColumnsSelect.disabled).toBe(true);
    expect(findSelectByOptions(spacingSection, ["none", "sm", "md", "lg", "xl"]).value).toBe("md");
    expect(
      findSelectByOptions(spacingSection, ["__match_variant__", "none", "sm", "md", "lg", "xl"])
        .value
    ).toBe("__match_variant__");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("0");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("none");

    clickByText(view.container, "Contained");
    expect(view.getLatestVariant()).toBe("legacy");
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();
  } finally {
    view?.cleanup();
    vi.doUnmock("../../../core/widgets/core/section");
    vi.resetModules();
  }
});
