import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { getWidget, registerWidget } from "../registry";
import { createCompareTimelineWidget, type CompareTimelineData } from "./compareTimeline";
import { createContentListWidget, type ContentListData } from "./contentList";
import { createProductGalleryWidget, type ProductGalleryData } from "./productGallery";
import { createProductCompareWidget, type ProductCompareData } from "./productCompare";
import { createProductTableWidget, type ProductTableData } from "./productTable";
import { createContactWidget, type ContactData } from "./contact";
import { createCtaBannerWidget, type CtaBannerData } from "./ctaBanner";
import { createDividerWidget, type DividerData } from "./divider";
import { createEntryTeaserWidget, type EntryTeaserData } from "./entryTeaser";
import {
  createAppointmentFormWidget,
  type AppointmentFormData,
} from "./appointmentForm";
import { createFeatureGridWidget, type FeatureGridData } from "./featureGrid";
import { createFooterWidget, type FooterData } from "./footer";
import { createFormEmbedWidget, type FormEmbedData } from "./formEmbed";
import { createFaqAccordionWidget, type FaqAccordionData } from "./faqAccordion";
import { createGalleryMosaicWidget, type GalleryMosaicData } from "./galleryMosaic";
import { createGridColumnsWidget, type GridColumnsData } from "./gridColumns";
import { createHeroWidget, type HeroData } from "./hero";
import {
  createBookingCalendarWidget,
  type BookingCalendarData,
} from "./bookingCalendar";
import {
  createListingFiltersWidget,
  type ListingFiltersData,
} from "./listingFilters";
import { createLogoCloudWidget, type LogoCloudData } from "./logoCloud";
import { createNavigationWidget, type NavigationData } from "./navigation";
import { createNewsletterWidget, type NewsletterData } from "./newsletter";
import { createPricingPlansWidget, type PricingPlansData } from "./pricingPlans";
import {
  createRichTextSectionWidget,
  type RichTextSectionData,
} from "./richTextSection";
import { createSectionWidget, type SectionData } from "./section";
import { createSearchBoxWidget, type SearchBoxData } from "./searchBox";
import { createSplitLayoutWidget, type SplitLayoutData } from "./splitLayout";
import { createSpacerWidget, type SpacerData } from "./spacer";
import { createStackWidget, type StackData } from "./stack";
import { createStatsKpiWidget, type StatsKpiData } from "./statsKpi";
import { createTeamWidget, type TeamData } from "./team";
import { createTabsWidget, type TabsData } from "./tabs";
import { createAccordionWidget, type AccordionData } from "./accordion";
import { createToggleBlockWidget, type ToggleBlockData } from "./toggleBlock";
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
  tabs: EditorBundle<TabsData>;
  accordion: EditorBundle<AccordionData>;
  toggleBlock: EditorBundle<ToggleBlockData>;
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
  productGallery: EditorBundle<ProductGalleryData>;
  productCompare: EditorBundle<ProductCompareData>;
  productTable: EditorBundle<ProductTableData>;
  listingFilters: EditorBundle<ListingFiltersData>;
  searchBox: EditorBundle<SearchBoxData>;
  timeline: EditorBundle<TimelineData>;
  compareTimeline: EditorBundle<CompareTimelineData>;
  newsletter: EditorBundle<NewsletterData>;
  bookingCalendar: EditorBundle<BookingCalendarData>;
  appointmentForm: EditorBundle<AppointmentFormData>;
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
    createTabsWidget(editors.tabs),
    createAccordionWidget(editors.accordion),
    createToggleBlockWidget(editors.toggleBlock),
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
    createProductGalleryWidget(editors.productGallery),
    createProductCompareWidget(editors.productCompare),
    createProductTableWidget(editors.productTable),
    createListingFiltersWidget(editors.listingFilters),
    createSearchBoxWidget(editors.searchBox),
    createTimelineWidget(editors.timeline),
    createCompareTimelineWidget(editors.compareTimeline),
    createNewsletterWidget(editors.newsletter),
    createBookingCalendarWidget(editors.bookingCalendar),
    createAppointmentFormWidget(editors.appointmentForm),
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
