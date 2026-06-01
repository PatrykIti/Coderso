// @vitest-environment happy-dom

import React from "react";
import type { ComponentType } from "react";

import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { VisualPanel } from "../../../core/admin/ui/pages/builder/VisualPanel";
import {
  CompareTimelineAdvancedEditor,
  CompareTimelineVisualEditor,
  CompareTimelineWizardEditor,
} from "../../../core/admin/ui/widgets/editors/CompareTimelineEditors";
import {
  NavigationAdvancedEditor,
  NavigationVisualEditor,
  NavigationWizardEditor,
} from "../../../core/admin/ui/widgets/editors/NavigationEditors";
import {
  NewsletterAdvancedEditor,
  NewsletterVisualEditor,
  NewsletterWizardEditor,
} from "../../../core/admin/ui/widgets/editors/NewsletterEditors";
import {
  TimelineAdvancedEditor,
  TimelineVisualEditor,
  TimelineWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TimelineEditors";
import type { Block } from "../../../core/admin/ui/pages/builder/types";
import {
  compareTimelineDefaults,
  createCompareTimelineWidget,
} from "../../../core/widgets/core/compareTimeline";
import { createFooterWidget, footerDefaults } from "../../../core/widgets/core/footer";
import { contactDefaults, createContactWidget } from "../../../core/widgets/core/contact";
import { createNavigationWidget, navigationDefaults } from "../../../core/widgets/core/navigation";
import { createNewsletterWidget, newsletterDefaults } from "../../../core/widgets/core/newsletter";
import { createTimelineWidget, timelineDefaults } from "../../../core/widgets/core/timeline";
import type { WidgetDefinition, WidgetEditorProps } from "../../../core/widgets/types";

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <button
      type="button"
      data-switch-checked={String(Boolean(checked))}
      onClick={() => onCheckedChange?.(!checked)}
    >
      switch
    </button>
  ),
}));

const StubVisual: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => (
  <div>Hero visual editor body</div>
);
const StubEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => null;

const asEditor = <T,>() => StubEditor as unknown as ComponentType<WidgetEditorProps<T>>;

const asVisualPanelWidget = <T,>(widget: WidgetDefinition<T>) =>
  widget as unknown as WidgetDefinition;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const baseBlock: Block = {
  id: "hero-1",
  type: "hero",
  variant: "centered",
  data: { headline: "Headline" },
  editor: {
    mode: "visual",
    wizardCompleted: true,
  },
};

function createWidget(capabilities?: WidgetDefinition["editorCapabilities"]): WidgetDefinition {
  return {
    type: "hero",
    title: "Hero",
    category: "layout",
    variants: [
      { id: "centered", label: "Centered" },
      { id: "split", label: "Split" },
    ],
    schema: {},
    defaults: {},
    editor: {
      wizard: StubEditor,
      visual: StubVisual,
      advanced: StubEditor,
    },
    editorCapabilities: capabilities,
    render: () => null,
  };
}

function mount(node: React.ReactNode) {
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
}

afterEach(() => {
  document.body.innerHTML = "";
});

test("VisualPanel keeps generic variant controls by default", () => {
  const html = renderAdminUi(
    <VisualPanel widget={createWidget()} block={baseBlock} onChange={() => undefined} />
  );

  expect(html).toContain('data-widget-editor="hero"');
  expect(html).toContain('data-widget-editor-mode="visual"');
  expect(html).toContain("Choose a visual style for this widget.");
  expect(html).toContain("Add variant preset");
  expect(html).toContain("Hero visual editor body");
});

test("VisualPanel hides generic variant controls when widget owns visual variants", () => {
  const html = renderAdminUi(
    <VisualPanel
      widget={createWidget({ visualOwnsVariantSelection: true })}
      block={baseBlock}
      onChange={() => undefined}
    />
  );

  expect(html).not.toContain("Choose a visual style for this widget.");
  expect(html).toContain("Hero visual editor body");
});

test("VisualPanel renders slot controls inside a named structure section", () => {
  const html = renderAdminUi(
    <VisualPanel
      widget={createWidget({ visualOwnsVariantSelection: true })}
      block={baseBlock}
      onChange={() => undefined}
      slotControls={{
        sectionId: "hero.structure",
        title: "Structure",
        description: "Manage slots in the visual flow.",
        addActions: [],
        items: [
          {
            id: "hero.slot.content",
            label: "Hero Content slot",
            count: 0,
            empty: true,
            canRemove: false,
            canMoveUp: false,
            canMoveDown: false,
          },
        ],
        childrenHint: "Use the slot add action in the canvas or drag from the widgets tab.",
      }}
    />
  );

  expect(html).toContain('data-widget-editor-section="hero.structure"');
  expect(html).toContain('data-widget-control="hero.slot.content"');
  expect(html).toContain('data-widget-control-ownership="action"');
  expect(html).toContain("Hero Content slot");
  expect(html).toContain("Manage slots in the visual flow.");
});

test("VisualPanel renders repeatable slot move controls with disabled boundaries", () => {
  const html = renderAdminUi(
    <VisualPanel
      widget={createWidget({ visualOwnsVariantSelection: true })}
      block={baseBlock}
      onChange={() => undefined}
      slotControls={{
        sectionId: "tabs.structure",
        title: "Structure",
        addActions: [
          {
            id: "add-panel",
            label: "Add Panel",
            path: "slots.panel",
            ownership: "action",
            disabled: false,
            onClick: () => undefined,
          },
        ],
        items: [
          {
            id: "tabs.slot.panel:1",
            label: "Panel 1 slot",
            path: "slots.panel",
            ownership: "action",
            count: 1,
            empty: false,
            canRemove: true,
            canMoveUp: false,
            canMoveDown: true,
            onMoveUp: () => undefined,
            onMoveDown: () => undefined,
            onRemove: () => undefined,
          },
        ],
      }}
    />
  );

  expect(html).toContain('data-widget-control="add-panel"');
  expect(html).toContain('data-widget-control-path="slots.panel"');
  expect(html).toContain('data-widget-control="tabs.slot.panel:1"');
  expect(html).toContain('data-widget-control="tabs.slot.panel:1.move-up"');
  expect(html).toContain('data-widget-control="tabs.slot.panel:1.move-down"');
  expect(html).toContain('data-widget-control="tabs.slot.panel:1.remove"');
  expect(html).toContain("Move up");
  expect(html).toContain("Move down");
  expect(html).toContain("Remove");
  expect(html).toContain("disabled");
});

test("VisualPanel forwards section region label edits through slot controls", () => {
  const onLabelChange = vi.fn();
  const view = mount(
    <VisualPanel
      widget={createWidget({ visualOwnsVariantSelection: true })}
      block={baseBlock}
      onChange={() => undefined}
      slotControls={{
        sectionId: "section.structure",
        title: "Structure",
        addActions: [],
        items: [
          {
            id: "section.slot.region-1",
            label: "Primary hero slot",
            labelValue: "Primary hero",
            labelPlaceholder: "Region 1",
            count: 0,
            empty: true,
            canRemove: false,
            canMoveUp: false,
            canMoveDown: false,
            onLabelChange,
          },
        ],
      }}
    />
  );

  try {
    expect(view.container.textContent).toContain("Region label");
    const input = view.container.querySelector(
      'input[placeholder="Region 1"]'
    ) as HTMLInputElement | null;
    expect(input?.value).toBe("Primary hero");

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    React.act(() => {
      if (!input) {
        throw new Error("Missing region label input");
      }
      valueSetter?.call(input, "Supporting proof");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onLabelChange).toHaveBeenCalledWith("Supporting proof");
  } finally {
    view.cleanup();
  }
});

test("VisualPanel uses navigation editor variant controls", () => {
  const widget = createNavigationWidget({
    wizard: NavigationWizardEditor,
    visual: NavigationVisualEditor,
    advanced: NavigationAdvancedEditor,
  });
  const block: Block = {
    id: "nav-1",
    type: "navigation",
    variant: "simple",
    data: navigationDefaults,
    editor: {
      mode: "visual",
      wizardCompleted: true,
    },
  };

  const html = renderAdminUi(
    <VisualPanel widget={asVisualPanelWidget(widget)} block={block} onChange={() => undefined} />
  );

  expect(html).not.toContain("Choose a visual style for this widget.");
  expect(html).toContain("Variant and Structure");
  expect(html).toContain("Navigation Links");
});

test("VisualPanel uses footer editor variant controls", () => {
  const widget = createFooterWidget({
    wizard: asEditor<typeof footerDefaults>(),
    visual: asEditor<typeof footerDefaults>(),
    advanced: asEditor<typeof footerDefaults>(),
  });
  const block: Block = {
    id: "footer-1",
    type: "footer",
    variant: "columns-2",
    data: footerDefaults,
    editor: {
      mode: "visual",
      wizardCompleted: true,
    },
  };

  const html = renderAdminUi(
    <VisualPanel widget={asVisualPanelWidget(widget)} block={block} onChange={() => undefined} />
  );

  expect(html).not.toContain("Choose a visual style for this widget.");
});

test("VisualPanel uses timeline editor variant controls", () => {
  const widget = createTimelineWidget({
    wizard: TimelineWizardEditor,
    visual: TimelineVisualEditor,
    advanced: TimelineAdvancedEditor,
  });
  const block: Block = {
    id: "timeline-1",
    type: "timeline",
    variant: "milestones",
    data: timelineDefaults,
    editor: {
      mode: "visual",
      wizardCompleted: true,
    },
  };

  const html = renderAdminUi(
    <VisualPanel widget={asVisualPanelWidget(widget)} block={block} onChange={() => undefined} />
  );

  expect(html).not.toContain("Choose a visual style for this widget.");
  expect(html).toContain("Variant and timeline structure");
});

test("VisualPanel uses compare timeline editor variant controls", () => {
  const widget = createCompareTimelineWidget({
    wizard: CompareTimelineWizardEditor,
    visual: CompareTimelineVisualEditor,
    advanced: CompareTimelineAdvancedEditor,
  });
  const block: Block = {
    id: "compare-1",
    type: "compare-timeline",
    variant: "dual-track-highlight",
    data: compareTimelineDefaults,
    editor: {
      mode: "visual",
      wizardCompleted: true,
    },
  };

  const html = renderAdminUi(
    <VisualPanel widget={asVisualPanelWidget(widget)} block={block} onChange={() => undefined} />
  );

  expect(html).not.toContain("Choose a visual style for this widget.");
  expect(html).toContain("Variant and compare structure");
});

test("VisualPanel uses newsletter editor variant controls", () => {
  const widget = createNewsletterWidget({
    wizard: NewsletterWizardEditor,
    visual: NewsletterVisualEditor,
    advanced: NewsletterAdvancedEditor,
  });
  const block: Block = {
    id: "newsletter-1",
    type: "newsletter",
    variant: "inline",
    data: newsletterDefaults,
    editor: {
      mode: "visual",
      wizardCompleted: true,
    },
  };

  const html = renderAdminUi(
    <VisualPanel widget={asVisualPanelWidget(widget)} block={block} onChange={() => undefined} />
  );

  expect(html).not.toContain("Choose a visual style for this widget.");
  expect(html).toContain("Variant and form structure");
});

test("VisualPanel uses contact editor variant controls", () => {
  const widget = createContactWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const block: Block = {
    id: "contact-1",
    type: "contact",
    variant: "form-left",
    data: contactDefaults,
    editor: {
      mode: "visual",
      wizardCompleted: true,
    },
  };

  const html = renderAdminUi(
    <VisualPanel widget={asVisualPanelWidget(widget)} block={block} onChange={() => undefined} />
  );

  expect(html).not.toContain("Choose a visual style for this widget.");
});

test("VisualPanel falls back to the first widget variant and renders described options", () => {
  const captureVariant = vi.fn();
  const InspectEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = ({
    variant,
  }) => {
    captureVariant(variant);
    return <div>Inspect visual editor</div>;
  };

  const widget: WidgetDefinition = {
    ...createWidget(),
    variants: [
      { id: "stacked", label: "Stacked", description: "Primary hero layout" },
      { id: "minimal", label: "Minimal" },
    ],
    editor: {
      wizard: StubEditor,
      visual: InspectEditor,
      advanced: StubEditor,
    },
  };

  const html = renderAdminUi(
    <VisualPanel
      widget={asVisualPanelWidget(widget)}
      block={{ ...baseBlock, variant: undefined } as Block}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Primary hero layout");
  expect(html).toContain("Inspect visual editor");
  expect(captureVariant).toHaveBeenCalledWith("stacked");
});

test("VisualPanel forwards generic variant clicks and visual editor callbacks", () => {
  const onChange = vi.fn();
  const InteractiveEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = ({
    value,
    variant,
    onChange: onValueChange,
    onVariantChange,
  }) => (
    <div>
      <p data-current-variant={variant}>{String(value.headline)}</p>
      <button type="button" onClick={() => onValueChange({ headline: "Updated headline" })}>
        Editor update data
      </button>
      <button type="button" onClick={() => onVariantChange?.("split")}>
        Editor update variant
      </button>
    </div>
  );

  const widget: WidgetDefinition = {
    ...createWidget(),
    variants: [
      { id: "centered", label: "Centered", description: "Primary hero layout" },
      { id: "split", label: "Split" },
    ],
    editor: {
      wizard: StubEditor,
      visual: InteractiveEditor,
      advanced: StubEditor,
    },
  };

  const { container, cleanup } = mount(
    <VisualPanel widget={asVisualPanelWidget(widget)} block={baseBlock} onChange={onChange} />
  );

  const splitVariantButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Split")
  );
  const dataButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Editor update data")
  );
  const variantButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Editor update variant")
  );

  if (!(splitVariantButton instanceof HTMLButtonElement)) {
    throw new Error("Missing split variant button");
  }
  if (!(dataButton instanceof HTMLButtonElement)) {
    throw new Error("Missing editor data button");
  }
  if (!(variantButton instanceof HTMLButtonElement)) {
    throw new Error("Missing editor variant button");
  }

  React.act(() => {
    splitVariantButton.click();
  });
  expect(onChange).toHaveBeenLastCalledWith({ ...baseBlock, variant: "split" });

  onChange.mockClear();
  React.act(() => {
    dataButton.click();
  });
  expect(onChange).toHaveBeenCalledWith({
    ...baseBlock,
    data: { headline: "Updated headline" },
  });

  onChange.mockClear();
  React.act(() => {
    variantButton.click();
  });
  expect(onChange).toHaveBeenCalledWith({ ...baseBlock, variant: "split" });

  cleanup();
});

test("VisualPanel owns shared block layout and device visibility controls", () => {
  const onChange = vi.fn();
  const block: Block = {
    ...baseBlock,
    layout: {
      container: "default",
      padding: { top: "xl", bottom: "md" },
      margin: { top: "none", bottom: "none" },
      background: { color: "transparent", image: null },
    },
    visibility: {
      enabled: true,
      devices: ["desktop", "mobile"],
    },
  };

  const { container, cleanup } = mount(
    <VisualPanel widget={asVisualPanelWidget(createWidget())} block={block} onChange={onChange} />
  );

  try {
    expect(container.textContent).toContain("Block layout");
    expect(container.textContent).toContain("Device visibility");
    const writablePaths = Array.from(container.querySelectorAll("[data-widget-control-path]"))
      .filter((element) => element.getAttribute("data-widget-control-readonly") !== "true")
      .map((element) => element.getAttribute("data-widget-control-path"));
    expect(writablePaths).toEqual(
      expect.arrayContaining([
        "layout.container",
        "layout.padding.top",
        "layout.padding.bottom",
        "layout.margin.top",
        "layout.margin.bottom",
        "visibility.devices.desktop",
        "visibility.devices.tablet",
        "visibility.devices.mobile",
      ])
    );

    const switches = Array.from(container.querySelectorAll("button[data-switch-checked]"));
    React.act(() => {
      switches[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith({
      ...block,
      visibility: {
        enabled: true,
        devices: ["desktop", "mobile", "tablet"],
      },
    });
  } finally {
    cleanup();
  }
});
