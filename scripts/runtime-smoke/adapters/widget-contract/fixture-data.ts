export type MediaFixtureSeed = {
  widgetTypes: string[];
  originalName: string;
  mimeType: string;
  mediaType: "image" | "file";
  title: string;
  alt: string;
  caption: string;
  content: string;
  optionalUpload?: boolean;
};

export type MediaFixtureListItem = {
  id: string;
  originalName: string | null;
  mimeType: string;
  type: string;
  title: string | null;
  alt: string | null;
  caption: string | null;
};

export type MediaFixtureListPayload = {
  items?: MediaFixtureListItem[];
};

export type ContentListFixturePageListItem = {
  id: string;
  slug: string;
};

export type ContentListFixturePageDetail = {
  id: string;
  currentData?: Record<string, unknown> | null;
};

export type PostsFeedFixturePostListItem = {
  id: string;
  slug: string;
  title?: string | null;
  status?: string | null;
  tags?: string[];
  data?: Record<string, unknown> | null;
};

export type PostsFeedFixturePostListPayload = {
  items?: PostsFeedFixturePostListItem[];
};

export type PostsFeedFixturePostSeed = {
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  imageAlt: string;
  publishedAt: string;
  authorName: string;
};

export type PostsFeedFixtureSettingsPayload = {
  "site.contentRoutes"?: unknown;
};

export type PostsFeedFixtureContentRoute = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};

export type EntryTeaserFixtureContentTypeListItem = {
  id: string;
  name?: string | null;
  slug: string;
  schema?: Record<string, unknown> | null;
  status?: string | null;
};

export type EntryTeaserFixtureEntryListItem = {
  id: string;
  title?: string | null;
  slug: string;
  status?: string | null;
  tags?: string[];
  data?: Record<string, unknown> | null;
};

export type EntryTeaserFixtureEntrySeed = {
  key: "manual" | "featured" | "fallback";
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  imageAlt: string;
  publishedAt: string;
  authorName: string;
  featured: boolean;
};

export type EntryTeaserFixtureListingQueryListItem = {
  id: string;
  name?: string | null;
  description?: string | null;
  query?: Record<string, unknown> | null;
};

export type EntryTeaserFixtureListingQueryListPayload = {
  items?: EntryTeaserFixtureListingQueryListItem[];
};

export type EntryTeaserFixtureListingTemplateListItem = {
  id: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  layout?: string | null;
  config?: Record<string, unknown> | null;
};

export type EntryTeaserFixtureListingTemplateListPayload = {
  items?: EntryTeaserFixtureListingTemplateListItem[];
};

export type EntryTeaserFixtureSettingsPayload = {
  "site.contentRoutes"?: unknown;
};

export type EntryTeaserFixtureContentRoute = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};

export type EntryTeaserFixtureContext = {
  contentTypeId: string;
  listingQueryId: string;
  listingFallbackQueryId: string;
  listingTemplateId: string;
  manualEntryId: string;
  featuredEntryId: string;
  fallbackEntryId: string;
};

export const productGalleryFixtureMediaOriginalName = "widget-fixture-product-gallery-home.svg";

export const mediaFixtureSeeds: MediaFixtureSeed[] = [
  {
    widgetTypes: ["product-gallery", "product-compare"],
    originalName: productGalleryFixtureMediaOriginalName,
    mimeType: "image/svg+xml",
    mediaType: "image",
    title: "Widget fixture Product Gallery home image",
    alt: "Widget fixture Product Gallery home exterior",
    caption: "Deterministic Product Gallery image fixture.",
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640" role="img" aria-label="Product Gallery home exterior"><rect width="960" height="640" fill="#f8fafc"/><rect x="130" y="250" width="700" height="280" rx="24" fill="#0f766e"/><path d="M104 286 480 112l376 174H104Z" fill="#1d4ed8"/><rect x="220" y="330" width="150" height="190" rx="12" fill="#bfdbfe"/><rect x="462" y="340" width="98" height="190" rx="10" fill="#f97316"/><rect x="620" y="330" width="140" height="104" rx="12" fill="#ccfbf1"/><text x="160" y="120" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="#111827">Product Fixture</text></svg>`,
  },
  {
    widgetTypes: ["logo-cloud"],
    originalName: "widget-fixture-logo-cloud-acme.svg",
    mimeType: "image/svg+xml",
    mediaType: "image",
    title: "Widget fixture Acme logo",
    alt: "Widget fixture Acme logo mark",
    caption: "Deterministic Logo Cloud MediaPicker image fixture.",
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="128" viewBox="0 0 320 128" role="img" aria-label="Acme logo"><rect width="320" height="128" rx="24" fill="#ffffff"/><circle cx="74" cy="64" r="34" fill="#2563eb"/><path d="M58 78 74 42l16 36h-9l-3-8H70l-3 8h-9Zm14-15h5l-3-9-2 9Z" fill="#ffffff"/><text x="126" y="74" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" fill="#111827">ACME</text></svg>`,
  },
  {
    widgetTypes: ["gallery-mosaic"],
    originalName: "widget-fixture-gallery-mosaic-image.svg",
    mimeType: "image/svg+xml",
    mediaType: "image",
    title: "Widget fixture Gallery Mosaic image",
    alt: "Widget fixture Gallery Mosaic image tile",
    caption: "Deterministic Gallery Mosaic MediaPicker image fixture.",
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640" role="img" aria-label="Gallery Mosaic image tile"><rect width="960" height="640" fill="#f8fafc"/><rect x="80" y="80" width="800" height="480" rx="44" fill="#0f766e"/><path d="M180 460 350 278l118 126 82-88 230 144H180Z" fill="#ccfbf1"/><circle cx="690" cy="205" r="58" fill="#f97316"/><text x="160" y="180" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="#ffffff">Gallery Fixture</text></svg>`,
  },
  {
    widgetTypes: ["gallery-mosaic"],
    originalName: "widget-fixture-gallery-mosaic-video.mp4",
    mimeType: "video/mp4",
    mediaType: "file",
    title: "Widget fixture Gallery Mosaic video",
    alt: "Widget fixture Gallery Mosaic video clip",
    caption: "Deterministic Gallery Mosaic MediaPicker video fixture.",
    content: "coderso-gallery-mosaic-video-fixture",
    optionalUpload: true,
  },
  {
    widgetTypes: ["team"],
    originalName: "widget-fixture-team-photo.svg",
    mimeType: "image/svg+xml",
    mediaType: "image",
    title: "Widget fixture Team photo",
    alt: "Widget fixture Team portrait",
    caption: "Deterministic Team MediaPicker photo fixture.",
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" role="img" aria-label="Team portrait"><rect width="640" height="640" fill="#f1f5f9"/><circle cx="320" cy="245" r="112" fill="#0369a1"/><path d="M134 560c32-108 114-170 186-170s154 62 186 170H134Z" fill="#0f766e"/><circle cx="280" cy="222" r="18" fill="#e0f2fe"/><circle cx="360" cy="222" r="18" fill="#e0f2fe"/><path d="M268 292c33 28 71 28 104 0" fill="none" stroke="#e0f2fe" stroke-width="18" stroke-linecap="round"/></svg>`,
  },
  {
    widgetTypes: ["rich-text-section"],
    originalName: "widget-fixture-rich-text-section-image.svg",
    mimeType: "image/svg+xml",
    mediaType: "image",
    title: "Widget fixture Rich Text Section image",
    alt: "Widget fixture Rich Text Section illustration",
    caption: "Deterministic Rich Text Section MediaPicker image fixture.",
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Rich Text Section illustration"><rect width="960" height="540" fill="#f8fafc"/><rect x="80" y="76" width="800" height="388" rx="34" fill="#1f2937"/><rect x="136" y="136" width="360" height="36" rx="8" fill="#facc15"/><rect x="136" y="214" width="590" height="24" rx="7" fill="#e5e7eb"/><rect x="136" y="262" width="690" height="24" rx="7" fill="#cbd5e1"/><rect x="136" y="310" width="520" height="24" rx="7" fill="#94a3b8"/><circle cx="748" cy="160" r="54" fill="#0d9488"/></svg>`,
  },
  {
    widgetTypes: ["rich-text-section"],
    originalName: "widget-fixture-rich-text-section-document.pdf",
    mimeType: "application/pdf",
    mediaType: "file",
    title: "Widget fixture Rich Text Section document",
    alt: "Widget fixture Rich Text Section document",
    caption: "Deterministic Rich Text Section attachment fixture.",
    content: "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
  },
];

export type CommerceFixtureCollectionSeed = {
  slug: string;
  name: string;
  description: string;
};

export type CommerceFixtureProductSeed = {
  slug: string;
  title: string;
  excerpt: string;
  description: string;
  status: "published";
  pricing: {
    amount: number;
    currency: string;
    compareAtAmount: number | null;
  };
  stock: {
    state: "in_stock" | "backorder" | "out_of_stock";
    quantity: number;
  };
  collectionSlugs: string[];
  mediaOriginalName?: string;
};

export type CommerceFixtureSettingsPayload = {
  "site.contentRoutes"?: unknown;
};

export type CommerceFixtureContentRoute = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};

export const commerceFixtureCollectionSeeds: CommerceFixtureCollectionSeed[] = [
  {
    slug: "fixture-homes",
    name: "Fixture Homes",
    description: "Deterministic homes collection for widget smoke fixtures.",
  },
  {
    slug: "fixture-lofts",
    name: "Fixture Lofts",
    description: "Deterministic loft collection for widget smoke fixtures.",
  },
];

export const commerceFixtureProductSeeds: CommerceFixtureProductSeed[] = [
  {
    slug: "fixture-starter-home",
    title: "Fixture Starter Home",
    excerpt: "Compact starter plan for deterministic widget smoke coverage.",
    description: "Deterministic fixture product for Product Gallery, Compare, and Table.",
    status: "published",
    pricing: {
      amount: 19900,
      currency: "USD",
      compareAtAmount: 24900,
    },
    stock: {
      state: "in_stock",
      quantity: 3,
    },
    collectionSlugs: ["fixture-homes"],
    mediaOriginalName: productGalleryFixtureMediaOriginalName,
  },
  {
    slug: "fixture-urban-loft",
    title: "Fixture Urban Loft",
    excerpt: "City-forward loft listing for deterministic comparison coverage.",
    description: "Second deterministic fixture product with a different stock state.",
    status: "published",
    pricing: {
      amount: 29900,
      currency: "USD",
      compareAtAmount: 34900,
    },
    stock: {
      state: "backorder",
      quantity: 8,
    },
    collectionSlugs: ["fixture-lofts"],
    mediaOriginalName: productGalleryFixtureMediaOriginalName,
  },
  {
    slug: "fixture-garden-suite",
    title: "Fixture Garden Suite",
    excerpt: "Garden-facing suite used to keep product table fixtures populated.",
    description: "Third deterministic fixture product to satisfy multi-row public widget proof.",
    status: "published",
    pricing: {
      amount: 15900,
      currency: "USD",
      compareAtAmount: 17900,
    },
    stock: {
      state: "out_of_stock",
      quantity: 0,
    },
    collectionSlugs: ["fixture-homes", "fixture-lofts"],
    mediaOriginalName: productGalleryFixtureMediaOriginalName,
  },
];
export type CommerceCollectionListItem = {
  id: string;
  slug: string;
  name: string;
};

export type CommerceProductListItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  excerpt: string | null;
  description: string | null;
  pricing?: {
    amount?: number;
    currency?: string;
    compareAtAmount?: number | null;
  };
  stock?: {
    state?: string;
    quantity?: number | null;
  };
  collectionIds?: string[];
  mediaIds?: string[];
};
export const contentListFixtureFallbackBlockId = "content-list-fixture";
export const productGalleryFixtureFallbackBlockId = "product-gallery-fixture";
export const productGalleryFixtureProductBasePath = "/fixture-products";
export const productGalleryFixtureViewAllHref = "/audit-31-05-product-gallery";
export const productCompareFixtureFallbackBlockId = "product-compare-fixture";
export const productTableFixtureFallbackBlockId = "product-table-fixture";
export const commerceProductFixtureListPath = "/fixture-products";
export const commerceProductFixtureDetailPath = `${commerceProductFixtureListPath}/:slug`;
export const contentListFixtureImageSrc =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='960'%20height='540'%20viewBox='0%200%20960%20540'%20role='img'%20aria-label='Content%20List%20fixture'%3E%3Crect%20width='960'%20height='540'%20fill='%23f8fafc'/%3E%3Crect%20x='96'%20y='84'%20width='768'%20height='372'%20rx='34'%20fill='%230f766e'/%3E%3Ccircle%20cx='704'%20cy='184'%20r='72'%20fill='%23f97316'/%3E%3Cpath%20d='M162%20408%20342%20236l124%20118%2086-82%20246%20136H162Z'%20fill='%23ccfbf1'/%3E%3Ctext%20x='150'%20y='168'%20font-family='Arial,Helvetica,sans-serif'%20font-size='54'%20font-weight='700'%20fill='%23ffffff'%3EContent%20Fixture%3C/text%3E%3C/svg%3E";
export const postsFeedFixtureFallbackBlockId = "posts-feed-fixture";
export const postsFeedFixtureListPath = "/fixture-posts";
export const postsFeedFixtureDetailPath = `${postsFeedFixtureListPath}/:slug`;
export const postsFeedFixtureImageSrc =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='960'%20height='540'%20viewBox='0%200%20960%20540'%20role='img'%20aria-label='Posts%20Feed%20fixture'%3E%3Crect%20width='960'%20height='540'%20fill='%23f8fafc'/%3E%3Crect%20x='88'%20y='74'%20width='784'%20height='392'%20rx='34'%20fill='%231e40af'/%3E%3Cpath%20d='M164%20396%20338%20242l112%20102%2082-78%20264%20130H164Z'%20fill='%23bfdbfe'/%3E%3Ccircle%20cx='704'%20cy='174'%20r='70'%20fill='%23f97316'/%3E%3Ctext%20x='146'%20y='164'%20font-family='Arial,Helvetica,sans-serif'%20font-size='54'%20font-weight='700'%20fill='%23ffffff'%3EPosts%20Fixture%3C/text%3E%3C/svg%3E";
export const entryTeaserFixtureContentTypeSlug = "fixture-entry-teaser";
export const entryTeaserFixtureContentTypeName = "Fixture Entry Teasers";
export const entryTeaserFixtureListPath = "/fixture-entry-teaser";
export const entryTeaserFixtureDetailPath = `${entryTeaserFixtureListPath}/:slug`;
export const entryTeaserFixturePrimaryBlockId = "entry-teaser-fixture";
export const entryTeaserFixtureListingBlockId = "entry-teaser-listing-fixture";
export const entryTeaserFixtureFallbackBlockId = "entry-teaser-fallback-fixture";
export const entryTeaserFixtureListingQueryName = "Fixture Entry Teaser Listing Query";
export const entryTeaserFixtureFallbackQueryName = "Fixture Entry Teaser Fallback Query";
export const entryTeaserFixtureListingTemplateSlug = "fixture-entry-teaser-cards";
export const entryTeaserFixtureListingTemplateName = "Fixture Entry Teaser Cards";
export const entryTeaserFixtureImageSrc =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='960'%20height='540'%20viewBox='0%200%20960%20540'%20role='img'%20aria-label='Entry%20Teaser%20fixture'%3E%3Crect%20width='960'%20height='540'%20fill='%23f8fafc'/%3E%3Crect%20x='92'%20y='82'%20width='776'%20height='376'%20rx='34'%20fill='%230f766e'/%3E%3Cpath%20d='M160%20394%20338%20236l112%2098%2078-74%20272%20134H160Z'%20fill='%23ccfbf1'/%3E%3Ccircle%20cx='708'%20cy='176'%20r='70'%20fill='%23f97316'/%3E%3Ctext%20x='146'%20y='164'%20font-family='Arial,Helvetica,sans-serif'%20font-size='54'%20font-weight='700'%20fill='%23ffffff'%3EEntry%20Fixture%3C/text%3E%3C/svg%3E";

export const postsFeedFixturePostSeeds: PostsFeedFixturePostSeed[] = [
  {
    title: "Fixture Posts Feed Launch Brief",
    slug: "fixture-posts-launch-brief",
    excerpt: "Deterministic featured post with image, tags, author, date, and CTA proof.",
    tags: ["featured", "launch"],
    imageAlt: "Fixture Posts Feed launch brief image",
    publishedAt: "2026-05-31T10:00:00.000Z",
    authorName: "Fixture Editor",
  },
  {
    title: "Fixture Posts Feed Roadmap Note",
    slug: "fixture-posts-roadmap-note",
    excerpt: "Second deterministic post proving multi-card layout and pagination.",
    tags: ["roadmap", "release"],
    imageAlt: "Fixture Posts Feed roadmap note image",
    publishedAt: "2026-05-30T10:00:00.000Z",
    authorName: "Fixture Editor",
  },
  {
    title: "Fixture Posts Feed Operations Update",
    slug: "fixture-posts-operations-update",
    excerpt: "Third deterministic post proving load-more counts and category-style tags.",
    tags: ["operations", "news"],
    imageAlt: "Fixture Posts Feed operations update image",
    publishedAt: "2026-05-29T10:00:00.000Z",
    authorName: "Fixture Editor",
  },
];

export const entryTeaserFixtureEntrySeeds: EntryTeaserFixtureEntrySeed[] = [
  {
    key: "manual",
    title: "Fixture Entry Teaser Manual Brief",
    slug: "fixture-entry-teaser-manual-brief",
    excerpt: "Manual teaser branch with image, metadata, tags, and CTA proof.",
    tags: ["manual", "launch"],
    imageAlt: "Fixture Entry Teaser manual brief image",
    publishedAt: "2026-05-31T10:00:00.000Z",
    authorName: "Fixture Editor",
    featured: false,
  },
  {
    key: "featured",
    title: "Fixture Entry Teaser Featured Brief",
    slug: "fixture-entry-teaser-featured-brief",
    excerpt: "Featured listing branch proving tagged selection and route-backed CTA.",
    tags: ["featured", "spotlight"],
    imageAlt: "Fixture Entry Teaser featured brief image",
    publishedAt: "2026-05-30T10:00:00.000Z",
    authorName: "Fixture Editor",
    featured: true,
  },
  {
    key: "fallback",
    title: "Fixture Entry Teaser Fallback Brief",
    slug: "fixture-entry-teaser-fallback-brief",
    excerpt: "Fallback-to-latest listing branch with no featured tag.",
    tags: ["fallback", "latest"],
    imageAlt: "Fixture Entry Teaser fallback brief image",
    publishedAt: "2026-05-29T10:00:00.000Z",
    authorName: "Fixture Editor",
    featured: false,
  },
];
