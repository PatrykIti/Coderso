import { lazy, type ComponentType } from "react";
import { registerCoreWidgets, type CoreWidgetEditors } from "../../../widgets/core";
import {
  getWidget,
  listWidgets,
  listWidgetsForSurface,
  listWidgetsForSurfaceContext,
} from "../../../widgets/registry";
import type { WidgetEditorComponent, WidgetSurface } from "../../../widgets/types";

/**
 * Wraps a named editor export in a React.lazy component so editor modules load
 * only when a concrete widget editor mode is rendered. The loader map below
 * stays exhaustive for every CoreWidgetEditors key through `satisfies
 * CoreWidgetEditors`; the data type `T` is inferred contextually from the
 * expected editor slot.
 */
function lazyNamedEditor<T>(
  loadModule: () => Promise<unknown>,
  exportName: string
): WidgetEditorComponent<T> {
  // React.lazy requires a ComponentType default; the editor export is a
  // function component whose real prop shape is T. Casting at the lazy
  // boundary keeps the public loader map typed as WidgetEditorComponent<T>
  // while React.lazy drives the module fetch (repo precedent:
  // core/admin/app/adminRouteComponents.tsx).
  const LazyComponent = lazy<ComponentType<Record<string, unknown>>>(async () => {
    const module = (await loadModule()) as Record<string, unknown>;
    const component = module[exportName];
    if (typeof component !== "function") {
      throw new Error(`widget_editor_export_missing:${exportName}`);
    }
    return { default: component as ComponentType<Record<string, unknown>> };
  });
  return LazyComponent as WidgetEditorComponent<T>;
}

const editorLoaders = {
  section: {
    wizard: lazyNamedEditor(() => import("./editors/SectionEditors"), "SectionWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/SectionEditors"), "SectionVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/SectionEditors"), "SectionAdvancedEditor"),
  },
  templateSection: {
    wizard: lazyNamedEditor(
      () => import("./editors/TemplateSectionEditors"),
      "TemplateSectionWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/TemplateSectionEditors"),
      "TemplateSectionVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/TemplateSectionEditors"),
      "TemplateSectionAdvancedEditor"
    ),
  },
  gridColumns: {
    wizard: lazyNamedEditor(
      () => import("./editors/GridColumnsEditors"),
      "GridColumnsWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/GridColumnsEditors"),
      "GridColumnsVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/GridColumnsEditors"),
      "GridColumnsAdvancedEditor"
    ),
  },
  splitLayout: {
    wizard: lazyNamedEditor(
      () => import("./editors/SplitLayoutEditors"),
      "SplitLayoutWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/SplitLayoutEditors"),
      "SplitLayoutVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/SplitLayoutEditors"),
      "SplitLayoutAdvancedEditor"
    ),
  },
  tabs: {
    wizard: lazyNamedEditor(() => import("./editors/TabsEditors"), "TabsWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/TabsEditors"), "TabsVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/TabsEditors"), "TabsAdvancedEditor"),
  },
  accordion: {
    wizard: lazyNamedEditor(() => import("./editors/AccordionEditors"), "AccordionWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/AccordionEditors"), "AccordionVisualEditor"),
    advanced: lazyNamedEditor(
      () => import("./editors/AccordionEditors"),
      "AccordionAdvancedEditor"
    ),
  },
  toggleBlock: {
    wizard: lazyNamedEditor(
      () => import("./editors/ToggleBlockEditors"),
      "ToggleBlockWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/ToggleBlockEditors"),
      "ToggleBlockVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/ToggleBlockEditors"),
      "ToggleBlockAdvancedEditor"
    ),
  },
  spacer: {
    wizard: lazyNamedEditor(() => import("./editors/SpacerEditors"), "SpacerWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/SpacerEditors"), "SpacerVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/SpacerEditors"), "SpacerAdvancedEditor"),
  },
  divider: {
    wizard: lazyNamedEditor(() => import("./editors/DividerEditors"), "DividerWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/DividerEditors"), "DividerVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/DividerEditors"), "DividerAdvancedEditor"),
  },
  stack: {
    wizard: lazyNamedEditor(() => import("./editors/StackEditors"), "StackWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/StackEditors"), "StackVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/StackEditors"), "StackAdvancedEditor"),
  },
  hero: {
    wizard: lazyNamedEditor(() => import("./editors/HeroEditors"), "HeroWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/HeroEditors"), "HeroVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/HeroEditors"), "HeroAdvancedEditor"),
  },
  featureGrid: {
    wizard: lazyNamedEditor(
      () => import("./editors/FeatureGridEditors"),
      "FeatureGridWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/FeatureGridEditors"),
      "FeatureGridVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/FeatureGridEditors"),
      "FeatureGridAdvancedEditor"
    ),
  },
  testimonials: {
    wizard: lazyNamedEditor(
      () => import("./editors/TestimonialsEditors"),
      "TestimonialsWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/TestimonialsEditors"),
      "TestimonialsVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/TestimonialsEditors"),
      "TestimonialsAdvancedEditor"
    ),
  },
  pricingPlans: {
    wizard: lazyNamedEditor(
      () => import("./editors/PricingPlansEditors"),
      "PricingPlansWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/PricingPlansEditors"),
      "PricingPlansVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/PricingPlansEditors"),
      "PricingPlansAdvancedEditor"
    ),
  },
  faqAccordion: {
    wizard: lazyNamedEditor(
      () => import("./editors/FaqAccordionEditors"),
      "FaqAccordionWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/FaqAccordionEditors"),
      "FaqAccordionVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/FaqAccordionEditors"),
      "FaqAccordionAdvancedEditor"
    ),
  },
  ctaBanner: {
    wizard: lazyNamedEditor(() => import("./editors/CtaBannerEditors"), "CtaBannerWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/CtaBannerEditors"), "CtaBannerVisualEditor"),
    advanced: lazyNamedEditor(
      () => import("./editors/CtaBannerEditors"),
      "CtaBannerAdvancedEditor"
    ),
  },
  logoCloud: {
    wizard: lazyNamedEditor(() => import("./editors/LogoCloudEditors"), "LogoCloudWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/LogoCloudEditors"), "LogoCloudVisualEditor"),
    advanced: lazyNamedEditor(
      () => import("./editors/LogoCloudEditors"),
      "LogoCloudAdvancedEditor"
    ),
  },
  galleryMosaic: {
    wizard: lazyNamedEditor(
      () => import("./editors/GalleryMosaicEditors"),
      "GalleryMosaicWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/GalleryMosaicEditors"),
      "GalleryMosaicVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/GalleryMosaicEditors"),
      "GalleryMosaicAdvancedEditor"
    ),
  },
  statsKpi: {
    wizard: lazyNamedEditor(() => import("./editors/StatsKpiEditors"), "StatsKpiWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/StatsKpiEditors"), "StatsKpiVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/StatsKpiEditors"), "StatsKpiAdvancedEditor"),
  },
  team: {
    wizard: lazyNamedEditor(() => import("./editors/TeamEditors"), "TeamWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/TeamEditors"), "TeamVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/TeamEditors"), "TeamAdvancedEditor"),
  },
  richTextSection: {
    wizard: lazyNamedEditor(
      () => import("./editors/RichTextSectionEditors"),
      "RichTextSectionWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/RichTextSectionEditors"),
      "RichTextSectionVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/RichTextSectionEditors"),
      "RichTextSectionAdvancedEditor"
    ),
  },
  contentList: {
    wizard: lazyNamedEditor(
      () => import("./editors/ContentListEditors"),
      "ContentListWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/ContentListEditors"),
      "ContentListVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/ContentListEditors"),
      "ContentListAdvancedEditor"
    ),
  },
  postsFeed: {
    wizard: lazyNamedEditor(() => import("./editors/PostsFeedEditors"), "PostsFeedWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/PostsFeedEditors"), "PostsFeedVisualEditor"),
    advanced: lazyNamedEditor(
      () => import("./editors/PostsFeedEditors"),
      "PostsFeedAdvancedEditor"
    ),
  },
  entryTeaser: {
    wizard: lazyNamedEditor(
      () => import("./editors/EntryTeaserEditors"),
      "EntryTeaserWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/EntryTeaserEditors"),
      "EntryTeaserVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/EntryTeaserEditors"),
      "EntryTeaserAdvancedEditor"
    ),
  },
  productGallery: {
    wizard: lazyNamedEditor(
      () => import("./editors/ProductGalleryEditors"),
      "ProductGalleryWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/ProductGalleryEditors"),
      "ProductGalleryVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/ProductGalleryEditors"),
      "ProductGalleryAdvancedEditor"
    ),
  },
  productCompare: {
    wizard: lazyNamedEditor(
      () => import("./editors/ProductCompareEditors"),
      "ProductCompareWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/ProductCompareEditors"),
      "ProductCompareVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/ProductCompareEditors"),
      "ProductCompareAdvancedEditor"
    ),
  },
  productTable: {
    wizard: lazyNamedEditor(
      () => import("./editors/ProductTableEditors"),
      "ProductTableWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/ProductTableEditors"),
      "ProductTableVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/ProductTableEditors"),
      "ProductTableAdvancedEditor"
    ),
  },
  listingFilters: {
    wizard: lazyNamedEditor(
      () => import("./editors/ListingFiltersEditors"),
      "ListingFiltersWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/ListingFiltersEditors"),
      "ListingFiltersVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/ListingFiltersEditors"),
      "ListingFiltersAdvancedEditor"
    ),
  },
  searchBox: {
    wizard: lazyNamedEditor(() => import("./editors/SearchBoxEditors"), "SearchBoxWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/SearchBoxEditors"), "SearchBoxVisualEditor"),
    advanced: lazyNamedEditor(
      () => import("./editors/SearchBoxEditors"),
      "SearchBoxAdvancedEditor"
    ),
  },
  timeline: {
    wizard: lazyNamedEditor(() => import("./editors/TimelineEditors"), "TimelineWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/TimelineEditors"), "TimelineVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/TimelineEditors"), "TimelineAdvancedEditor"),
  },
  compareTimeline: {
    wizard: lazyNamedEditor(
      () => import("./editors/CompareTimelineEditors"),
      "CompareTimelineWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/CompareTimelineEditors"),
      "CompareTimelineVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/CompareTimelineEditors"),
      "CompareTimelineAdvancedEditor"
    ),
  },
  newsletter: {
    wizard: lazyNamedEditor(() => import("./editors/NewsletterEditors"), "NewsletterWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/NewsletterEditors"), "NewsletterVisualEditor"),
    advanced: lazyNamedEditor(
      () => import("./editors/NewsletterEditors"),
      "NewsletterAdvancedEditor"
    ),
  },
  bookingCalendar: {
    wizard: lazyNamedEditor(
      () => import("./editors/BookingCalendarEditors"),
      "BookingCalendarWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/BookingCalendarEditors"),
      "BookingCalendarVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/BookingCalendarEditors"),
      "BookingCalendarAdvancedEditor"
    ),
  },
  appointmentForm: {
    wizard: lazyNamedEditor(
      () => import("./editors/AppointmentFormEditors"),
      "AppointmentFormWizardEditor"
    ),
    visual: lazyNamedEditor(
      () => import("./editors/AppointmentFormEditors"),
      "AppointmentFormVisualEditor"
    ),
    advanced: lazyNamedEditor(
      () => import("./editors/AppointmentFormEditors"),
      "AppointmentFormAdvancedEditor"
    ),
  },
  formEmbed: {
    wizard: lazyNamedEditor(() => import("./editors/FormEmbedEditors"), "FormEmbedWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/FormEmbedEditors"), "FormEmbedVisualEditor"),
    advanced: lazyNamedEditor(
      () => import("./editors/FormEmbedEditors"),
      "FormEmbedAdvancedEditor"
    ),
  },
  contact: {
    wizard: lazyNamedEditor(() => import("./editors/ContactEditors"), "ContactWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/ContactEditors"), "ContactVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/ContactEditors"), "ContactAdvancedEditor"),
  },
  navigation: {
    wizard: lazyNamedEditor(() => import("./editors/NavigationEditors"), "NavigationWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/NavigationEditors"), "NavigationVisualEditor"),
    advanced: lazyNamedEditor(
      () => import("./editors/NavigationEditors"),
      "NavigationAdvancedEditor"
    ),
  },
  footer: {
    wizard: lazyNamedEditor(() => import("./editors/FooterEditors"), "FooterWizardEditor"),
    visual: lazyNamedEditor(() => import("./editors/FooterEditors"), "FooterVisualEditor"),
    advanced: lazyNamedEditor(() => import("./editors/FooterEditors"), "FooterAdvancedEditor"),
  },
} satisfies CoreWidgetEditors;

export function ensureCoreWidgetsRegistered() {
  registerCoreWidgets(editorLoaders);
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
