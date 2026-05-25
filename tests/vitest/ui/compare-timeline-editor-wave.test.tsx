// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  compareTimelineDefaults,
  type CompareTimelineData,
} from "../../../core/widgets/core/compareTimeline";

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
    readOnly,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    readOnly?: boolean;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      readOnly={readOnly}
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

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "compare-step-page",
      title: "Compare Step",
      slug: "compare-step",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
    {
      id: "compare-segment-page",
      title: "Compare Segment",
      slug: "compare-segment",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
  ]),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("../../../core/admin/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    confirmLabel,
    onOpenChange,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void | Promise<void>;
  }) =>
    open ? (
      <div data-compare-confirm-dialog={title}>
        <p>{title}</p>
        <p>{description}</p>
        <button type="button" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
        <button type="button" onClick={() => void onConfirm()}>
          {confirmLabel}
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

const clickElement = (element: Element | null | undefined) => {
  if (!element) return;
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const toggleCheckbox = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLInputElement)) return;
  React.act(() => {
    element.click();
  });
};

const clickButtonByText = (container: ParentNode, text: string, index = 0) => {
  const button = Array.from(container.querySelectorAll("button")).filter((candidate) =>
    candidate.textContent?.includes(text)
  )[index];
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text} (${index})`);
  }
  clickElement(button);
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

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
    Array.from(section.querySelectorAll("h3, p")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("CompareTimeline wizard editor covers variant fallback, step expansion, track normalization, and marker toggles", async () => {
  const { CompareTimelineWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/CompareTimelineEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue: CompareTimelineData = {
    axis: {
      steps: [{ label: "Discover" }, { label: "Build" }, { label: "Launch" }],
    },
    tracks: [
      { id: "left", label: "Current state", markers: [0, 2], segments: [] },
      { id: "right", label: "Future state", markers: [1], segments: [] },
    ],
  };
  let currentVariant = "unexpected";

  const Harness = () => {
    const [value, setValue] = useState<CompareTimelineData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <CompareTimelineWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          currentVariant = next;
          onVariantChangeSpy(next);
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Quick setup");
    expect(view.container.textContent).toContain("Marker baseline");

    const highlightSwitch = view.container.querySelector("input[type='checkbox']");
    expect((highlightSwitch as HTMLInputElement | null)?.checked).toBe(false);

    toggleCheckbox(highlightSwitch);
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("dual-track-highlight");
    expect(currentVariant).toBe("dual-track-highlight");

    toggleCheckbox(highlightSwitch);
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("dual-track");
    expect(currentVariant).toBe("dual-track");

    setSelectValue(findSelectByOptions(view.container, ["3", "4", "5", "6"]), "4");
    expect(latestValue.axis.steps).toHaveLength(4);
    expect(latestValue.axis.steps[3]).toEqual(
      expect.objectContaining({ id: "step-4", label: "Optimize" })
    );
    expect(view.container.textContent).toContain("Optimize");

    setInputValue(findInputByPlaceholder(view.container, "Track 1 label"), "  Guided rollout  ");
    setInputValue(findInputByPlaceholder(view.container, "Track 2 label"), " ");

    clickButtonByText(view.container, "Discover", 0);
    clickButtonByText(view.container, "Optimize", 1);

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.tracks[0]).toEqual(
      expect.objectContaining({
        id: "a",
        label: "Guided rollout",
        markers: [2],
      })
    );
    expect(latestValue.tracks[1]).toEqual(
      expect.objectContaining({
        id: "b",
        label: "With us",
        markers: [1, 3],
      })
    );
  } finally {
    view.cleanup();
  }
});

test("CompareTimeline visual editor covers highlight branching, segment editing, and style controls", async () => {
  const { CompareTimelineVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/CompareTimelineEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue: CompareTimelineData = {
    axis: {
      steps: [{ label: "Plan" }, { label: "Build" }, { label: "Deliver" }],
    },
    tracks: [
      {
        id: "legacy",
        label: "Legacy path",
        markers: [0],
        segments: [{ from: 1, to: 2, label: "Long review" }],
      },
      {
        id: "modern",
        label: "Modern path",
        markers: [2],
        segments: [],
      },
    ],
    guides: { enabled: false, style: "solid" },
    layout: { trackSpacing: "sm", labelPosition: "top" },
    highlight: { targetTrackId: "missing" },
    style: {
      highlightColor: "bad-token",
      highlightLabelStyle: "outline",
      markerColor: "not-hex",
      trackLabelColor: "#123123",
      stepLabelColor: "#456456",
      mutedStepColor: "#789789",
      guideColor: "still-bad",
      trackLabelSize: "sm",
      stepLabelSize: "sm",
      segmentLabelSize: "sm",
    },
  };
  let currentVariant = "dual-track";

  const Harness = () => {
    const [value, setValue] = useState<CompareTimelineData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <CompareTimelineVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          currentVariant = next;
          onVariantChangeSpy(next);
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Variant and compare structure");
    expect(view.container.textContent).toContain(
      "Segment mapping is hidden in Dual Track. Saved segments are preserved and will reappear in Dual Track Highlight."
    );

    setSelectValue(findSelectByOptions(view.container, ["3", "4", "5", "6"]), "4");
    setInputValue(findInputByPlaceholder(view.container, "Step 1"), "Discover");
    setInputValue(findInputByPlaceholder(view.container, "Step 4"), "Review");
    expect(
      findInputByPlaceholder(view.container, "Optional safe link (/compare-step or https://...)")
    ).toBeUndefined();
    setInputValue(findInputByPlaceholder(view.container, "Track 1 label"), "Current state");
    setInputValue(findInputByPlaceholder(view.container, "Track 2 label"), "Future state");

    clickButtonByText(view.container, "Dual Track Highlight");
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("dual-track-highlight");
    expect(currentVariant).toBe("dual-track-highlight");

    const markersSection = findSectionByTitle(view.container, "Markers and segment mapping");
    expect(markersSection?.textContent).toContain("No highlight segments configured.");
    expect(
      findInputByPlaceholder(
        markersSection as ParentNode,
        "Optional safe link (/compare-path or https://...)"
      )
    ).toBeUndefined();

    const targetTrackSelect = findSelectByOptions(markersSection as ParentNode, ["a", "b", "both"]);
    expect((targetTrackSelect as HTMLSelectElement | null | undefined)?.value).toBe("b");

    clickButtonByText(markersSection as ParentNode, "Discover", 0);
    clickButtonByText(markersSection as ParentNode, "Build", 1);

    setSelectValue(targetTrackSelect, "a");
    clickButtonByText(markersSection as ParentNode, "Add segment");

    setSelectValue(
      findSelectsByOptions(markersSection as ParentNode, ["0", "1", "2", "3"])[2],
      "0"
    );
    setSelectValue(
      findSelectsByOptions(markersSection as ParentNode, ["0", "1", "2", "3"])[3],
      "3"
    );
    const segmentLabelInputs = Array.from(markersSection?.querySelectorAll("input") ?? []).filter(
      (candidate) =>
        candidate instanceof HTMLInputElement &&
        candidate.getAttribute("placeholder")?.startsWith("Optional label.")
    ) as HTMLInputElement[];
    setInputValue(segmentLabelInputs[1], "Automation lane");
    clickButtonByText(markersSection as ParentNode, "Remove segment", 0);

    const highlightSection = findSectionByTitle(view.container, "Highlight and guide styles");
    toggleCheckbox(highlightSection?.querySelector("input[type='checkbox']"));
    setSelectValue(
      findSelectByOptions(highlightSection as ParentNode, ["solid", "dashed"]),
      "dashed"
    );
    setSelectValue(
      findSelectByOptions(highlightSection as ParentNode, ["solid", "outline", "subtle"]),
      "subtle"
    );

    const colorsSection = findSectionByTitle(view.container, "Colors and typography");
    const colorInputs = Array.from(
      colorsSection?.querySelectorAll("input[type='color']") ?? []
    ) as HTMLInputElement[];
    expect(colorInputs[0]?.value).toBe("#f59e0b");
    expect(colorInputs[1]?.value).toBe("#1d4ed8");
    expect(colorInputs[5]?.value).toBe("#e2e8f0");
    expect(colorInputs[6]?.value).toBe("#ffffff");
    expect(colorsSection?.querySelector("input:not([type='color'])")).toBeNull();
    const writablePaths = Array.from(view.container.querySelectorAll("[data-widget-control-path]"))
      .map((element) => element.getAttribute("data-widget-control-path"))
      .filter(Boolean);
    expect(new Set(writablePaths)).toEqual(
      new Set([
        "variant",
        "axis.steps",
        "tracks",
        "highlight.targetTrackId",
        "highlight.targetTrackIds",
        "guides.enabled",
        "guides.style",
        "style.highlightLabelStyle",
        "style.highlightColor",
        "style.markerColor",
        "style.trackLabelColor",
        "style.stepLabelColor",
        "style.mutedStepColor",
        "style.guideColor",
        "style.trackBackgroundColor",
        "style.trackLabelSize",
        "style.stepLabelSize",
        "style.segmentLabelSize",
        "style.trackLabelFontWeight",
        "style.stepLabelFontWeight",
        "style.segmentLabelFontWeight",
        "style.markerShape",
        "header.title",
        "header.subtitle",
        "layout.trackSpacing",
        "layout.labelPosition",
        "layout.maxWidth",
        "layout.padding",
        "layout.trackOrder",
        "layout.motion",
      ])
    );

    const highlightOnlyPaths = new Set(
      Array.from((markersSection as ParentNode).querySelectorAll("[data-widget-control-path]"))
        .map((element) => element.getAttribute("data-widget-control-path"))
        .filter(Boolean)
    );
    expect(highlightOnlyPaths).toEqual(
      new Set(["highlight.targetTrackId", "highlight.targetTrackIds"])
    );

    setInputValue(colorInputs[0], "#ffaa00");
    setInputValue(colorInputs[1], "#2244ff");
    setInputValue(colorInputs[2], "#334455");
    setInputValue(colorInputs[3], "#445566");
    setInputValue(colorInputs[4], "#556677");
    setInputValue(colorInputs[5], "#0f172a");
    setInputValue(colorInputs[6], "#f8fafc");

    const trackLabelSizeSelect = findSelectByOptions(colorsSection as ParentNode, [
      "sm",
      "base",
      "lg",
    ]);
    const smallLabelSizeSelects = findSelectsByOptions(colorsSection as ParentNode, [
      "xs",
      "sm",
      "base",
    ]);
    expect(
      Array.from((trackLabelSizeSelect as HTMLSelectElement).options).map((option) => option.value)
    ).toContain("none");
    expect(
      Array.from((smallLabelSizeSelects[0] as HTMLSelectElement).options).map(
        (option) => option.value
      )
    ).toContain("none");
    expect(
      Array.from((smallLabelSizeSelects[1] as HTMLSelectElement).options).map(
        (option) => option.value
      )
    ).toContain("none");
    setSelectValue(trackLabelSizeSelect, "lg");
    setSelectValue(smallLabelSizeSelects[0], "base");
    setSelectValue(smallLabelSizeSelects[1], "base");
    const fontWeightSelects = findSelectsByOptions(colorsSection as ParentNode, [
      "normal",
      "medium",
      "semibold",
      "bold",
    ]);
    setSelectValue(fontWeightSelects[0], "bold");
    setSelectValue(fontWeightSelects[1], "medium");
    setSelectValue(fontWeightSelects[2], "semibold");
    setSelectValue(
      findSelectByOptions(colorsSection as ParentNode, ["rounded", "circle", "numbered", "check"]),
      "check"
    );

    const spacingSection = findSectionByTitle(view.container, "Spacing and layout preview hints");
    const trackSpacingSelect = findSelectByOptions(spacingSection as ParentNode, [
      "sm",
      "md",
      "lg",
      "xl",
    ]);
    expect(
      Array.from((trackSpacingSelect as HTMLSelectElement).options).map((option) => option.value)
    ).toContain("none");
    setSelectValue(trackSpacingSelect, "xl");
    setSelectValue(findSelectByOptions(spacingSection as ParentNode, ["top", "bottom"]), "bottom");
    setSelectValue(
      findSelectByOptions(spacingSection as ParentNode, ["4xl", "5xl", "6xl", "7xl"]),
      "7xl"
    );
    setSelectValue(findSelectsByOptions(spacingSection as ParentNode, ["sm", "md", "lg"])[1], "lg");
    setSelectValue(
      findSelectByOptions(spacingSection as ParentNode, ["a-first", "b-first"]),
      "b-first"
    );
    setSelectValue(
      findSelectByOptions(spacingSection as ParentNode, ["none", "fade", "slide"]),
      "slide"
    );
    expect(spacingSection?.textContent).toContain("Current state first");
    expect(spacingSection?.textContent).toContain("Future state first");

    const headingSection = findSectionByTitle(view.container, "Section heading");
    setInputValue(
      findInputByPlaceholder(headingSection as ParentNode, "Optional section title"),
      "Compare adoption"
    );
    setTextareaValue(
      findTextareaByPlaceholder(headingSection as ParentNode, "Optional supporting subtitle"),
      "Explain the rollout delta"
    );

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.axis.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Discover" }),
        expect.objectContaining({ label: "Review" }),
      ])
    );
    expect(latestValue.tracks[0]).toEqual(
      expect.objectContaining({
        id: "a",
        label: "Current state",
        markers: [],
        segments: [{ from: 0, to: 3, label: "Automation lane", href: undefined }],
      })
    );
    expect(latestValue.tracks[1]).toEqual(
      expect.objectContaining({
        id: "b",
        label: "Future state",
        markers: [1, 2],
      })
    );
    expect(latestValue.highlight).toEqual({ targetTrackId: "a", targetTrackIds: ["a"] });
    expect(latestValue.guides).toEqual({ enabled: true, style: "dashed" });
    expect(latestValue.style).toEqual(
      expect.objectContaining({
        highlightColor: "#ffaa00",
        highlightLabelStyle: "subtle",
        markerColor: "#2244ff",
        trackLabelColor: "#334455",
        stepLabelColor: "#445566",
        mutedStepColor: "#556677",
        guideColor: "#0f172a",
        trackBackgroundColor: "#f8fafc",
        trackLabelSize: "lg",
        stepLabelSize: "base",
        segmentLabelSize: "base",
        trackLabelFontWeight: "bold",
        stepLabelFontWeight: "medium",
        segmentLabelFontWeight: "semibold",
        markerShape: "check",
      })
    );
    expect(latestValue.layout).toEqual(
      expect.objectContaining({
        trackSpacing: "xl",
        labelPosition: "bottom",
        maxWidth: "7xl",
        padding: "lg",
        trackOrder: "b-first",
        motion: "slide",
      })
    );
    expect(latestValue.header).toEqual(
      expect.objectContaining({
        title: "Compare adoption",
        subtitle: "Explain the rollout delta",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("CompareTimeline advanced editor keeps diagnostics read-only and confirms normalization", async () => {
  const { CompareTimelineAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/CompareTimelineEditors");

  const onChangeSpy = vi.fn();
  let latestValue: CompareTimelineData = {
    axis: {
      steps: [
        { id: "", label: " " },
        { id: "step-1", label: "Build" },
        { id: "step-2", label: "Ship", description: " " },
        { id: "launch", label: "Launch" },
        { id: "launch", label: "Review" },
        { id: "", label: "Scale" },
      ],
    },
    tracks: [
      {
        id: "left-custom",
        label: " ",
        markers: [-1, 2, 2, 9],
        segments: [
          { from: 2, to: 1, label: "  slow  " },
          { from: 2, to: 1, label: "slow" },
          { from: 5, to: 9 },
        ],
      },
      {
        id: "right-custom",
        label: "  Fast lane  ",
        markers: [1, 99],
        segments: [{ from: 0, to: 0, label: "   " }],
      },
    ],
    guides: { enabled: false },
    layout: { trackSpacing: "wide" as never },
    highlight: { targetTrackId: "missing" },
    style: {},
  };

  const Harness = () => {
    const [value, setValue] = useState<CompareTimelineData>(latestValue);

    return (
      <CompareTimelineAdvancedEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant="dual-track-highlight"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Runtime layout diagnostics");
    expect(view.container.textContent).toContain("Metadata diagnostics");
    expect(view.container.textContent).toContain("Normalization support");
    expect(view.container.textContent).toContain("Fast lane");
    expect(view.container.textContent).toContain("Show internal support references");
    expect(normalizeText(view.container.textContent)).toContain("current axis steps: 6.");
    expect(normalizeText(view.container.textContent)).toContain(
      "track referencestraditional, fast lane"
    );
    expect(view.container.textContent).not.toContain("Track spacing token");
    expect(view.container.textContent).not.toContain("Raw metadata fields");
    expect(view.container.textContent).not.toContain("support key");
    expect(view.container.querySelector("input")).toBeNull();
    expect(view.container.querySelector("textarea")).toBeNull();
    expect(view.container.querySelector("select")).toBeNull();
    expect(view.container.textContent).not.toContain("Add step");
    expect(view.container.textContent).not.toContain("Remove step");
    expect(onChangeSpy).not.toHaveBeenCalled();

    clickButtonByText(view.container, "Normalize compare payload");
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Normalize compare timeline");

    clickButtonByText(view.container, "Normalize", 1);
    expect(latestValue.axis.steps.map((step) => step.id)).toEqual([
      "step-1",
      "step-2",
      "step-3",
      "launch",
      "step-4",
      "step-6",
    ]);
    expect(latestValue.axis.steps.map((step) => step.label)).toEqual([
      "Plan",
      "Build",
      "Ship",
      "Launch",
      "Review",
      "Scale",
    ]);
    expect(latestValue.tracks).toEqual([
      {
        id: "a",
        label: "Traditional",
        markers: [0, 2, 5],
        segments: [
          { from: 1, to: 2, label: "slow", href: undefined },
          { from: 5, to: 5, label: undefined, href: undefined },
        ],
      },
      {
        id: "b",
        label: "Fast lane",
        markers: [1, 5],
        segments: [{ from: 0, to: 0, label: undefined, href: undefined }],
      },
    ]);
    expect(latestValue.highlight).toEqual({ targetTrackId: "b", targetTrackIds: ["b"] });
    expect(latestValue.guides).toEqual({ enabled: false, style: "dashed" });
    expect(latestValue.layout).toEqual({
      trackSpacing: "wide",
      labelPosition: "top",
      maxWidth: "6xl",
      padding: "md",
      trackOrder: "a-first",
      motion: "none",
    });
  } finally {
    view.cleanup();
  }
});

test("CompareTimeline editors cover visual marker toggles, saved custom colors, and advanced diagnostics", async () => {
  const { CompareTimelineAdvancedEditor, CompareTimelineVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/CompareTimelineEditors");

  let latestVisualValue: CompareTimelineData = {
    axis: {
      steps: [{ label: "Plan" }, { label: "Build" }, { label: "Ship" }],
    },
    tracks: [
      { id: "legacy", label: "Legacy", markers: [0], segments: [] },
      { id: "modern", label: "Modern", markers: [2], segments: [] },
    ],
    guides: { enabled: true, style: "solid" },
    layout: { trackSpacing: "md", labelPosition: "top" },
    style: {
      trackLabelColor: "var(--track-label)",
      stepLabelColor: "var(--step-label)",
      mutedStepColor: "muted-step-token",
    },
  };

  const VisualHarness = () => {
    const [value, setValue] = useState<CompareTimelineData>(latestVisualValue);

    return (
      <CompareTimelineVisualEditor
        value={value}
        onChange={(next) => {
          latestVisualValue = next;
          setValue(next);
        }}
        variant="dual-track"
      />
    );
  };

  const visualView = mount(<VisualHarness />);

  try {
    const markersSection = findSectionByTitle(visualView.container, "Markers and segment mapping");
    clickButtonByText(markersSection as ParentNode, "Plan", 1);
    clickButtonByText(markersSection as ParentNode, "Build", 0);

    expect(latestVisualValue.tracks[0]?.markers).toEqual([0, 1]);
    expect(latestVisualValue.tracks[1]?.markers).toEqual([0, 2]);

    const colorsSection = findSectionByTitle(visualView.container, "Colors and typography");
    expect(colorsSection?.textContent).toContain("Saved custom color");
    expect(colorsSection?.querySelector("input:not([type='color'])")).toBeNull();

    const colorInputs = Array.from(
      colorsSection?.querySelectorAll("input[type='color']") ?? []
    ) as HTMLInputElement[];
    setInputValue(colorInputs[1], "#102030");
    setInputValue(colorInputs[2], "#203040");
    setInputValue(colorInputs[3], "#304050");

    expect(latestVisualValue.style).toEqual(
      expect.objectContaining({
        trackLabelColor: "#102030",
        stepLabelColor: "#203040",
        mutedStepColor: "#304050",
      })
    );
  } finally {
    visualView.cleanup();
  }

  const defaultView = mount(
    <CompareTimelineVisualEditor
      value={compareTimelineDefaults}
      onChange={() => undefined}
      variant="dual-track"
    />
  );

  try {
    const colorsSection = findSectionByTitle(defaultView.container, "Colors and typography");
    expect(colorsSection?.textContent).not.toContain("Saved custom color");
    expect(colorsSection?.textContent).toContain("Selected color");
    expect(colorsSection?.querySelector("input:not([type='color'])")).toBeNull();
  } finally {
    defaultView.cleanup();
  }

  let latestAdvancedValue: CompareTimelineData = {
    axis: {
      steps: [{ label: "Plan" }, { label: "Build" }, { label: "Ship" }],
    },
    tracks: [
      { id: "legacy", label: "Legacy", markers: [0], segments: [] },
      { id: "modern", label: "Modern", markers: [1], segments: [] },
    ],
  };

  const AdvancedHarness = () => {
    const [value, setValue] = useState<CompareTimelineData>(latestAdvancedValue);

    return (
      <CompareTimelineAdvancedEditor
        value={value}
        onChange={(next) => {
          latestAdvancedValue = next;
          setValue(next);
        }}
        variant="dual-track"
      />
    );
  };

  const advancedView = mount(<AdvancedHarness />);

  try {
    expect(advancedView.container.textContent).toContain("Runtime layout diagnostics");
    expect(advancedView.container.textContent).toContain("Track references");
    expect(advancedView.container.textContent).not.toContain("Add step");
    expect(advancedView.container.querySelector("input")).toBeNull();
    expect(advancedView.container.querySelector("textarea")).toBeNull();
    expect(advancedView.container.querySelector("select")).toBeNull();
    expect(latestAdvancedValue.axis.steps).toHaveLength(3);
  } finally {
    advancedView.cleanup();
  }
});

test("CompareTimeline visual warns when configured colors collapse into unreadable contrast", async () => {
  const { CompareTimelineVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/CompareTimelineEditors");

  const view = mount(
    <CompareTimelineVisualEditor
      value={{
        ...compareTimelineDefaults,
        style: {
          ...compareTimelineDefaults.style,
          markerColor: "#ffffff",
          trackLabelColor: "#ffffff",
          stepLabelColor: "#ffffff",
          trackBackgroundColor: "#ffffff",
        },
      }}
      onChange={() => undefined}
      variant="dual-track-highlight"
    />
  );

  try {
    expect(view.container.textContent).toContain("Marker contrast advisory");
    expect(view.container.textContent).toContain("Label contrast advisory");
    expect(view.container.textContent).toContain("Configured colors may be hard to read together");
  } finally {
    view.cleanup();
  }
});
