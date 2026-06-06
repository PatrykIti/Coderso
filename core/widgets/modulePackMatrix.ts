export type WidgetPackEnforcement = "strict" | "advisory";

export type WidgetPackMinimum = {
  pagePresets: number;
  sectionPresets: number;
  compositeWidgets: number;
};

export type ModuleWidgetPackDefinition = {
  module: string;
  label: string;
  enforcement: WidgetPackEnforcement;
  minimum: WidgetPackMinimum;
  pagePresets: string[];
  sectionPresets: string[];
  compositeWidgets: string[];
  assistantPageSections?: Array<{
    alias: string;
    widgetType: string;
    pagePresets?: string[];
    sectionPresets?: string[];
  }>;
  notes?: string;
};

const DEFAULT_MINIMUM: WidgetPackMinimum = {
  pagePresets: 1,
  sectionPresets: 2,
  compositeWidgets: 3,
};

export const WIDGET_PACK_MATRIX: ModuleWidgetPackDefinition[] = [
  {
    module: "content",
    label: "Content",
    enforcement: "strict",
    minimum: DEFAULT_MINIMUM,
    pagePresets: ["content:landing-home"],
    sectionPresets: ["content:hero-benefits", "content:proof-cta"],
    compositeWidgets: ["hero", "feature-grid", "cta-banner"],
    assistantPageSections: [
      {
        alias: "hero",
        widgetType: "hero",
        pagePresets: ["content:landing-home"],
        sectionPresets: ["content:hero-benefits"],
      },
      {
        alias: "cta",
        widgetType: "cta-banner",
        pagePresets: ["content:landing-home"],
        sectionPresets: ["content:proof-cta"],
      },
      {
        alias: "process",
        widgetType: "feature-grid",
        pagePresets: ["content:landing-home"],
        sectionPresets: ["content:hero-benefits"],
      },
    ],
  },
  {
    module: "forms",
    label: "Forms",
    enforcement: "strict",
    minimum: DEFAULT_MINIMUM,
    pagePresets: ["forms:lead-capture"],
    sectionPresets: ["forms:intake-inline", "forms:contact-split"],
    compositeWidgets: ["contact", "form-embed", "newsletter"],
    assistantPageSections: [
      {
        alias: "form-embed",
        widgetType: "form-embed",
        pagePresets: ["forms:lead-capture"],
        sectionPresets: ["forms:intake-inline"],
      },
      {
        alias: "contact",
        widgetType: "contact",
        pagePresets: ["forms:lead-capture"],
        sectionPresets: ["forms:contact-split"],
      },
    ],
  },
  {
    module: "listings",
    label: "Listings",
    enforcement: "strict",
    minimum: DEFAULT_MINIMUM,
    pagePresets: ["listings:directory-index"],
    sectionPresets: ["listings:grid-filters", "listings:teaser-stack"],
    compositeWidgets: ["content-list", "posts-feed", "entry-teaser", "listing-filters"],
    assistantPageSections: [
      {
        alias: "listing-filters",
        widgetType: "listing-filters",
        pagePresets: ["listings:directory-index"],
        sectionPresets: ["listings:grid-filters"],
      },
      {
        alias: "content-list",
        widgetType: "content-list",
        pagePresets: ["listings:directory-index"],
        sectionPresets: ["listings:teaser-stack"],
      },
      {
        alias: "posts-feed",
        widgetType: "posts-feed",
        pagePresets: ["listings:directory-index"],
        sectionPresets: ["listings:teaser-stack"],
      },
    ],
  },
  {
    module: "commerce",
    label: "Commerce",
    enforcement: "strict",
    minimum: DEFAULT_MINIMUM,
    pagePresets: ["commerce:catalog-home"],
    sectionPresets: ["commerce:gallery-compare", "commerce:table-specs"],
    compositeWidgets: ["product-gallery", "product-compare", "product-table"],
  },
  {
    module: "navigation",
    label: "Navigation",
    enforcement: "advisory",
    minimum: DEFAULT_MINIMUM,
    pagePresets: ["navigation:site-shell"],
    sectionPresets: ["navigation:header-main", "navigation:footer-columns"],
    compositeWidgets: ["navigation", "footer"],
    notes: "Missing one composite in v1; tracked as roadmap gap.",
  },
  {
    module: "booking",
    label: "Booking",
    enforcement: "advisory",
    minimum: DEFAULT_MINIMUM,
    pagePresets: ["booking:service-landing"],
    sectionPresets: ["booking:calendar-intake", "booking:confirm-panel"],
    compositeWidgets: ["booking-calendar", "appointment-form"],
    notes: "Missing one composite in v1; tracked for appointments expansion.",
  },
  {
    module: "search",
    label: "Search",
    enforcement: "advisory",
    minimum: DEFAULT_MINIMUM,
    pagePresets: ["search:results-shell"],
    sectionPresets: ["search:query-summary", "search:result-cards"],
    compositeWidgets: ["search-box"],
    notes: "Search relies on listing composites; dedicated pack in progress.",
  },
  {
    module: "media",
    label: "Media",
    enforcement: "advisory",
    minimum: DEFAULT_MINIMUM,
    pagePresets: ["media:gallery-showcase"],
    sectionPresets: ["media:mosaic-band", "media:logo-strip"],
    compositeWidgets: ["gallery-mosaic"],
    notes: "Media-focused composites are planned beyond gallery v1.",
  },
  {
    module: "engagement",
    label: "Engagement",
    enforcement: "advisory",
    minimum: DEFAULT_MINIMUM,
    pagePresets: ["engagement:trust-loop"],
    sectionPresets: ["engagement:faq-proof", "engagement:testimonials-cta"],
    compositeWidgets: ["testimonials", "faq-accordion"],
    assistantPageSections: [
      {
        alias: "faq",
        widgetType: "faq-accordion",
        pagePresets: ["engagement:trust-loop"],
        sectionPresets: ["engagement:faq-proof"],
      },
      {
        alias: "testimonials",
        widgetType: "testimonials",
        pagePresets: ["engagement:trust-loop"],
        sectionPresets: ["engagement:testimonials-cta"],
      },
    ],
    notes: "One additional engagement composite remains on roadmap.",
  },
];

export function listWidgetPackMatrix() {
  return WIDGET_PACK_MATRIX;
}
