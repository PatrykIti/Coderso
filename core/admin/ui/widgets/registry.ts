import { registerCoreWidgets } from "../../../widgets/core";
import {
  getWidget,
  listWidgets,
  listWidgetsForSurface,
  listWidgetsForSurfaceContext,
} from "../../../widgets/registry";
import type { WidgetSurface } from "../../../widgets/types";
import {
  CompareTimelineAdvancedEditor,
  CompareTimelineVisualEditor,
  CompareTimelineWizardEditor,
  GridColumnsAdvancedEditor,
  GridColumnsVisualEditor,
  GridColumnsWizardEditor,
  DividerAdvancedEditor,
  DividerVisualEditor,
  DividerWizardEditor,
  SpacerAdvancedEditor,
  SpacerVisualEditor,
  SpacerWizardEditor,
  SplitLayoutAdvancedEditor,
  SplitLayoutVisualEditor,
  SplitLayoutWizardEditor,
  TabsAdvancedEditor,
  TabsVisualEditor,
  TabsWizardEditor,
  AccordionAdvancedEditor,
  AccordionVisualEditor,
  AccordionWizardEditor,
  ToggleBlockAdvancedEditor,
  ToggleBlockVisualEditor,
  ToggleBlockWizardEditor,
  StackAdvancedEditor,
  StackVisualEditor,
  StackWizardEditor,
  SectionAdvancedEditor,
  SectionVisualEditor,
  SectionWizardEditor,
  TemplateSectionAdvancedEditor,
  TemplateSectionVisualEditor,
  TemplateSectionWizardEditor,
  ContactAdvancedEditor,
  ContactVisualEditor,
  ContactWizardEditor,
  CtaBannerAdvancedEditor,
  CtaBannerVisualEditor,
  CtaBannerWizardEditor,
  ContentListAdvancedEditor,
  ContentListVisualEditor,
  ContentListWizardEditor,
  PostsFeedAdvancedEditor,
  PostsFeedVisualEditor,
  PostsFeedWizardEditor,
  ProductGalleryAdvancedEditor,
  ProductGalleryVisualEditor,
  ProductGalleryWizardEditor,
  ProductCompareAdvancedEditor,
  ProductCompareVisualEditor,
  ProductCompareWizardEditor,
  ProductTableAdvancedEditor,
  ProductTableVisualEditor,
  ProductTableWizardEditor,
  ListingFiltersAdvancedEditor,
  ListingFiltersVisualEditor,
  ListingFiltersWizardEditor,
  EntryTeaserAdvancedEditor,
  EntryTeaserVisualEditor,
  EntryTeaserWizardEditor,
  FaqAccordionAdvancedEditor,
  FaqAccordionVisualEditor,
  FaqAccordionWizardEditor,
  GalleryMosaicAdvancedEditor,
  GalleryMosaicVisualEditor,
  GalleryMosaicWizardEditor,
  LogoCloudAdvancedEditor,
  LogoCloudVisualEditor,
  LogoCloudWizardEditor,
  StatsKpiAdvancedEditor,
  StatsKpiVisualEditor,
  StatsKpiWizardEditor,
  RichTextSectionAdvancedEditor,
  RichTextSectionVisualEditor,
  RichTextSectionWizardEditor,
  TeamAdvancedEditor,
  TeamVisualEditor,
  TeamWizardEditor,
  FeatureGridAdvancedEditor,
  FeatureGridVisualEditor,
  FeatureGridWizardEditor,
  FooterAdvancedEditor,
  FooterVisualEditor,
  FooterWizardEditor,
  HeroAdvancedEditor,
  HeroVisualEditor,
  HeroWizardEditor,
  NavigationAdvancedEditor,
  NavigationVisualEditor,
  NavigationWizardEditor,
  NewsletterAdvancedEditor,
  NewsletterVisualEditor,
  NewsletterWizardEditor,
  BookingCalendarAdvancedEditor,
  BookingCalendarVisualEditor,
  BookingCalendarWizardEditor,
  AppointmentFormAdvancedEditor,
  AppointmentFormVisualEditor,
  AppointmentFormWizardEditor,
  SearchBoxAdvancedEditor,
  SearchBoxVisualEditor,
  SearchBoxWizardEditor,
  FormEmbedAdvancedEditor,
  FormEmbedVisualEditor,
  FormEmbedWizardEditor,
  PricingPlansAdvancedEditor,
  PricingPlansVisualEditor,
  PricingPlansWizardEditor,
  TestimonialsAdvancedEditor,
  TestimonialsVisualEditor,
  TestimonialsWizardEditor,
  TimelineAdvancedEditor,
  TimelineVisualEditor,
  TimelineWizardEditor,
} from "./editors";

export function ensureCoreWidgetsRegistered() {
  registerCoreWidgets({
    section: {
      wizard: SectionWizardEditor,
      visual: SectionVisualEditor,
      advanced: SectionAdvancedEditor,
    },
    templateSection: {
      wizard: TemplateSectionWizardEditor,
      visual: TemplateSectionVisualEditor,
      advanced: TemplateSectionAdvancedEditor,
    },
    gridColumns: {
      wizard: GridColumnsWizardEditor,
      visual: GridColumnsVisualEditor,
      advanced: GridColumnsAdvancedEditor,
    },
    splitLayout: {
      wizard: SplitLayoutWizardEditor,
      visual: SplitLayoutVisualEditor,
      advanced: SplitLayoutAdvancedEditor,
    },
    tabs: {
      wizard: TabsWizardEditor,
      visual: TabsVisualEditor,
      advanced: TabsAdvancedEditor,
    },
    accordion: {
      wizard: AccordionWizardEditor,
      visual: AccordionVisualEditor,
      advanced: AccordionAdvancedEditor,
    },
    toggleBlock: {
      wizard: ToggleBlockWizardEditor,
      visual: ToggleBlockVisualEditor,
      advanced: ToggleBlockAdvancedEditor,
    },
    spacer: {
      wizard: SpacerWizardEditor,
      visual: SpacerVisualEditor,
      advanced: SpacerAdvancedEditor,
    },
    divider: {
      wizard: DividerWizardEditor,
      visual: DividerVisualEditor,
      advanced: DividerAdvancedEditor,
    },
    stack: {
      wizard: StackWizardEditor,
      visual: StackVisualEditor,
      advanced: StackAdvancedEditor,
    },
    hero: {
      wizard: HeroWizardEditor,
      visual: HeroVisualEditor,
      advanced: HeroAdvancedEditor,
    },
    featureGrid: {
      wizard: FeatureGridWizardEditor,
      visual: FeatureGridVisualEditor,
      advanced: FeatureGridAdvancedEditor,
    },
    testimonials: {
      wizard: TestimonialsWizardEditor,
      visual: TestimonialsVisualEditor,
      advanced: TestimonialsAdvancedEditor,
    },
    pricingPlans: {
      wizard: PricingPlansWizardEditor,
      visual: PricingPlansVisualEditor,
      advanced: PricingPlansAdvancedEditor,
    },
    faqAccordion: {
      wizard: FaqAccordionWizardEditor,
      visual: FaqAccordionVisualEditor,
      advanced: FaqAccordionAdvancedEditor,
    },
    ctaBanner: {
      wizard: CtaBannerWizardEditor,
      visual: CtaBannerVisualEditor,
      advanced: CtaBannerAdvancedEditor,
    },
    logoCloud: {
      wizard: LogoCloudWizardEditor,
      visual: LogoCloudVisualEditor,
      advanced: LogoCloudAdvancedEditor,
    },
    galleryMosaic: {
      wizard: GalleryMosaicWizardEditor,
      visual: GalleryMosaicVisualEditor,
      advanced: GalleryMosaicAdvancedEditor,
    },
    statsKpi: {
      wizard: StatsKpiWizardEditor,
      visual: StatsKpiVisualEditor,
      advanced: StatsKpiAdvancedEditor,
    },
    team: {
      wizard: TeamWizardEditor,
      visual: TeamVisualEditor,
      advanced: TeamAdvancedEditor,
    },
    richTextSection: {
      wizard: RichTextSectionWizardEditor,
      visual: RichTextSectionVisualEditor,
      advanced: RichTextSectionAdvancedEditor,
    },
    contentList: {
      wizard: ContentListWizardEditor,
      visual: ContentListVisualEditor,
      advanced: ContentListAdvancedEditor,
    },
    postsFeed: {
      wizard: PostsFeedWizardEditor,
      visual: PostsFeedVisualEditor,
      advanced: PostsFeedAdvancedEditor,
    },
    entryTeaser: {
      wizard: EntryTeaserWizardEditor,
      visual: EntryTeaserVisualEditor,
      advanced: EntryTeaserAdvancedEditor,
    },
    productGallery: {
      wizard: ProductGalleryWizardEditor,
      visual: ProductGalleryVisualEditor,
      advanced: ProductGalleryAdvancedEditor,
    },
    productCompare: {
      wizard: ProductCompareWizardEditor,
      visual: ProductCompareVisualEditor,
      advanced: ProductCompareAdvancedEditor,
    },
    productTable: {
      wizard: ProductTableWizardEditor,
      visual: ProductTableVisualEditor,
      advanced: ProductTableAdvancedEditor,
    },
    listingFilters: {
      wizard: ListingFiltersWizardEditor,
      visual: ListingFiltersVisualEditor,
      advanced: ListingFiltersAdvancedEditor,
    },
    searchBox: {
      wizard: SearchBoxWizardEditor,
      visual: SearchBoxVisualEditor,
      advanced: SearchBoxAdvancedEditor,
    },
    timeline: {
      wizard: TimelineWizardEditor,
      visual: TimelineVisualEditor,
      advanced: TimelineAdvancedEditor,
    },
    compareTimeline: {
      wizard: CompareTimelineWizardEditor,
      visual: CompareTimelineVisualEditor,
      advanced: CompareTimelineAdvancedEditor,
    },
    formEmbed: {
      wizard: FormEmbedWizardEditor,
      visual: FormEmbedVisualEditor,
      advanced: FormEmbedAdvancedEditor,
    },
    newsletter: {
      wizard: NewsletterWizardEditor,
      visual: NewsletterVisualEditor,
      advanced: NewsletterAdvancedEditor,
    },
    bookingCalendar: {
      wizard: BookingCalendarWizardEditor,
      visual: BookingCalendarVisualEditor,
      advanced: BookingCalendarAdvancedEditor,
    },
    appointmentForm: {
      wizard: AppointmentFormWizardEditor,
      visual: AppointmentFormVisualEditor,
      advanced: AppointmentFormAdvancedEditor,
    },
    contact: {
      wizard: ContactWizardEditor,
      visual: ContactVisualEditor,
      advanced: ContactAdvancedEditor,
    },
    navigation: {
      wizard: NavigationWizardEditor,
      visual: NavigationVisualEditor,
      advanced: NavigationAdvancedEditor,
    },
    footer: {
      wizard: FooterWizardEditor,
      visual: FooterVisualEditor,
      advanced: FooterAdvancedEditor,
    },
  });
}

export function listRegisteredWidgets() {
  ensureCoreWidgetsRegistered();
  return listWidgets();
}

export function listRegisteredPageWidgets() {
  ensureCoreWidgetsRegistered();
  return listWidgetsForSurface("page-builder");
}

export function listRegisteredWidgetLibraryWidgets() {
  ensureCoreWidgetsRegistered();
  return listWidgetsForSurface("widget-library");
}

export function listRegisteredScreenWidgets() {
  ensureCoreWidgetsRegistered();
  return listWidgetsForSurface("custom-screen-builder");
}

export function listRegisteredWidgetsForSurface(input: {
  surface: WidgetSurface;
  contentType?: unknown | null;
}) {
  ensureCoreWidgetsRegistered();
  return listWidgetsForSurfaceContext({
    surface: input.surface,
    hasSelectedContentType: Boolean(input.contentType),
  });
}

export function getRegisteredWidget(type: string) {
  ensureCoreWidgetsRegistered();
  return getWidget(type);
}
