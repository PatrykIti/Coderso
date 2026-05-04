import type { ComponentType } from "react";
import type {
  WidgetAudience,
  WidgetBindingTarget,
  WidgetComplexity,
  WidgetDefinition,
  WidgetEditorProps,
  WidgetPreset,
  WidgetSurface,
  WidgetDataAccess,
} from "../types";
import { getWidget, registerWidget } from "../registry";
import { createCompareTimelineWidget, type CompareTimelineData } from "./compareTimeline";
import { createContentListWidget, type ContentListData } from "./contentList";
import { createPostsFeedWidget, type PostsFeedData } from "./postsFeed";
import { createProductGalleryWidget, type ProductGalleryData } from "./productGallery";
import { createProductCompareWidget, type ProductCompareData } from "./productCompare";
import { createProductTableWidget, type ProductTableData } from "./productTable";
import { createContactWidget, type ContactData } from "./contact";
import { createCtaBannerWidget, type CtaBannerData } from "./ctaBanner";
import { createDividerWidget, type DividerData } from "./divider";
import { createEntryTeaserWidget, type EntryTeaserData } from "./entryTeaser";
import { createAppointmentFormWidget, type AppointmentFormData } from "./appointmentForm";
import { createFeatureGridWidget, type FeatureGridData } from "./featureGrid";
import { createFooterWidget, type FooterData } from "./footer";
import { createFormEmbedWidget, type FormEmbedData } from "./formEmbed";
import { createFaqAccordionWidget, type FaqAccordionData } from "./faqAccordion";
import { createGalleryMosaicWidget, type GalleryMosaicData } from "./galleryMosaic";
import { createGridColumnsWidget, type GridColumnsData } from "./gridColumns";
import { createHeroWidget, type HeroData } from "./hero";
import { createBookingCalendarWidget, type BookingCalendarData } from "./bookingCalendar";
import { createListingFiltersWidget, type ListingFiltersData } from "./listingFilters";
import { createLogoCloudWidget, type LogoCloudData } from "./logoCloud";
import { createNavigationWidget, type NavigationData } from "./navigation";
import { createNewsletterWidget, type NewsletterData } from "./newsletter";
import { createPricingPlansWidget, type PricingPlansData } from "./pricingPlans";
import { createRichTextSectionWidget, type RichTextSectionData } from "./richTextSection";
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
import { createTemplateSectionWidget, type TemplateSectionData } from "./templateSection";
import { createTestimonialsWidget, type TestimonialsData } from "./testimonials";
import { createTimelineWidget, type TimelineData } from "./timeline";
import { createScreenFieldGroupWidget, type ScreenFieldGroupData } from "./screenFieldGroup";
import {
  createScreenFieldValueWidget,
  screenFieldValueBindingTargets,
  type ScreenFieldValueData,
} from "./screenFieldValue";
import {
  createScreenRecordHeaderWidget,
  screenRecordHeaderBindingTargets,
  type ScreenRecordHeaderData,
} from "./screenRecordHeader";
import { createScreenTwoColumnWidget, type ScreenTwoColumnData } from "./screenTwoColumn";

type EditorBundle<T> = {
  wizard: ComponentType<WidgetEditorProps<T>>;
  visual: ComponentType<WidgetEditorProps<T>>;
  advanced: ComponentType<WidgetEditorProps<T>>;
};

type CoreWidgetMetadata = {
  complexity: WidgetComplexity;
  audience: WidgetAudience;
  module: string;
  presets?: WidgetPreset[];
  requires?: string[];
  surfaces?: WidgetSurface[];
  dataAccess?: WidgetDataAccess;
  bindingTargets?: WidgetBindingTarget[];
};

const coreWidgetMetadata: Record<string, CoreWidgetMetadata> = {
  section: {
    complexity: "atomic",
    audience: "advanced",
    module: "layout",
  },
  "template-section": {
    complexity: "atomic",
    audience: "advanced",
    module: "layout",
  },
  "grid-columns": {
    complexity: "atomic",
    audience: "advanced",
    module: "layout",
  },
  "split-layout": {
    complexity: "atomic",
    audience: "advanced",
    module: "layout",
  },
  tabs: {
    complexity: "atomic",
    audience: "intermediate",
    module: "engagement",
  },
  accordion: {
    complexity: "atomic",
    audience: "intermediate",
    module: "engagement",
  },
  "toggle-block": {
    complexity: "atomic",
    audience: "intermediate",
    module: "engagement",
  },
  spacer: {
    complexity: "atomic",
    audience: "advanced",
    module: "layout",
  },
  divider: {
    complexity: "atomic",
    audience: "advanced",
    module: "layout",
  },
  stack: {
    complexity: "atomic",
    audience: "advanced",
    module: "layout",
  },
  hero: {
    complexity: "composite",
    audience: "beginner",
    module: "content",
  },
  "feature-grid": {
    complexity: "composite",
    audience: "beginner",
    module: "content",
  },
  testimonials: {
    complexity: "composite",
    audience: "beginner",
    module: "engagement",
  },
  "pricing-plans": {
    complexity: "composite",
    audience: "intermediate",
    module: "content",
  },
  "faq-accordion": {
    complexity: "composite",
    audience: "beginner",
    module: "engagement",
  },
  "cta-banner": {
    complexity: "composite",
    audience: "beginner",
    module: "content",
  },
  "logo-cloud": {
    complexity: "composite",
    audience: "beginner",
    module: "content",
  },
  "gallery-mosaic": {
    complexity: "composite",
    audience: "beginner",
    module: "media",
  },
  "stats-kpi": {
    complexity: "composite",
    audience: "beginner",
    module: "content",
  },
  team: {
    complexity: "composite",
    audience: "beginner",
    module: "content",
  },
  "rich-text-section": {
    complexity: "composite",
    audience: "beginner",
    module: "content",
  },
  "content-list": {
    complexity: "composite",
    audience: "intermediate",
    module: "listings",
    requires: ["entries"],
  },
  "posts-feed": {
    complexity: "composite",
    audience: "beginner",
    module: "listings",
    requires: ["posts"],
  },
  "entry-teaser": {
    complexity: "composite",
    audience: "intermediate",
    module: "listings",
    requires: ["entries"],
  },
  "product-gallery": {
    complexity: "composite",
    audience: "intermediate",
    module: "commerce",
    requires: ["commerce"],
  },
  "product-compare": {
    complexity: "composite",
    audience: "advanced",
    module: "commerce",
    requires: ["commerce"],
  },
  "product-table": {
    complexity: "composite",
    audience: "intermediate",
    module: "commerce",
    requires: ["commerce"],
  },
  "listing-filters": {
    complexity: "composite",
    audience: "intermediate",
    module: "listings",
    requires: ["listings"],
  },
  "search-box": {
    complexity: "composite",
    audience: "intermediate",
    module: "search",
    requires: ["search"],
  },
  timeline: {
    complexity: "composite",
    audience: "intermediate",
    module: "content",
  },
  "compare-timeline": {
    complexity: "composite",
    audience: "advanced",
    module: "content",
  },
  newsletter: {
    complexity: "composite",
    audience: "beginner",
    module: "forms",
    requires: ["forms"],
  },
  "booking-calendar": {
    complexity: "composite",
    audience: "intermediate",
    module: "booking",
    requires: ["booking"],
  },
  "appointment-form": {
    complexity: "composite",
    audience: "intermediate",
    module: "booking",
    requires: ["booking"],
  },
  "form-embed": {
    complexity: "composite",
    audience: "beginner",
    module: "forms",
    requires: ["forms"],
  },
  contact: {
    complexity: "composite",
    audience: "beginner",
    module: "forms",
    requires: ["forms"],
  },
  navigation: {
    complexity: "composite",
    audience: "beginner",
    module: "navigation",
  },
  footer: {
    complexity: "composite",
    audience: "beginner",
    module: "navigation",
  },
  "screen-record-header": {
    complexity: "composite",
    audience: "beginner",
    module: "screens",
    surfaces: ["custom-screen-builder", "admin-editor-view"],
    dataAccess: { source: "selected-entry", modes: ["read", "write"] },
    bindingTargets: screenRecordHeaderBindingTargets,
  },
  "screen-field-value": {
    complexity: "composite",
    audience: "beginner",
    module: "screens",
    surfaces: ["custom-screen-builder", "admin-editor-view"],
    dataAccess: { source: "selected-entry", modes: ["read", "write"] },
    bindingTargets: screenFieldValueBindingTargets,
  },
  "screen-field-group": {
    complexity: "atomic",
    audience: "intermediate",
    module: "screens",
    surfaces: ["custom-screen-builder", "admin-editor-view"],
    dataAccess: { source: "selected-content-type", modes: ["read"] },
  },
  "screen-two-column": {
    complexity: "atomic",
    audience: "intermediate",
    module: "screens",
    surfaces: ["custom-screen-builder", "admin-editor-view"],
    dataAccess: { source: "selected-content-type", modes: ["read"] },
  },
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
  postsFeed: EditorBundle<PostsFeedData>;
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
  screenRecordHeader: EditorBundle<ScreenRecordHeaderData>;
  screenFieldValue: EditorBundle<ScreenFieldValueData>;
  screenFieldGroup: EditorBundle<ScreenFieldGroupData>;
  screenTwoColumn: EditorBundle<ScreenTwoColumnData>;
};

export function createCoreWidgetDefinitions(
  editors: CoreWidgetEditors
): Array<WidgetDefinition<any>> {
  const definitions = [
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
    createPostsFeedWidget(editors.postsFeed),
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
    createScreenRecordHeaderWidget(editors.screenRecordHeader),
    createScreenFieldValueWidget(editors.screenFieldValue),
    createScreenFieldGroupWidget(editors.screenFieldGroup),
    createScreenTwoColumnWidget(editors.screenTwoColumn),
  ];

  return definitions.map((definition) => {
    const metadata = coreWidgetMetadata[definition.type];
    if (!metadata) {
      throw new Error(`widget_core_metadata_missing:${definition.type}`);
    }
    return {
      ...definition,
      complexity: metadata.complexity,
      audience: metadata.audience,
      module: metadata.module,
      presets: metadata.presets,
      requires: metadata.requires,
      surfaces: metadata.surfaces,
      dataAccess: metadata.dataAccess,
      bindingTargets: metadata.bindingTargets,
    };
  });
}

export function registerCoreWidgets(editors: CoreWidgetEditors) {
  for (const def of createCoreWidgetDefinitions(editors)) {
    if (getWidget(def.type)) continue;
    registerWidget(def);
  }
}
