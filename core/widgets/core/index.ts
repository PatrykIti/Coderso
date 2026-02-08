import type { ComponentType } from "react";
import type { WidgetDefinition, WidgetEditorProps } from "../types";
import { getWidget, registerWidget } from "../registry";
import { createCompareTimelineWidget, type CompareTimelineData } from "./compareTimeline";
import { createContactWidget, type ContactData } from "./contact";
import { createFeatureGridWidget, type FeatureGridData } from "./featureGrid";
import { createFooterWidget, type FooterData } from "./footer";
import { createHeroWidget, type HeroData } from "./hero";
import { createNavigationWidget, type NavigationData } from "./navigation";
import { createNewsletterWidget, type NewsletterData } from "./newsletter";
import { createTimelineWidget, type TimelineData } from "./timeline";

type EditorBundle<T> = {
  wizard: ComponentType<WidgetEditorProps<T>>;
  visual: ComponentType<WidgetEditorProps<T>>;
  advanced: ComponentType<WidgetEditorProps<T>>;
};

export type CoreWidgetEditors = {
  hero: EditorBundle<HeroData>;
  featureGrid: EditorBundle<FeatureGridData>;
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
