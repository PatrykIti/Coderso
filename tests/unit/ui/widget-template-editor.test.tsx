import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import {
  CompareTimelineAdvancedEditor,
  CompareTimelineVisualEditor,
  CompareTimelineWizardEditor,
} from "../../../core/admin/ui/widgets/editors/CompareTimelineEditors";
import {
  ContactAdvancedEditor,
  ContactVisualEditor,
  ContactWizardEditor,
} from "../../../core/admin/ui/widgets/editors/ContactEditors";
import {
  FeatureGridAdvancedEditor,
  FeatureGridVisualEditor,
  FeatureGridWizardEditor,
} from "../../../core/admin/ui/widgets/editors/FeatureGridEditors";
import {
  FooterAdvancedEditor,
  FooterVisualEditor,
  FooterWizardEditor,
} from "../../../core/admin/ui/widgets/editors/FooterEditors";
import {
  TestimonialsAdvancedEditor,
  TestimonialsVisualEditor,
  TestimonialsWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TestimonialsEditors";
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
  PricingPlansAdvancedEditor,
  PricingPlansVisualEditor,
  PricingPlansWizardEditor,
} from "../../../core/admin/ui/widgets/editors/PricingPlansEditors";
import {
  TimelineAdvancedEditor,
  TimelineVisualEditor,
  TimelineWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TimelineEditors";
import { WidgetTemplateEditorPage } from "../../../core/admin/ui/widgets/WidgetTemplateEditorPage";
import {
  compareTimelineDefaults,
  createCompareTimelineWidget,
} from "../../../core/widgets/core/compareTimeline";
import {
  contactDefaults,
  createContactWidget,
} from "../../../core/widgets/core/contact";
import {
  createFeatureGridWidget,
  featureGridDefaults,
} from "../../../core/widgets/core/featureGrid";
import {
  createFooterWidget,
  footerDefaults,
} from "../../../core/widgets/core/footer";
import {
  createNavigationWidget,
  navigationDefaults,
} from "../../../core/widgets/core/navigation";
import {
  createNewsletterWidget,
  newsletterDefaults,
} from "../../../core/widgets/core/newsletter";
import {
  createPricingPlansWidget,
  pricingPlansDefaults,
} from "../../../core/widgets/core/pricingPlans";
import {
  createTestimonialsWidget,
  testimonialsDefaults,
} from "../../../core/widgets/core/testimonials";
import {
  createTimelineWidget,
  timelineDefaults,
} from "../../../core/widgets/core/timeline";

test("WidgetTemplateEditorPage renders canvas placeholder", () => {
  const html = renderToString(<WidgetTemplateEditorPage />);

  expect(html).toContain("Build your template");
  expect(html).toContain("Save Template");
  expect(html).toContain("Runtime Preview");
  expect(html).toContain("Template Details");
  expect(html).toMatch(
    /<div(?=[^>]*data-slot="card")(?=[^>]*class="[^"]*border-b border-border bg-card px-6 py-4)[^>]*>/
  );
  expect(html).toMatch(
    /<aside(?=[^>]*data-slot="card")(?=[^>]*class="[^"]*hidden w-72 min-h-0 flex-col border-r border-border bg-card lg:flex)[^>]*>/
  );
  expect(html).toMatch(
    /<aside(?=[^>]*data-slot="card")(?=[^>]*class="[^"]*hidden w-80 min-h-0 flex-col border-l border-border bg-card lg:flex)[^>]*>/
  );
});

test("widget template block settings render navigation visual sections", () => {
  const widget = createNavigationWidget({
    wizard: NavigationWizardEditor,
    visual: NavigationVisualEditor,
    advanced: NavigationAdvancedEditor,
  });

  const html = renderToString(
    <BlockSettings
      widget={widget}
      block={{
        id: "nav-1",
        type: "navigation",
        variant: "split",
        data: navigationDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and Structure");
  expect(html).toContain("Navigation Links");
  expect(html).toContain("CTA and Right Actions");
});

test("widget template block settings render footer visual sections", () => {
  const widget = createFooterWidget({
    wizard: FooterWizardEditor,
    visual: FooterVisualEditor,
    advanced: FooterAdvancedEditor,
  });

  const html = renderToString(
    <BlockSettings
      widget={widget}
      block={{
        id: "footer-1",
        type: "footer",
        variant: "columns-2",
        data: footerDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and structure");
  expect(html).toContain("Legal strip");
  expect(html).toContain("Social links");
});

test("widget template block settings render timeline visual sections", () => {
  const widget = createTimelineWidget({
    wizard: TimelineWizardEditor,
    visual: TimelineVisualEditor,
    advanced: TimelineAdvancedEditor,
  });

  const html = renderToString(
    <BlockSettings
      widget={widget}
      block={{
        id: "timeline-1",
        type: "timeline",
        variant: "milestones",
        data: timelineDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and timeline structure");
  expect(html).toContain("Steps content and order");
  expect(html).toContain("Guides and axis line");
  expect(html).toContain("Typography and spacing");
});

test("widget template block settings render compare timeline visual sections", () => {
  const widget = createCompareTimelineWidget({
    wizard: CompareTimelineWizardEditor,
    visual: CompareTimelineVisualEditor,
    advanced: CompareTimelineAdvancedEditor,
  });

  const html = renderToString(
    <BlockSettings
      widget={widget}
      block={{
        id: "compare-1",
        type: "compare-timeline",
        variant: "dual-track-highlight",
        data: compareTimelineDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and compare structure");
  expect(html).toContain("Axis steps and track labels");
  expect(html).toContain("Markers and segment mapping");
  expect(html).toContain("Spacing and layout preview hints");
});

test("widget template block settings render newsletter visual sections", () => {
  const widget = createNewsletterWidget({
    wizard: NewsletterWizardEditor,
    visual: NewsletterVisualEditor,
    advanced: NewsletterAdvancedEditor,
  });

  const html = renderToString(
    <BlockSettings
      widget={widget}
      block={{
        id: "newsletter-1",
        type: "newsletter",
        variant: "inline",
        data: newsletterDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and form structure");
  expect(html).toContain("Content and copy");
  expect(html).toContain("Consent and submit behavior");
  expect(html).toContain("Integration target");
  expect(html).toContain("Spacing and alignment");
});

test("widget template block settings render feature grid visual sections", () => {
  const widget = createFeatureGridWidget({
    wizard: FeatureGridWizardEditor,
    visual: FeatureGridVisualEditor,
    advanced: FeatureGridAdvancedEditor,
  });

  const html = renderToString(
    <BlockSettings
      widget={widget}
      block={{
        id: "feature-grid-1",
        type: "feature-grid",
        variant: "cards-3",
        data: featureGridDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Feature cards and actions");
  expect(html).toContain("Colors and borders");
});

test("widget template block settings render testimonials visual sections", () => {
  const widget = createTestimonialsWidget({
    wizard: TestimonialsWizardEditor,
    visual: TestimonialsVisualEditor,
    advanced: TestimonialsAdvancedEditor,
  });

  const html = renderToString(
    <BlockSettings
      widget={widget}
      block={{
        id: "testimonials-1",
        type: "testimonials",
        variant: "grid",
        data: testimonialsDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Testimonials content and ratings");
  expect(html).toContain("Colors and emphasis");
});

test("widget template block settings render pricing plans visual sections", () => {
  const widget = createPricingPlansWidget({
    wizard: PricingPlansWizardEditor,
    visual: PricingPlansVisualEditor,
    advanced: PricingPlansAdvancedEditor,
  });

  const html = renderToString(
    <BlockSettings
      widget={widget}
      block={{
        id: "pricing-1",
        type: "pricing-plans",
        variant: "three-plans",
        data: pricingPlansDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and plan structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Plans, features, and actions");
  expect(html).toContain("Colors and emphasis");
});

test("widget template block settings render contact visual sections", () => {
  const widget = createContactWidget({
    wizard: ContactWizardEditor,
    visual: ContactVisualEditor,
    advanced: ContactAdvancedEditor,
  });

  const html = renderToString(
    <BlockSettings
      widget={widget}
      block={{
        id: "contact-1",
        type: "contact",
        variant: "form-left",
        data: contactDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Form fields and required rules");
  expect(html).toContain("Contact details and business info");
  expect(html).toContain("Map source and display behavior");
  expect(html).toContain("Spacing and columns");
});
