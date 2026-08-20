/**
 * Detail-page v1 to v2 widget conversion map (TASK-580-03-L02).
 *
 * Canonical, pure, Bun-free conversion table for the TASK-580-03 parent:
 * per registered widget type, the V2 section/block shape it maps to, plus the
 * binding fieldPath remap. `null` entries (`navigation` / `footer`) are DROPPED
 * by the migration (the site shell owns them); any other registered type maps
 * to a `custom` section with one read-only `legacy-widget` block whose `data`
 * is preserved verbatim.
 *
 * This module must stay free of `db/*`, runtime/server, and settings imports.
 * The conversion executor lives in detailPageV2Conversion.ts.
 */
import {
  type PageBlockType,
  type PageSectionType,
  type PageSectionVariant,
} from "../pages/pageDocumentV2";

export type WidgetConversionRole =
  | "heading"
  | "text"
  | "badge"
  | "button"
  | "image"
  | "card"
  | `card-${number}`
  | "columns"
  | "divider"
  | "spacer"
  | "collection"
  | "filters"
  | "form"
  | "embed"
  | "legacy";

/** Binding drop reason codes (machine-readable, ordered in binding order). */
export type BindingDropReason =
  "unknown_widget_block" | "dropped_widget_type" | "unmapped_prop_path";

export type BindingDropReport = {
  bindingId: string;
  reason: BindingDropReason;
};

export type WidgetConversionRoleSpec = {
  role: WidgetConversionRole;
  /** Widget-data path the block prop is extracted from (e.g. "headline"). */
  from?: string;
  /** V2 block prop key written from `from` (real `pageBlockPropKeys` name). */
  propPath?: string;
  /** Additional prop mappings for the same block (e.g. button label+href). */
  extraProps?: Array<{ from: string; propPath: string }>;
};

export type WidgetConversionItemRoleSpec = {
  /** Base role name; the per-item block id is `<widgetId>-<base>-<itemIndex>`. */
  role: string;
  blockType: PageBlockType;
  /** Item-data path the block prop is extracted from (e.g. "title"). */
  from: string;
  /** V2 block prop key written from `from`. */
  propPath: string;
  /** Additional prop mappings for the same block. */
  extraProps?: Array<{ from: string; propPath: string }>;
};

export type WidgetConversionSpec = {
  /** "custom" for placeholders. */
  sectionType: PageSectionType;
  sectionVariant: PageSectionVariant;
  roles: WidgetConversionRoleSpec[];
  /**
   * Binding fieldPath (the v1 widget-data path, e.g. "headline",
   * "badge.label") → { role, propPath }. `role` may use the occurrence syntax
   * `heading:1` (second static heading block) or the per-item wildcard
   * `card-*` / `question-*` resolved against the item index.
   */
  bindingRemap: Record<string, { role: string; propPath: string }>;
  /** Per-item role expansion (feature-grid items, timeline steps, ...). */
  itemRoles?: {
    /** Widget-data path to the items array. */
    dataPath: string;
    rolesPerItem: WidgetConversionItemRoleSpec[];
  };
  /**
   * Per-item binding field map: item field (e.g. "title") → role template
   * (`card-*`) + propPath. The `*` is replaced with the item index.
   */
  itemBindingRemap?: Record<string, { role: string; propPath: string }>;
};

export const DEFAULT_LEGACY_SPEC: WidgetConversionSpec = {
  sectionType: "custom",
  sectionVariant: "default",
  roles: [{ role: "legacy" }],
  bindingRemap: {}, // bindings targeting legacy blocks are DROPPED.
};

const HERO_SPEC: WidgetConversionSpec = {
  sectionType: "hero",
  sectionVariant: "centered",
  roles: [
    { role: "heading", from: "headline", propPath: "text" },
    { role: "text", from: "body", propPath: "text" },
    { role: "badge", from: "badge.label", propPath: "text" },
    {
      role: "button",
      from: "primaryCta.label",
      propPath: "label",
      extraProps: [{ from: "primaryCta.href", propPath: "href" }],
    },
    {
      role: "image",
      from: "media.src",
      propPath: "src",
      extraProps: [{ from: "media.alt", propPath: "alt" }],
    },
  ],
  bindingRemap: {
    headline: { role: "heading", propPath: "text" },
    body: { role: "text", propPath: "text" },
    "badge.label": { role: "badge", propPath: "text" },
    "primaryCta.label": { role: "button", propPath: "label" },
    "primaryCta.href": { role: "button", propPath: "href" },
    media: { role: "image", propPath: "src" },
    "media.src": { role: "image", propPath: "src" },
    "media.alt": { role: "image", propPath: "alt" },
  },
};

const TIMELINE_SPEC: WidgetConversionSpec = {
  sectionType: "timeline",
  sectionVariant: "default",
  roles: [
    { role: "heading", from: "header.title", propPath: "text" },
    { role: "text", from: "header.description", propPath: "text" },
  ],
  itemRoles: {
    dataPath: "steps",
    rolesPerItem: [
      { role: "card", blockType: "card", from: "title", propPath: "title" },
      { role: "card", blockType: "card", from: "description", propPath: "text" },
    ],
  },
  bindingRemap: {
    "header.title": { role: "heading", propPath: "text" },
    "header.description": { role: "text", propPath: "text" },
  },
  itemBindingRemap: {
    title: { role: "card-*", propPath: "title" },
    description: { role: "card-*", propPath: "text" },
  },
};

const FAQ_ACCORDION_SPEC: WidgetConversionSpec = {
  sectionType: "faq",
  sectionVariant: "default",
  roles: [{ role: "heading", from: "header.title", propPath: "text" }],
  itemRoles: {
    dataPath: "items",
    rolesPerItem: [
      { role: "question", blockType: "heading", from: "question", propPath: "text" },
      { role: "answer", blockType: "text", from: "answer", propPath: "text" },
    ],
  },
  bindingRemap: {
    "header.title": { role: "heading", propPath: "text" },
    "header.description": { role: "text", propPath: "text" },
  },
  itemBindingRemap: {
    question: { role: "question-*", propPath: "text" },
    answer: { role: "answer-*", propPath: "text" },
  },
};

const CTA_BANNER_SPEC: WidgetConversionSpec = {
  sectionType: "cta",
  sectionVariant: "centered",
  roles: [
    { role: "heading", from: "content.title", propPath: "text" },
    { role: "text", from: "content.description", propPath: "text" },
    {
      role: "button",
      from: "actions.primaryCta.label",
      propPath: "label",
      extraProps: [{ from: "actions.primaryCta.href", propPath: "href" }],
    },
  ],
  bindingRemap: {
    "content.title": { role: "heading", propPath: "text" },
    "content.description": { role: "text", propPath: "text" },
    "actions.primaryCta.label": { role: "button", propPath: "label" },
    "actions.primaryCta.href": { role: "button", propPath: "href" },
  },
};

const FEATURE_GRID_SPEC: WidgetConversionSpec = {
  sectionType: "feature-grid",
  sectionVariant: "cards",
  roles: [
    { role: "heading", from: "header.eyebrow", propPath: "text" },
    { role: "heading", from: "header.title", propPath: "text" },
    { role: "text", from: "header.description", propPath: "text" },
  ],
  itemRoles: {
    dataPath: "items",
    rolesPerItem: [
      { role: "card", blockType: "card", from: "title", propPath: "title" },
      { role: "card", blockType: "card", from: "description", propPath: "text" },
    ],
  },
  bindingRemap: {
    "header.eyebrow": { role: "heading", propPath: "text" },
    // Second static heading occurrence (role index syntax).
    "header.title": { role: "heading:1", propPath: "text" },
    "header.description": { role: "text", propPath: "text" },
  },
  itemBindingRemap: {
    title: { role: "card-*", propPath: "title" },
    description: { role: "card-*", propPath: "text" },
  },
};

const TESTIMONIALS_SPEC: WidgetConversionSpec = {
  sectionType: "testimonials",
  sectionVariant: "cards",
  roles: [
    { role: "heading", from: "header.title", propPath: "text" },
    { role: "text", from: "header.description", propPath: "text" },
  ],
  itemRoles: {
    dataPath: "testimonials",
    rolesPerItem: [
      { role: "quote", blockType: "quote", from: "quote", propPath: "text" },
      { role: "quote", blockType: "quote", from: "author", propPath: "cite" },
    ],
  },
  bindingRemap: {
    "header.title": { role: "heading", propPath: "text" },
    "header.description": { role: "text", propPath: "text" },
  },
  itemBindingRemap: {
    quote: { role: "quote-*", propPath: "text" },
    author: { role: "quote-*", propPath: "cite" },
  },
};

const GALLERY_MOSAIC_SPEC: WidgetConversionSpec = {
  sectionType: "gallery",
  sectionVariant: "grid",
  roles: [{ role: "heading", from: "header.title", propPath: "text" }],
  itemRoles: {
    dataPath: "items",
    rolesPerItem: [
      { role: "image", blockType: "image", from: "image", propPath: "src" },
      { role: "image", blockType: "image", from: "alt", propPath: "alt" },
    ],
  },
  bindingRemap: {
    "header.title": { role: "heading", propPath: "text" },
  },
  itemBindingRemap: {
    image: { role: "image-*", propPath: "src" },
    alt: { role: "image-*", propPath: "alt" },
  },
};

const GRID_COLUMNS_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [{ role: "columns" }],
  bindingRemap: {},
};

const RICH_TEXT_SECTION_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [
    { role: "heading", from: "titleBlock.title", propPath: "text" },
    { role: "text", from: "body.html", propPath: "text" },
  ],
  bindingRemap: {
    "titleBlock.title": { role: "heading", propPath: "text" },
    "body.html": { role: "text", propPath: "text" },
  },
};

const DIVIDER_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [{ role: "divider", from: "thickness", propPath: "thickness" }],
  bindingRemap: {},
};

const SPACER_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [{ role: "spacer", from: "height.desktop", propPath: "size" }],
  bindingRemap: {},
};

const CONTENT_LIST_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [{ role: "collection" }],
  bindingRemap: {
    "source.contentTypeId": { role: "collection", propPath: "contentTypeId" },
    "source.listingQueryId": { role: "collection", propPath: "queryId" },
    "source.limit": { role: "collection", propPath: "limit" },
  },
};

const POSTS_FEED_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [{ role: "collection" }],
  bindingRemap: {
    "source.limit": { role: "collection", propPath: "limit" },
  },
};

const LISTING_FILTERS_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [{ role: "filters" }],
  bindingRemap: {
    listingQueryId: { role: "filters", propPath: "queryId" },
  },
};

const ENTRY_TEASER_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [
    {
      role: "card",
      from: "section.title",
      propPath: "title",
      extraProps: [
        { from: "section.description", propPath: "text" },
        { from: "cta.href", propPath: "href" },
        { from: "section.image", propPath: "image" },
      ],
    },
  ],
  bindingRemap: {
    "section.title": { role: "card", propPath: "title" },
    "cta.href": { role: "card", propPath: "href" },
  },
};

const FORM_EMBED_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [{ role: "embed" }],
  bindingRemap: {},
};

/** Contact/newsletter: form block only when a resolvable formId exists. */
export const CONTACT_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [{ role: "form" }],
  bindingRemap: {},
};

export const NEWSLETTER_SPEC: WidgetConversionSpec = {
  sectionType: "content",
  sectionVariant: "default",
  roles: [{ role: "form" }],
  bindingRemap: {},
};

/**
 * Exhaustive widget→V2 conversion map over the 42 registered widget types
 * (`core/widgets/core/*`, verified via the type ids of the `create*Widget`
 * definitions). `null` = the widget is dropped by the migration
 * (`navigation` / `footer`; the site shell owns header/footer).
 */
export const WIDGET_TO_V2_MAP: Record<string, WidgetConversionSpec | null> = {
  hero: HERO_SPEC,
  timeline: TIMELINE_SPEC,
  "faq-accordion": FAQ_ACCORDION_SPEC,
  "cta-banner": CTA_BANNER_SPEC,
  "feature-grid": FEATURE_GRID_SPEC,
  testimonials: TESTIMONIALS_SPEC,
  "gallery-mosaic": GALLERY_MOSAIC_SPEC,
  "grid-columns": GRID_COLUMNS_SPEC,
  "rich-text-section": RICH_TEXT_SECTION_SPEC,
  divider: DIVIDER_SPEC,
  spacer: SPACER_SPEC,
  "content-list": CONTENT_LIST_SPEC,
  "posts-feed": POSTS_FEED_SPEC,
  "listing-filters": LISTING_FILTERS_SPEC,
  "entry-teaser": ENTRY_TEASER_SPEC,
  "form-embed": FORM_EMBED_SPEC,
  contact: CONTACT_SPEC,
  newsletter: NEWSLETTER_SPEC,
  navigation: null, // DROP (site shell owns nav)
  footer: null, // DROP (site shell owns footer)
  // Remaining 22 registered types → custom section + legacy-widget placeholder.
  accordion: DEFAULT_LEGACY_SPEC,
  "appointment-form": DEFAULT_LEGACY_SPEC,
  "booking-calendar": DEFAULT_LEGACY_SPEC,
  "compare-timeline": DEFAULT_LEGACY_SPEC,
  "logo-cloud": DEFAULT_LEGACY_SPEC,
  "pricing-plans": DEFAULT_LEGACY_SPEC,
  "product-compare": DEFAULT_LEGACY_SPEC,
  "product-gallery": DEFAULT_LEGACY_SPEC,
  "product-table": DEFAULT_LEGACY_SPEC,
  "screen-field-group": DEFAULT_LEGACY_SPEC,
  "screen-field-value": DEFAULT_LEGACY_SPEC,
  "screen-record-header": DEFAULT_LEGACY_SPEC,
  "screen-two-column": DEFAULT_LEGACY_SPEC,
  "search-box": DEFAULT_LEGACY_SPEC,
  section: DEFAULT_LEGACY_SPEC,
  "split-layout": DEFAULT_LEGACY_SPEC,
  stack: DEFAULT_LEGACY_SPEC,
  "stats-kpi": DEFAULT_LEGACY_SPEC,
  tabs: DEFAULT_LEGACY_SPEC,
  team: DEFAULT_LEGACY_SPEC,
  "template-section": DEFAULT_LEGACY_SPEC,
  "toggle-block": DEFAULT_LEGACY_SPEC,
};

/** The 42 registered widget types the map is exhaustive over. */
export const REGISTERED_WIDGET_TYPES = [
  "hero",
  "timeline",
  "faq-accordion",
  "cta-banner",
  "feature-grid",
  "testimonials",
  "gallery-mosaic",
  "grid-columns",
  "rich-text-section",
  "divider",
  "spacer",
  "content-list",
  "posts-feed",
  "listing-filters",
  "entry-teaser",
  "form-embed",
  "contact",
  "newsletter",
  "navigation",
  "footer",
  "accordion",
  "appointment-form",
  "booking-calendar",
  "compare-timeline",
  "logo-cloud",
  "pricing-plans",
  "product-compare",
  "product-gallery",
  "product-table",
  "screen-field-group",
  "screen-field-value",
  "screen-record-header",
  "screen-two-column",
  "search-box",
  "section",
  "split-layout",
  "stack",
  "stats-kpi",
  "tabs",
  "team",
  "template-section",
  "toggle-block",
] as const;

export const CONVERTED_WIDGET_TYPES = REGISTERED_WIDGET_TYPES.filter(
  (type) => WIDGET_TO_V2_MAP[type] !== null
);
