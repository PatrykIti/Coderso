// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { TimelineData } from "../../../core/widgets/core/timeline";

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
    readOnly,
    className,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    readOnly?: boolean;
    className?: string;
    [key: string]: unknown;
  }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
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

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "timeline-cta-page",
      title: "Timeline CTA",
      slug: "timeline-cta",
      status: "published",
      updatedAt: "2026-05-25T00:00:00.000Z",
      author: null,
    },
    {
      id: "timeline-link-page",
      title: "Timeline Link",
      slug: "timeline-link",
      status: "published",
      updatedAt: "2026-05-25T00:00:00.000Z",
      author: null,
    },
  ]),
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

const flushAsyncEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const createDataTransfer = () => {
  const store = new Map<string, string>();
  return {
    effectAllowed: "move",
    dropEffect: "move",
    setData: (key: string, value: string) => {
      store.set(key, value);
    },
    getData: (key: string) => store.get(key) ?? "",
  };
};

const dispatchDragEvent = (
  node: Element,
  type: "dragstart" | "dragover" | "drop" | "dragend",
  dataTransfer = createDataTransfer()
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  React.act(() => {
    node.dispatchEvent(event);
  });
  return dataTransfer;
};

const clickButtonByText = (container: ParentNode, text: string, index = 0) => {
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

const findLinkDestinationSelect = (container: ParentNode, fieldId: string) =>
  container.querySelector(`[data-link-destination-field="${fieldId}"] select`);

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("h3,p,span")).some(
      (element) => normalizeText(element.textContent) === normalizeText(title)
    )
  );

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("Timeline wizard keeps header and step previews read-only and leaves daily presentation controls out", async () => {
  const { TimelineWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/TimelineEditors");

  const onChangeSpy = vi.fn();
  let latestValue: TimelineData = {
    header: {
      title: "Existing roadmap",
      description: "Existing context",
    },
    steps: [
      { id: "", title: " " },
      { id: "custom-step", title: "Kickoff" },
      { id: "step-3", title: "Launch" },
    ],
    layout: {},
    guides: {},
    style: { titleSize: "none" },
  };
  let currentVariant = "milestones";

  const Harness = () => {
    const [value, setValue] = useState<TimelineData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <TimelineWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          currentVariant = next;
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);
  await flushAsyncEffects();

  try {
    expect(view.container.textContent).toContain("Wizard summarizes the saved timeline story");
    expect(view.container.textContent).toContain("Visual owns daily step details");
    expect(
      findSectionByTitle(view.container, "Starter steps")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("timeline.wizard.starter-steps");
    expect(view.container.textContent).not.toContain("Show guide lines");
    expect(view.container.textContent).not.toContain("Step titles are hidden right now");
    expect(findInputByPlaceholder(view.container, "Icon text or emoji")).toBeUndefined();
    expect(findInputsByPlaceholder(view.container, "#1d4ed8")).toHaveLength(0);

    const variantSummary = view.container.querySelector(
      '[data-widget-control="timeline.wizard.variant"]'
    );
    expect(variantSummary?.getAttribute("data-widget-control-readonly")).toBe("true");
    expect(variantSummary?.textContent).toContain("Milestones");
    expect(findSelectByOptions(view.container, ["milestones", "cards", "compact"])).toBeUndefined();
    expect(currentVariant).toBe("milestones");

    expect(findInputByPlaceholder(view.container, "Timeline heading")).toBeUndefined();
    expect(
      findTextareaByPlaceholder(view.container, "Optional context above the timeline")
    ).toBeUndefined();
    expect(view.container.textContent).toContain("Existing roadmap");
    expect(view.container.textContent).toContain("Existing context");

    expect(findSelectByOptions(view.container, ["3", "4", "5", "6", "7", "8"])).toBeUndefined();
    expect(view.container.textContent).toContain("3 steps");

    expect(findInputByPlaceholder(view.container, "Step 1")).toBeUndefined();
    expect(findTextareaByPlaceholder(view.container, "Step description")).toBeUndefined();

    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(view.container.querySelectorAll("button")).toHaveLength(0);
    expect(latestValue.steps).toHaveLength(3);
    expect(latestValue.steps[0]).toEqual(
      expect.objectContaining({
        id: "",
        title: " ",
      })
    );
    expect(latestValue.header).toEqual(
      expect.objectContaining({
        title: "Existing roadmap",
        description: "Existing context",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("Timeline visual editor covers mode previews, drag reorder, no-status, grouped marker controls, and container tokens", async () => {
  const { TimelineVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/TimelineEditors");

  const onChangeSpy = vi.fn();
  let latestValue: TimelineData = {
    steps: [
      {
        id: "alpha",
        title: "Discover",
        description: "Existing intro",
        status: "current",
      },
      { id: "beta", title: "Plan" },
      { id: "gamma", title: "Ship" },
    ],
    style: {
      lineColor: "bad-token",
      titleColor: "#123123",
      descriptionColor: "still-bad",
    },
    background: {
      color: "transparent",
    },
  };
  let currentVariant = "milestones";

  const Harness = () => {
    const [value, setValue] = useState<TimelineData>(latestValue);
    const [variant, setVariant] = useState(currentVariant);

    return (
      <TimelineVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          currentVariant = next;
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);
  await flushAsyncEffects();

  try {
    expect(
      findSectionByTitle(view.container, "Variant and timeline structure")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("timeline.mode-layout");
    expect(
      findSectionByTitle(view.container, "Steps content and order")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("timeline.items-dates");
    expect(
      findSectionByTitle(view.container, "Guides and axis line")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("timeline.axis-markers");
    expect(
      findSectionByTitle(view.container, "Markers and accents")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("timeline.markers-accents");
    expect(
      findSectionByTitle(view.container, "Colors and background")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("timeline.colors");
    expect(
      findSectionByTitle(view.container, "Typography and spacing")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("timeline.typography-spacing");
    clickButtonByText(view.container, "Alternating");
    expect(latestValue.mode).toBe("alternating");
    expect(currentVariant).toBe("cards");
    expect(view.container.textContent).toContain("prefers the cards visual variant");

    const contentSection = findSectionByTitle(view.container, "Steps content and order");
    const markersSection = findSectionByTitle(view.container, "Markers and accents");
    const typographySection = findSectionByTitle(view.container, "Typography and spacing");

    const dateInputs = findInputsByPlaceholder(contentSection as ParentNode, "2026-05-11");
    setInputValue(dateInputs[0], "Q3 launch");
    expect(contentSection?.textContent).toContain("Use YYYY-MM-DD here or move prose");

    const statusSelects = findSelectsByOptions(contentSection as ParentNode, [
      "__none__",
      "upcoming",
      "current",
      "complete",
    ]);
    setSelectValue(statusSelects[0], "__none__");
    expect(latestValue.steps.find((step) => step.id === "alpha")?.status).toBeUndefined();

    const getStepCards = () => contentSection?.querySelectorAll(".space-y-3.rounded-lg.border.p-3");
    const getStepCard = (index: number) => getStepCards()?.[index] as ParentNode;

    setInputValue(findInputByPlaceholder(getStepCard(0), "Step CTA label"), "Read details");
    await Promise.resolve();
    setSelectValue(
      findLinkDestinationSelect(getStepCard(0), "timeline-step-1-cta-destination"),
      "timeline-cta-page"
    );
    await Promise.resolve();
    setInputValue(
      findInputByPlaceholder(getStepCard(0), "Whole-step link label"),
      "Open discovery"
    );
    await Promise.resolve();
    setSelectValue(
      findLinkDestinationSelect(getStepCard(0), "timeline-step-1-link-destination"),
      "timeline-link-page"
    );
    await Promise.resolve();
    expect(view.container.textContent).toContain(
      "Whole-step links are disabled when a CTA link is configured"
    );
    expect(findInputsByPlaceholder(getStepCard(0), "/timeline-step")).toHaveLength(0);
    expect(view.container.textContent).not.toContain("Use a relative path, hash, or full URL");

    const dragHandle = view.container.querySelector('[aria-label="Drag step 1"]');
    const stepCards = getStepCards();
    const dataTransfer = dispatchDragEvent(dragHandle as Element, "dragstart");
    dispatchDragEvent(stepCards?.[1] as Element, "dragover", dataTransfer);
    dispatchDragEvent(stepCards?.[1] as Element, "drop", dataTransfer);
    expect(latestValue.steps.map((step) => step.title)).toEqual(["Plan", "Discover", "Ship"]);

    setSelectValue(
      findSelectByOptions(markersSection as ParentNode, ["dot", "number", "icon"]),
      "icon"
    );
    setInputValue(
      findInputByPlaceholder(markersSection as ParentNode, "Marker icon or emoji"),
      "rocket"
    );
    expect(markersSection?.textContent).toContain("Accent fallback");

    setInputValue(
      findInputByPlaceholder(typographySection as ParentNode, "Timeline heading"),
      "Roadmap"
    );
    setSelectValue(
      findSelectByOptions(typographySection as ParentNode, ["none", "sm", "base", "lg", "xl"]),
      "none"
    );
    expect(typographySection?.textContent).toContain("Step titles are currently hidden");
    setSelectValue(
      findSelectByOptions(typographySection as ParentNode, [
        "normal",
        "medium",
        "semibold",
        "bold",
      ]),
      "bold"
    );
    setSelectValue(
      findSelectByOptions(typographySection as ParentNode, ["none", "sm", "md", "lg", "xl"]),
      "xl"
    );
    setSelectValue(
      findSelectByOptions(typographySection as ParentNode, [
        "none",
        "4xl",
        "5xl",
        "6xl",
        "7xl",
        "full",
      ]),
      "7xl"
    );
    expect(typographySection?.textContent).toContain("36px gap");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.style).toEqual(
      expect.objectContaining({
        markerDisplay: "icon",
        titleWeight: "bold",
      })
    );
    expect(latestValue.layout).toEqual(expect.objectContaining({ spacing: "xl", maxWidth: "7xl" }));
    expect(latestValue.header).toEqual(expect.objectContaining({ title: "Roadmap" }));
    expect(latestValue.steps.find((step) => step.id === "alpha")?.cta).toEqual(
      expect.objectContaining({ label: "Read details", href: "/timeline-cta" })
    );
    expect(latestValue.steps.find((step) => step.id === "alpha")?.link).toEqual(
      expect.objectContaining({ href: "/timeline-link", label: "Open discovery" })
    );
  } finally {
    view.cleanup();
  }
});

test("Timeline visual warns when configured marker and text colors collapse into unreadable contrast", async () => {
  const { TimelineVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/TimelineEditors");

  const view = mount(
    <TimelineVisualEditor
      value={{
        steps: [
          { id: "alpha", title: "Discover" },
          { id: "beta", title: "Plan" },
          { id: "gamma", title: "Deliver" },
        ],
        style: {
          markerColor: "#ffffff",
          titleColor: "#ffffff",
          descriptionColor: "#ffffff",
        },
        background: {
          color: "#ffffff",
        },
      }}
      onChange={() => undefined}
      variant="milestones"
      onVariantChange={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Marker contrast advisory");
    expect(view.container.textContent).toContain("Text contrast advisory");
    expect(view.container.textContent).toContain("Configured colors may be hard to read together");
  } finally {
    view.cleanup();
  }
});

test("Timeline advanced editor keeps diagnostics read-only with truthful normalization summary", async () => {
  const { TimelineAdvancedEditor } =
    await import("../../../core/admin/ui/widgets/editors/TimelineEditors");

  const onChangeSpy = vi.fn();
  let latestValue: TimelineData = {
    steps: [
      { id: " ", title: " " },
      { id: "custom", title: "Plan" },
      { id: "custom", title: " " },
      { id: " ", title: "Review" },
      { id: "custom", title: "Ship" },
      { id: "", title: "" },
      { id: "step-7", title: "Scale" },
      { id: "step-7", title: " " },
      { id: "", title: "Ignored after clamp" },
    ],
    guides: {
      enabled: false,
    },
  };

  const Harness = () => {
    const [value, setValue] = useState<TimelineData>(latestValue);

    return (
      <>
        <button
          type="button"
          onClick={() => {
            latestValue = {
              ...latestValue,
              header: {
                title: "External update",
              },
            };
            setValue(latestValue);
          }}
        >
          External update
        </button>
        <TimelineAdvancedEditor
          value={value}
          onChange={(next) => {
            latestValue = next;
            onChangeSpy(next);
            setValue(next);
          }}
          variant="milestones"
          onVariantChange={() => undefined}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain(
      "Advanced mode is read-only. Use Visual for public-facing timeline steps, layout, guides, markers, colors, background, and typography changes."
    );
    expect(view.container.textContent).toContain("Current steps: 8.");
    expect(findSelectByOptions(view.container, ["3", "4", "5", "6", "7", "8"])).toBeUndefined();
    expect(view.container.textContent).toContain("Runtime summary");
    expect(view.container.textContent).toContain("Layout diagnostics");
    expect(view.container.textContent).toContain("Read-only layout, guide, and style state");
    expect(
      findSectionByTitle(view.container, "Runtime summary")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("timeline.runtime-summary");
    expect(
      findSectionByTitle(view.container, "Layout diagnostics")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("timeline.layout-diagnostics");
    expect(
      findSectionByTitle(view.container, "Data normalization")?.getAttribute(
        "data-widget-editor-section"
      )
    ).toBe("timeline.data-normalization");
    expect(view.container.textContent).toContain("Inherited / transparent");
    expect(view.container.querySelectorAll("select")).toHaveLength(0);
    expect(view.container.textContent).toContain("Normalization scope");
    expect(view.container.textContent).toContain("Wizard owns");
    expect(view.container.textContent).toContain("Visual owns");
    expect(view.container.textContent).toContain("Advanced owns");
    expect(view.container.querySelectorAll("button")).toHaveLength(1);
    clickButtonByText(view.container, "External update");
    expect(onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});
