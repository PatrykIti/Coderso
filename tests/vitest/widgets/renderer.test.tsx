import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { createHeroWidget, heroDefaults, type HeroData } from "../../../core/widgets/core/hero";
import {
  compareTimelineDefaults,
  createCompareTimelineWidget,
  type CompareTimelineData,
} from "../../../core/widgets/core/compareTimeline";
import {
  createTimelineWidget,
  timelineDefaults,
  type TimelineData,
} from "../../../core/widgets/core/timeline";
import {
  createNavigationWidget,
  navigationDefaults,
  type NavigationData,
} from "../../../core/widgets/core/navigation";
import {
  createFooterWidget,
  footerDefaults,
  type FooterData,
} from "../../../core/widgets/core/footer";
import {
  createNewsletterWidget,
  newsletterDefaults,
  type NewsletterData,
} from "../../../core/widgets/core/newsletter";
import {
  contactDefaults,
  createContactWidget,
  type ContactData,
} from "../../../core/widgets/core/contact";
import {
  createFeatureGridWidget,
  featureGridDefaults,
  type FeatureGridData,
} from "../../../core/widgets/core/featureGrid";
import {
  createTestimonialsWidget,
  testimonialsDefaults,
  type TestimonialsData,
} from "../../../core/widgets/core/testimonials";
import {
  createPricingPlansWidget,
  pricingPlansDefaults,
  type PricingPlansData,
} from "../../../core/widgets/core/pricingPlans";
import {
  createFaqAccordionWidget,
  faqAccordionDefaults,
  type FaqAccordionData,
} from "../../../core/widgets/core/faqAccordion";
import {
  createCtaBannerWidget,
  ctaBannerDefaults,
  type CtaBannerData,
} from "../../../core/widgets/core/ctaBanner";
import {
  createLogoCloudWidget,
  logoCloudDefaults,
  type LogoCloudData,
} from "../../../core/widgets/core/logoCloud";
import {
  createGalleryMosaicWidget,
  galleryMosaicDefaults,
  type GalleryMosaicData,
} from "../../../core/widgets/core/galleryMosaic";
import {
  createStatsKpiWidget,
  statsKpiDefaults,
  type StatsKpiData,
} from "../../../core/widgets/core/statsKpi";
import {
  createTeamWidget,
  teamDefaults,
  type TeamData,
} from "../../../core/widgets/core/team";
import {
  createRichTextSectionWidget,
  richTextSectionDefaults,
  type RichTextSectionData,
} from "../../../core/widgets/core/richTextSection";
import {
  createSectionWidget,
  sectionDefaults,
  type SectionData,
} from "../../../core/widgets/core/section";
import {
  createGridColumnsWidget,
  gridColumnsDefaults,
  type GridColumnsData,
} from "../../../core/widgets/core/gridColumns";
import {
  createStackWidget,
  stackDefaults,
  type StackData,
} from "../../../core/widgets/core/stack";
import {
  createSplitLayoutWidget,
  splitLayoutDefaults,
  type SplitLayoutData,
} from "../../../core/widgets/core/splitLayout";
import {
  createSpacerWidget,
  spacerDefaults,
  type SpacerData,
} from "../../../core/widgets/core/spacer";
import {
  createDividerWidget,
  dividerDefaults,
  type DividerData,
} from "../../../core/widgets/core/divider";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import type { WidgetEditorProps, WidgetBlock } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<HeroData>> = () => null;
const StubCompareTimelineEditor: ComponentType<WidgetEditorProps<CompareTimelineData>> = () =>
  null;
const StubTimelineEditor: ComponentType<WidgetEditorProps<TimelineData>> = () => null;
const StubNavigationEditor: ComponentType<WidgetEditorProps<NavigationData>> = () => null;
const StubFooterEditor: ComponentType<WidgetEditorProps<FooterData>> = () => null;
const StubNewsletterEditor: ComponentType<WidgetEditorProps<NewsletterData>> = () => null;
const StubContactEditor: ComponentType<WidgetEditorProps<ContactData>> = () => null;
const StubFeatureGridEditor: ComponentType<WidgetEditorProps<FeatureGridData>> = () => null;
const StubTestimonialsEditor: ComponentType<WidgetEditorProps<TestimonialsData>> = () => null;
const StubPricingPlansEditor: ComponentType<WidgetEditorProps<PricingPlansData>> = () => null;
const StubFaqAccordionEditor: ComponentType<WidgetEditorProps<FaqAccordionData>> = () =>
  null;
const StubCtaBannerEditor: ComponentType<WidgetEditorProps<CtaBannerData>> = () => null;
const StubLogoCloudEditor: ComponentType<WidgetEditorProps<LogoCloudData>> = () => null;
const StubGalleryMosaicEditor: ComponentType<WidgetEditorProps<GalleryMosaicData>> = () =>
  null;
const StubStatsKpiEditor: ComponentType<WidgetEditorProps<StatsKpiData>> = () => null;
const StubTeamEditor: ComponentType<WidgetEditorProps<TeamData>> = () => null;
const StubRichTextSectionEditor: ComponentType<WidgetEditorProps<RichTextSectionData>> = () =>
  null;
const StubSectionEditor: ComponentType<WidgetEditorProps<SectionData>> = () => null;
const StubGridColumnsEditor: ComponentType<WidgetEditorProps<GridColumnsData>> = () =>
  null;
const StubStackEditor: ComponentType<WidgetEditorProps<StackData>> = () => null;
const StubSplitLayoutEditor: ComponentType<WidgetEditorProps<SplitLayoutData>> = () =>
  null;
const StubSpacerEditor: ComponentType<WidgetEditorProps<SpacerData>> = () => null;
const StubDividerEditor: ComponentType<WidgetEditorProps<DividerData>> = () => null;
const StubUnknownEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => null;

test("renderer shows missing widget fallback", () => {
  clearWidgets();
  const html = renderToString(
    <WidgetRenderer block={{ id: "missing-1", type: "unknown", data: {} }} />
  );
  expect(html).toContain("Missing widget");
});

test("renderer respects visibility disabled", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "hero-1",
        type: "hero",
        variant: "centered",
        data: heroDefaults,
        visibility: { enabled: false, devices: ["desktop"] },
      }}
    />
  );
  expect(html).toBe("");
});

test("renderer respects visibility devices in runtime preview", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const block: WidgetBlock = {
    id: "hero-visible-mobile-only",
    type: "hero",
    variant: "centered",
    data: heroDefaults,
    visibility: { enabled: true, devices: ["mobile"] },
  };

  const desktopHtml = renderToString(
    <WidgetRenderer block={block} previewDevice="desktop" />
  );
  const mobileHtml = renderToString(
    <WidgetRenderer block={block} previewDevice="mobile" />
  );

  expect(desktopHtml).toBe("");
  expect(mobileHtml).toContain("Build faster with Nextless");
});

test("renderer hides widget when visibility devices are empty", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const block: WidgetBlock = {
    id: "hero-visible-no-devices",
    type: "hero",
    variant: "centered",
    data: heroDefaults,
    visibility: { enabled: true, devices: [] },
  };

  const html = renderToString(
    <WidgetRenderer block={block} previewDevice="desktop" />
  );

  expect(html).toBe("");
});

test("renderer applies layout classes", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const block: WidgetBlock = {
    id: "hero-2",
    type: "hero",
    variant: "centered",
    data: heroDefaults,
    layout: {
      container: "narrow",
      padding: { top: "xl", bottom: "xl" },
      margin: { top: "sm", bottom: "sm" },
      background: { color: "transparent" },
    },
  };

  const html = renderToString(<WidgetRenderer block={block} />);
  expect(html).toContain("max-w-3xl");
  expect(html).toContain("pt-12");
  expect(html).toContain("mt-4");
});

test("renderer resolves inherit layout tokens from page defaults", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const block: WidgetBlock = {
    id: "hero-inherit",
    type: "hero",
    variant: "centered",
    data: heroDefaults,
    layout: {
      container: "inherit",
      padding: { top: "inherit", bottom: "inherit" },
      margin: { top: "inherit", bottom: "inherit" },
      background: { color: "transparent" },
    },
  };

  const html = renderToString(
    <WidgetRenderer
      block={block}
      pageDefaults={{
        container: "narrow",
        padding: { top: "sm", bottom: "lg" },
        margin: { top: "xs", bottom: "sm" },
      }}
    />
  );

  expect(html).toContain("max-w-3xl");
  expect(html).toContain("pt-4");
  expect(html).toContain("pb-8");
  expect(html).toContain("mt-2");
  expect(html).toContain("mb-4");
});

test("renderer renders nested blocks", () => {
  clearWidgets();
  registerWidget(
    createHeroWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );
  registerWidget({
    type: "container",
    title: "Container",
    description: "Container widget",
    category: "layout",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: {},
    editor: { wizard: StubEditor, visual: StubEditor, advanced: StubEditor },
    render: () => <div>Container</div>,
  });

  const block: WidgetBlock = {
    id: "container-parent",
    type: "container",
    variant: "default",
    data: {},
    children: [
      {
        id: "hero-child",
        type: "hero",
        variant: "centered",
        data: { ...heroDefaults, headline: "Child hero" },
      },
    ],
  };

  const html = renderToString(<WidgetRenderer block={block} />);
  expect(html).toContain("Container");
  expect(html).toContain("Child hero");
});

test("renderer passes slots to widget render", () => {
  clearWidgets();
  registerWidget({
    type: "slot-layout",
    title: "Slot Layout",
    description: "Slot Layout",
    category: "layout",
    slots: [{ id: "main", label: "Main" }],
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: {},
    editor: { wizard: StubEditor, visual: StubEditor, advanced: StubEditor },
    render: ({ slots }) => (
      <div>Slots:{slots?.main?.length ?? 0}</div>
    ),
  });

  const block: WidgetBlock = {
    id: "slot-1",
    type: "slot-layout",
    data: {},
    slots: {
      main: [{ id: "child-1", type: "hero", data: heroDefaults }],
    },
  };

  const html = renderToString(<WidgetRenderer block={block} />);
  const normalizedHtml = html.replace(/<!--.*?-->/g, "");
  expect(normalizedHtml).toContain("Slots:1");
});

test("renderer outputs section variant and region markers", () => {
  clearWidgets();
  registerWidget(
    createSectionWidget({
      wizard: StubSectionEditor,
      visual: StubSectionEditor,
      advanced: StubSectionEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "section-1",
        type: "section",
        variant: "contained",
        data: sectionDefaults,
        slots: {
          "region:1": [],
          "region:2": [],
        },
      }}
    />
  );

  expect(html).toContain('data-section-variant="contained"');
  expect(html).toContain('data-section-regions="2"');
  expect(html).toContain('data-section-region="region:1"');
});

test("renderer outputs grid columns responsive markers", () => {
  clearWidgets();
  registerWidget(
    createGridColumnsWidget({
      wizard: StubGridColumnsEditor,
      visual: StubGridColumnsEditor,
      advanced: StubGridColumnsEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "grid-columns-1",
        type: "grid-columns",
        variant: "asymmetric",
        data: gridColumnsDefaults,
        slots: {
          "column:1": [],
          "column:2": [],
          "column:3": [],
        },
      }}
    />
  );

  expect(html).toContain('data-grid-columns-variant="asymmetric"');
  expect(html).toContain('data-grid-columns-count="3"');
  expect(html).toContain('data-grid-column="column:1"');
  expect(html).toContain('data-grid-column="column:3"');
});

test("renderer outputs stack responsive markers", () => {
  clearWidgets();
  registerWidget(
    createStackWidget({
      wizard: StubStackEditor,
      visual: StubStackEditor,
      advanced: StubStackEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "stack-1",
        type: "stack",
        variant: "responsive",
        data: {
          ...stackDefaults,
          direction: {
            desktop: "row",
            tablet: "row",
            mobile: "column",
          },
          gap: {
            desktop: "8",
            tablet: "6",
            mobile: "4",
          },
          wrap: true,
        },
        slots: {
          content: [],
        },
      }}
    />
  );

  expect(html).toContain('data-stack-variant="responsive"');
  expect(html).toContain('data-stack-direction-desktop="row"');
  expect(html).toContain('data-stack-gap-desktop="8"');
  expect(html).toContain('data-stack-wrap="true"');
});

test("renderer outputs split layout markers", () => {
  clearWidgets();
  registerWidget(
    createSplitLayoutWidget({
      wizard: StubSplitLayoutEditor,
      visual: StubSplitLayoutEditor,
      advanced: StubSplitLayoutEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "split-layout-1",
        type: "split-layout",
        variant: "40-60",
        data: {
          ...splitLayoutDefaults,
          ratio: {
            desktop: "40-60",
            tablet: "60-40",
          },
          collapseMobile: "keep",
          reverseOnMobile: true,
          gap: "8",
          verticalAlign: "center",
        },
        slots: {
          left: [],
          right: [],
        },
      }}
    />
  );

  expect(html).toContain('data-split-layout-variant="40-60"');
  expect(html).toContain('data-split-ratio-desktop="40-60"');
  expect(html).toContain('data-split-ratio-tablet="60-40"');
  expect(html).toContain('data-split-collapse-mobile="keep"');
  expect(html).toContain('data-split-reverse-mobile="true"');
});

test("renderer outputs spacer markers", () => {
  clearWidgets();
  registerWidget(
    createSpacerWidget({
      wizard: StubSpacerEditor,
      visual: StubSpacerEditor,
      advanced: StubSpacerEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "spacer-1",
        type: "spacer",
        variant: "responsive",
        data: {
          ...spacerDefaults,
          height: {
            desktop: "24",
            tablet: "64px",
            mobile: "12",
          },
          showGuideInEditor: true,
        },
      }}
      previewDevice="desktop"
    />
  );

  expect(html).toContain('data-spacer="true"');
  expect(html).toContain('data-spacer-variant="responsive"');
  expect(html).toContain('data-spacer-desktop="24"');
  expect(html).toContain('data-spacer-tablet="64px"');
  expect(html).toContain('data-spacer-mobile="12"');
  expect(html.replace(/<!-- -->/g, "")).toContain("Spacer 6rem");
});

test("renderer outputs divider markers", () => {
  clearWidgets();
  registerWidget(
    createDividerWidget({
      wizard: StubDividerEditor,
      visual: StubDividerEditor,
      advanced: StubDividerEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "divider-1",
        type: "divider",
        variant: "label-center",
        data: {
          ...dividerDefaults,
          label: "Features",
          thickness: 2,
          color: "#cbd5e1",
          width: "custom",
          customWidth: "60%",
          marginTop: "8",
          marginBottom: "10",
        },
      }}
    />
  );

  expect(html).toContain('data-divider="true"');
  expect(html).toContain('data-divider-variant="label-center"');
  expect(html).toContain('data-divider-thickness="2"');
  expect(html).toContain('data-divider-width-mode="custom"');
  expect(html).toContain('data-divider-has-label="true"');
  expect(html).toContain("Features");
});

test("renderer renders navigation right slot content", () => {
  clearWidgets();
  registerWidget(
    createNavigationWidget({
      wizard: StubNavigationEditor,
      visual: StubNavigationEditor,
      advanced: StubNavigationEditor,
    })
  );
  registerWidget({
    type: "login-chip",
    title: "Login Chip",
    description: "Simple auth action",
    category: "content",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: { label: "Log in" },
    editor: {
      wizard: StubUnknownEditor,
      visual: StubUnknownEditor,
      advanced: StubUnknownEditor,
    },
    render: ({ data }) => <span>{String((data as { label?: string }).label ?? "Log in")}</span>,
  });

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "nav-1",
        type: "navigation",
        variant: "split",
        data: navigationDefaults,
        slots: {
          right: [
            {
              id: "right-1",
              type: "login-chip",
              variant: "default",
              data: { label: "Sign in" },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("Sign in");
  expect(html).toContain(navigationDefaults.cta?.label ?? "Get started");
});

test("renderer applies preview device visibility to slot widgets", () => {
  clearWidgets();
  registerWidget(
    createNavigationWidget({
      wizard: StubNavigationEditor,
      visual: StubNavigationEditor,
      advanced: StubNavigationEditor,
    })
  );
  registerWidget({
    type: "login-chip",
    title: "Login Chip",
    description: "Simple auth action",
    category: "content",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: { label: "Log in" },
    editor: {
      wizard: StubUnknownEditor,
      visual: StubUnknownEditor,
      advanced: StubUnknownEditor,
    },
    render: ({ data }) => <span>{String((data as { label?: string }).label ?? "Log in")}</span>,
  });

  const html = renderToString(
    <WidgetRenderer
      previewDevice="desktop"
      block={{
        id: "nav-with-mobile-slot",
        type: "navigation",
        variant: "split",
        data: {
          ...navigationDefaults,
          cta: undefined,
        },
        slots: {
          right: [
            {
              id: "slot-mobile-only",
              type: "login-chip",
              variant: "default",
              data: { label: "Mobile only action" },
              visibility: { enabled: true, devices: ["mobile"] },
            },
          ],
        },
      }}
    />
  );

  expect(html).not.toContain("Mobile only action");
});

test("renderer renders footer column and bottom slot content", () => {
  clearWidgets();
  registerWidget(
    createFooterWidget({
      wizard: StubFooterEditor,
      visual: StubFooterEditor,
      advanced: StubFooterEditor,
    })
  );
  registerWidget({
    type: "badge",
    title: "Badge",
    description: "Simple marker",
    category: "content",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: { label: "Badge" },
    editor: {
      wizard: StubUnknownEditor,
      visual: StubUnknownEditor,
      advanced: StubUnknownEditor,
    },
    render: ({ data }) => <span>{String((data as { label?: string }).label ?? "Badge")}</span>,
  });

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "footer-1",
        type: "footer",
        variant: "columns-2",
        data: footerDefaults,
        slots: {
          "column-1": [
            {
              id: "footer-column-slot",
              type: "badge",
              data: { label: "Column slot item" },
            },
          ],
          bottom: [
            {
              id: "footer-bottom-slot",
              type: "badge",
              data: { label: "Bottom slot item" },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("Column slot item");
  expect(html).toContain("Bottom slot item");
});

test("renderer outputs timeline variant and orientation markers", () => {
  clearWidgets();
  registerWidget(
    createTimelineWidget({
      wizard: StubTimelineEditor,
      visual: StubTimelineEditor,
      advanced: StubTimelineEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "timeline-1",
        type: "timeline",
        variant: "cards",
        data: {
          ...timelineDefaults,
          layout: {
            ...timelineDefaults.layout,
            orientation: "vertical",
            labelPosition: "bottom",
          },
        },
      }}
    />
  );

  expect(html).toContain('data-timeline-variant="cards"');
  expect(html).toContain('data-timeline-orientation="vertical"');
  expect(html).toContain('data-timeline-label-position="bottom"');
});

test("renderer outputs compare timeline highlight segments", () => {
  clearWidgets();
  registerWidget(
    createCompareTimelineWidget({
      wizard: StubCompareTimelineEditor,
      visual: StubCompareTimelineEditor,
      advanced: StubCompareTimelineEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "compare-1",
        type: "compare-timeline",
        variant: "dual-track-highlight",
        data: {
          ...compareTimelineDefaults,
          highlight: { targetTrackId: "b" },
          tracks: [
            compareTimelineDefaults.tracks[0]!,
            {
              ...compareTimelineDefaults.tracks[1]!,
              segments: [{ from: 0, to: 1, label: "Fast lane" }],
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain('data-compare-variant="dual-track-highlight"');
  expect(html).toContain('data-compare-target-track="b"');
  expect(html).toContain("Fast lane");
});

test("renderer outputs newsletter variant and integration markers", () => {
  clearWidgets();
  registerWidget(
    createNewsletterWidget({
      wizard: StubNewsletterEditor,
      visual: StubNewsletterEditor,
      advanced: StubNewsletterEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "newsletter-1",
        type: "newsletter",
        variant: "minimal",
        data: {
          ...newsletterDefaults,
          description: "Hidden in minimal variant",
          consent: {
            enabled: true,
            label: "Accept policy",
            required: true,
          },
          integration: {
            mode: "webhook",
            webhookId: "webhook_1",
            actionUrl: "",
          },
          style: {
            spacing: "lg",
            alignment: "center",
            background: "#ffffff",
          },
        },
      }}
    />
  );

  expect(html).toContain('data-newsletter-variant="minimal"');
  expect(html).toContain('data-newsletter-integration-mode="webhook"');
  expect(html).toContain('data-newsletter-consent-required="true"');
  expect(html).toContain('name="webhookId"');
  expect(html).not.toContain("Hidden in minimal variant");
});

test("renderer outputs contact variant and map markers", () => {
  clearWidgets();
  registerWidget(
    createContactWidget({
      wizard: StubContactEditor,
      visual: StubContactEditor,
      advanced: StubContactEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "contact-1",
        type: "contact",
        variant: "form-right",
        data: {
          ...contactDefaults,
          map: {
            enabled: true,
            embedUrl: "https://maps.google.com/?q=Warsaw&output=embed",
          },
          style: {
            spacing: "lg",
            columns: "two",
            background: "#f8fafc",
            surfaceColor: "#ffffff",
            borderColor: "#cbd5e1",
            borderWidth: "2",
          },
        },
      }}
    />
  );

  expect(html).toContain('data-contact-variant="form-right"');
  expect(html).toContain('data-contact-spacing="lg"');
  expect(html).toContain('data-contact-columns="two"');
  expect(html).toContain('data-contact-map="true"');
  expect(html).toContain('data-contact-border-width="2"');
  expect(html).toContain("Contact map");
});

test("renderer outputs feature grid variant and layout markers", () => {
  clearWidgets();
  registerWidget(
    createFeatureGridWidget({
      wizard: StubFeatureGridEditor,
      visual: StubFeatureGridEditor,
      advanced: StubFeatureGridEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "feature-grid-1",
        type: "feature-grid",
        variant: "highlight-first",
        data: {
          ...featureGridDefaults,
          style: {
            ...featureGridDefaults.style,
            columns: "3",
            gap: "lg",
            borderWidth: "2",
          },
          items: normalizeFeatureGridItemsForRenderer(featureGridDefaults.items),
        },
      }}
    />
  );

  expect(html).toContain('data-feature-grid-variant="highlight-first"');
  expect(html).toContain('data-feature-grid-columns="3"');
  expect(html).toContain('data-feature-grid-gap="lg"');
  expect(html).toContain('data-feature-grid-highlighted="true"');
});

test("renderer outputs testimonials variant and rating markers", () => {
  clearWidgets();
  registerWidget(
    createTestimonialsWidget({
      wizard: StubTestimonialsEditor,
      visual: StubTestimonialsEditor,
      advanced: StubTestimonialsEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "testimonials-1",
        type: "testimonials",
        variant: "slider-static",
        data: {
          ...testimonialsDefaults,
          testimonials: [
            {
              id: "t-1",
              quote: "Great flexibility for content teams.",
              author: "Alex",
              role: "Content Lead",
              rating: 4,
              sourceLabel: "Acme",
            },
            {
              id: "t-2",
              quote: "We reduced page launch time significantly.",
              author: "Riley",
              role: "Marketing Manager",
              rating: 5,
              sourceLabel: "North Labs",
            },
            {
              id: "t-3",
              quote: "Design consistency improved across campaigns.",
              author: "Jordan",
              role: "Designer",
              rating: 5,
              sourceLabel: "BlueRiver",
            },
          ],
          style: {
            ...testimonialsDefaults.style,
            spacing: "lg",
            accentColor: "#1d4ed8",
          },
        },
      }}
    />
  );

  expect(html).toContain('data-testimonials-variant="slider-static"');
  expect(html).toContain('data-testimonials-spacing="lg"');
  expect(html).toContain('data-testimonials-count="3"');
  expect(html).toContain('data-testimonial-rating="4"');
  expect(html).toContain("Great flexibility for content teams.");
});

test("renderer outputs pricing plans variant and highlight markers", () => {
  clearWidgets();
  registerWidget(
    createPricingPlansWidget({
      wizard: StubPricingPlansEditor,
      visual: StubPricingPlansEditor,
      advanced: StubPricingPlansEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "pricing-1",
        type: "pricing-plans",
        variant: "four-plans",
        data: {
          ...pricingPlansDefaults,
          plans: [
            {
              id: "starter",
              name: "Starter",
              price: "$19",
              period: "/month",
              features: ["Email support", "Basic analytics"],
              ctaLabel: "Start",
              ctaHref: "#",
              highlighted: false,
            },
            {
              id: "growth",
              name: "Growth",
              price: "$49",
              period: "/month",
              features: ["Priority support", "Advanced analytics"],
              ctaLabel: "Choose growth",
              ctaHref: "#",
              highlighted: true,
            },
            {
              id: "scale",
              name: "Scale",
              price: "$99",
              period: "/month",
              features: ["SLA", "Audit logs"],
              ctaLabel: "Contact",
              ctaHref: "#",
              highlighted: false,
            },
            {
              id: "enterprise",
              name: "Enterprise",
              price: "Custom",
              period: "",
              features: ["Dedicated support"],
              ctaLabel: "Talk to sales",
              ctaHref: "#",
              highlighted: false,
            },
          ],
          style: {
            ...pricingPlansDefaults.style,
            spacing: "lg",
            highlightRing: "#1d4ed8",
          },
        },
      }}
    />
  );

  expect(html).toContain('data-pricing-variant="four-plans"');
  expect(html).toContain('data-pricing-spacing="lg"');
  expect(html).toContain('data-pricing-count="4"');
  expect(html).toContain('data-pricing-highlighted="true"');
  expect(html).toContain("Choose growth");
});

test("renderer outputs faq accordion variant and open-state markers", () => {
  clearWidgets();
  registerWidget(
    createFaqAccordionWidget({
      wizard: StubFaqAccordionEditor,
      visual: StubFaqAccordionEditor,
      advanced: StubFaqAccordionEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "faq-1",
        type: "faq-accordion",
        variant: "two-column",
        data: {
          ...faqAccordionDefaults,
          items: [
            {
              id: "faq-1",
              question: "What is included?",
              answer: "Core widgets, templates, and admin editing flow.",
            },
            {
              id: "faq-2",
              question: "Can I customize colors?",
              answer: "Yes, each FAQ panel supports surface and border tokens.",
            },
          ],
          options: {
            allowMultipleOpen: true,
            defaultOpenIndex: 1,
          },
          style: {
            ...faqAccordionDefaults.style,
            spacing: "lg",
          },
        },
      }}
    />
  );

  expect(html).toContain('data-faq-variant="two-column"');
  expect(html).toContain('data-faq-spacing="lg"');
  expect(html).toContain('data-faq-count="2"');
  expect(html).toContain('data-faq-multiple-open="true"');
  expect(html).toContain('data-faq-item-open="true"');
  expect(html).toContain("Can I customize colors?");
});

test("renderer outputs cta banner variant and style markers", () => {
  clearWidgets();
  registerWidget(
    createCtaBannerWidget({
      wizard: StubCtaBannerEditor,
      visual: StubCtaBannerEditor,
      advanced: StubCtaBannerEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "cta-1",
        type: "cta-banner",
        variant: "split",
        data: {
          ...ctaBannerDefaults,
          content: {
            badge: "Limited",
            title: "Start building now",
            description: "Reusable blocks with deterministic runtime output.",
          },
          style: {
            ...ctaBannerDefaults.style,
            padding: "lg",
            borderWidth: "2",
          },
        },
      }}
    />
  );

  expect(html).toContain('data-cta-banner-variant="split"');
  expect(html).toContain('data-cta-banner-padding="lg"');
  expect(html).toContain('data-cta-banner-border-width="2"');
  expect(html).toContain("Start building now");
});

test("renderer outputs logo cloud variant and style markers", () => {
  clearWidgets();
  registerWidget(
    createLogoCloudWidget({
      wizard: StubLogoCloudEditor,
      visual: StubLogoCloudEditor,
      advanced: StubLogoCloudEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "logo-cloud-1",
        type: "logo-cloud",
        variant: "dense",
        data: {
          ...logoCloudDefaults,
          logos: [
            {
              id: "logo-1",
              name: "Acme",
              image: "https://cdn.example.com/acme.svg",
              href: "#",
            },
            {
              id: "logo-2",
              name: "North Labs",
              image: "https://cdn.example.com/north.svg",
              href: "#",
            },
            {
              id: "logo-3",
              name: "BlueRiver",
              image: "https://cdn.example.com/blue.svg",
              href: "#",
            },
          ],
          style: {
            ...logoCloudDefaults.style,
            logoHeight: "lg",
            gap: "lg",
            alignment: "start",
            grayscale: true,
            hoverColor: false,
          },
        },
      }}
    />
  );

  expect(html).toContain('data-logo-cloud-variant="dense"');
  expect(html).toContain('data-logo-cloud-gap="lg"');
  expect(html).toContain('data-logo-cloud-count="3"');
  expect(html).toContain('data-logo-cloud-alignment="start"');
  expect(html).toContain('data-logo-cloud-grayscale="true"');
  expect(html).toContain("North Labs");
});

test("renderer outputs gallery mosaic variant and caption markers", () => {
  clearWidgets();
  registerWidget(
    createGalleryMosaicWidget({
      wizard: StubGalleryMosaicEditor,
      visual: StubGalleryMosaicEditor,
      advanced: StubGalleryMosaicEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "gallery-mosaic-1",
        type: "gallery-mosaic",
        variant: "feature-left",
        data: {
          ...galleryMosaicDefaults,
          items: [
            {
              id: "g-1",
              image: "https://cdn.example.com/one.jpg",
              caption: "Main frame",
              href: "#",
            },
            {
              id: "g-2",
              video: "https://cdn.example.com/two.mp4",
              caption: "Video frame",
              href: "#",
            },
            {
              id: "g-3",
              image: "https://cdn.example.com/three.jpg",
              caption: "Third frame",
              href: "#",
            },
          ],
          style: {
            ...galleryMosaicDefaults.style,
            ratio: "16:9",
            gap: "lg",
            captionPosition: "hover",
          },
        },
      }}
    />
  );

  expect(html).toContain('data-gallery-mosaic-variant="feature-left"');
  expect(html).toContain('data-gallery-mosaic-gap="lg"');
  expect(html).toContain('data-gallery-mosaic-ratio="16:9"');
  expect(html).toContain('data-gallery-mosaic-caption-position="hover"');
  expect(html).toContain('data-gallery-media-type="video"');
  expect(html).toContain("Main frame");
});

test("renderer outputs stats kpi variant and style markers", () => {
  clearWidgets();
  registerWidget(
    createStatsKpiWidget({
      wizard: StubStatsKpiEditor,
      visual: StubStatsKpiEditor,
      advanced: StubStatsKpiEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "stats-kpi-1",
        type: "stats-kpi",
        variant: "split-highlight",
        data: {
          ...statsKpiDefaults,
          header: {
            title: "Performance overview",
            description: "Critical KPIs for campaign delivery and retention.",
          },
          items: [
            {
              id: "kpi-1",
              value: "250%",
              label: "Growth",
              description: "Revenue growth in the last quarter.",
              icon: "📈",
            },
            {
              id: "kpi-2",
              value: "99.95%",
              label: "Uptime",
              description: "Average service availability.",
              icon: "⚙️",
            },
            {
              id: "kpi-3",
              value: "18m",
              label: "Support SLA",
              description: "Median first-response time.",
              icon: "⏱",
            },
          ],
          style: {
            ...statsKpiDefaults.style,
            alignment: "start",
            spacing: "lg",
            divider: true,
          },
        },
      }}
    />
  );

  expect(html).toContain('data-stats-kpi-variant="split-highlight"');
  expect(html).toContain('data-stats-kpi-count="3"');
  expect(html).toContain('data-stats-kpi-alignment="start"');
  expect(html).toContain('data-stats-kpi-spacing="lg"');
  expect(html).toContain('data-stats-kpi-divider="true"');
  expect(html).toContain("Performance overview");
  expect(html).toContain("Support SLA");
});

test("renderer outputs team variant and style markers", () => {
  clearWidgets();
  registerWidget(
    createTeamWidget({
      wizard: StubTeamEditor,
      visual: StubTeamEditor,
      advanced: StubTeamEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "team-1",
        type: "team",
        variant: "spotlight",
        data: {
          ...teamDefaults,
          header: {
            title: "Meet our leadership",
            description: "Key people behind strategy and execution.",
          },
          members: [
            {
              id: "member-1",
              name: "Anna Kowalska",
              role: "Head of Product",
              bio: "Owns product direction and roadmap outcomes.",
              photo: "https://cdn.example.com/anna.jpg",
              socialLinks: [
                { id: "social-1", label: "LinkedIn", url: "#" },
                { id: "social-2", label: "X", url: "#" },
              ],
            },
            {
              id: "member-2",
              name: "Marek Nowak",
              role: "Engineering Lead",
              bio: "Leads architecture and platform reliability.",
              photo: "https://cdn.example.com/marek.jpg",
              socialLinks: [{ id: "social-1", label: "GitHub", url: "#" }],
            },
            {
              id: "member-3",
              name: "Ewa Zielinska",
              role: "Content Operations",
              bio: "Turns strategy into repeatable content operations.",
              photo: "https://cdn.example.com/ewa.jpg",
              socialLinks: [{ id: "social-1", label: "LinkedIn", url: "#" }],
            },
          ],
          style: {
            ...teamDefaults.style,
            columns: "3",
            gap: "lg",
            radius: "xl",
          },
        },
      }}
    />
  );

  expect(html).toContain('data-team-variant="spotlight"');
  expect(html).toContain('data-team-count="3"');
  expect(html).toContain('data-team-columns="3"');
  expect(html).toContain('data-team-gap="lg"');
  expect(html).toContain('data-team-radius="xl"');
  expect(html).toContain('data-team-social-count="2"');
  expect(html).toContain("Meet our leadership");
  expect(html).toContain("Engineering Lead");
});

test("renderer outputs rich text section markers and sanitized output", () => {
  clearWidgets();
  registerWidget(
    createRichTextSectionWidget({
      wizard: StubRichTextSectionEditor,
      visual: StubRichTextSectionEditor,
      advanced: StubRichTextSectionEditor,
    })
  );

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "rich-text-1",
        type: "rich-text-section",
        variant: "article",
        data: {
          ...richTextSectionDefaults,
          titleBlock: {
            eyebrow: "Guides",
            title: "How the pipeline works",
          },
          body: {
            html: '<h2>Overview</h2><p>Body copy.</p><script>alert(1)</script><a href="javascript:alert(2)">bad</a>',
            blocks: [
              { id: "block-1", heading: "Overview", content: "Body copy." },
              { id: "block-2", heading: "Details", content: "Extra details." },
            ],
          },
          options: {
            ...richTextSectionDefaults.options,
            toc: true,
            dropcap: true,
            outputMode: "blocks-fallback",
            maxWidth: "xl",
          },
          style: {
            ...richTextSectionDefaults.style,
            fontScale: "lg",
            lineHeight: "relaxed",
            spacing: "lg",
          },
        },
      }}
    />
  );

  expect(html).toContain('data-rich-text-variant="article"');
  expect(html).toContain('data-rich-text-font-scale="lg"');
  expect(html).toContain('data-rich-text-line-height="relaxed"');
  expect(html).toContain('data-rich-text-spacing="lg"');
  expect(html).toContain('data-rich-text-dropcap="true"');
  expect(html).toContain('data-rich-text-toc="true"');
  expect(html).toContain('data-rich-text-output-mode="blocks-fallback"');
  expect(html).toContain('data-rich-text-toc-count="1"');
  expect(html).toContain("How the pipeline works");
  expect(html).toContain('href="#"');
  expect(html).not.toContain("<script");
});

function normalizeFeatureGridItemsForRenderer(
  items: FeatureGridData["items"]
): FeatureGridData["items"] {
  const source = Array.isArray(items) ? items : [];
  const ensured = [...source];
  if (ensured.length < 4) {
    ensured.push({
      id: "item-4",
      title: "Reliable delivery",
      description: "Extra card to satisfy highlight-first baseline.",
    });
  }
  return ensured;
}
