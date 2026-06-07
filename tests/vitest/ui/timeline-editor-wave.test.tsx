// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import {
  TimelineAdvancedEditor,
  TimelineVisualEditor,
  TimelineWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TimelineEditors";
import { timelineDefaults, type TimelineData } from "../../../core/widgets/core/timeline";

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
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    [key: string]: unknown;
  }) => <textarea value={value} onChange={onChange} placeholder={placeholder} {...props} />,
}));

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

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
      <option value={value}>{children}</option>
    ),
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <>{placeholder ?? null}</>,
  };
});

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => []),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

// Render the dialog content inline so the full icon browser is queryable in tests.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScrollBar: () => null,
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
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) throw new Error("missing select");
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) throw new Error("missing input");
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickElement = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLElement)) throw new Error("missing clickable");
  React.act(() => element.click());
};

const controlRow = (container: ParentNode, id: string) =>
  container.querySelector(`[data-widget-control="${id}"]`);

function VisualHarness({
  initialVariant,
  onData,
  onVariant,
}: {
  initialVariant: string;
  onData: (next: TimelineData) => void;
  onVariant?: (next: string) => void;
}) {
  const [value, setValue] = useState<TimelineData>(timelineDefaults);
  const [variant, setVariant] = useState(initialVariant);
  return (
    <TimelineVisualEditor
      value={value}
      variant={variant}
      onChange={(next) => {
        setValue(next);
        onData(next);
      }}
      onVariantChange={(next) => {
        setVariant(next);
        onVariant?.(next);
      }}
    />
  );
}

test("visual editor renders the four preset sections and gates a vertical preset", () => {
  const onData = vi.fn();
  const { container, cleanup } = mount(
    <VisualHarness initialVariant="vertical-right" onData={onData} />
  );

  expect(
    container.querySelector('[data-widget-editor-section="timeline.visual.preset-structure"]')
  ).toBeTruthy();
  expect(
    container.querySelector('[data-widget-editor-section="timeline.visual.step-content"]')
  ).toBeTruthy();
  expect(
    container.querySelector('[data-widget-editor-section="timeline.visual.dots-connector"]')
  ).toBeTruthy();
  expect(
    container.querySelector('[data-widget-editor-section="timeline.visual.appearance"]')
  ).toBeTruthy();

  expect(controlRow(container, "timeline.visual.axis-position")).toBeNull();
  expect(controlRow(container, "timeline.visual.step.0.opposite-content")).toBeNull();
  expect(controlRow(container, "timeline.visual.connector-show")).toBeTruthy();

  cleanup();
});

test("alternating-opposite preset surfaces axis position and opposite content controls", () => {
  const onData = vi.fn();
  const { container, cleanup } = mount(
    <VisualHarness initialVariant="alternating-opposite" onData={onData} />
  );

  expect(controlRow(container, "timeline.visual.axis-position")).toBeTruthy();
  expect(controlRow(container, "timeline.visual.step.0.opposite-content")).toBeTruthy();

  cleanup();
});

test("compact preset hides axis position and opposite content", () => {
  const onData = vi.fn();
  const { container, cleanup } = mount(<VisualHarness initialVariant="compact" onData={onData} />);

  expect(controlRow(container, "timeline.visual.axis-position")).toBeNull();
  expect(controlRow(container, "timeline.visual.step.0.opposite-content")).toBeNull();

  cleanup();
});

test("picking a preset card changes the active variant", () => {
  const onData = vi.fn();
  const onVariant = vi.fn();
  const { container, cleanup } = mount(
    <VisualHarness initialVariant="vertical-right" onData={onData} onVariant={onVariant} />
  );

  clickElement(container.querySelector('[data-timeline-preset-card="alternating-opposite"]'));
  expect(onVariant).toHaveBeenCalledWith("alternating-opposite");
  // After re-render the gated controls now appear.
  expect(controlRow(container, "timeline.visual.axis-position")).toBeTruthy();

  cleanup();
});

test("changing the global dot tone updates the data", () => {
  const onData = vi.fn();
  const { container, cleanup } = mount(
    <VisualHarness initialVariant="vertical-right" onData={onData} />
  );

  const toneSelect = controlRow(container, "timeline.visual.dot-tone")?.querySelector("select");
  setSelectValue(toneSelect, "secondary");

  const last = onData.mock.calls.at(-1)?.[0] as TimelineData;
  expect(last.dot?.tone).toBe("secondary");

  cleanup();
});

test("editing a step title updates the data", () => {
  const onData = vi.fn();
  const { container, cleanup } = mount(
    <VisualHarness initialVariant="vertical-right" onData={onData} />
  );

  const titleInput = controlRow(container, "timeline.visual.step.0.title")?.querySelector("input");
  setInputValue(titleInput, "Kickoff");

  const last = onData.mock.calls.at(-1)?.[0] as TimelineData;
  expect(last.steps[0]?.title).toBe("Kickoff");

  cleanup();
});

test("adding a step increases the step count", () => {
  const onData = vi.fn();
  const { container, cleanup } = mount(
    <VisualHarness initialVariant="vertical-right" onData={onData} />
  );

  clickElement(controlRow(container, "timeline.visual.step.add"));
  const last = onData.mock.calls.at(-1)?.[0] as TimelineData;
  expect(last.steps).toHaveLength(timelineDefaults.steps.length + 1);

  cleanup();
});

test("toggling the connector switch updates connector visibility", () => {
  const onData = vi.fn();
  const { container, cleanup } = mount(
    <VisualHarness initialVariant="vertical-right" onData={onData} />
  );

  const toggle = controlRow(container, "timeline.visual.connector-show")?.querySelector(
    'input[type="checkbox"]'
  );
  clickElement(toggle);

  const last = onData.mock.calls.at(-1)?.[0] as TimelineData;
  expect(last.connector?.show).toBe(false);

  cleanup();
});

test("dot icon picker offers lucide options and updates the data", () => {
  const onData = vi.fn();
  const { container, cleanup } = mount(
    <VisualHarness initialVariant="vertical-right" onData={onData} />
  );

  const option = container.querySelector(
    '[data-widget-control="timeline.visual.dot-icon"] [data-timeline-dot-icon-option="rocket"]'
  );
  expect(option).toBeTruthy();
  clickElement(option);

  const last = onData.mock.calls.at(-1)?.[0] as TimelineData;
  expect(last.dot?.icon).toBe("rocket");

  cleanup();
});

test("dot icon browser exposes the full lucide library beyond the quick picks", () => {
  const onData = vi.fn();
  const { container, cleanup } = mount(
    <VisualHarness initialVariant="vertical-right" onData={onData} />
  );

  const dotIconControl = container.querySelector(
    '[data-widget-control="timeline.visual.dot-icon"]'
  );
  expect(dotIconControl?.querySelector('[data-timeline-dot-icon-browse="true"]')).toBeTruthy();

  // An icon outside the 16 quick picks is selectable from the full browser.
  const pick = dotIconControl?.querySelector('[data-timeline-dot-icon-pick="activity"]');
  expect(pick).toBeTruthy();
  clickElement(pick);

  const last = onData.mock.calls.at(-1)?.[0] as TimelineData;
  expect(last.dot?.icon).toBe("activity");

  cleanup();
});

test("wizard preset gallery is interactive and changes the variant", () => {
  const onVariant = vi.fn();
  function WizardHarness() {
    const [variant, setVariant] = useState("vertical-right");
    return (
      <TimelineWizardEditor
        value={timelineDefaults}
        onChange={() => undefined}
        variant={variant}
        onVariantChange={(next) => {
          setVariant(next);
          onVariant(next);
        }}
      />
    );
  }

  const { container, cleanup } = mount(<WizardHarness />);
  expect(
    container.querySelector('[data-widget-editor-section="timeline.setup.gallery"]')
  ).toBeTruthy();
  expect(container.textContent).toContain("Choose a timeline preset");

  const card = container.querySelector('[data-timeline-preset-card="cards"]');
  expect(card).toBeTruthy();
  clickElement(card);
  expect(onVariant).toHaveBeenCalledWith("cards");

  cleanup();
});

test("advanced editor renders read-only diagnostics sections", () => {
  const { container, cleanup } = mount(
    <TimelineAdvancedEditor
      value={timelineDefaults}
      onChange={() => undefined}
      variant="vertical-right"
      onVariantChange={() => undefined}
    />
  );

  expect(
    container.querySelector('[data-widget-editor-section="timeline.advanced.runtime"]')
  ).toBeTruthy();
  expect(
    container.querySelector('[data-widget-editor-section="timeline.advanced.appearance"]')
  ).toBeTruthy();
  expect(
    container.querySelector('[data-widget-editor-section="timeline.advanced.normalization"]')
  ).toBeTruthy();
  expect(container.querySelector('[data-widget-control-ownership="readonly"]')).toBeTruthy();
  expect(container.textContent).toContain("Advanced mode is read-only.");

  cleanup();
});
