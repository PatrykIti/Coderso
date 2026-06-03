// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { gridColumnsDefaults, type GridColumnsData } from "../../../core/widgets/core/gridColumns";
import type { WidgetBlock } from "../../../core/widgets/types";

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
    placeholder,
    type,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
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

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

const allSpanOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const allGapOptions = ["none", "1", "2", "3", "4", "5", "6", "7", "8", "10", "12"];

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

const setCheckboxValue = (element: Element | null | undefined, checked: boolean) => {
  if (!(element instanceof HTMLInputElement)) return;
  if (element.checked === checked) return;
  React.act(() => {
    element.click();
  });
};

const clickButton = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLButtonElement)) return;
  React.act(() => {
    element.click();
  });
};

const queryInputByPlaceholder = (container: ParentNode, placeholder: string, index = 0) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  )[index];

const findInputByPlaceholder = (container: ParentNode, placeholder: string, index = 0) => {
  const input = queryInputByPlaceholder(container, placeholder, index);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input with placeholder "${placeholder}" (${index})`);
  }
  return input;
};

const findColorInputByLabel = (container: ParentNode, label: string, index = 0) => {
  const input = Array.from(container.querySelectorAll('input[type="color"]'))
    .filter(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement && element.getAttribute("aria-label") === label
    )
    .at(index);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing color input "${label}" (${index})`);
  }
  return input;
};

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter(
    (element): element is HTMLSelectElement => {
      if (!(element instanceof HTMLSelectElement)) return false;
      const optionValues = Array.from(element.options).map((option) => option.value);
      return values.every((value) => optionValues.includes(value));
    }
  );

const findButtonsByText = (container: ParentNode, text: string) => {
  const buttons = Array.from(container.querySelectorAll("button")).filter(
    (element): element is HTMLButtonElement =>
      element instanceof HTMLButtonElement && element.textContent?.includes(text) === true
  );
  if (buttons.length === 0) {
    throw new Error(`Missing button "${text}"`);
  }
  return buttons;
};

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const getWritableControlPaths = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-widget-control-path]"))
    .filter((element) => element.getAttribute("data-widget-control-readonly") !== "true")
    .map((element) => element.getAttribute("data-widget-control-path"))
    .filter((path): path is string => Boolean(path));

const getSectionByTitle = (container: ParentNode, title: string) => {
  const section = Array.from(container.querySelectorAll("section")).find((candidate) =>
    Array.from(candidate.querySelectorAll("p, h3")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Missing section "${title}"`);
  }
  return section;
};

const findSelectByLabel = (container: ParentNode, label: string, index = 0) => {
  const select = Array.from(container.querySelectorAll("p, h3"))
    .filter((element) => normalizeText(element.textContent) === normalizeText(label))
    .map((element) => element.parentElement?.querySelector("select"))
    .filter((element): element is HTMLSelectElement => element instanceof HTMLSelectElement)[index];
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`Missing select for label "${label}" (${index})`);
  }
  return select;
};

const findCheckboxByLabel = (container: ParentNode, label: string, index = 0) => {
  const checkbox = Array.from(container.querySelectorAll("p, h3"))
    .filter((element) => normalizeText(element.textContent) === normalizeText(label))
    .map((element) =>
      element.closest("div")?.parentElement?.querySelector('input[type="checkbox"]')
    )
    .filter((element): element is HTMLInputElement => element instanceof HTMLInputElement)[index];
  if (!(checkbox instanceof HTMLInputElement)) {
    throw new Error(`Missing checkbox for label "${label}" (${index})`);
  }
  return checkbox;
};

type EditorKind = "wizard" | "visual" | "advanced";

const renderEditor = async ({
  editor,
  initialValue,
  initialVariant = "equal",
  withVariantChange = true,
  context,
  initialBlock,
}: {
  editor: EditorKind;
  initialValue: GridColumnsData;
  initialVariant?: string;
  withVariantChange?: boolean;
  context?: import("../../../core/widgets/types").WidgetEditorProps<GridColumnsData>["context"];
  initialBlock?: WidgetBlock;
}) => {
  const { GridColumnsAdvancedEditor, GridColumnsVisualEditor, GridColumnsWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/GridColumnsEditors");

  const editorMap = {
    wizard: GridColumnsWizardEditor,
    visual: GridColumnsVisualEditor,
    advanced: GridColumnsAdvancedEditor,
  } as const;

  const Editor = editorMap[editor];
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  let latestValue = initialValue;
  let latestVariant = initialVariant;
  let latestBlock = initialBlock;

  const Harness = () => {
    const [value, setValue] = useState<GridColumnsData>(initialValue);
    const [variant, setVariant] = useState(initialVariant);
    const [block, setBlock] = useState<WidgetBlock | undefined>(initialBlock);
    const resolvedContext =
      context && block
        ? {
            ...context,
            slotTargets: Object.keys(block.slots ?? {})
              .filter((slotId) => slotId.startsWith("column:"))
              .map((slotId, index) => ({
                definitionId: "column",
                slotId,
                label: `Column ${index + 1}`,
                kind: "repeatable" as const,
                instanceId: slotId.split(":")[1],
              })),
          }
        : context;

    return (
      <Editor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={
          withVariantChange
            ? (next) => {
                latestVariant = next;
                onVariantChangeSpy(next);
                setVariant(next);
              }
            : undefined
        }
        onBlockPatch={
          block
            ? (patch) => {
                setBlock((current) => {
                  if (!current) return current;
                  const next =
                    typeof patch === "function" ? patch(current) : { ...current, ...patch };
                  latestBlock = next;
                  latestValue = next.data as GridColumnsData;
                  latestVariant = next.variant ?? latestVariant;
                  onChangeSpy(next.data as GridColumnsData);
                  setValue(next.data as GridColumnsData);
                  if (typeof next.variant === "string") {
                    setVariant(next.variant);
                  }
                  return next;
                });
              }
            : undefined
        }
        context={resolvedContext}
      />
    );
  };

  const view = mount(<Harness />);

  return {
    ...view,
    getBlock: () => latestBlock,
    getValue: () => latestValue,
    getVariant: () => latestVariant,
    onChangeSpy,
    onVariantChangeSpy,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("GridColumns wizard editor only seeds the starter variant", async () => {
  const initialValue: GridColumnsData = {
    columns: [
      { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      { id: "3", label: "Stats", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
    ],
    layout: {
      gapX: "8",
      gapY: "3",
    },
  };
  const view = await renderEditor({
    editor: "wizard",
    initialVariant: "legacy-grid",
    initialValue,
  });

  try {
    const quickStart = getSectionByTitle(view.container, "Grid quick start");

    expect(normalizeText(quickStart.textContent)).toContain("starter layout");
    expect(normalizeText(quickStart.textContent)).toContain(
      "column labels, count, spacing, responsive spans, and surfaces stay in visual"
    );
    expect(quickStart.querySelectorAll("input, select, textarea")).toHaveLength(0);
    expect(normalizeText(quickStart.textContent)).not.toContain("column count");
    expect(normalizeText(quickStart.textContent)).not.toContain("horizontal gap");

    clickButton(findButtonsByText(quickStart, "Masonry Lite")[0]);
    expect(view.getVariant()).toBe("masonry-lite");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("masonry-lite");
    expect(view.getValue()).toEqual(initialValue);
    expect(view.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("GridColumns variant controls ignore changes when variant handlers are absent", async () => {
  const wizardView = await renderEditor({
    editor: "wizard",
    initialVariant: "equal",
    initialValue: gridColumnsDefaults,
    withVariantChange: false,
  });
  const visualView = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: gridColumnsDefaults,
    withVariantChange: false,
  });

  try {
    const visualVariantSection = getSectionByTitle(
      visualView.container,
      "Variant and layout structure"
    );

    clickButton(findButtonsByText(wizardView.container, "Masonry Lite")[0]);
    clickButton(findButtonsByText(visualVariantSection, "Masonry Lite")[0]);

    expect(wizardView.getVariant()).toBe("equal");
    expect(wizardView.onVariantChangeSpy).not.toHaveBeenCalled();
    expect(visualView.getVariant()).toBe("equal");
    expect(visualView.onVariantChangeSpy).not.toHaveBeenCalled();
    expect(
      normalizeText(findButtonsByText(visualVariantSection, "Equal")[0]?.textContent)
    ).toContain("selected");
    expect(
      normalizeText(findButtonsByText(visualVariantSection, "Masonry Lite")[0]?.textContent)
    ).toContain("pick");
  } finally {
    wizardView.cleanup();
    visualView.cleanup();
  }
});

test("GridColumns wizard variant selection does not rewrite daily column sizing", async () => {
  const initialValue: GridColumnsData = {
    columns: [
      { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      { id: "3", label: "Meta", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
      { id: "4", label: "Stats", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
    ],
  };
  const view = await renderEditor({
    editor: "wizard",
    initialVariant: "equal",
    initialValue,
  });

  try {
    clickButton(findButtonsByText(view.container, "Asymmetric")[0]);

    expect(view.getVariant()).toBe("asymmetric");
    expect(view.getValue()).toEqual(initialValue);
    expect(view.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual variant cards change only the grid style owner", async () => {
  const initialValue: GridColumnsData = {
    columns: [
      { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      { id: "3", label: "Meta", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
    ],
  };
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue,
    context: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "column",
          slotId: "column:2",
          label: "Column 1",
          kind: "repeatable",
          instanceId: "2",
        },
        {
          definitionId: "column",
          slotId: "column:1",
          label: "Column 2",
          kind: "repeatable",
          instanceId: "1",
        },
        {
          definitionId: "column",
          slotId: "column:3",
          label: "Column 3",
          kind: "repeatable",
          instanceId: "3",
        },
      ],
    },
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant and layout structure");

    clickButton(findButtonsByText(variantSection, "Asymmetric")[0]);

    expect(view.getVariant()).toBe("asymmetric");
    expect(view.getValue()).toEqual(initialValue);
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("asymmetric");
    expect(view.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor explains saved asymmetric drift and allows preset reapply", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "asymmetric",
    initialValue: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");

    expect(normalizeText(columnSection.textContent)).toContain("matching desktop spans");
    const reapplyButton = findButtonsByText(columnSection, "Reapply asymmetric desktop widths")[0];
    expect(reapplyButton?.getAttribute("data-widget-control")).toBe(
      "grid-columns.visual.asymmetric-reapply"
    );
    expect(reapplyButton?.getAttribute("data-widget-control-path")).toBe("columns.desktopSpan");
    expect(reapplyButton?.getAttribute("data-widget-control-ownership")).toBe("action");

    clickButton(reapplyButton);

    expect(view.getValue().columns?.map((column) => column.desktopSpan)).toEqual(["8", "4"]);
    expect(normalizeText(columnSection.textContent)).toContain(
      "asymmetric desktop widths are active"
    );
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor shows current span totals and no-auto-balance guidance", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "7", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "7", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");
    const text = normalizeText(columnSection.textContent);

    expect(text).toContain("desktop total: 14 / 12 - continues onto additional rows.");
    expect(text).toContain("tablet total: 12 / 12 - fills one 12-column row.");
    expect(text).toContain("phone total: 24 / 12 - continues onto additional rows.");
    expect(text).toContain("totals below 12 leave unused space");
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor follows the current live slot order in drifted asymmetric layouts", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "asymmetric",
    initialValue: {
      columns: [
        {
          id: "1",
          label: "Lead",
          desktopSpan: "6",
          tabletSpan: "6",
          mobileSpan: "12",
          hideOnTablet: true,
        },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "4", label: "Phantom", desktopSpan: "2", tabletSpan: "4", mobileSpan: "8" },
      ],
    },
    context: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "column",
          slotId: "column:1",
          label: "Column 1",
          kind: "repeatable",
          instanceId: "1",
        },
        {
          definitionId: "column",
          slotId: "column:2",
          label: "Column 2",
          kind: "repeatable",
          instanceId: "2",
        },
        {
          definitionId: "column",
          slotId: "column:3",
          label: "Column 3",
          kind: "repeatable",
          instanceId: "3",
        },
      ],
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");
    const text = normalizeText(columnSection.textContent);

    expect(text).toContain("saved column settings are out of sync");
    expect(text).toContain("rows follow the current structure order");
    expect(text).toContain("content area 3");
    expect(text).not.toContain("content area 4");
    expect(text).toContain("25 / 50 / 25");
    expect(text).toContain("desktop total: 15 / 12 - continues onto additional rows.");
    expect(text).toContain("tablet total: 12 / 12 - fills one 12-column row.");
    expect(text).toContain("phone total: 36 / 12 - continues onto additional rows.");
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor asymmetric drift copy stays precise when only live columns are missing", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "asymmetric",
    initialValue: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    context: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "column",
          slotId: "column:1",
          label: "Column 1",
          kind: "repeatable",
          instanceId: "1",
        },
        {
          definitionId: "column",
          slotId: "column:2",
          label: "Column 2",
          kind: "repeatable",
          instanceId: "2",
        },
        {
          definitionId: "column",
          slotId: "column:3",
          label: "Column 3",
          kind: "repeatable",
          instanceId: "3",
        },
      ],
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");
    const text = normalizeText(columnSection.textContent);

    expect(text).toContain("some areas do not have saved column settings yet");
    expect(text).not.toContain("ignores removed areas");
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor reapply materializes the current live asymmetric preset", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "asymmetric",
    initialValue: {
      columns: [
        {
          id: "1",
          label: "Lead",
          desktopSpan: "6",
          tabletSpan: "6",
          mobileSpan: "12",
          hideOnTablet: true,
        },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "4", label: "Phantom", desktopSpan: "2", tabletSpan: "4", mobileSpan: "8" },
      ],
    },
    context: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "column",
          slotId: "column:1",
          label: "Column 1",
          kind: "repeatable",
          instanceId: "1",
        },
        {
          definitionId: "column",
          slotId: "column:2",
          label: "Column 2",
          kind: "repeatable",
          instanceId: "2",
        },
        {
          definitionId: "column",
          slotId: "column:3",
          label: "Column 3",
          kind: "repeatable",
          instanceId: "3",
        },
      ],
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");

    clickButton(findButtonsByText(columnSection, "Reapply asymmetric desktop widths")[0]);

    expect(
      view.getValue().columns?.map((column) => ({
        id: column.id,
        desktopSpan: column.desktopSpan,
        tabletSpan: column.tabletSpan,
        mobileSpan: column.mobileSpan,
      }))
    ).toEqual([
      { id: "1", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      { id: "2", desktopSpan: "3", tabletSpan: "6", mobileSpan: "12" },
      { id: "3", desktopSpan: "3", tabletSpan: "6", mobileSpan: "12" },
    ]);
    expect(normalizeText(columnSection.textContent)).toContain(
      "asymmetric desktop widths are active for the current content areas"
    );
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor layout presets materialize the current live slot order when drift exists", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "4", label: "Phantom", desktopSpan: "2", tabletSpan: "4", mobileSpan: "8" },
      ],
    },
    context: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "column",
          slotId: "column:1",
          label: "Column 1",
          kind: "repeatable",
          instanceId: "1",
        },
        {
          definitionId: "column",
          slotId: "column:2",
          label: "Column 2",
          kind: "repeatable",
          instanceId: "2",
        },
        {
          definitionId: "column",
          slotId: "column:3",
          label: "Column 3",
          kind: "repeatable",
          instanceId: "3",
        },
      ],
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");

    clickButton(findButtonsByText(columnSection, "25 / 50 / 25")[0]);

    expect(
      view.getValue().columns?.map((column) => ({
        id: column.id,
        desktopSpan: column.desktopSpan,
      }))
    ).toEqual([
      { id: "1", desktopSpan: "3" },
      { id: "2", desktopSpan: "6" },
      { id: "3", desktopSpan: "3" },
    ]);
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor layout presets respect the current live slot order after a reorder", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "3", label: "Meta", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    context: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "column",
          slotId: "column:2",
          label: "Column 1",
          kind: "repeatable",
          instanceId: "2",
        },
        {
          definitionId: "column",
          slotId: "column:1",
          label: "Column 2",
          kind: "repeatable",
          instanceId: "1",
        },
        {
          definitionId: "column",
          slotId: "column:3",
          label: "Column 3",
          kind: "repeatable",
          instanceId: "3",
        },
      ],
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");

    clickButton(findButtonsByText(columnSection, "25 / 50 / 25")[0]);

    expect(
      view.getValue().columns?.map((column) => ({
        id: column.id,
        desktopSpan: column.desktopSpan,
      }))
    ).toEqual([
      { id: "2", desktopSpan: "3" },
      { id: "1", desktopSpan: "6" },
      { id: "3", desktopSpan: "3" },
    ]);
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor visibility warnings respect fallback live rows", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: {
      columns: [
        {
          id: "1",
          label: "Lead",
          desktopSpan: "6",
          tabletSpan: "6",
          mobileSpan: "12",
          hideOnMobile: true,
        },
        {
          id: "2",
          label: "Side",
          desktopSpan: "6",
          tabletSpan: "6",
          mobileSpan: "12",
          hideOnMobile: true,
        },
      ],
    },
    context: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "column",
          slotId: "column:1",
          label: "Column 1",
          kind: "repeatable",
          instanceId: "1",
        },
        {
          definitionId: "column",
          slotId: "column:2",
          label: "Column 2",
          kind: "repeatable",
          instanceId: "2",
        },
        {
          definitionId: "column",
          slotId: "column:3",
          label: "Column 3",
          kind: "repeatable",
          instanceId: "3",
        },
      ],
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");
    const text = normalizeText(columnSection.textContent);

    expect(text).toContain("content area 3");
    expect(text).not.toContain("all columns are hidden on phone");
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor keeps CSS variable colors visible with fallback swatches", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "masonry-lite",
    initialValue: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "8", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
      ],
      style: {
        cardizeColumns: false,
        columnBackground: "var(--color-surface)",
        columnBorderColor: "var(--color-border)",
      },
    },
  });

  try {
    const surfaceSection = getSectionByTitle(view.container, "Gap and column surface");
    const backgroundSwatch = findColorInputByLabel(surfaceSection, "Column background swatch");
    const borderSwatch = findColorInputByLabel(surfaceSection, "Column border color swatch");

    expect(queryInputByPlaceholder(surfaceSection, "var(--color-surface)")).toBeUndefined();
    expect(queryInputByPlaceholder(surfaceSection, "var(--color-border)")).toBeUndefined();
    expect(backgroundSwatch.value).toBe("#f8fafc");
    expect(borderSwatch.value).toBe("#e2e8f0");
    expect(normalizeText(surfaceSection.textContent)).toContain("theme token");
    expect(normalizeText(surfaceSection.textContent)).toContain("a theme token is saved");
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor keeps CSS variable per-column overrides visible with fallback swatches", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: {
      columns: [
        {
          id: "1",
          label: "Lead",
          desktopSpan: "6",
          tabletSpan: "6",
          mobileSpan: "12",
          style: {
            surface: "on",
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          },
        },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
  });

  try {
    const behaviorSection = getSectionByTitle(view.container, "Per-column surfaces and behavior");
    const backgroundSwatch = findColorInputByLabel(
      behaviorSection,
      "Column background override swatch"
    );
    const borderSwatch = findColorInputByLabel(behaviorSection, "Column border override swatch");

    expect(queryInputByPlaceholder(behaviorSection, "var(--color-surface)")).toBeUndefined();
    expect(queryInputByPlaceholder(behaviorSection, "var(--color-border)")).toBeUndefined();
    expect(backgroundSwatch.value).toBe("#f8fafc");
    expect(borderSwatch.value).toBe("#e2e8f0");
    expect(normalizeText(behaviorSection.textContent)).toContain("theme token");
    expect(normalizeText(behaviorSection.textContent)).toContain("a theme token is saved");
  } finally {
    view.cleanup();
  }
});

test("GridColumns advanced editor reports cardize diagnostics without editing controls", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialVariant: "equal",
    initialValue: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      ],
      style: {
        cardizeColumns: false,
      },
    },
  });

  try {
    const technicalSection = getSectionByTitle(view.container, "Layout summary");
    const text = normalizeText(technicalSection.textContent);

    expect(text).toContain("cardized columns");
    expect(text).toContain("off");
    expect(view.container.querySelectorAll("input, select, textarea, button")).toHaveLength(0);
    expect(view.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor covers variant cards, column sizing controls, and conditional card surface fields", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "legacy-grid",
    initialValue: {
      columns: [
        { id: "1", label: "Main", desktopSpan: "bad" as never },
        { id: "2", label: "Aside" },
      ],
      layout: {
        align: "edge" as never,
        gapX: "bad" as never,
      },
      style: {
        cardizeColumns: false,
        columnBackground: "token-surface",
        columnBorderColor: "#cbd5e1",
        columnBorderWidth: "9" as never,
        columnRadius: "pill" as never,
        columnPadding: "0" as never,
      },
    },
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant and layout structure");
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");
    const surfaceSection = getSectionByTitle(view.container, "Gap and column surface");
    const columnPaths = getWritableControlPaths(columnSection);
    expect(columnPaths).toEqual(
      expect.arrayContaining([
        "columns",
        "columns.label",
        "columns.desktopSpan",
        "columns.tabletSpan",
        "columns.mobileSpan",
        "columns.xlSpan",
        "columns.twoXlSpan",
        "columns.hideOnMobile",
        "columns.hideOnTablet",
        "columns.hideOnDesktop",
      ])
    );

    expect(
      variantSection.querySelector('[data-grid-columns-variant-preview="equal"]')
    ).toBeInstanceOf(HTMLElement);
    expect(normalizeText(findButtonsByText(variantSection, "Equal")[0]?.textContent)).toContain(
      "selected"
    );

    clickButton(findButtonsByText(variantSection, "Asymmetric")[0]);
    expect(view.getVariant()).toBe("asymmetric");
    expect(view.onVariantChangeSpy).toHaveBeenLastCalledWith("asymmetric");

    const alignmentSelect = findSelectByLabel(variantSection, "Vertical alignment");
    expect(alignmentSelect.value).toBe("start");
    setSelectValue(alignmentSelect, "stretch");

    const removeButton = findButtonsByText(columnSection, "Remove one column")[0];
    const addButton = findButtonsByText(columnSection, "Add one column")[0];
    expect(removeButton.disabled).toBe(true);
    expect(addButton.disabled).toBe(false);

    clickButton(findButtonsByText(columnSection, "33 / 67")[0]);
    expect(view.getValue().columns?.[0]).toEqual(
      expect.objectContaining({
        desktopSpan: "4",
        tabletSpan: "6",
        mobileSpan: "12",
      })
    );
    expect(view.getValue().columns?.[1]).toEqual(
      expect.objectContaining({
        desktopSpan: "8",
        tabletSpan: "6",
        mobileSpan: "12",
      })
    );

    clickButton(addButton);
    clickButton(addButton);
    expect(view.getValue().columns).toHaveLength(4);
    expect(findInputByPlaceholder(columnSection, "Column 3").value).toBe("Column 3");

    setInputValue(findInputByPlaceholder(columnSection, "Column 3"), "Stats");
    const spanSelects = findSelectsByOptions(columnSection, allSpanOptions).filter(
      (select) => select.options.length === allSpanOptions.length
    );
    setSelectValue(spanSelects[0], "8");
    setSelectValue(spanSelects[1], "4");
    setSelectValue(spanSelects[2], "12");

    clickButton(findButtonsByText(columnSection, "Remove one column")[0]);
    expect(view.getValue().columns).toHaveLength(3);

    const gapXSelect = findSelectByLabel(surfaceSection, "Horizontal gap");
    const gapYSelect = findSelectByLabel(surfaceSection, "Vertical gap");
    expect(gapXSelect.value).toBe(gridColumnsDefaults.layout?.gapX);
    expect(gapYSelect.value).toBe(gridColumnsDefaults.layout?.gapY);
    expect(queryInputByPlaceholder(surfaceSection, "var(--color-surface)")).toBeUndefined();
    expect(normalizeText(surfaceSection.textContent)).not.toMatch(/\b(px|rem)\b/);

    setSelectValue(gapXSelect, "8");
    setSelectValue(gapYSelect, "2");

    clickButton(findButtonsByText(variantSection, "Masonry Lite")[0]);
    expect(view.getVariant()).toBe("masonry-lite");

    const cardizeToggle = surfaceSection.querySelector('input[type="checkbox"]');
    expect((cardizeToggle as HTMLInputElement | null | undefined)?.disabled).toBe(true);
    expect(normalizeText(surfaceSection.textContent)).toContain("masonry lite always adds");
    expect(view.getValue().style?.cardizeColumns).toBe(false);

    const backgroundSwatch = findColorInputByLabel(surfaceSection, "Column background swatch");
    const borderSwatch = findColorInputByLabel(surfaceSection, "Column border color swatch");
    expect(backgroundSwatch.value).toBe("#f8fafc");
    expect(borderSwatch.value).toBe("#cbd5e1");

    setInputValue(backgroundSwatch, "#0f172a");
    setInputValue(borderSwatch, "#475569");

    const borderWidthSelect = findSelectByLabel(surfaceSection, "Border width");
    const radiusSelect = findSelectByLabel(surfaceSection, "Corner radius");
    const paddingSelect = findSelectByLabel(surfaceSection, "Internal padding");
    setSelectValue(borderWidthSelect, "2");
    setSelectValue(radiusSelect, "2xl");
    setSelectValue(paddingSelect, "6");

    expect(view.getValue()).toEqual(
      expect.objectContaining({
        layout: expect.objectContaining({
          align: "stretch",
          gapX: "8",
          gapY: "2",
        }),
        columns: expect.arrayContaining([
          expect.objectContaining({
            desktopSpan: "8",
            tabletSpan: "4",
            mobileSpan: "12",
          }),
          expect.objectContaining({
            label: "Stats",
          }),
        ]),
        style: expect.objectContaining({
          cardizeColumns: false,
          columnBackground: "#0f172a",
          columnBorderColor: "#475569",
          columnBorderWidth: "2",
          columnRadius: "2xl",
          columnPadding: "6",
        }),
      })
    );

    setCheckboxValue(surfaceSection.querySelector('input[type="checkbox"]') ?? undefined, false);
    expect(view.getValue().style?.cardizeColumns).toBe(false);
    expect(queryInputByPlaceholder(surfaceSection, "var(--color-surface)")).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor derives live column slots from repeatable slot ids", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: {
      columns: [
        { id: "1", label: "Main" },
        { id: "2", label: "Aside" },
        { id: "3", label: "Extra" },
      ],
    },
    context: {
      surface: "page-builder",
      slotTargets: [
        { definitionId: "column", slotId: "column:1", label: "Column 1", kind: "repeatable" },
        { definitionId: "column", slotId: "column:2", label: "Column 2", kind: "repeatable" },
      ],
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");
    const columnCountSelect = findSelectByLabel(columnSection, "Content area count");
    const text = normalizeText(columnSection.textContent);

    expect(columnCountSelect.disabled).toBe(true);
    expect(text).toContain("current content areas: 2");
    expect(text).toContain("out of sync");
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor locks local column-count controls when live slot structure exists", async () => {
  const initialBlock: WidgetBlock = {
    id: "grid-locked-count",
    type: "grid-columns",
    variant: "equal",
    data: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    slots: {
      "column:1": [],
      "column:2": [],
    },
  };
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: initialBlock.data as GridColumnsData,
    initialBlock,
    context: {
      surface: "page-builder",
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");

    expect(findSelectByLabel(columnSection, "Content area count").disabled).toBe(true);
    expect(findButtonsByText(columnSection, "Add one column")[0].disabled).toBe(true);
    expect(findButtonsByText(columnSection, "Remove one column")[0].disabled).toBe(true);
    expect(normalizeText(columnSection.textContent)).toContain("shared content areas");
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor also locks local count buttons without block patch access", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "6", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    context: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "column",
          slotId: "column:1",
          label: "Column 1",
          kind: "repeatable",
          instanceId: "1",
        },
        {
          definitionId: "column",
          slotId: "column:2",
          label: "Column 2",
          kind: "repeatable",
          instanceId: "2",
        },
      ],
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");

    expect(findSelectByLabel(columnSection, "Content area count").disabled).toBe(true);
    expect(findButtonsByText(columnSection, "Add one column")[0].disabled).toBe(true);
    expect(findButtonsByText(columnSection, "Remove one column")[0].disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor reorders column data and slots through the live block patch path", async () => {
  const initialBlock: WidgetBlock = {
    id: "grid-block",
    type: "grid-columns",
    variant: "equal",
    data: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "8", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
        { id: "3", label: "Extra", desktopSpan: "12", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    slots: {
      "column:1": [{ id: "child-1", type: "hero", data: {} }],
      "column:2": [{ id: "child-2", type: "hero", data: {} }],
      "column:3": [{ id: "child-3", type: "hero", data: {} }],
    },
  };
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: initialBlock.data as GridColumnsData,
    initialBlock,
    context: {
      surface: "page-builder",
    },
  });

  try {
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");
    clickButton(findButtonsByText(columnSection, "Move down")[0]);

    expect(view.getValue().columns?.map((column) => column.id)).toEqual(["2", "1", "3"]);
    expect(Object.keys(view.getBlock()?.slots ?? {})).toEqual(["column:2", "column:1", "column:3"]);
    expect(view.getBlock()?.slots?.["column:2"]?.[0]?.id).toBe("child-2");
    expect(view.getBlock()?.slots?.["column:1"]?.[0]?.id).toBe("child-1");
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor updates responsive ordering, wide spans, and visibility", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "8", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
  });

  try {
    const variantSection = getSectionByTitle(view.container, "Variant and layout structure");
    const columnSection = getSectionByTitle(view.container, "Column sizing and labels");
    const reverseToggle = findCheckboxByLabel(variantSection, "Reverse on phone");
    const xlSelect = findSelectByLabel(columnSection, "Wide screens", 0);
    const twoXlSelect = findSelectByLabel(columnSection, "Very wide screens", 0);

    setCheckboxValue(reverseToggle, true);
    setSelectValue(xlSelect, "9");
    setSelectValue(twoXlSelect, "8");
    setCheckboxValue(findCheckboxByLabel(columnSection, "Hide on mobile", 0), true);
    setCheckboxValue(findCheckboxByLabel(columnSection, "Hide on mobile", 1), true);

    expect(view.getValue()).toEqual(
      expect.objectContaining({
        layout: expect.objectContaining({
          reverseOnMobile: true,
        }),
        columns: expect.arrayContaining([
          expect.objectContaining({
            xlSpan: "9",
            twoXlSpan: "8",
            hideOnMobile: true,
          }),
          expect.objectContaining({
            hideOnMobile: true,
          }),
        ]),
      })
    );
    expect(normalizeText(columnSection.textContent)).toContain("all columns are hidden on phone");
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor updates per-column surface, height, overflow, and alignment overrides", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: gridColumnsDefaults,
  });

  try {
    const behaviorSection = getSectionByTitle(view.container, "Per-column surfaces and behavior");
    expect(normalizeText(behaviorSection.textContent)).not.toMatch(/\b(px|rem)\b/);

    setCheckboxValue(findCheckboxByLabel(behaviorSection, "Highlight this column", 0), true);
    expect(getWritableControlPaths(behaviorSection)).toEqual(
      expect.arrayContaining([
        "columns.style",
        "columns.style.surface",
        "columns.style.background",
        "columns.style.borderColor",
        "columns.style.borderWidth",
        "columns.style.radius",
        "columns.style.padding",
        "columns.style.overflow",
        "columns.minHeight",
        "columns.mobileMinHeight",
        "columns.alignSelf",
      ])
    );
    setInputValue(
      findColorInputByLabel(behaviorSection, "Column background override swatch"),
      "#112233"
    );
    setInputValue(
      findColorInputByLabel(behaviorSection, "Column border override swatch"),
      "#445566"
    );
    setSelectValue(findSelectByLabel(behaviorSection, "Border width", 0), "2");
    setSelectValue(findSelectByLabel(behaviorSection, "Corner radius", 0), "2xl");
    setSelectValue(findSelectByLabel(behaviorSection, "Internal padding", 0), "6");
    setSelectValue(findSelectByLabel(behaviorSection, "Clip overflowing content", 0), "hidden");
    setSelectValue(findSelectByLabel(behaviorSection, "Minimum height", 0), "lg");
    setSelectValue(findSelectByLabel(behaviorSection, "Phone minimum height", 0), "none");
    setSelectValue(findSelectByLabel(behaviorSection, "Vertical alignment", 0), "end");

    expect(view.getValue().columns?.[0]).toEqual(
      expect.objectContaining({
        minHeight: "lg",
        mobileMinHeight: "none",
        alignSelf: "end",
        style: expect.objectContaining({
          surface: "on",
          background: "#112233",
          borderColor: "#445566",
          borderWidth: "2",
          radius: "2xl",
          padding: "6",
          overflow: "hidden",
        }),
      })
    );
  } finally {
    view.cleanup();
  }
});

test("GridColumns visual editor keeps overflow independent from local surface highlight", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialVariant: "equal",
    initialValue: gridColumnsDefaults,
  });

  try {
    const behaviorSection = getSectionByTitle(view.container, "Per-column surfaces and behavior");
    const highlightToggle = findCheckboxByLabel(behaviorSection, "Highlight this column", 0);

    setSelectValue(findSelectByLabel(behaviorSection, "Clip overflowing content", 0), "hidden");
    expect(highlightToggle.checked).toBe(false);
    expect(view.getValue().columns?.[0]?.style).toEqual(
      expect.objectContaining({
        overflow: "hidden",
      })
    );

    setCheckboxValue(highlightToggle, true);
    setCheckboxValue(highlightToggle, false);

    expect(highlightToggle.checked).toBe(false);
    expect(view.getValue().columns?.[0]?.style).toEqual(
      expect.objectContaining({
        overflow: "hidden",
      })
    );
    expect(view.getValue().columns?.[0]?.style).not.toEqual(
      expect.objectContaining({
        surface: "on",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("GridColumns editors fall back to safe defaults when normalization returns sparse data", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/gridColumns", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/gridColumns")>(
      "../../../core/widgets/core/gridColumns"
    );

    return {
      ...actual,
      normalizeGridColumnsData: vi.fn((value: GridColumnsData) => value),
      gridColumnsDefaults: {
        ...actual.gridColumnsDefaults,
        layout: {
          ...actual.gridColumnsDefaults.layout,
          gapX: undefined,
          gapY: undefined,
        },
        style: {
          ...actual.gridColumnsDefaults.style,
          cardizeColumns: true,
          columnBackground: undefined,
          columnBorderColor: undefined,
          columnBorderWidth: undefined,
          columnRadius: undefined,
          columnPadding: undefined,
        },
      },
    };
  });

  const wizardView = await renderEditor({
    editor: "wizard",
    initialVariant: "legacy-grid",
    initialValue: {},
  });
  const visualEmptyView = await renderEditor({
    editor: "visual",
    initialVariant: "legacy-grid",
    initialValue: {},
  });
  const visualPartialView = await renderEditor({
    editor: "visual",
    initialVariant: "legacy-grid",
    initialValue: {
      columns: [{}],
      layout: {},
    },
  });
  const advancedView = await renderEditor({
    editor: "advanced",
    initialValue: {},
  });

  try {
    const wizardSection = getSectionByTitle(wizardView.container, "Grid quick start");

    expect(normalizeText(wizardSection.textContent)).toContain("starter layout");
    expect(wizardSection.querySelectorAll("input, select, textarea")).toHaveLength(0);

    clickButton(findButtonsByText(wizardSection, "Asymmetric")[0]);
    expect(wizardView.getVariant()).toBe("asymmetric");
    expect(wizardView.getValue()).toEqual({});

    const visualVariantSection = getSectionByTitle(
      visualEmptyView.container,
      "Variant and layout structure"
    );
    const visualColumnSection = getSectionByTitle(
      visualPartialView.container,
      "Column sizing and labels"
    );
    const visualSurfaceSection = getSectionByTitle(
      visualPartialView.container,
      "Gap and column surface"
    );
    const alignmentSelect = findSelectByLabel(visualVariantSection, "Vertical alignment");
    const addButton = findButtonsByText(visualEmptyView.container, "Add one column")[0];
    const removeButton = findButtonsByText(visualEmptyView.container, "Remove one column")[0];
    const visualGapXSelect = findSelectByLabel(visualSurfaceSection, "Horizontal gap");
    const visualGapYSelect = findSelectByLabel(visualSurfaceSection, "Vertical gap");
    const visualSpanSelects = findSelectsByOptions(visualColumnSection, allSpanOptions).filter(
      (select) => select.options.length === allSpanOptions.length
    );
    const backgroundSwatch = findColorInputByLabel(
      visualSurfaceSection,
      "Column background swatch"
    );
    const borderSwatch = findColorInputByLabel(visualSurfaceSection, "Column border color swatch");

    expect(alignmentSelect.value).toBe("start");
    expect(addButton.disabled).toBe(false);
    expect(removeButton.disabled).toBe(true);

    clickButton(addButton);
    expect(visualEmptyView.getValue().columns).toHaveLength(3);

    expect(visualColumnSection.textContent).toContain("Content area 1");
    expect(findInputByPlaceholder(visualColumnSection, "Column 1").value).toBe("");
    expect(visualSpanSelects).toHaveLength(3);
    expect(visualSpanSelects[0]?.value).toBe("6");
    expect(visualSpanSelects[1]?.value).toBe("6");
    expect(visualSpanSelects[2]?.value).toBe("12");

    expect(visualGapXSelect.value).toBe("6");
    expect(visualGapYSelect.value).toBe("6");
    expect(backgroundSwatch.value).toBe("#f8fafc");
    expect(borderSwatch.value).toBe("#e2e8f0");
    expect(queryInputByPlaceholder(visualSurfaceSection, "var(--color-surface)")).toBeUndefined();
    expect(queryInputByPlaceholder(visualSurfaceSection, "var(--color-border)")).toBeUndefined();
    expect(findSelectByLabel(visualSurfaceSection, "Border width").value).toBe("1");
    expect(findSelectByLabel(visualSurfaceSection, "Corner radius").value).toBe("xl");
    expect(findSelectByLabel(visualSurfaceSection, "Internal padding").value).toBe("4");

    const advancedSection = getSectionByTitle(advancedView.container, "Layout summary");
    const advancedText = normalizeText(advancedSection.textContent);

    expect(advancedText).toContain("vertical alignment start");
    expect(advancedText).toContain("horizontal spacing large gap");
    expect(advancedText).toContain("vertical spacing large gap");
    expect(advancedText).toContain("cardized columns");
    expect(advancedView.container.querySelectorAll("input, select, textarea, button")).toHaveLength(
      0
    );
  } finally {
    wizardView.cleanup();
    visualEmptyView.cleanup();
    visualPartialView.cleanup();
    advancedView.cleanup();
    vi.doUnmock("../../../core/widgets/core/gridColumns");
    vi.resetModules();
  }
});

test("GridColumns advanced editor covers normalized diagnostics as read-only summaries", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialValue: {
      columns: [
        { id: "dup", label: "   ", desktopSpan: "bad" as never },
        {
          id: "dup",
          label: "Details",
          tabletSpan: "bad" as never,
          mobileSpan: "bad" as never,
        },
      ],
      layout: {
        align: "edge" as never,
        gapX: "bad" as never,
        gapY: "3",
      },
      style: {
        cardizeColumns: false,
        columnBackground: "token-surface",
        columnBorderColor: "token-border",
        columnBorderWidth: "9" as never,
        columnRadius: "pill" as never,
        columnPadding: "0" as never,
      },
    },
  });

  try {
    const technicalSection = getSectionByTitle(view.container, "Layout summary");
    const overrideSection = getSectionByTitle(view.container, "Column override summary");
    const slotSection = getSectionByTitle(view.container, "Content area diagnostics");
    const technicalText = normalizeText(technicalSection.textContent);

    expect(technicalText).toContain("vertical alignment start");
    expect(technicalText).toContain("horizontal spacing large gap");
    expect(technicalText).toContain("vertical spacing small gap");
    expect(technicalText).toContain("desktop 12/12");
    expect(technicalText).toContain("cardized columns");
    expect(technicalText).toContain("off");
    expect(normalizeText(overrideSection.textContent)).toContain(
      "0 of 2 content areas use per-column surface overrides"
    );
    expect(normalizeText(slotSection.textContent)).toContain("2 resolved content areas");
    expect(normalizeText(slotSection.textContent)).toContain("background theme default");
    expect(normalizeText(slotSection.textContent)).not.toContain("var(");
    expect(view.container.querySelector("pre")).toBeNull();
    expect(view.container.querySelectorAll("input, select, textarea, button")).toHaveLength(0);
    expect(view.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("GridColumns advanced editor reports masonry-lite and live slot state read-only", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialVariant: "masonry-lite",
    initialValue: {
      columns: [
        { id: "1", label: "Lead", desktopSpan: "8", tabletSpan: "6", mobileSpan: "12" },
        { id: "2", label: "Side", desktopSpan: "4", tabletSpan: "6", mobileSpan: "12" },
      ],
    },
    context: {
      surface: "page-builder",
      slotTargets: [
        {
          definitionId: "column",
          slotId: "column:2",
          label: "Column 2",
          kind: "repeatable",
          instanceId: "2",
        },
        {
          definitionId: "column",
          slotId: "column:1",
          label: "Column 1",
          kind: "repeatable",
          instanceId: "1",
        },
      ],
    },
  });

  try {
    const technicalSection = getSectionByTitle(view.container, "Layout summary");
    const slotSection = getSectionByTitle(view.container, "Content area diagnostics");
    const technicalText = normalizeText(technicalSection.textContent);

    expect(technicalText).toContain("on - masonry lite always adds column cards");
    expect(normalizeText(slotSection.textContent)).toContain("2 resolved content areas");
    expect(normalizeText(slotSection.textContent)).toContain("live structure order is active");
    expect(view.container.querySelectorAll("input, select, textarea, button")).toHaveLength(0);
    expect(view.getValue().columns?.map((column) => column.id)).toEqual(["1", "2"]);
    expect(view.onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
