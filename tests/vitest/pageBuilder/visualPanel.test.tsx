import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
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
import {
  createFooterWidget,
  footerDefaults,
} from "../../../core/widgets/core/footer";
import {
  contactDefaults,
  createContactWidget,
} from "../../../core/widgets/core/contact";
import {
  createNavigationWidget,
  navigationDefaults,
} from "../../../core/widgets/core/navigation";
import {
  createNewsletterWidget,
  newsletterDefaults,
} from "../../../core/widgets/core/newsletter";
import {
  createTimelineWidget,
  timelineDefaults,
} from "../../../core/widgets/core/timeline";
import type {
  WidgetDefinition,
  WidgetEditorProps,
} from "../../../core/widgets/types";

const StubVisual: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => (
  <div>Hero visual editor body</div>
);
const StubEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => null;

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

function createWidget(
  capabilities?: WidgetDefinition["editorCapabilities"]
): WidgetDefinition {
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

test("VisualPanel keeps generic variant controls by default", () => {
  const html = renderAdminUi(
    <VisualPanel
      widget={createWidget()}
      block={baseBlock}
      onChange={() => undefined}
    />
  );

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
    <VisualPanel
      widget={widget}
      block={block}
      onChange={() => undefined}
    />
  );

  expect(html).not.toContain("Choose a visual style for this widget.");
  expect(html).toContain("Variant and Structure");
  expect(html).toContain("Navigation Links");
});

test("VisualPanel uses footer editor variant controls", () => {
  const widget = createFooterWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
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
    <VisualPanel
      widget={widget}
      block={block}
      onChange={() => undefined}
    />
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
    <VisualPanel
      widget={widget}
      block={block}
      onChange={() => undefined}
    />
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
    <VisualPanel
      widget={widget}
      block={block}
      onChange={() => undefined}
    />
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
    <VisualPanel
      widget={widget}
      block={block}
      onChange={() => undefined}
    />
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
    <VisualPanel
      widget={widget}
      block={block}
      onChange={() => undefined}
    />
  );

  expect(html).not.toContain("Choose a visual style for this widget.");
});
