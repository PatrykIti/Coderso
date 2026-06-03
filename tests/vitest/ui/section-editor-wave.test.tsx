// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { SectionData } from "../../../core/widgets/core/section";
import type { WidgetBlock, WidgetBlockPatcher } from "../../../core/widgets/types";

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

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <button type="button" data-tabs-trigger={value}>
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

const findInputsByAriaLabel = (container: ParentNode, label: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("aria-label") === label
  );

const findColorInputByLabel = (container: ParentNode, label: string, index = 0) => {
  const colorInput = findInputsByAriaLabel(container, `${label} swatch`)[index];
  if (!(colorInput instanceof HTMLInputElement)) {
    throw new Error(`Missing color input for "${label}" (${index})`);
  }
  return colorInput;
};

const findWidgetControl = (container: ParentNode, id: string) => {
  const control = container.querySelector(`[data-widget-control="${id}"]`);
  if (!(control instanceof HTMLElement)) {
    throw new Error(`Missing widget control: ${id}`);
  }
  return control;
};

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
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

const findNumberInputs = (container: ParentNode) =>
  Array.from(container.querySelectorAll('input[type="number"]')).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement
  );

const findSectionSlider = (container: ParentNode, key: string) =>
  container.querySelector(`[data-section-slider="${key}"]`);

const findSectionRangeValue = (container: ParentNode, key: string) =>
  container.querySelector(`[data-section-range-value="${key}"]`);

const findSectionStepper = (
  container: ParentNode,
  key: string,
  direction: "increase" | "decrease"
) => container.querySelector(`[data-section-stepper="${key}-${direction}"]`);

const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error("Missing button element");
  }
  React.act(() => {
    element.click();
  });
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("p, h3")).some(
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
  withBlockPatch = false,
}: {
  initialValue: SectionData;
  initialVariant?: string;
  withVariantChange?: boolean;
  withBlockPatch?: boolean;
}) => {
  const { SectionAdvancedEditor, SectionVisualEditor, SectionWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/SectionEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  const onBlockPatchSpy = vi.fn();
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

    const handleBlockPatch: WidgetBlockPatcher | undefined = withBlockPatch
      ? (patch) => {
          const currentBlock: WidgetBlock = {
            id: "section-test-block",
            type: "section",
            variant,
            data: value,
          };
          const nextBlock =
            typeof patch === "function" ? patch(currentBlock) : { ...currentBlock, ...patch };
          const nextVariant = nextBlock.variant ?? "default";
          const nextValue = nextBlock.data as SectionData;
          latestVariant = nextVariant;
          latestValue = nextValue;
          onBlockPatchSpy(nextBlock);
          setVariant(nextVariant);
          setValue(nextValue);
        }
      : undefined;

    return (
      <>
        <SectionWizardEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
          onBlockPatch={handleBlockPatch}
        />
        <SectionVisualEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
          onBlockPatch={handleBlockPatch}
        />
        <SectionAdvancedEditor
          value={value}
          onChange={handleChange}
          variant={variant}
          onVariantChange={handleVariantChange}
          onBlockPatch={handleBlockPatch}
        />
      </>
    );
  };

  return {
    ...mount(<Harness />),
    onBlockPatchSpy,
    onChangeSpy,
    onVariantChangeSpy,
    getLatestValue: () => latestValue,
    getLatestVariant: () => latestVariant,
  };
};

const renderSectionBlockSettings = async () => {
  const { BlockSettings } = await import("../../../core/admin/ui/pages/builder/BlockSettings");
  const { SectionAdvancedEditor, SectionVisualEditor, SectionWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/SectionEditors");
  const { createSectionWidget, sectionDefaults } =
    await import("../../../core/widgets/core/section");

  const widget = createSectionWidget({
    wizard: SectionWizardEditor,
    visual: SectionVisualEditor,
    advanced: SectionAdvancedEditor,
  });
  const initialBlock: WidgetBlock = {
    id: "section-test-block",
    type: "section",
    variant: "default",
    data: {
      ...sectionDefaults,
      regions: [{ id: "1", label: "Hero" }],
    },
    slots: {
      "region:1": [],
    },
    editor: { mode: "visual", wizardCompleted: true },
  };
  let latestBlock = initialBlock;
  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [block, setBlock] = useState<WidgetBlock>(initialBlock);
    const handleChange = (nextBlock: WidgetBlock) => {
      latestBlock = nextBlock;
      onChangeSpy(nextBlock);
      setBlock(nextBlock);
    };

    return <BlockSettings block={block} widget={widget} onChange={handleChange} />;
  };

  return {
    ...mount(<Harness />),
    getLatestBlock: () => latestBlock,
    onChangeSpy,
  };
};

test("Section builder-owned Region controls expose stable control paths", async () => {
  const view = await renderSectionBlockSettings();

  try {
    await flush();
    const regionsSection = view.container.querySelector(
      '[data-widget-editor-section="section.regions"]'
    );
    if (!(regionsSection instanceof HTMLElement)) {
      throw new Error("Missing Section regions section");
    }

    const addRegionControl = findWidgetControl(regionsSection, "section.regions.add-region");
    expect(addRegionControl.getAttribute("data-widget-control-path")).toBe("regions");
    expect(addRegionControl.getAttribute("data-widget-control-ownership")).toBe("action");
    expect(addRegionControl.textContent).toContain("Add Region");

    const regionRow = findWidgetControl(regionsSection, "section.slot.region:1");
    expect(regionRow.getAttribute("data-widget-control-path")).toBe("regions.1");
    expect(regionRow.getAttribute("data-widget-control-ownership")).toBe("action");

    const labelControl = findWidgetControl(regionsSection, "section.slot.region:1.label");
    expect(labelControl.getAttribute("data-widget-control-path")).toBe("regions.1.label");
    expect(labelControl.getAttribute("data-widget-control-ownership")).toBe("writable");
    const labelInput = labelControl.querySelector("input");
    expect(labelInput?.getAttribute("aria-label")).toBe("Rename Hero slot");

    setInputValue(labelInput, "Main");
    expect(view.getLatestBlock().data).toMatchObject({
      regions: [{ id: "1", label: "Main" }],
    });

    clickByText(regionsSection, "Add Region");
    expect(view.getLatestBlock().slots).toMatchObject({
      "region:1": [],
      "region:2": [],
    });
    const nextLabelControl = findWidgetControl(view.container, "section.slot.region:2.label");
    expect(nextLabelControl.getAttribute("data-widget-control-path")).toBe("regions.2.label");

    const unmappedControls = Array.from(regionsSection.querySelectorAll("button, input")).filter(
      (element) => !element.closest("[data-widget-control-path]")
    );
    expect(unmappedControls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
}, 10000);

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

test("Section editors normalize malformed defaults, summarize saved custom colors, and ignore variant changes without a handler", async () => {
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
    const wizardSection = findSectionByTitle(view.container, "Section setup");
    if (!(wizardSection instanceof HTMLElement)) {
      throw new Error("Missing section setup");
    }
    expect(wizardSection.textContent).not.toContain("Quick preset");
    expect(wizardSection.textContent).not.toContain("Hero band");
    const wizardVariantControl = wizardSection.querySelector(
      '[data-widget-control="section.wizard.variant"]'
    );
    if (!(wizardVariantControl instanceof HTMLElement)) {
      throw new Error("Missing wizard variant control");
    }
    expect(wizardVariantControl.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(wizardVariantControl.textContent).toContain("Default");
    expect(view.getLatestVariant()).toBe("legacy");
    expect(view.onVariantChangeSpy).not.toHaveBeenCalled();
    expect(view.onChangeSpy).not.toHaveBeenCalled();

    const linkSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(linkSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }
    expect(linkSection.getAttribute("data-widget-editor-section")).toBe(
      "section.visual.link-accessibility"
    );
    expect(
      linkSection.querySelector('[data-widget-control="section.semantics.anchorId"]')
    ).not.toBeNull();
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    expect(surfaceSection.getAttribute("data-widget-editor-section")).toBe(
      "section.surface-borders"
    );
    expect(spacingSection.getAttribute("data-widget-editor-section")).toBe("section.width-spacing");

    expect(findSelectByOptions(linkSection, ["section", "div"]).value).toBe("section");
    expect(findColorInputByLabel(surfaceSection, "Background color").value).toBe("#ffffff");
    expect(findColorInputByLabel(surfaceSection, "Gradient start").value).toBe("#ffffff");
    expect(findColorInputByLabel(surfaceSection, "Gradient end").value).toBe("#f1f5f9");
    expect(findColorInputByLabel(surfaceSection, "Border color").value).toBe("#e2e8f0");
    expect(findColorInputByLabel(surfaceSection, "Overlay color").value).toBe("#000000");
    expect(surfaceSection.textContent).toContain("Saved custom color");
    expect(findInputsByPlaceholder(surfaceSection, "var(--color-border)")).toHaveLength(0);
    expect(findInputsByPlaceholder(surfaceSection, "#ffffff")).toHaveLength(0);

    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("0");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("none");
    expect(
      findSelectByOptions(surfaceSection, ["__match_variant__", "none", "sm", "md", "lg", "xl"])
        .value
    ).toBe("__match_variant__");
    expect(findSelectByOptions(surfaceSection, ["none", "fade", "slide-up"]).value).toBe("none");
    const preview = surfaceSection.querySelector('[data-section-surface-preview="true"]');
    expect(preview?.getAttribute("data-section-surface-preview-shadow")).toBe("none");
    expect(preview?.getAttribute("data-section-surface-preview-motion")).toBe("none");

    expect(findSectionSlider(surfaceSection, "gradient-angle")).not.toBeNull();
    expect(findSectionSlider(surfaceSection, "overlay-opacity")).not.toBeNull();
    expect(findSectionRangeValue(surfaceSection, "gradient-angle")?.textContent).toBe("360°");
    expect(findSectionRangeValue(surfaceSection, "overlay-opacity")?.textContent).toBe("100%");

    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    expect(angleInput?.value).toBe("360");
    expect(opacityInput?.value).toBe("100");
  } finally {
    view.cleanup();
  }
});

test("Section editors cover variant changes, friendly link fields, swatch colors, and advanced summaries", async () => {
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
    const wizardSection = findSectionByTitle(view.container, "Section setup");
    if (!(wizardSection instanceof HTMLElement)) {
      throw new Error("Missing section setup");
    }
    const wizardVariantControl = wizardSection.querySelector(
      '[data-widget-control="section.wizard.variant"]'
    );
    if (!(wizardVariantControl instanceof HTMLElement)) {
      throw new Error("Missing wizard variant control");
    }
    expect(wizardVariantControl.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(wizardVariantControl.textContent).toContain("Default");
    const wizardRoot = view.container.querySelector(
      '[data-widget-editor-mode="wizard"]'
    ) as ParentNode | null;
    expect(view.container.textContent).toContain("Wizard is one-time starter setup");
    expect(
      findInputByPlaceholder(wizardRoot ?? view.container, "Section label (optional)")
    ).toBeUndefined();
    expect(findInputByPlaceholder(wizardRoot ?? view.container, "Section title")).toBeUndefined();
    expect(
      findTextareaByPlaceholder(wizardRoot ?? view.container, "Short context for the section")
    ).toBeUndefined();

    const variantSection = findSectionByTitle(view.container, "Variant and structure");
    if (!(variantSection instanceof HTMLElement)) {
      throw new Error("Missing variant and structure section");
    }
    expect(
      variantSection.querySelector('[data-widget-control-path="layout.containerWidth"]')
    ).not.toBeNull();
    expect(
      variantSection.querySelector('[data-widget-control-path="style.radius"]')
    ).not.toBeNull();
    clickByText(variantSection, "Bleed");
    expect(view.getLatestVariant()).toBe("bleed");

    setInputValue(findInputsByPlaceholder(view.container, "Section title")[1], "Overview section");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Supportive copy for this section"),
      "Supporting copy from visual editor."
    );
    setInputValue(findInputByPlaceholder(view.container, "Section label"), "Overview");
    setInputValue(findInputByPlaceholder(view.container, "Pricing area"), "overview");
    setInputValue(findInputByPlaceholder(view.container, "Pricing section"), "Overview section");

    const headingSection = findSectionByTitle(view.container, "Heading and intro");
    if (!(headingSection instanceof HTMLElement)) {
      throw new Error("Missing heading section");
    }
    expect(headingSection.textContent).toContain("Section titles default to `h2`.");
    setSelectValue(findSelectByOptions(headingSection, ["h1", "h2", "h3", "h4", "h5", "h6"]), "h4");
    setSelectValue(findSelectByOptions(headingSection, ["left", "center", "right"]), "center");
    setSelectValue(findSelectByOptions(headingSection, ["xs", "sm", "md"]), "md");
    setSelectValue(findSelectByOptions(headingSection, ["xl", "2xl", "3xl"]), "3xl");
    setSelectValue(findSelectByOptions(headingSection, ["sm", "base", "lg"]), "lg");
    setInputValue(findColorInputByLabel(headingSection, "Label color"), "#475569");
    setInputValue(findColorInputByLabel(headingSection, "Title color"), "#111827");
    setInputValue(findColorInputByLabel(headingSection, "Description color"), "#334155");

    const linkSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(linkSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }
    const elementSelect = findSelectByOptions(linkSection, ["section", "div"]);
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
    const shadowSelect = findSelectByOptions(surfaceSection, [
      "__match_variant__",
      "none",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const motionSelect = findSelectByOptions(surfaceSection, ["none", "fade", "slide-up"]);
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
    const responsiveBlockSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const responsiveInlineSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "none",
      "sm",
      "md",
      "lg",
    ]);
    setSelectValue(responsiveBlockSelects[0], "sm");
    setSelectValue(responsiveInlineSelects[0], "none");
    setSelectValue(responsiveBlockSelects[1], "xl");
    setSelectValue(responsiveInlineSelects[1], "lg");
    setSelectValue(findSelectByOptions(spacingSection, ["none", "sm", "md", "lg", "xl"]), "lg");
    setSelectValue(
      findSelectByOptions(spacingSection, ["__match_variant__", "none", "sm", "md", "lg", "xl"]),
      "xl"
    );
    setInputValue(findColorInputByLabel(surfaceSection, "Background color"), "#ecfeff");
    setInputValue(findColorInputByLabel(surfaceSection, "Gradient start"), "#1d4ed8");
    setInputValue(findColorInputByLabel(surfaceSection, "Gradient end"), "#222222");
    setInputValue(findColorInputByLabel(surfaceSection, "Border color"), "#0f172a");
    setSelectValue(borderWidthSelect, "2");
    setSelectValue(radiusSelect, "xl");
    setSelectValue(shadowSelect, "lg");
    setSelectValue(motionSelect, "slide-up");

    setInputValue(findColorInputByLabel(surfaceSection, "Overlay color"), "#333333");
    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    setInputValue(angleInput, "270");
    setInputValue(opacityInput, "35");

    expect(view.onChangeSpy).toHaveBeenCalled();
    expect(view.getLatestValue().heading).toMatchObject({
      label: "Overview",
      title: "",
      description: "Supporting copy from visual editor.",
      level: "h4",
      align: "center",
      labelSize: "md",
      titleSize: "3xl",
      descriptionSize: "lg",
      descriptionColor: "#334155",
    });
    expect(view.getLatestValue().layout).toMatchObject({
      containerWidth: "wide",
      maxWidth: "7xl",
      minHeight: "hero",
      regionFlow: "grid",
      regionColumns: "4",
      paddingBlock: "xl",
      paddingInline: "lg",
      mobilePaddingBlock: "sm",
      mobilePaddingInline: "none",
      desktopPaddingBlock: "xl",
      desktopPaddingInline: "lg",
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
      shadow: "lg",
      motion: "slide-up",
      overlayColor: "#333333",
      overlayOpacity: 35,
    });

    const preview = surfaceSection.querySelector('[data-section-surface-preview="true"]');
    expect(preview?.getAttribute("data-section-surface-preview-shadow")).toBe("lg");
    expect(preview?.getAttribute("data-section-surface-preview-motion")).toBe("slide-up");
    expect(preview?.className).toContain("shadow-lg");
    expect(
      surfaceSection.querySelector('[data-section-surface-preview-overlay="true"]')
    ).not.toBeNull();

    const advancedSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(advancedSection?.textContent).toContain("h4 heading");
    expect(view.container.textContent).toContain("link name overview");
    expect(advancedSection?.textContent).toContain("Gradient angle 270 degrees");
    expect(advancedSection?.textContent).toContain("overlay 35%");
  } finally {
    view.cleanup();
  }
});

test("Section variant cards use atomic block patches when available", async () => {
  const view = await renderEditors({
    initialValue: {
      heading: {
        title: "Atomic section",
      },
    },
    initialVariant: "default",
    withVariantChange: false,
    withBlockPatch: true,
  });

  try {
    const wizardSection = findSectionByTitle(view.container, "Section setup");
    if (!(wizardSection instanceof HTMLElement)) {
      throw new Error("Missing section setup");
    }
    const wizardVariantControl = wizardSection.querySelector(
      '[data-widget-control="section.wizard.variant"]'
    );
    if (!(wizardVariantControl instanceof HTMLElement)) {
      throw new Error("Missing wizard variant control");
    }
    expect(wizardVariantControl.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(view.onBlockPatchSpy).not.toHaveBeenCalled();
    expect(view.onChangeSpy).not.toHaveBeenCalled();
    expect(view.getLatestVariant()).toBe("default");

    const variantSection = findSectionByTitle(view.container, "Variant and structure");
    if (!(variantSection instanceof HTMLElement)) {
      throw new Error("Missing variant and structure section");
    }
    clickByText(variantSection, "Contained");
    expect(view.getLatestVariant()).toBe("contained");
  } finally {
    view.cleanup();
  }
});

test("Section shadow fallback stays match-variant until explicitly overridden", async () => {
  const view = await renderEditors({
    initialValue: {},
    initialVariant: "contained",
  });

  try {
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const shadowSelect = findSelectByOptions(surfaceSection, [
      "__match_variant__",
      "none",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const motionSelect = findSelectByOptions(surfaceSection, ["none", "fade", "slide-up"]);
    const preview = surfaceSection.querySelector('[data-section-surface-preview="true"]');

    expect(shadowSelect.value).toBe("__match_variant__");
    expect(preview?.getAttribute("data-section-surface-preview-shadow")).toBe("sm");
    expect(preview?.getAttribute("data-section-surface-preview-motion")).toBe("none");

    setSelectValue(shadowSelect, "none");
    expect(view.getLatestValue().style?.shadow).toBe("none");
    expect(preview?.getAttribute("data-section-surface-preview-shadow")).toBe("none");

    setSelectValue(shadowSelect, "__match_variant__");
    expect(view.getLatestValue().style?.shadow).toBeUndefined();
    expect(preview?.getAttribute("data-section-surface-preview-shadow")).toBe("sm");

    setSelectValue(motionSelect, "fade");
    expect(view.getLatestValue().style?.motion).toBe("fade");
    expect(preview?.getAttribute("data-section-surface-preview-motion")).toBe("fade");
  } finally {
    view.cleanup();
  }
});

test("Section editor presets preserve heading copy and expose friendly width and gradient guidance", async () => {
  const view = await renderEditors({
    initialValue: {
      heading: {
        label: "Overview",
        title: "Pricing plans",
        description: "Supportive copy stays intact.",
      },
    },
    initialVariant: "default",
  });

  try {
    const wizardSection = findSectionByTitle(view.container, "Section setup");
    if (!(wizardSection instanceof HTMLElement)) {
      throw new Error("Missing section setup");
    }
    expect(wizardSection.textContent).not.toContain("Quick preset");
    expect(wizardSection.textContent).not.toContain("Two-column region group");
    const wizardVariantControl = wizardSection.querySelector(
      '[data-widget-control="section.wizard.variant"]'
    );
    if (!(wizardVariantControl instanceof HTMLElement)) {
      throw new Error("Missing wizard variant control");
    }
    expect(wizardVariantControl.getAttribute("data-widget-control-readonly")).toBe("true");

    const variantSection = findSectionByTitle(view.container, "Variant and structure");
    if (!(variantSection instanceof HTMLElement)) {
      throw new Error("Missing variant and structure section");
    }
    expect(variantSection.textContent).toContain("Quick presets");
    clickByText(variantSection, "Bleed");
    expect(view.getLatestVariant()).toBe("bleed");
    expect(view.getLatestValue().heading).toMatchObject({
      label: "Overview",
      title: "Pricing plans",
      description: "Supportive copy stays intact.",
    });
    clickByText(variantSection, "Two-column region group");
    expect(view.getLatestVariant()).toBe("default");
    expect(view.getLatestValue().heading).toMatchObject({
      label: "Overview",
      title: "Pricing plans",
      description: "Supportive copy stays intact.",
      align: "left",
    });
    expect(view.getLatestValue().layout).toMatchObject({
      containerWidth: "content",
      maxWidth: "7xl",
      regionFlow: "grid",
      regionColumns: "2",
      headingGap: "lg",
      regionGap: "lg",
    });

    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }
    expect(spacingSection.textContent).toContain(
      "`Wide alias` keeps the same wrapper classes as `Content`"
    );
    expect(spacingSection.textContent).toContain("Full-width wrapper");
    const maxWidthSelect = findSelectByOptions(spacingSection, [
      "none",
      "4xl",
      "5xl",
      "6xl",
      "7xl",
    ]);
    expect(Array.from(maxWidthSelect.options).map((option) => option.textContent)).toContain(
      "7XL (80rem / 1280px)"
    );

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }
    expect(surfaceSection.textContent).toContain("gradient becomes the visible surface");
    expect(
      surfaceSection.querySelector('[data-widget-control="section.style.gradientFrom"]')
        ?.textContent
    ).toContain("Clear");
    expect(
      surfaceSection.querySelector('[data-widget-control="section.style.gradientTo"]')?.textContent
    ).toContain("Clear");
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

test("Section visual editor clears responsive padding overrides back to match base", async () => {
  const view = await renderEditors({
    initialValue: {
      layout: {
        mobilePaddingBlock: "sm",
        mobilePaddingInline: "none",
        desktopPaddingBlock: "xl",
        desktopPaddingInline: "lg",
      },
    },
    initialVariant: "default",
  });

  try {
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }

    expect(spacingSection.textContent).toContain(
      "Responsive padding stays on the same bounded tokens."
    );

    const responsiveBlockSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const responsiveInlineSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "none",
      "sm",
      "md",
      "lg",
    ]);

    expect(responsiveBlockSelects).toHaveLength(2);
    expect(responsiveInlineSelects).toHaveLength(2);
    expect(responsiveBlockSelects[0]?.value).toBe("sm");
    expect(responsiveInlineSelects[0]?.value).toBe("none");
    expect(responsiveBlockSelects[1]?.value).toBe("xl");
    expect(responsiveInlineSelects[1]?.value).toBe("lg");

    setSelectValue(responsiveBlockSelects[0], "__match_base__");
    setSelectValue(responsiveInlineSelects[0], "__match_base__");
    setSelectValue(responsiveBlockSelects[1], "__match_base__");
    setSelectValue(responsiveInlineSelects[1], "__match_base__");

    expect(view.getLatestValue().layout?.mobilePaddingBlock).toBeUndefined();
    expect(view.getLatestValue().layout?.mobilePaddingInline).toBeUndefined();
    expect(view.getLatestValue().layout?.desktopPaddingBlock).toBeUndefined();
    expect(view.getLatestValue().layout?.desktopPaddingInline).toBeUndefined();
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

    const mediaControl = findWidgetControl(
      backgroundSection,
      "section.style.backgroundMedia.assetId"
    );
    expect(mediaControl.getAttribute("data-widget-control-path")).toBe("style.backgroundMedia");
    expect(
      backgroundSection.querySelector('[data-widget-control-path="style.backgroundMedia.source"]')
    ).not.toBeNull();
    expect(
      backgroundSection.querySelector('[data-widget-control-path="style.backgroundMedia.src"]')
    ).not.toBeNull();
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("image from Media Library");
    expect(diagnosticsSection?.textContent).toContain("45% opacity");
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

    const posterControl = findWidgetControl(
      backgroundSection,
      "section.style.backgroundMedia.posterAssetId"
    );
    expect(posterControl.getAttribute("data-widget-control-path")).toBe("style.backgroundMedia");
    expect(
      backgroundSection.querySelector(
        '[data-widget-control-path="style.backgroundMedia.posterSource"]'
      )
    ).not.toBeNull();
    expect(
      backgroundSection.querySelector(
        '[data-widget-control-path="style.backgroundMedia.posterSrc"]'
      )
    ).not.toBeNull();
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("video from Media Library");
    expect(diagnosticsSection?.textContent).toContain("55% opacity");
  } finally {
    view.cleanup();
  }
});

test("Section visual link fields own semantics while Advanced stays read-only", async () => {
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

    expect(findNumberInputs(technicalTokensSection)).toHaveLength(0);
    expect(technicalTokensSection.querySelectorAll("input, select, textarea, button")).toHaveLength(
      0
    );

    const linkSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(linkSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }
    setInputValue(findInputByPlaceholder(linkSection, "Pricing area"), "team-overview");
    setInputValue(findInputByPlaceholder(linkSection, "Pricing section"), "Team overview section");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    const [angleInput, opacityInput] = findNumberInputs(surfaceSection);
    expect(angleInput?.value).toBe("180");
    expect(opacityInput?.value).toBe("0");
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

    expect(view.container.querySelector("pre")).toBeNull();
    expect(technicalTokensSection.textContent).toContain("link name team-overview");
    expect(technicalTokensSection.textContent).toContain(
      "accessibility name Team overview section"
    );
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("Gradient angle 0 degrees");
    expect(diagnosticsSection?.textContent).toContain("overlay 100%");
  } finally {
    view.cleanup();
  }
});

test("Section surface color controls replace saved custom values through swatches without raw inputs", async () => {
  const view = await renderEditors({
    initialValue: {
      style: {
        backgroundColor: "var(--section-surface)",
        gradientFrom: "surface-start-token",
        borderColor: "border-strong-token",
      },
    },
  });

  try {
    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    expect(findInputsByPlaceholder(surfaceSection, "transparent")).toHaveLength(0);
    expect(findInputsByPlaceholder(surfaceSection, "#ffffff")).toHaveLength(0);
    expect(findInputsByPlaceholder(surfaceSection, "var(--color-border)")).toHaveLength(0);
    expect(surfaceSection.textContent).toContain("Saved custom color");

    const backgroundColorInput = findColorInputByLabel(surfaceSection, "Background color");
    const gradientStartColorInput = findColorInputByLabel(surfaceSection, "Gradient start");
    const borderColorInput = findColorInputByLabel(surfaceSection, "Border color");
    expect(backgroundColorInput.value).toBe("#ffffff");
    expect(gradientStartColorInput.value).toBe("#ffffff");
    expect(borderColorInput.value).toBe("#e2e8f0");

    setInputValue(backgroundColorInput, "#112233");
    setInputValue(gradientStartColorInput, "#abcdef");
    setInputValue(borderColorInput, "#334455");

    expect(view.getLatestValue().style).toMatchObject({
      backgroundColor: "#112233",
      gradientFrom: "#abcdef",
      borderColor: "#334455",
    });

    clickByText(findWidgetControl(surfaceSection, "section.style.backgroundColor"), "Clear");

    expect(view.getLatestValue().style?.backgroundColor).toBeUndefined();
    expect(backgroundColorInput.value).toBe("#ffffff");
    expect(view.container.querySelector("pre")).toBeNull();
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("No decorative background media.");
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

    expect(findNumberInputs(technicalTokensSection)).toHaveLength(0);

    expect(view.container.querySelector("pre")).toBeNull();
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("Gradient angle 180 degrees");
    expect(diagnosticsSection?.textContent).toContain("overlay 0%");
  } finally {
    view.cleanup();
  }
});

test("Section surface slider and exact controls round decimals, clamp boundaries, and stay visible in Advanced summaries", async () => {
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
    const linkSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(linkSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }

    setInputValue(findInputByPlaceholder(linkSection, "Pricing area"), "wave-layout");
    setInputValue(findInputByPlaceholder(linkSection, "Pricing section"), "Wave layout section");

    expect(view.getLatestValue().semantics).toMatchObject({
      anchorId: "wave-layout",
      ariaLabel: "Wave layout section",
    });

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    expect(findSectionSlider(surfaceSection, "gradient-angle")).not.toBeNull();
    expect(findSectionSlider(surfaceSection, "overlay-opacity")).not.toBeNull();

    clickButton(findSectionStepper(surfaceSection, "gradient-angle", "increase"));
    clickButton(findSectionStepper(surfaceSection, "overlay-opacity", "decrease"));

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 27,
      overlayOpacity: 3,
    });
    expect(findSectionRangeValue(surfaceSection, "gradient-angle")?.textContent).toBe("27°");
    expect(findSectionRangeValue(surfaceSection, "overlay-opacity")?.textContent).toBe("3%");

    const [surfaceAngleInput, surfaceOpacityInput] = findNumberInputs(surfaceSection);
    setInputValue(surfaceAngleInput, "44.6");
    setInputValue(surfaceOpacityInput, "15.5");

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 45,
      overlayOpacity: 16,
    });
    expect(surfaceAngleInput?.value).toBe("45");
    expect(surfaceOpacityInput?.value).toBe("16");
    expect(findSectionRangeValue(surfaceSection, "gradient-angle")?.textContent).toBe("45°");
    expect(findSectionRangeValue(surfaceSection, "overlay-opacity")?.textContent).toBe("16%");

    setInputValue(surfaceAngleInput, "359.6");
    setInputValue(surfaceOpacityInput, "-0.6");

    expect(view.getLatestValue().style).toMatchObject({
      gradientAngle: 360,
      overlayOpacity: 0,
    });
    expect(surfaceAngleInput?.value).toBe("360");
    expect(surfaceOpacityInput?.value).toBe("0");
    expect(findSectionRangeValue(surfaceSection, "gradient-angle")?.textContent).toBe("360°");
    expect(findSectionRangeValue(surfaceSection, "overlay-opacity")?.textContent).toBe("0%");

    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    expect(technicalTokensSection?.textContent).toContain("link name wave-layout");
    expect(technicalTokensSection?.textContent).toContain("accessibility name Wave layout section");
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("Gradient angle 360 degrees");
    expect(diagnosticsSection?.textContent).toContain("overlay 0%");
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

    const wizardRoot = view.container.querySelector(
      '[data-widget-editor-mode="wizard"]'
    ) as ParentNode | null;
    expect(findInputByPlaceholder(wizardRoot ?? view.container, "Section title")).toBeUndefined();
    expect(
      findTextareaByPlaceholder(wizardRoot ?? view.container, "Short context for the section")
    ).toBeUndefined();
    expect(findInputsByPlaceholder(view.container, "transparent")).toHaveLength(0);
    expect(findColorInputByLabel(view.container, "Background color").value).toBe("#ffffff");

    const linkSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(linkSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
    }
    const spacingSection = findSectionByTitle(view.container, "Width and spacing");
    if (!(spacingSection instanceof HTMLElement)) {
      throw new Error("Missing width and spacing section");
    }

    expect(findInputByPlaceholder(view.container, "Section label (optional)")).toBeUndefined();
    expect(findInputByPlaceholder(view.container, "Section label")?.value).toBe("");
    const headingSection = findSectionByTitle(view.container, "Heading and intro");
    if (!(headingSection instanceof HTMLElement)) {
      throw new Error("Missing heading section");
    }
    expect(findInputByPlaceholder(headingSection, "Section title")?.value).toBe("");
    expect(
      findTextareaByPlaceholder(view.container, "Supportive copy for this section")?.value
    ).toBe("");
    expect(findSelectByOptions(linkSection, ["section", "div"]).value).toBe("div");
    expect(findInputByPlaceholder(linkSection, "Pricing area")?.value).toBe("");
    expect(findInputByPlaceholder(linkSection, "Pricing section")?.value).toBe("");
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
    const sparseResponsiveBlockSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const sparseResponsiveInlineSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "none",
      "sm",
      "md",
      "lg",
    ]);
    expect(sparseResponsiveBlockSelects).toHaveLength(2);
    expect(sparseResponsiveInlineSelects).toHaveLength(2);
    expect(sparseResponsiveBlockSelects[0]?.value).toBe("__match_base__");
    expect(sparseResponsiveBlockSelects[1]?.value).toBe("__match_base__");
    expect(sparseResponsiveInlineSelects[0]?.value).toBe("__match_base__");
    expect(sparseResponsiveInlineSelects[1]?.value).toBe("__match_base__");
    expect(
      findSelectByOptions(spacingSection, ["__match_variant__", "none", "sm", "md", "lg", "xl"])
        .value
    ).toBe("__match_variant__");

    const surfaceSection = findSectionByTitle(view.container, "Surface and borders");
    if (!(surfaceSection instanceof HTMLElement)) {
      throw new Error("Missing surface section");
    }

    expect(findInputsByPlaceholder(surfaceSection, "#ffffff")).toHaveLength(0);
    expect(findColorInputByLabel(surfaceSection, "Gradient start").value).toBe("#ffffff");
    expect(findInputsByPlaceholder(surfaceSection, "#f1f5f9")).toHaveLength(0);
    expect(findColorInputByLabel(surfaceSection, "Gradient end").value).toBe("#f1f5f9");
    expect(findInputsByPlaceholder(surfaceSection, "var(--color-border)")).toHaveLength(0);
    expect(findColorInputByLabel(surfaceSection, "Border color").value).toBe("#e2e8f0");
    expect(findSelectByOptions(surfaceSection, ["0", "1", "2", "3"]).value).toBe("3");
    expect(findSelectByOptions(surfaceSection, ["none", "lg", "xl", "2xl"]).value).toBe("lg");
    expect(findInputsByPlaceholder(surfaceSection, "#000000")).toHaveLength(0);
    expect(findColorInputByLabel(surfaceSection, "Overlay color").value).toBe("#000000");

    const technicalTokensSection = findSectionByTitle(view.container, "Technical tokens");
    if (!(technicalTokensSection instanceof HTMLElement)) {
      throw new Error("Missing technical tokens section");
    }

    expect(findNumberInputs(technicalTokensSection)).toHaveLength(0);
    expect(technicalTokensSection.querySelectorAll("input, select, textarea, button")).toHaveLength(
      0
    );

    expect(view.container.querySelector("pre")).toBeNull();
    const diagnosticsSection = findSectionByTitle(view.container, "Support diagnostics");
    expect(diagnosticsSection?.textContent).toContain("Gradient angle 180 degrees");
    expect(diagnosticsSection?.textContent).toContain("overlay 0%");
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
    const semanticsSection = findSectionByTitle(view.container, "Section link and accessibility");
    setInputValue(
      findInputByPlaceholder(semanticsSection ?? view.container, "Pricing area"),
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

    const semanticsSection = findSectionByTitle(view.container, "Section link and accessibility");
    if (!(semanticsSection instanceof HTMLElement)) {
      throw new Error("Missing link and accessibility section");
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
    const hardcodedResponsiveBlockSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    const hardcodedResponsiveInlineSelects = findSelectsByOptions(spacingSection, [
      "__match_base__",
      "none",
      "sm",
      "md",
      "lg",
    ]);
    expect(hardcodedResponsiveBlockSelects).toHaveLength(2);
    expect(hardcodedResponsiveInlineSelects).toHaveLength(2);
    expect(hardcodedResponsiveBlockSelects[0]?.value).toBe("__match_base__");
    expect(hardcodedResponsiveBlockSelects[1]?.value).toBe("__match_base__");
    expect(hardcodedResponsiveInlineSelects[0]?.value).toBe("__match_base__");
    expect(hardcodedResponsiveInlineSelects[1]?.value).toBe("__match_base__");
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
