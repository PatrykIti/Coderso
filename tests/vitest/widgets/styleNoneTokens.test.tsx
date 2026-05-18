import React from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import {
  CompareTimelineBlock,
  compareTimelineDefaults,
  normalizeCompareTimelineData,
} from "../../../core/widgets/core/compareTimeline";
import { ContactBlock, normalizeContactData } from "../../../core/widgets/core/contact";
import { CtaBannerBlock, normalizeCtaBannerData } from "../../../core/widgets/core/ctaBanner";
import { DividerBlock, normalizeDividerData } from "../../../core/widgets/core/divider";
import {
  FaqAccordionBlock,
  faqAccordionDefaults,
  normalizeFaqAccordionData,
} from "../../../core/widgets/core/faqAccordion";
import {
  FeatureGridBlock,
  featureGridDefaults,
  normalizeFeatureGridData,
} from "../../../core/widgets/core/featureGrid";
import { FooterBlock, footerDefaults } from "../../../core/widgets/core/footer";
import { FormEmbedBlock, normalizeFormEmbedData } from "../../../core/widgets/core/formEmbed";
import {
  GalleryMosaicBlock,
  galleryMosaicDefaults,
  normalizeGalleryMosaicData,
} from "../../../core/widgets/core/galleryMosaic";
import { GridColumnsBlock, normalizeGridColumnsData } from "../../../core/widgets/core/gridColumns";
import { HeroBlock, heroDefaults } from "../../../core/widgets/core/hero";
import {
  LogoCloudBlock,
  logoCloudDefaults,
  normalizeLogoCloudData,
} from "../../../core/widgets/core/logoCloud";
import { NavigationBlock, navigationDefaults } from "../../../core/widgets/core/navigation";
import { NewsletterBlock, normalizeNewsletterData } from "../../../core/widgets/core/newsletter";
import {
  normalizePricingPlansData,
  PricingPlansBlock,
  pricingPlansDefaults,
} from "../../../core/widgets/core/pricingPlans";
import {
  normalizeRichTextSectionData,
  RichTextSectionBlock,
} from "../../../core/widgets/core/richTextSection";
import {
  normalizeScreenTwoColumnData,
  ScreenTwoColumnBlock,
} from "../../../core/widgets/core/screenTwoColumn";
import { normalizeSpacerData, SpacerBlock } from "../../../core/widgets/core/spacer";
import { normalizeSplitLayoutData, SplitLayoutBlock } from "../../../core/widgets/core/splitLayout";
import { normalizeStackData, StackBlock } from "../../../core/widgets/core/stack";
import {
  normalizeStatsKpiData,
  StatsKpiBlock,
  statsKpiDefaults,
} from "../../../core/widgets/core/statsKpi";
import { normalizeTeamData, TeamBlock, teamDefaults } from "../../../core/widgets/core/team";
import {
  normalizeTestimonialsData,
  TestimonialsBlock,
  testimonialsDefaults,
} from "../../../core/widgets/core/testimonials";
import {
  resolveTimelineLayout,
  resolveTimelineStyle,
  TimelineBlock,
  timelineDefaults,
} from "../../../core/widgets/core/timeline";

test("layout widgets preserve none as zero spacing", () => {
  const stack = normalizeStackData(
    {
      gap: {
        desktop: "none",
        tablet: "none",
        mobile: "none",
      },
    },
    "responsive"
  );
  expect(stack.gap).toEqual({
    desktop: "none",
    tablet: "none",
    mobile: "none",
  });
  expect(renderToString(<StackBlock data={stack} variant="responsive" />)).toContain(
    'data-stack-gap-desktop="none"'
  );

  const split = normalizeSplitLayoutData({ gap: "none" }, "50-50");
  expect(split.gap).toBe("none");
  expect(renderToString(<SplitLayoutBlock data={split} variant="50-50" />)).toContain(
    'data-split-gap="none"'
  );

  const grid = normalizeGridColumnsData({
    layout: { gapX: "none", gapY: "none" },
    style: { columnPadding: "none" },
  });
  expect(grid.layout?.gapX).toBe("none");
  expect(grid.layout?.gapY).toBe("none");
  expect(grid.style?.columnPadding).toBe("none");
  const gridHtml = renderToString(<GridColumnsBlock data={grid} variant="equal" />);
  expect(gridHtml).toContain('data-grid-columns-gap-x="none"');
  expect(gridHtml).toContain('data-grid-columns-gap-y="none"');

  const screen = normalizeScreenTwoColumnData({ gap: "none" });
  expect(screen.gap).toBe("none");
  expect(renderToString(<ScreenTwoColumnBlock data={screen} variant="balanced" />)).toContain(
    "gap-0"
  );
});

test("utility widgets preserve none token values in rendered markers", () => {
  const divider = normalizeDividerData({
    marginTop: "none",
    marginBottom: "none",
  });
  expect(divider.marginTop).toBe("none");
  expect(divider.marginBottom).toBe("none");
  const dividerHtml = renderToString(<DividerBlock data={divider} variant="line" />);
  expect(dividerHtml).toContain('data-divider-margin-top-kind="none"');
  expect(dividerHtml).toContain('data-divider-margin-bottom-kind="none"');

  const spacer = normalizeSpacerData(
    {
      height: {
        desktop: "none",
        tablet: "none",
        mobile: "none",
      },
    },
    "responsive"
  );
  expect(spacer.height).toEqual({
    desktop: "none",
    tablet: "none",
    mobile: "none",
  });
  const spacerHtml = renderToString(<SpacerBlock data={spacer} variant="responsive" />);
  expect(spacerHtml).toContain('data-spacer-desktop="none"');
  expect(spacerHtml).toContain('data-spacer-tablet="none"');
  expect(spacerHtml).toContain('data-spacer-mobile="none"');
});

test("marketing widgets preserve none spacing and radius tokens", () => {
  expect(
    normalizeStatsKpiData({
      ...statsKpiDefaults,
      style: { ...statsKpiDefaults.style, spacing: "none" },
    }).style?.spacing
  ).toBe("none");
  expect(
    renderToString(
      <StatsKpiBlock
        data={normalizeStatsKpiData({
          ...statsKpiDefaults,
          style: { ...statsKpiDefaults.style, spacing: "none" },
        })}
        variant="cards"
      />
    )
  ).toContain('data-stats-kpi-spacing="none"');

  expect(
    normalizeFeatureGridData({
      ...featureGridDefaults,
      style: { ...featureGridDefaults.style, gap: "none" },
    }).style?.gap
  ).toBe("none");
  expect(
    renderToString(
      <FeatureGridBlock
        data={normalizeFeatureGridData({
          ...featureGridDefaults,
          style: { ...featureGridDefaults.style, gap: "none" },
        })}
        variant="cards-3"
      />
    )
  ).toContain('data-feature-grid-gap="none"');

  expect(
    normalizeGalleryMosaicData({
      ...galleryMosaicDefaults,
      style: { ...galleryMosaicDefaults.style, gap: "none" },
    }).style?.gap
  ).toBe("none");
  expect(
    renderToString(
      <GalleryMosaicBlock
        data={normalizeGalleryMosaicData({
          ...galleryMosaicDefaults,
          style: { ...galleryMosaicDefaults.style, gap: "none" },
        })}
        variant="uniform-grid"
      />
    )
  ).toContain('data-gallery-mosaic-gap="none"');

  expect(normalizeCtaBannerData({ style: { padding: "none" } }).style?.padding).toBe("none");
  expect(
    renderToString(
      <CtaBannerBlock
        data={normalizeCtaBannerData({ style: { padding: "none" } })}
        variant="centered"
      />
    )
  ).toContain('data-cta-banner-padding="none"');

  expect(
    normalizePricingPlansData({
      ...pricingPlansDefaults,
      style: { ...pricingPlansDefaults.style, spacing: "none" },
    }).style?.spacing
  ).toBe("none");
  expect(
    renderToString(
      <PricingPlansBlock
        data={normalizePricingPlansData({
          ...pricingPlansDefaults,
          style: { ...pricingPlansDefaults.style, spacing: "none" },
        })}
        variant="three-plans"
      />
    )
  ).toContain('data-pricing-spacing="none"');

  expect(
    normalizeFaqAccordionData({
      ...faqAccordionDefaults,
      style: { ...faqAccordionDefaults.style, spacing: "none" },
    }).style?.spacing
  ).toBe("none");
  expect(
    renderToString(
      <FaqAccordionBlock
        data={normalizeFaqAccordionData({
          ...faqAccordionDefaults,
          style: { ...faqAccordionDefaults.style, spacing: "none" },
        })}
        variant="single-column"
      />
    )
  ).toContain('data-faq-spacing="none"');
});

test("people and form widgets preserve none style tokens", () => {
  expect(
    normalizeTeamData({
      ...teamDefaults,
      style: { ...teamDefaults.style, gap: "none", radius: "none" },
    }).style
  ).toMatchObject({
    gap: "none",
    radius: "none",
  });
  const teamHtml = renderToString(
    <TeamBlock
      data={normalizeTeamData({
        ...teamDefaults,
        style: { ...teamDefaults.style, gap: "none", radius: "none" },
      })}
      variant="cards"
    />
  );
  expect(teamHtml).toContain('data-team-gap="none"');
  expect(teamHtml).toContain('data-team-radius="none"');

  expect(
    normalizeTestimonialsData({
      ...testimonialsDefaults,
      style: { ...testimonialsDefaults.style, spacing: "none" },
    }).style?.spacing
  ).toBe("none");
  expect(
    renderToString(
      <TestimonialsBlock
        data={normalizeTestimonialsData({
          ...testimonialsDefaults,
          style: { ...testimonialsDefaults.style, spacing: "none" },
        })}
        variant="grid"
      />
    )
  ).toContain('data-testimonials-spacing="none"');

  expect(normalizeContactData({ style: { spacing: "none" } }).style?.spacing).toBe("none");
  expect(
    renderToString(
      <ContactBlock
        data={normalizeContactData({ style: { spacing: "none" } })}
        variant="form-left"
      />
    )
  ).toContain('data-contact-spacing="none"');

  expect(normalizeNewsletterData({ style: { spacing: "none" } }).style?.spacing).toBe("none");
  expect(
    renderToString(
      <NewsletterBlock
        data={normalizeNewsletterData({ style: { spacing: "none" } })}
        variant="inline"
      />
    )
  ).toContain('data-newsletter-spacing="none"');

  const form = normalizeFormEmbedData({
    layout: { width: "none", spacing: "none" },
    style: { radius: "none", inputSize: "none" },
  });
  expect(form.layout).toMatchObject({ width: "none", spacing: "none" });
  expect(form.style).toMatchObject({ radius: "none", inputSize: "none" });
  const formHtml = renderToString(<FormEmbedBlock data={form} variant="standard" />);
  expect(formHtml).toContain('data-form-embed-spacing="none"');
  expect(formHtml).toContain('data-form-embed-width="none"');
  expect(formHtml).toContain('data-form-embed-radius="none"');
  expect(formHtml).toContain('data-form-embed-input-size="none"');
});

test("brand and text widgets preserve none typography tokens", () => {
  const logoCloud = normalizeLogoCloudData({
    ...logoCloudDefaults,
    style: { ...logoCloudDefaults.style, logoHeight: "none", gap: "none" },
  });
  expect(logoCloud.style).toMatchObject({ logoHeight: "none", gap: "none" });
  const logoCloudHtml = renderToString(<LogoCloudBlock data={logoCloud} variant="grid" />);
  expect(logoCloudHtml).toContain('data-logo-cloud-height="none"');
  expect(logoCloudHtml).toContain('data-logo-cloud-gap="none"');

  const richText = normalizeRichTextSectionData({
    style: {
      fontScale: "none",
      lineHeight: "none",
      spacing: "none",
    },
  });
  expect(richText.style).toMatchObject({
    fontScale: "none",
    lineHeight: "none",
    spacing: "none",
  });
  const richTextHtml = renderToString(
    <RichTextSectionBlock data={richText} variant="single-column" />
  );
  expect(richTextHtml).toContain('data-rich-text-font-scale="none"');
  expect(richTextHtml).toContain('data-rich-text-line-height="none"');
  expect(richTextHtml).toContain('data-rich-text-spacing="none"');
});

test("hero, navigation, footer, and timelines accept none as visual off tokens", () => {
  const heroHtml = renderToString(
    <HeroBlock
      data={{
        ...heroDefaults,
        layout: { align: "center", maxWidth: "none", contentWidth: "none" },
        spacing: { paddingTop: "none", paddingBottom: "none" },
        style: {
          ...heroDefaults.style,
          headlineSize: "none",
          subheadSize: "none",
          bodySize: "none",
          borderRadius: "none",
          mediaRadius: "none",
          primaryButtonSize: "none",
          secondaryButtonSize: "none",
        },
      }}
      variant="centered"
    />
  );
  expect(heroHtml).toContain("padding-top:0rem");
  expect(heroHtml).toContain("padding-bottom:0rem");
  expect(heroHtml).not.toContain("max-w-");

  const navigationHtml = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        layout: {
          ...navigationDefaults.layout,
          maxWidth: "none",
          paddingY: "none",
          itemGap: "none",
        },
        style: {
          ...navigationDefaults.style,
          fontSize: "none",
          fontWeight: "none",
        },
      }}
      variant="simple"
    />
  );
  expect(navigationHtml).toContain("py-0");
  expect(navigationHtml).toContain("gap-0");

  const footerHtml = renderToString(
    <FooterBlock
      data={{
        ...footerDefaults,
        layout: {
          ...footerDefaults.layout,
          maxWidth: "none",
          columnGap: "none",
          sectionPaddingY: "none",
        },
        style: {
          ...footerDefaults.style,
          fontSize: "none",
        },
      }}
      variant="columns-2"
    />
  );
  expect(footerHtml).toContain("py-0");
  expect(footerHtml).toContain("gap-0");

  expect(resolveTimelineLayout({ spacing: "none" }).spacing).toBe("none");
  expect(
    resolveTimelineStyle({
      titleSize: "none",
      descriptionSize: "none",
    })
  ).toMatchObject({
    titleSize: "none",
    descriptionSize: "none",
  });
  expect(
    renderToString(
      <TimelineBlock
        data={{
          ...timelineDefaults,
          layout: { ...timelineDefaults.layout, spacing: "none" },
          style: {
            ...timelineDefaults.style,
            titleSize: "none",
            descriptionSize: "none",
          },
        }}
        variant="milestones"
      />
    )
  ).toContain("gap-0");

  const compareTimeline = normalizeCompareTimelineData({
    ...compareTimelineDefaults,
    layout: { ...compareTimelineDefaults.layout, trackSpacing: "none" },
    style: {
      ...compareTimelineDefaults.style,
      trackLabelSize: "none",
      stepLabelSize: "none",
      segmentLabelSize: "none",
    },
  });
  expect(compareTimeline.layout?.trackSpacing).toBe("none");
  expect(compareTimeline.style).toMatchObject({
    trackLabelSize: "none",
    stepLabelSize: "none",
    segmentLabelSize: "none",
  });
  expect(
    renderToString(<CompareTimelineBlock data={compareTimeline} variant="dual-track-highlight" />)
  ).toContain("space-y-0");
});
