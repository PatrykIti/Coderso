// Shared harness for the two Section editor wave suites.
//
// `section-editor-wave.test.tsx` (structure, layout and contract) and
// `section-editor-surface-wave.test.tsx` (surface, colour and decoration) drive the same
// three Section editors through the same stubbed admin primitives and the same DOM query
// helpers. Duplicating that preamble into both suites would put each of them back over the
// family's 1000-line limit, so it lives here once.
//
// The two mount harnesses take their components as arguments instead of importing them.
// That is deliberate: the sparse-contract tests re-import the Section editors after
// `vi.resetModules()` + `vi.doMock(...)`, and that re-import is how they observe the mocked
// contract. Parameterising keeps this module free of any application module at runtime, so
// importing it never pins a graph a suite needs to be able to reset.

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { vi } from "vitest";

import type { SectionData } from "../../../../core/widgets/core/section";
import type { WidgetBlock, WidgetBlockPatcher } from "../../../../core/widgets/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export type SectionEditorsModule = Pick<
  typeof import("../../../../core/admin/ui/widgets/editors/SectionEditors"),
  "SectionAdvancedEditor" | "SectionVisualEditor" | "SectionWizardEditor"
>;

export type SectionBlockSettingsComponent =
  (typeof import("../../../../core/admin/ui/pages/builder/BlockSettings"))["BlockSettings"];

export type SectionContractModule = Pick<
  typeof import("../../../../core/widgets/core/section"),
  "createSectionWidget" | "sectionDefaults"
>;

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

export const sectionMediaState = {
  mediaItems: createMediaItems(),
  mediaError: null as unknown,
  reset() {
    this.mediaItems = createMediaItems();
    this.mediaError = null;
  },
};

export const sectionBadgeMock = () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
});

export const sectionTabsMock = () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <button type="button" data-tabs-trigger={value}>
      {children}
    </button>
  ),
});

export const sectionInputMock = () => ({
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
});

export const sectionSelectMock = () => {
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
};

export const sectionTextareaMock = () => ({
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
});

export const sectionUtilsMock = () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
});

export const sectionApiClientMock = () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
});

export const sectionMediaClientMock = () => ({
  listMediaCached: vi.fn(async () => {
    if (sectionMediaState.mediaError) throw sectionMediaState.mediaError;
    return sectionMediaState.mediaItems;
  }),
});

export const sectionMediaPickerMock = () => ({
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
});

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

export const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

export const setRawInputValue = (element: Element | null | undefined, value: string) => {
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

export const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

export const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

export const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

export const clickByText = (container: ParentNode, text: string, index = 0) => {
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

export const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

export const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  findInputsByPlaceholder(container, placeholder)[0];

const findInputsByAriaLabel = (container: ParentNode, label: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("aria-label") === label
  );

export const findColorInputByLabel = (container: ParentNode, label: string, index = 0) => {
  const colorInput = findInputsByAriaLabel(container, `${label} swatch`)[index];
  if (!(colorInput instanceof HTMLInputElement)) {
    throw new Error(`Missing color input for "${label}" (${index})`);
  }
  return colorInput;
};

export const findWidgetControl = (container: ParentNode, id: string) => {
  const control = container.querySelector(`[data-widget-control="${id}"]`);
  if (!(control instanceof HTMLElement)) {
    throw new Error(`Missing widget control: ${id}`);
  }
  return control;
};

export const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

export const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

export const findSelectByOptions = (container: ParentNode, values: string[]) => {
  const select = findSelectsByOptions(container, values)[0];
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select with options ${values.join(", ")}`);
  }
  return select;
};

export const findNumberInputs = (container: ParentNode) =>
  Array.from(container.querySelectorAll('input[type="number"]')).filter(
    (element): element is HTMLInputElement => element instanceof HTMLInputElement
  );

export const findSectionSlider = (container: ParentNode, key: string) =>
  container.querySelector(`[data-section-slider="${key}"]`);

export const findSectionRangeValue = (container: ParentNode, key: string) =>
  container.querySelector(`[data-section-range-value="${key}"]`);

export const findSectionStepper = (
  container: ParentNode,
  key: string,
  direction: "increase" | "decrease"
) => container.querySelector(`[data-section-stepper="${key}-${direction}"]`);

export const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error("Missing button element");
  }
  React.act(() => {
    element.click();
  });
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

export const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("p, h3")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );

export const resetSectionEditorEnvironment = () => {
  document.body.innerHTML = "";
  sectionMediaState.reset();
  vi.restoreAllMocks();
};

export type SectionEditorsRenderOptions = {
  initialValue: SectionData;
  initialVariant?: string;
  withVariantChange?: boolean;
  withBlockPatch?: boolean;
};

export const renderSectionEditors = ({
  editors: { SectionAdvancedEditor, SectionVisualEditor, SectionWizardEditor },
  initialValue,
  initialVariant = "legacy",
  withVariantChange = true,
  withBlockPatch = false,
}: SectionEditorsRenderOptions & { editors: SectionEditorsModule }) => {
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

export const renderSectionBlockSettingsHost = ({
  BlockSettings,
  editors: { SectionAdvancedEditor, SectionVisualEditor, SectionWizardEditor },
  contract: { createSectionWidget, sectionDefaults },
}: {
  BlockSettings: SectionBlockSettingsComponent;
  editors: SectionEditorsModule;
  contract: SectionContractModule;
}) => {
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
