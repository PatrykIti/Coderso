import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { getWidget, registerWidget } from "../registry";
import { createCompareTimelineWidget, type CompareTimelineData } from "./compareTimeline";
import { createContactWidget, type ContactData } from "./contact";
import { createCtaBannerWidget, type CtaBannerData } from "./ctaBanner";
import { createFeatureGridWidget, type FeatureGridData } from "./featureGrid";
import { createFooterWidget, type FooterData } from "./footer";
import { createFaqAccordionWidget, type FaqAccordionData } from "./faqAccordion";
import { createGalleryMosaicWidget, type GalleryMosaicData } from "./galleryMosaic";
import { createHeroWidget, type HeroData } from "./hero";
import { createLogoCloudWidget, type LogoCloudData } from "./logoCloud";
import { createNavigationWidget, type NavigationData } from "./navigation";
import { createNewsletterWidget, type NewsletterData } from "./newsletter";
import { createPricingPlansWidget, type PricingPlansData } from "./pricingPlans";
import {
  createRichTextSectionWidget,
  type RichTextSectionData,
} from "./richTextSection";
import { createStatsKpiWidget, type StatsKpiData } from "./statsKpi";
import { createTeamWidget, type TeamData } from "./team";
import { createTestimonialsWidget, type TestimonialsData } from "./testimonials";
import { createTimelineWidget, type TimelineData } from "./timeline";

type EditorBundle<T> = {
  wizard: ComponentType<WidgetEditorProps<T>>;
  visual: ComponentType<WidgetEditorProps<T>>;
  advanced: ComponentType<WidgetEditorProps<T>>;
};

export type CoreWidgetEditors = {
  hero: EditorBundle<HeroData>;
  featureGrid: EditorBundle<FeatureGridData>;
  testimonials: EditorBundle<TestimonialsData>;
  pricingPlans: EditorBundle<PricingPlansData>;
  faqAccordion: EditorBundle<FaqAccordionData>;
  ctaBanner: EditorBundle<CtaBannerData>;
  logoCloud: EditorBundle<LogoCloudData>;
  galleryMosaic: EditorBundle<GalleryMosaicData>;
  statsKpi: EditorBundle<StatsKpiData>;
  team: EditorBundle<TeamData>;
  richTextSection: EditorBundle<RichTextSectionData>;
  timeline: EditorBundle<TimelineData>;
  compareTimeline: EditorBundle<CompareTimelineData>;
  newsletter: EditorBundle<NewsletterData>;
  contact: EditorBundle<ContactData>;
  navigation: EditorBundle<NavigationData>;
  footer: EditorBundle<FooterData>;
};

export function createCoreWidgetDefinitions(
  editors: CoreWidgetEditors
): Array<WidgetDefinition<any>> {
  return [
    createHeroWidget(editors.hero),
    createFeatureGridWidget(editors.featureGrid),
    createTestimonialsWidget(editors.testimonials),
    createPricingPlansWidget(editors.pricingPlans),
    createFaqAccordionWidget(editors.faqAccordion),
    createCtaBannerWidget(editors.ctaBanner),
    createLogoCloudWidget(editors.logoCloud),
    createGalleryMosaicWidget(editors.galleryMosaic),
    createStatsKpiWidget(editors.statsKpi),
    createTeamWidget(editors.team),
    createRichTextSectionWidget(editors.richTextSection),
    createTimelineWidget(editors.timeline),
    createCompareTimelineWidget(editors.compareTimeline),
    createNewsletterWidget(editors.newsletter),
    createContactWidget(editors.contact),
    createNavigationWidget(editors.navigation),
    createFooterWidget(editors.footer),
  ];
}

export function registerCoreWidgets(editors: CoreWidgetEditors) {
  for (const def of createCoreWidgetDefinitions(editors)) {
    if (getWidget(def.type)) continue;
    registerWidget(def);
  }
}
