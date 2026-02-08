import { registerCoreWidgets } from "../../../widgets/core";
import { getWidget, listWidgets } from "../../../widgets/registry";
import {
  CompareTimelineAdvancedEditor,
  CompareTimelineVisualEditor,
  CompareTimelineWizardEditor,
  ContactAdvancedEditor,
  ContactVisualEditor,
  ContactWizardEditor,
  CtaBannerAdvancedEditor,
  CtaBannerVisualEditor,
  CtaBannerWizardEditor,
  FaqAccordionAdvancedEditor,
  FaqAccordionVisualEditor,
  FaqAccordionWizardEditor,
  GalleryMosaicAdvancedEditor,
  GalleryMosaicVisualEditor,
  GalleryMosaicWizardEditor,
  LogoCloudAdvancedEditor,
  LogoCloudVisualEditor,
  LogoCloudWizardEditor,
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
