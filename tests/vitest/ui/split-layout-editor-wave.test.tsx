// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { SplitLayoutData } from "../../../core/widgets/core/splitLayout";
import type { WidgetBlock, WidgetEditorProps } from "../../../core/widgets/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

const findSelectsByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).filter((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("p, h3")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );

type EditorKind = "wizard" | "visual" | "advanced";

const renderEditor = async ({
  editor,
  initialValue,
  initialVariant = "50-50",
  withVariantChange = true,
}: {
  editor: EditorKind;
  initialValue: SplitLayoutData;
  initialVariant?: string;
  withVariantChange?: boolean;
}) => {
  const { SplitLayoutAdvancedEditor, SplitLayoutVisualEditor, SplitLayoutWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/SplitLayoutEditors");

  const editorMap = {
    wizard: SplitLayoutWizardEditor,
    visual: SplitLayoutVisualEditor,
    advanced: SplitLayoutAdvancedEditor,
  } as const;

  const Editor = editorMap[editor];
  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();

  let latestValue = initialValue;
  let latestVariant = initialVariant;

  const Harness = () => {
    const [value, setValue] = useState<SplitLayoutData>(initialValue);
    const [variant, setVariant] = useState(initialVariant);

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
      />
    );
  };

  const view = mount(<Harness />);

  return {
    ...view,
    onChangeSpy,
    onVariantChangeSpy,
    getLatestValue: () => latestValue,
    getLatestVariant: () => latestVariant,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("SplitLayout wizard only seeds the starter split", async () => {
  const view = await renderEditor({
    editor: "wizard",
    initialValue: {
      ratio: {
        desktop: "bad" as never,
        tablet: "bad" as never,
        mobile: "bad" as never,
      },
      collapseMobile: "bad" as never,
      reverseOnMobile: false,
      gap: "99" as never,
      verticalAlign: "bad" as never,
    },
    initialVariant: "legacy",
  });

  try {
    const presetSelect = findSelectsByOptions(view.container, ["50-50", "40-60", "60-40"])[0];

    expect((presetSelect as HTMLSelectElement | null | undefined)?.value).toBe("50-50");
    expect(findSelectsByOptions(view.container, ["stack", "keep"])).toHaveLength(0);
    expect(
      findSelectsByOptions(view.container, ["none", "1", "2", "3", "4", "5", "6", "8", "10", "12"])
    ).toHaveLength(0);
    expect(view.container.textContent).not.toContain("Mobile behavior");
    expect(view.container.textContent).not.toContain("Base gap");

    setSelectValue(presetSelect, "60-40");

    expect(view.onVariantChangeSpy).toHaveBeenCalledWith("60-40");
    expect(view.getLatestVariant()).toBe("60-40");
    expect(view.getLatestValue()).toMatchObject({
      ratio: {
        desktop: "60-40",
        tablet: "60-40",
        mobile: "60-40",
      },
      collapseMobile: "stack",
      reverseOnMobile: false,
      gap: "6",
      verticalAlign: "stretch",
    });
  } finally {
    view.cleanup();
  }
});

test("SplitLayout visual editor exposes keep-specific mobile ratio and truthful reverse copy", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: {
      ratio: {
        desktop: "60-40",
        tablet: "50-50",
      },
      collapseMobile: "keep",
      reverseOnMobile: false,
      gap: "6",
      verticalAlign: "stretch",
    },
    initialVariant: "60-40",
  });

  try {
    const mobileSection = findSectionByTitle(view.container, "Phone behavior") as ParentNode;
    const mobileSelects = Array.from(mobileSection.querySelectorAll("select"));
    const collapseSelect = mobileSelects[0];
    const mobileRatioSelect = mobileSelects[1];
    const reverseToggle = mobileSection.querySelector('input[type="checkbox"]');
    const reverseCopy = mobileSection.querySelector("[data-split-reverse-copy]");

    expect(
      view.container.querySelector('[data-split-mobile-ratio-control="visible"]')
    ).toBeTruthy();
    expect((collapseSelect as HTMLSelectElement | null | undefined)?.value).toBe("keep");
    expect((mobileRatioSelect as HTMLSelectElement | null | undefined)?.value).toBe("50-50");
    expect(reverseCopy?.textContent).toContain("visually show the right pane first");

    setSelectValue(mobileRatioSelect, "40-60");
    expect(view.getLatestValue().ratio?.mobile).toBe("40-60");

    setCheckboxValue(reverseToggle, true);
    expect(reverseCopy?.textContent).toContain("right pane is shown first");

    setSelectValue(collapseSelect, "stack");
    expect(view.container.querySelector('[data-split-mobile-ratio-control="visible"]')).toBeFalsy();
    expect(
      view.container.querySelector('[data-split-mobile-ratio-control="stack-note"]')
    ).toBeTruthy();
    expect(reverseCopy?.textContent).toContain("right pane is shown above the left pane");
  } finally {
    view.cleanup();
  }
});

test("SplitLayout visual editor shows ratio disclosure, miniatures, and legacy zero-gap guidance", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: {
      ratio: {
        desktop: "40-60",
        tablet: "60-40",
      },
      collapseMobile: "keep",
      gap: "0",
      verticalAlign: "center",
    },
    initialVariant: "40-60",
  });

  try {
    expect(view.container.querySelectorAll("[data-split-variant-preview]")).toHaveLength(3);

    const ratioSummary = view.container.querySelector("[data-split-ratio-summary]");
    expect(ratioSummary?.getAttribute("data-split-ratio-override")).toBe("true");
    expect(ratioSummary?.getAttribute("data-split-ratio-effective-starter")).toBe("false");
    expect(ratioSummary?.getAttribute("data-split-ratio-device-specific")).toBe("true");
    expect(ratioSummary?.textContent).toContain("Desktop 40 / 60, tablet 60 / 40, mobile 60 / 40.");
    expect(ratioSummary?.textContent).toContain("Custom device layout");
    expect(ratioSummary?.textContent).toContain(
      "Desktop split cards update the desktop layout. Tablet and phone overrides stay intact when they differ from desktop."
    );

    const spacingSection = findSectionByTitle(
      view.container,
      "Spacing and alignment"
    ) as ParentNode;
    const gapSelect = Array.from(spacingSection.querySelectorAll("select"))[0] as HTMLSelectElement;
    const gapCopy = spacingSection.querySelector("[data-split-gap-copy]");
    const optionValues = Array.from(gapSelect.options).map((option) => option.value);

    expect(optionValues).not.toContain("0");
    expect(gapSelect.value).toBe("none");
    expect(gapCopy?.textContent).toContain("Older saved zero-gap layouts are shown here.");
  } finally {
    view.cleanup();
  }
});

test("SplitLayout visual disclosure does not call explicit matching phone splits independent", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: {
      ratio: {
        desktop: "60-40",
        tablet: "60-40",
        mobile: "60-40",
      },
      collapseMobile: "keep",
    },
    initialVariant: "60-40",
  });

  try {
    const ratioSummary = view.container.querySelector("[data-split-ratio-summary]");
    expect(ratioSummary?.getAttribute("data-split-ratio-override")).toBe("false");
    expect(ratioSummary?.getAttribute("data-split-ratio-effective-starter")).toBe("true");
    expect(ratioSummary?.textContent).toContain("Matches starter layout");
    expect(ratioSummary?.textContent).toContain(
      "Phone split is saved explicitly, but it currently matches the starter layout."
    );
    expect(ratioSummary?.textContent).not.toContain("Phone layout has its own saved split.");
  } finally {
    view.cleanup();
  }
});

test("SplitLayout visual preset cards follow desktop ratio and preserve device overrides", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: {
      ratio: {
        desktop: "50-50",
        tablet: "40-60",
        mobile: "50-50",
      },
      collapseMobile: "keep",
      reverseOnMobile: false,
      gap: "6",
      verticalAlign: "stretch",
    },
    initialVariant: "60-40",
  });

  try {
    expect(
      view.container
        .querySelector('button[data-split-variant-card="50-50"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true");
    expect(
      view.container
        .querySelector('button[data-split-variant-card="60-40"]')
        ?.getAttribute("aria-pressed")
    ).toBe("false");

    clickByText(view.container, "60 / 40");

    expect(view.getLatestVariant()).toBe("60-40");
    expect(view.getLatestValue()).toMatchObject({
      ratio: {
        desktop: "60-40",
        tablet: "40-60",
        mobile: "50-50",
      },
    });
  } finally {
    view.cleanup();
  }
});

test("SplitLayout visual editor replaces Pane slots with Pane content guidance", async () => {
  const view = await renderEditor({
    editor: "visual",
    initialValue: {},
    initialVariant: "50-50",
  });

  try {
    expect(findSectionByTitle(view.container, "Pane content")).toBeTruthy();
    expect(findSectionByTitle(view.container, "Pane slots")).toBeUndefined();
    expect(view.container.textContent).toContain("Target the left or right pane from Structure");
  } finally {
    view.cleanup();
  }
});

test("SplitLayout visual variant cards use the atomic onBlockPatch path", async () => {
  const { SplitLayoutVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/SplitLayoutEditors");
  const onChangeSpy = vi.fn();
  const onBlockPatch = vi.fn();

  const view = mount(
    <SplitLayoutVisualEditor
      value={{
        ratio: {
          desktop: "50-50",
          tablet: "50-50",
        },
        collapseMobile: "stack",
        reverseOnMobile: false,
        gap: "6",
        verticalAlign: "stretch",
      }}
      onChange={onChangeSpy}
      variant="50-50"
      onBlockPatch={onBlockPatch}
    />
  );

  try {
    clickByText(view.container, "60 / 40");

    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(onBlockPatch).toHaveBeenCalledTimes(1);

    const patch = onBlockPatch.mock.calls[0]?.[0] as Parameters<
      NonNullable<WidgetEditorProps<SplitLayoutData>["onBlockPatch"]>
    >[0];
    const currentBlock: WidgetBlock = {
      id: "split-1",
      type: "split-layout",
      variant: "50-50",
      data: {
        ratio: {
          desktop: "50-50",
          tablet: "50-50",
        },
        collapseMobile: "stack",
        reverseOnMobile: false,
        gap: "6",
        verticalAlign: "stretch",
      },
    };
    const nextBlock =
      typeof patch === "function" ? patch(currentBlock) : { ...currentBlock, ...patch };

    expect(nextBlock.variant).toBe("60-40");
    expect(nextBlock.data).toMatchObject({
      ratio: {
        desktop: "60-40",
        tablet: "60-40",
        mobile: "60-40",
      },
    });
  } finally {
    view.cleanup();
  }
});

test("SplitLayout advanced editor is read-only diagnostics without raw payload", async () => {
  const view = await renderEditor({
    editor: "advanced",
    initialValue: {
      ratio: {
        desktop: "40-60",
        tablet: "50-50",
        mobile: "60-40",
      },
      collapseMobile: "keep",
      reverseOnMobile: true,
      gap: "4",
      verticalAlign: "center",
    },
    initialVariant: "50-50",
  });

  try {
    const diagnosticsSection = findSectionByTitle(
      view.container,
      "How this layout renders"
    ) as ParentNode;
    expect(diagnosticsSection.querySelectorAll("select")).toHaveLength(0);
    expect(diagnosticsSection.textContent).toContain("Starter layout");
    expect(diagnosticsSection.textContent).toContain("Desktop");
    expect(diagnosticsSection.textContent).toContain("Tablet");
    expect(diagnosticsSection.textContent).toContain("Phone");
    expect(diagnosticsSection.textContent).toContain("Balanced");
    expect(diagnosticsSection.textContent).toContain("right pane first");

    expect(view.container.querySelector("pre")).toBeNull();
    expect(view.container.textContent).not.toContain('"mobile"');
    expect(view.container.textContent).not.toContain("raw JSON");
    expect(view.container.textContent).not.toContain("CSS class");
    expect(view.container.textContent).not.toContain("token");
    expect(view.container.textContent).not.toContain("payload");
    expect(view.container.textContent).not.toContain("gap-4");
    expect(view.container.textContent).not.toContain("items-center");
    expect(view.container.textContent).toContain("Saved layout summary");
  } finally {
    view.cleanup();
  }
});
