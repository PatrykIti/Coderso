import type { ComponentType } from "react";

import { registerCoreWidgets } from "./core";
import { getWidget } from "./registry";
import type { WidgetEditorProps } from "./types";

const NullEditor: ComponentType<WidgetEditorProps<any>> = () => null;

const noopEditors = {
  wizard: NullEditor,
  visual: NullEditor,
  advanced: NullEditor,
};

let registered = false;

export function ensureRuntimeWidgetsRegistered() {
  if (registered && getWidget("content-list")) {
    return;
  }

  registerCoreWidgets({
    section: noopEditors,
    templateSection: noopEditors,
    gridColumns: noopEditors,
    splitLayout: noopEditors,
    tabs: noopEditors,
    accordion: noopEditors,
    toggleBlock: noopEditors,
    spacer: noopEditors,
    divider: noopEditors,
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
    postsFeed: noopEditors,
    entryTeaser: noopEditors,
    productGallery: noopEditors,
    productCompare: noopEditors,
    productTable: noopEditors,
    listingFilters: noopEditors,
    searchBox: noopEditors,
    timeline: noopEditors,
    compareTimeline: noopEditors,
    newsletter: noopEditors,
    bookingCalendar: noopEditors,
    appointmentForm: noopEditors,
    formEmbed: noopEditors,
    contact: noopEditors,
    navigation: noopEditors,
    footer: noopEditors,
  });
  registered = true;
}
