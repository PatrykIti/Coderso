import { registerCoreWidgets } from "../../../widgets/core";
import { getWidget, listWidgets } from "../../../widgets/registry";
import {
  CompareTimelineAdvancedEditor,
  CompareTimelineVisualEditor,
  CompareTimelineWizardEditor,
  ContactAdvancedEditor,
  ContactVisualEditor,
  ContactWizardEditor,
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
