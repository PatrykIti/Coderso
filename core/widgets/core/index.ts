import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { getWidget, registerWidget } from "../registry";
import { createCompareTimelineWidget, type CompareTimelineData } from "./compareTimeline";
import { createContentListWidget, type ContentListData } from "./contentList";
import { createContactWidget, type ContactData } from "./contact";
import { createCtaBannerWidget, type CtaBannerData } from "./ctaBanner";
import { createDividerWidget, type DividerData } from "./divider";
import { createEntryTeaserWidget, type EntryTeaserData } from "./entryTeaser";
import { createFeatureGridWidget, type FeatureGridData } from "./featureGrid";
import { createFooterWidget, type FooterData } from "./footer";
import { createFormEmbedWidget, type FormEmbedData } from "./formEmbed";
import { createFaqAccordionWidget, type FaqAccordionData } from "./faqAccordion";
import { createGalleryMosaicWidget, type GalleryMosaicData } from "./galleryMosaic";
import { createGridColumnsWidget, type GridColumnsData } from "./gridColumns";
import { createHeroWidget, type HeroData } from "./hero";
import { createLogoCloudWidget, type LogoCloudData } from "./logoCloud";
import { createNavigationWidget, type NavigationData } from "./navigation";
import { createNewsletterWidget, type NewsletterData } from "./newsletter";
import { createPricingPlansWidget, type PricingPlansData } from "./pricingPlans";
import {
  createRichTextSectionWidget,
  type RichTextSectionData,
} from "./richTextSection";
import { createSectionWidget, type SectionData } from "./section";
import { createSplitLayoutWidget, type SplitLayoutData } from "./splitLayout";
import { createSpacerWidget, type SpacerData } from "./spacer";
import { createStackWidget, type StackData } from "./stack";
import { createStatsKpiWidget, type StatsKpiData } from "./statsKpi";
import { createTeamWidget, type TeamData } from "./team";
import {
  createTemplateSectionWidget,
  type TemplateSectionData,
} from "./templateSection";
import { createTestimonialsWidget, type TestimonialsData } from "./testimonials";
import { createTimelineWidget, type TimelineData } from "./timeline";

type EditorBundle<T> = {
  wizard: ComponentType<WidgetEditorProps<T>>;
  visual: ComponentType<WidgetEditorProps<T>>;
  advanced: ComponentType<WidgetEditorProps<T>>;
};

export type CoreWidgetEditors = {
  section: EditorBundle<SectionData>;
  templateSection: EditorBundle<TemplateSectionData>;
  gridColumns: EditorBundle<GridColumnsData>;
  splitLayout: EditorBundle<SplitLayoutData>;
  spacer: EditorBundle<SpacerData>;
  divider: EditorBundle<DividerData>;
  stack: EditorBundle<StackData>;
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
  contentList: EditorBundle<ContentListData>;
  entryTeaser: EditorBundle<EntryTeaserData>;
  timeline: EditorBundle<TimelineData>;
  compareTimeline: EditorBundle<CompareTimelineData>;
  newsletter: EditorBundle<NewsletterData>;
  formEmbed: EditorBundle<FormEmbedData>;
  contact: EditorBundle<ContactData>;
  navigation: EditorBundle<NavigationData>;
  footer: EditorBundle<FooterData>;
};

export function createCoreWidgetDefinitions(
  editors: CoreWidgetEditors
): Array<WidgetDefinition<any>> {
  return [
    createSectionWidget(editors.section),
    createTemplateSectionWidget(editors.templateSection),
    createGridColumnsWidget(editors.gridColumns),
    createSplitLayoutWidget(editors.splitLayout),
    createSpacerWidget(editors.spacer),
    createDividerWidget(editors.divider),
    createStackWidget(editors.stack),
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
    createContentListWidget(editors.contentList),
    createEntryTeaserWidget(editors.entryTeaser),
    createTimelineWidget(editors.timeline),
    createCompareTimelineWidget(editors.compareTimeline),
    createNewsletterWidget(editors.newsletter),
    createFormEmbedWidget(editors.formEmbed),
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
