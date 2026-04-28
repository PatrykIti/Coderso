import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

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
  CtaBannerAdvancedEditor,
  CtaBannerVisualEditor,
  CtaBannerWizardEditor,
} from "../../../core/admin/ui/widgets/editors/CtaBannerEditors";
import {
  LogoCloudAdvancedEditor,
  LogoCloudVisualEditor,
  LogoCloudWizardEditor,
} from "../../../core/admin/ui/widgets/editors/LogoCloudEditors";
import {
  GalleryMosaicAdvancedEditor,
  GalleryMosaicVisualEditor,
  GalleryMosaicWizardEditor,
} from "../../../core/admin/ui/widgets/editors/GalleryMosaicEditors";
import {
  StatsKpiAdvancedEditor,
  StatsKpiVisualEditor,
  StatsKpiWizardEditor,
} from "../../../core/admin/ui/widgets/editors/StatsKpiEditors";
import {
  TeamAdvancedEditor,
  TeamVisualEditor,
  TeamWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TeamEditors";
import {
  RichTextSectionAdvancedEditor,
  RichTextSectionVisualEditor,
  RichTextSectionWizardEditor,
} from "../../../core/admin/ui/widgets/editors/RichTextSectionEditors";
import {
  FaqAccordionAdvancedEditor,
  FaqAccordionVisualEditor,
  FaqAccordionWizardEditor,
} from "../../../core/admin/ui/widgets/editors/FaqAccordionEditors";
import {
  TimelineAdvancedEditor,
  TimelineVisualEditor,
  TimelineWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TimelineEditors";
import {
  SectionAdvancedEditor,
  SectionVisualEditor,
  SectionWizardEditor,
} from "../../../core/admin/ui/widgets/editors/SectionEditors";
import {
  GridColumnsAdvancedEditor,
  GridColumnsVisualEditor,
  GridColumnsWizardEditor,
} from "../../../core/admin/ui/widgets/editors/GridColumnsEditors";
import {
  StackAdvancedEditor,
  StackVisualEditor,
  StackWizardEditor,
} from "../../../core/admin/ui/widgets/editors/StackEditors";
import {
  SplitLayoutAdvancedEditor,
  SplitLayoutVisualEditor,
  SplitLayoutWizardEditor,
} from "../../../core/admin/ui/widgets/editors/SplitLayoutEditors";
import {
  SpacerAdvancedEditor,
  SpacerVisualEditor,
  SpacerWizardEditor,
} from "../../../core/admin/ui/widgets/editors/SpacerEditors";
import {
  DividerAdvancedEditor,
  DividerVisualEditor,
  DividerWizardEditor,
} from "../../../core/admin/ui/widgets/editors/DividerEditors";
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
  createCtaBannerWidget,
  ctaBannerDefaults,
} from "../../../core/widgets/core/ctaBanner";
import {
  createLogoCloudWidget,
  logoCloudDefaults,
} from "../../../core/widgets/core/logoCloud";
import {
  createGalleryMosaicWidget,
  galleryMosaicDefaults,
} from "../../../core/widgets/core/galleryMosaic";
import {
  createStatsKpiWidget,
  statsKpiDefaults,
} from "../../../core/widgets/core/statsKpi";
import {
  createTeamWidget,
  teamDefaults,
} from "../../../core/widgets/core/team";
import {
  createRichTextSectionWidget,
  richTextSectionDefaults,
} from "../../../core/widgets/core/richTextSection";
import {
  createFaqAccordionWidget,
  faqAccordionDefaults,
} from "../../../core/widgets/core/faqAccordion";
import {
  createTestimonialsWidget,
  testimonialsDefaults,
} from "../../../core/widgets/core/testimonials";
import {
  createTimelineWidget,
  timelineDefaults,
} from "../../../core/widgets/core/timeline";
import {
  createSectionWidget,
  sectionDefaults,
} from "../../../core/widgets/core/section";
import {
  createGridColumnsWidget,
  gridColumnsDefaults,
} from "../../../core/widgets/core/gridColumns";
import {
  createStackWidget,
  stackDefaults,
} from "../../../core/widgets/core/stack";
import {
  createSplitLayoutWidget,
  splitLayoutDefaults,
} from "../../../core/widgets/core/splitLayout";
import {
  createSpacerWidget,
  spacerDefaults,
} from "../../../core/widgets/core/spacer";
import {
  createDividerWidget,
  dividerDefaults,
} from "../../../core/widgets/core/divider";
import type { WidgetDefinition } from "../../../core/widgets/types";

const asBlockSettingsWidget = <T,>(widget: WidgetDefinition<T>) =>
  widget as unknown as WidgetDefinition;

test("WidgetTemplateEditorPage renders canvas placeholder", () => {
  const html = renderAdminUi(<WidgetTemplateEditorPage />);

  expect(html).toContain("Build your template");
  expect(html).toContain("Save Template");
  expect(html).toContain("Preview");
  expect(html).toContain("Settings");
  expect(html).toContain("Details");
  expect(html).toContain("Template name");
  expect(html).toContain("Template canvas");
  expect(html).toContain("History");
  expect(html).toContain("Find components...");
  expect(html).toContain("Hero");
  expect(html).toMatch(
    /<aside(?=[^>]*data-slot="card")(?=[^>]*class="[^"]*hidden w-72 min-h-0 flex-col overflow-hidden border-r border-border bg-card lg:flex)[^>]*>/
  );
  expect(html).toMatch(
    /<div(?=[^>]*class="[^"]*flex-1[^"]*min-h-0[^"]*overflow-hidden[^"]*")[^>]*>/
  );
  expect(html).toContain("border-b bg-background/80");
});

test("widget template block settings render navigation visual sections", () => {
  const widget = createNavigationWidget({
    wizard: NavigationWizardEditor,
    visual: NavigationVisualEditor,
    advanced: NavigationAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
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

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
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

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
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

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
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

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
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

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
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

test("widget template block settings render section visual sections", () => {
  const widget = createSectionWidget({
    wizard: SectionWizardEditor,
    visual: SectionVisualEditor,
    advanced: SectionAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "section-1",
        type: "section",
        variant: "default",
        data: sectionDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and structure");
  expect(html).toContain("Semantics and anchor");
  expect(html).toContain("Surface and borders");
});

test("widget template block settings render grid columns visual sections", () => {
  const widget = createGridColumnsWidget({
    wizard: GridColumnsWizardEditor,
    visual: GridColumnsVisualEditor,
    advanced: GridColumnsAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "grid-columns-1",
        type: "grid-columns",
        variant: "equal",
        data: gridColumnsDefaults,
        slots: {
          "column:1": [],
          "column:2": [],
        },
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Column sizing and labels");
  expect(html).toContain("Gap and column surface");
});

test("widget template block settings render stack visual sections", () => {
  const widget = createStackWidget({
    wizard: StackWizardEditor,
    visual: StackVisualEditor,
    advanced: StackAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "stack-1",
        type: "stack",
        variant: "vertical",
        data: stackDefaults,
        slots: {
          content: [],
        },
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and flow");
  expect(html).toContain("Responsive direction");
  expect(html).toContain("Spacing and distribution");
});

test("widget template block settings render split layout visual sections", () => {
  const widget = createSplitLayoutWidget({
    wizard: SplitLayoutWizardEditor,
    visual: SplitLayoutVisualEditor,
    advanced: SplitLayoutAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "split-layout-1",
        type: "split-layout",
        variant: "50-50",
        data: splitLayoutDefaults,
        slots: {
          left: [],
          right: [],
        },
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and pane ratio");
  expect(html).toContain("Mobile collapse behavior");
  expect(html).toContain("Spacing and vertical alignment");
});

test("widget template block settings render spacer visual sections", () => {
  const widget = createSpacerWidget({
    wizard: SpacerWizardEditor,
    visual: SpacerVisualEditor,
    advanced: SpacerAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "spacer-1",
        type: "spacer",
        variant: "responsive",
        data: spacerDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and responsive behavior");
  expect(html).toContain("Responsive heights");
  expect(html).toContain("Editor guide");
});

test("widget template block settings render divider visual sections", () => {
  const widget = createDividerWidget({
    wizard: DividerWizardEditor,
    visual: DividerVisualEditor,
    advanced: DividerAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "divider-1",
        type: "divider",
        variant: "line",
        data: dividerDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and label");
  expect(html).toContain("Line style and width");
  expect(html).toContain("Spacing around divider");
});

test("widget template block settings render testimonials visual sections", () => {
  const widget = createTestimonialsWidget({
    wizard: TestimonialsWizardEditor,
    visual: TestimonialsVisualEditor,
    advanced: TestimonialsAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
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

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
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

test("widget template block settings render faq accordion visual sections", () => {
  const widget = createFaqAccordionWidget({
    wizard: FaqAccordionWizardEditor,
    visual: FaqAccordionVisualEditor,
    advanced: FaqAccordionAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "faq-1",
        type: "faq-accordion",
        variant: "single-column",
        data: faqAccordionDefaults,
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
  expect(html).toContain("Questions and answers");
  expect(html).toContain("Colors and spacing");
});

test("widget template block settings render cta banner visual sections", () => {
  const widget = createCtaBannerWidget({
    wizard: CtaBannerWizardEditor,
    visual: CtaBannerVisualEditor,
    advanced: CtaBannerAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "cta-1",
        type: "cta-banner",
        variant: "centered",
        data: ctaBannerDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Content copy");
  expect(html).toContain("Actions");
  expect(html).toContain("Colors and button styles");
});

test("widget template block settings render logo cloud visual sections", () => {
  const widget = createLogoCloudWidget({
    wizard: LogoCloudWizardEditor,
    visual: LogoCloudVisualEditor,
    advanced: LogoCloudAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "logo-cloud-1",
        type: "logo-cloud",
        variant: "grid",
        data: logoCloudDefaults,
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
  expect(html).toContain("Logos list and links");
  expect(html).toContain("Display style");
});

test("widget template block settings render gallery mosaic visual sections", () => {
  const widget = createGalleryMosaicWidget({
    wizard: GalleryMosaicWizardEditor,
    visual: GalleryMosaicVisualEditor,
    advanced: GalleryMosaicAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "gallery-mosaic-1",
        type: "gallery-mosaic",
        variant: "mosaic",
        data: galleryMosaicDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and media structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Media items and links");
  expect(html).toContain("Overlay and caption controls");
});

test("widget template block settings render stats kpi visual sections", () => {
  const widget = createStatsKpiWidget({
    wizard: StatsKpiWizardEditor,
    visual: StatsKpiVisualEditor,
    advanced: StatsKpiAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "stats-kpi-1",
        type: "stats-kpi",
        variant: "cards",
        data: statsKpiDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and metric structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Metrics content and order");
  expect(html).toContain("Typography and colors");
  expect(html).toContain("Layout display options");
});

test("widget template block settings render team visual sections", () => {
  const widget = createTeamWidget({
    wizard: TeamWizardEditor,
    visual: TeamVisualEditor,
    advanced: TeamAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "team-1",
        type: "team",
        variant: "cards",
        data: teamDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and member structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Members content and order");
  expect(html).toContain("Social links");
  expect(html).toContain("Card and layout style");
});

test("widget template block settings render rich text section visual sections", () => {
  const widget = createRichTextSectionWidget({
    wizard: RichTextSectionWizardEditor,
    visual: RichTextSectionVisualEditor,
    advanced: RichTextSectionAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
      block={{
        id: "rich-text-1",
        type: "rich-text-section",
        variant: "single-column",
        data: richTextSectionDefaults,
        editor: {
          mode: "visual",
          wizardCompleted: true,
        },
      }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Title block copy");
  expect(html).toContain("Body content");
  expect(html).toContain("Structured fallback blocks");
  expect(html).toContain("Reader options");
  expect(html).toContain("Typography and colors");
});

test("widget template block settings render contact visual sections", () => {
  const widget = createContactWidget({
    wizard: ContactWizardEditor,
    visual: ContactVisualEditor,
    advanced: ContactAdvancedEditor,
  });

  const html = renderAdminUi(
    <BlockSettings
      widget={asBlockSettingsWidget(widget)}
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
