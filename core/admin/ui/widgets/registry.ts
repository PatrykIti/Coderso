import { registerCoreWidgets } from "../../../widgets/core";
import { getWidget, listWidgets } from "../../../widgets/registry";
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
  StackAdvancedEditor,
  StackVisualEditor,
  StackWizardEditor,
  SectionAdvancedEditor,
  SectionVisualEditor,
  SectionWizardEditor,
  ContactAdvancedEditor,
  ContactVisualEditor,
  ContactWizardEditor,
  CtaBannerAdvancedEditor,
  CtaBannerVisualEditor,
  CtaBannerWizardEditor,
  ContentListAdvancedEditor,
  ContentListVisualEditor,
  ContentListWizardEditor,
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
    entryTeaser: {
      wizard: EntryTeaserWizardEditor,
      visual: EntryTeaserVisualEditor,
      advanced: EntryTeaserAdvancedEditor,
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
    newsletter: {
      wizard: NewsletterWizardEditor,
      visual: NewsletterVisualEditor,
      advanced: NewsletterAdvancedEditor,
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

export function getRegisteredWidget(type: string) {
  ensureCoreWidgetsRegistered();
  return getWidget(type);
}
