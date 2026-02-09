import type { ComponentType } from "react";

import { registerCoreWidgets } from "./core";
import type { WidgetEditorProps } from "./types";

const NullEditor: ComponentType<WidgetEditorProps<any>> = () => null;

const noopEditors = {
  wizard: NullEditor,
  visual: NullEditor,
  advanced: NullEditor,
};

let registered = false;

export function ensureRuntimeWidgetsRegistered() {
  if (registered) return;
  registerCoreWidgets({
    section: noopEditors,
    gridColumns: noopEditors,
    stack: noopEditors,
    hero: noopEditors,
    featureGrid: noopEditors,
    testimonials: noopEditors,
    pricingPlans: noopEditors,
    faqAccordion: noopEditors,
    ctaBanner: noopEditors,
    logoCloud: noopEditors,
    galleryMosaic: noopEditors,
    statsKpi: noopEditors,
    team: noopEditors,
    richTextSection: noopEditors,
    contentList: noopEditors,
    entryTeaser: noopEditors,
    timeline: noopEditors,
    compareTimeline: noopEditors,
    newsletter: noopEditors,
    contact: noopEditors,
    navigation: noopEditors,
    footer: noopEditors,
  });
  registered = true;
}
