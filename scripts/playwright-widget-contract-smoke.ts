import { createHash } from "node:crypto";
import { chmod, mkdir, rm } from "node:fs/promises";

type EditorMode = "wizard" | "visual" | "advanced";
type CssCheck = "body-overflow" | "card-overflow" | "empty-fixture";
type SmokeStatus = "passed" | "failed" | "fixture-gap" | "metadata-gap" | "skipped";

type WidgetSmokeCase = {
  widgetType: string;
  title: string;
  adminInsertLabel: string;
  adminFixtureSlug: string;
  publicPath?: string | null;
  publicFixtureStatus?: "published" | "draft-only" | "missing" | "shared-page";
  requiredModes: EditorMode[];
  cssChecks?: CssCheck[];
  priority?: "P0" | "P1" | "P2";
  notes?: string;
  allowedDuplicateWritablePaths?: Array<{
    path: string;
    reason: string;
    expiresWithTask: string;
  }>;
};

type AdminProbeSmokeCase = WidgetSmokeCase & {
  mediaProofPublicPath?: string | null;
};

type SmokeInventory = {
  version: 1;
  expectedWidgetCount: number;
  excludedScreenOnlyWidgets: string[];
  widgets: WidgetSmokeCase[];
};

const APPROVED_INTENTIONAL_OVERFLOW_SELECTORS: Record<string, string[]> = {
  "pricing-plans": ['[data-pricing-comparison-scroll="true"]'],
  "product-compare": ['[data-product-compare-scroll-region="table"]'],
  "product-table": ['[data-product-table-scroll-region="table"]'],
  testimonials: ['[data-testimonials-list="slider-static"]'],
};

type ParsedArgs = {
  session: string;
  adminUrl: string;
  frontUrl: string;
  inventoryPath: string;
  outputJsonPath: string;
  outputMarkdownPath: string;
  widgetType?: string;
  limit?: number;
  dryRun: boolean;
  skipAdmin: boolean;
  skipFront: boolean;
  strict: boolean;
  keepOpen: boolean;
};

type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const playwrightCliOpenSettleMs = 500;
const playwrightCliSessionMaxLength = 64;

type AdminAuthStateResult = {
  attempted: boolean;
  authenticated: boolean;
  sessionValue?: string;
  error?: string;
};

type AdminModeResult = {
  mode: EditorMode;
  status: SmokeStatus;
  rootCount: number;
  sectionCount: number;
  visibleSectionCount: number;
  writablePaths: string[];
  controlsWithoutPath: number;
  error?: string;
};

type WidgetMediaProofResult = {
  status: SmokeStatus;
  adminHasImage: boolean;
  publicHasImage: boolean;
  publicPath?: string | null;
  adminAlt?: string | null;
  publicAlt?: string | null;
  adminSrc?: string | null;
  publicSrc?: string | null;
  adminHasAttachment?: boolean;
  publicHasAttachment?: boolean;
  adminAttachmentHref?: string | null;
  publicAttachmentHref?: string | null;
  sanitizerGuidanceShown?: boolean;
  unsafeHrefBlocked?: boolean;
  rawIframeBlocked?: boolean;
  publicLightboxOpened?: boolean;
  publicLightboxClosed?: boolean;
  error?: string;
};

type WidgetContentListProofResult = {
  status: SmokeStatus;
  adminItemCount: number;
  publicItemCount: number;
  adminHasImage: boolean;
  publicHasImage: boolean;
  adminHasTags: boolean;
  publicHasTags: boolean;
  adminHasCta: boolean;
  publicHasCta: boolean;
  adminHasLoadMore: boolean;
  publicHasViewAll: boolean;
  publicPath?: string | null;
  error?: string;
};

type WidgetPostsFeedProofResult = WidgetContentListProofResult;
type WidgetEntryTeaserProofResult = WidgetContentListProofResult & {
  adminReadyCount: number;
  publicReadyCount: number;
  consoleErrors: string[];
};
type WidgetProductGalleryProofResult = {
  status: SmokeStatus;
  adminItemCount: number;
  publicItemCount: number;
  adminHasImage: boolean;
  publicHasImage: boolean;
  adminHasReadyLinks: boolean;
  publicHasReadyLinks: boolean;
  adminHasViewAll: boolean;
  publicHasViewAll: boolean;
  publicPath?: string | null;
  error?: string;
};
type WidgetProductCompareProofResult = {
  status: SmokeStatus;
  adminItemCount: number;
  publicItemCount: number;
  adminHasImage: boolean;
  publicHasImage: boolean;
  adminHasTitleLinks: boolean;
  publicHasTitleLinks: boolean;
  adminHasCta: boolean;
  publicHasCta: boolean;
  publicPath?: string | null;
  error?: string;
};
type WidgetProductTableProofResult = WidgetProductCompareProofResult;

type AdminWidgetResult = {
  widgetType: string;
  status: SmokeStatus;
  adminPath?: string;
  pageId?: string;
  modes: AdminModeResult[];
  duplicateWritablePaths: string[];
  mediaProof?: WidgetMediaProofResult;
  contentProof?: WidgetContentListProofResult;
  postsProof?: WidgetPostsFeedProofResult;
  entryTeaserProof?: WidgetEntryTeaserProofResult;
  productGalleryProof?: WidgetProductGalleryProofResult;
  productCompareProof?: WidgetProductCompareProofResult;
  productTableProof?: WidgetProductTableProofResult;
  error?: string;
};

type PublicWidgetResult = {
  widgetType: string;
  status: SmokeStatus;
  publicPath?: string | null;
  statusCode?: number | null;
  emptyFixture?: boolean;
  bodyOverflow?: boolean;
  viewportWidth?: number;
  documentWidth?: number;
  screenshotPath?: string;
  unmarkedOverflowOwners?: Array<{
    tag: string;
    className: string;
    text: string;
    scrollWidth: number;
    clientWidth: number;
  }>;
  error?: string;
};

type SmokeReport = {
  generatedAt: string;
  command: string;
  dryRun: boolean;
  inventory: {
    expectedWidgetCount: number;
    actualWidgetCount: number;
    excludedScreenOnlyWidgets: string[];
    selectedWidgetTypes: string[];
  };
  environment: {
    adminUrl: string;
    frontUrl: string;
    resolvedPlaywrightSession?: string;
    adminReachable: boolean | null;
    frontReachable: boolean | null;
    playwrightCliAvailable: boolean;
  };
  admin: {
    skipped: boolean;
    loginAttempted: boolean;
    authenticated: boolean | null;
    results: AdminWidgetResult[];
    error?: string;
  };
  public: {
    skipped: boolean;
    results: PublicWidgetResult[];
    error?: string;
  };
  summary: {
    adminFailures: number;
    publicFailures: number;
    fixtureGaps: number;
    metadataGaps: number;
  };
};

const defaultInventoryPath = "_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json";
const defaultOutputJsonPath = "_docs/PLAYWRIGHT/widget-contract-smoke-results.json";
const defaultOutputMarkdownPath = "_docs/PLAYWRIGHT/widget-contract-smoke-results.md";
const defaultModes: EditorMode[] = ["visual", "advanced"];
const screenOnlyWidgets = new Set([
  "screen-record-header",
  "screen-field-value",
  "screen-field-group",
  "screen-two-column",
]);
const commerceFixtureWidgetTypes = new Set(["product-gallery", "product-compare", "product-table"]);
const productGalleryFixtureWidgetTypes = new Set(["product-gallery"]);
const productCompareFixtureWidgetTypes = new Set(["product-compare"]);
const productTableFixtureWidgetTypes = new Set(["product-table"]);
const contentFixtureWidgetTypes = new Set(["content-list"]);
const postsFixtureWidgetTypes = new Set(["posts-feed"]);
const entryTeaserFixtureWidgetTypes = new Set(["entry-teaser"]);
const mediaFixtureWidgetTypes = new Set([
  "product-gallery",
  "product-compare",
  "product-table",
  "logo-cloud",
  "gallery-mosaic",
  "team",
  "rich-text-section",
]);

type MediaFixtureSeed = {
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

type MediaFixtureListItem = {
  id: string;
  originalName: string | null;
  mimeType: string;
  type: string;
  title: string | null;
  alt: string | null;
  caption: string | null;
};

type MediaFixtureListPayload = {
  items?: MediaFixtureListItem[];
};

type ContentListFixturePageListItem = {
  id: string;
  slug: string;
};

type ContentListFixturePageDetail = {
  id: string;
  currentData?: Record<string, unknown> | null;
};

type PostsFeedFixturePostListItem = {
  id: string;
  slug: string;
  title?: string | null;
  status?: string | null;
  tags?: string[];
  data?: Record<string, unknown> | null;
};

type PostsFeedFixturePostListPayload = {
  items?: PostsFeedFixturePostListItem[];
};

type PostsFeedFixturePostSeed = {
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  imageAlt: string;
  publishedAt: string;
  authorName: string;
};

type PostsFeedFixtureSettingsPayload = {
  "site.contentRoutes"?: unknown;
};

type PostsFeedFixtureContentRoute = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};

type EntryTeaserFixtureContentTypeListItem = {
  id: string;
  name?: string | null;
  slug: string;
  schema?: Record<string, unknown> | null;
  status?: string | null;
};

type EntryTeaserFixtureEntryListItem = {
  id: string;
  title?: string | null;
  slug: string;
  status?: string | null;
  tags?: string[];
  data?: Record<string, unknown> | null;
};

type EntryTeaserFixtureEntrySeed = {
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

type EntryTeaserFixtureListingQueryListItem = {
  id: string;
  name?: string | null;
  description?: string | null;
  query?: Record<string, unknown> | null;
};

type EntryTeaserFixtureListingQueryListPayload = {
  items?: EntryTeaserFixtureListingQueryListItem[];
};

type EntryTeaserFixtureListingTemplateListItem = {
  id: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  layout?: string | null;
  config?: Record<string, unknown> | null;
};

type EntryTeaserFixtureListingTemplateListPayload = {
  items?: EntryTeaserFixtureListingTemplateListItem[];
};

type EntryTeaserFixtureSettingsPayload = {
  "site.contentRoutes"?: unknown;
};

type EntryTeaserFixtureContentRoute = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};

type EntryTeaserFixtureContext = {
  contentTypeId: string;
  listingQueryId: string;
  listingFallbackQueryId: string;
  listingTemplateId: string;
  manualEntryId: string;
  featuredEntryId: string;
  fallbackEntryId: string;
};

const productGalleryFixtureMediaOriginalName = "widget-fixture-product-gallery-home.svg";

const mediaFixtureSeeds: MediaFixtureSeed[] = [
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

type CommerceFixtureCollectionSeed = {
  slug: string;
  name: string;
  description: string;
};

type CommerceFixtureProductSeed = {
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

type CommerceFixtureSettingsPayload = {
  "site.contentRoutes"?: unknown;
};

type CommerceFixtureContentRoute = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};

const commerceFixtureCollectionSeeds: CommerceFixtureCollectionSeed[] = [
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

const commerceFixtureProductSeeds: CommerceFixtureProductSeed[] = [
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

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`missing_value:${flag}`);
  }
  return value;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    session: "widget-contract-smoke",
    adminUrl: "http://localhost:5173/admin",
    frontUrl: "http://localhost:3000",
    inventoryPath: defaultInventoryPath,
    outputJsonPath: defaultOutputJsonPath,
    outputMarkdownPath: defaultOutputMarkdownPath,
    dryRun: false,
    skipAdmin: false,
    skipFront: false,
    strict: false,
    keepOpen: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--session") parsed.session = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--session=")) parsed.session = arg.slice("--session=".length);
    else if (arg === "--admin") parsed.adminUrl = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--admin=")) parsed.adminUrl = arg.slice("--admin=".length);
    else if (arg === "--front") parsed.frontUrl = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--front=")) parsed.frontUrl = arg.slice("--front=".length);
    else if (arg === "--inventory") parsed.inventoryPath = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--inventory=")) {
      parsed.inventoryPath = arg.slice("--inventory=".length);
    } else if (arg === "--output-json") parsed.outputJsonPath = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--output-json=")) {
      parsed.outputJsonPath = arg.slice("--output-json=".length);
    } else if (arg === "--output-md") {
      parsed.outputMarkdownPath = readFlagValue(argv, index++, arg);
    } else if (arg.startsWith("--output-md=")) {
      parsed.outputMarkdownPath = arg.slice("--output-md=".length);
    } else if (arg === "--widget") parsed.widgetType = readFlagValue(argv, index++, arg);
    else if (arg.startsWith("--widget=")) parsed.widgetType = arg.slice("--widget=".length);
    else if (arg === "--limit") parsed.limit = Number(readFlagValue(argv, index++, arg));
    else if (arg.startsWith("--limit=")) parsed.limit = Number(arg.slice("--limit=".length));
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--skip-admin") parsed.skipAdmin = true;
    else if (arg === "--skip-front") parsed.skipFront = true;
    else if (arg === "--strict") parsed.strict = true;
    else if (arg === "--keep-open") parsed.keepOpen = true;
    else {
      throw new Error(`unknown_arg:${arg}`);
    }
  }

  if (parsed.limit !== undefined && (!Number.isInteger(parsed.limit) || parsed.limit <= 0)) {
    throw new Error("invalid_limit");
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

type CommerceCollectionListItem = {
  id: string;
  slug: string;
  name: string;
};

type CommerceProductListItem = {
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

export function selectedCasesNeedCommerceFixtures(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => commerceFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedProductGalleryFixture(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => productGalleryFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedProductCompareFixture(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => productCompareFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedProductTableFixture(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => productTableFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedContentFixtures(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => contentFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedPostsFixtures(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => postsFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedEntryTeaserFixtures(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => entryTeaserFixtureWidgetTypes.has(item.widgetType));
}

export function selectedCasesNeedMediaFixtures(cases: WidgetSmokeCase[]): boolean {
  return cases.some((item) => mediaFixtureWidgetTypes.has(item.widgetType));
}

export function resolveWidgetMediaProofPublicPath(
  item: Pick<WidgetSmokeCase, "adminFixtureSlug" | "publicPath">
): string | null {
  return item.publicPath || item.adminFixtureSlug || null;
}

export function resolveLogoCloudMediaProofPublicPath(
  item: Pick<WidgetSmokeCase, "adminFixtureSlug" | "publicPath">
): string | null {
  return resolveWidgetMediaProofPublicPath(item);
}

function resolveMediaFixtureSeedsForCases(cases: WidgetSmokeCase[]): MediaFixtureSeed[] {
  const selectedWidgetTypes = new Set(cases.map((item) => item.widgetType));
  return mediaFixtureSeeds.filter((seed) =>
    seed.widgetTypes.some((widgetType) => selectedWidgetTypes.has(widgetType))
  );
}

const contentListFixtureFallbackBlockId = "content-list-fixture";
const productGalleryFixtureFallbackBlockId = "product-gallery-fixture";
const productGalleryFixtureProductBasePath = "/fixture-products";
const productGalleryFixtureViewAllHref = "/audit-31-05-product-gallery";
const productCompareFixtureFallbackBlockId = "product-compare-fixture";
const productTableFixtureFallbackBlockId = "product-table-fixture";
const commerceProductFixtureListPath = "/fixture-products";
const commerceProductFixtureDetailPath = `${commerceProductFixtureListPath}/:slug`;
const contentListFixtureImageSrc =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='960'%20height='540'%20viewBox='0%200%20960%20540'%20role='img'%20aria-label='Content%20List%20fixture'%3E%3Crect%20width='960'%20height='540'%20fill='%23f8fafc'/%3E%3Crect%20x='96'%20y='84'%20width='768'%20height='372'%20rx='34'%20fill='%230f766e'/%3E%3Ccircle%20cx='704'%20cy='184'%20r='72'%20fill='%23f97316'/%3E%3Cpath%20d='M162%20408%20342%20236l124%20118%2086-82%20246%20136H162Z'%20fill='%23ccfbf1'/%3E%3Ctext%20x='150'%20y='168'%20font-family='Arial,Helvetica,sans-serif'%20font-size='54'%20font-weight='700'%20fill='%23ffffff'%3EContent%20Fixture%3C/text%3E%3C/svg%3E";
const postsFeedFixtureFallbackBlockId = "posts-feed-fixture";
const postsFeedFixtureListPath = "/fixture-posts";
const postsFeedFixtureDetailPath = `${postsFeedFixtureListPath}/:slug`;
const postsFeedFixtureImageSrc =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='960'%20height='540'%20viewBox='0%200%20960%20540'%20role='img'%20aria-label='Posts%20Feed%20fixture'%3E%3Crect%20width='960'%20height='540'%20fill='%23f8fafc'/%3E%3Crect%20x='88'%20y='74'%20width='784'%20height='392'%20rx='34'%20fill='%231e40af'/%3E%3Cpath%20d='M164%20396%20338%20242l112%20102%2082-78%20264%20130H164Z'%20fill='%23bfdbfe'/%3E%3Ccircle%20cx='704'%20cy='174'%20r='70'%20fill='%23f97316'/%3E%3Ctext%20x='146'%20y='164'%20font-family='Arial,Helvetica,sans-serif'%20font-size='54'%20font-weight='700'%20fill='%23ffffff'%3EPosts%20Fixture%3C/text%3E%3C/svg%3E";
const entryTeaserFixtureContentTypeSlug = "fixture-entry-teaser";
const entryTeaserFixtureContentTypeName = "Fixture Entry Teasers";
const entryTeaserFixtureListPath = "/fixture-entry-teaser";
const entryTeaserFixtureDetailPath = `${entryTeaserFixtureListPath}/:slug`;
const entryTeaserFixturePrimaryBlockId = "entry-teaser-fixture";
const entryTeaserFixtureListingBlockId = "entry-teaser-listing-fixture";
const entryTeaserFixtureFallbackBlockId = "entry-teaser-fallback-fixture";
const entryTeaserFixtureListingQueryName = "Fixture Entry Teaser Listing Query";
const entryTeaserFixtureFallbackQueryName = "Fixture Entry Teaser Fallback Query";
const entryTeaserFixtureListingTemplateSlug = "fixture-entry-teaser-cards";
const entryTeaserFixtureListingTemplateName = "Fixture Entry Teaser Cards";
const entryTeaserFixtureImageSrc =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='960'%20height='540'%20viewBox='0%200%20960%20540'%20role='img'%20aria-label='Entry%20Teaser%20fixture'%3E%3Crect%20width='960'%20height='540'%20fill='%23f8fafc'/%3E%3Crect%20x='92'%20y='82'%20width='776'%20height='376'%20rx='34'%20fill='%230f766e'/%3E%3Cpath%20d='M160%20394%20338%20236l112%2098%2078-74%20272%20134H160Z'%20fill='%23ccfbf1'/%3E%3Ccircle%20cx='708'%20cy='176'%20r='70'%20fill='%23f97316'/%3E%3Ctext%20x='146'%20y='164'%20font-family='Arial,Helvetica,sans-serif'%20font-size='54'%20font-weight='700'%20fill='%23ffffff'%3EEntry%20Fixture%3C/text%3E%3C/svg%3E";

const postsFeedFixturePostSeeds: PostsFeedFixturePostSeed[] = [
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

const entryTeaserFixtureEntrySeeds: EntryTeaserFixtureEntrySeed[] = [
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

function buildContentListFixtureWidgetData(blockId: string): Record<string, unknown> {
  return {
    source: {
      mode: "legacy",
      listingQueryId: "",
      listingTemplateId: "",
      contentTypeId: "fixture-content-type",
      statusScope: "published",
      limit: 2,
      sort: "published-desc",
    },
    filters: {
      taxonomy: "",
      featuredOnly: false,
      searchQuery: "",
      authorId: "",
    },
    title: "Fixture stories",
    description: "Populated Content List smoke fixture.",
    pagination: {
      mode: "load-more",
      pageSize: 2,
      viewAllHref: "/fixture-content-list",
      viewAllLabel: "View all fixture stories",
      loadMoreLabel: "More fixture stories",
    },
    fields: {
      showImage: true,
      showExcerpt: true,
      showMeta: true,
      showCta: true,
    },
    emptyState: {
      title: "No fixture stories",
      description: "The Content List smoke fixture should stay populated.",
    },
    style: {
      columns: "2",
      gap: "lg",
      cardStyle: "elevated",
      imageAspect: "wide",
      tagMode: "badges",
      tagLimit: 2,
      ctaLabel: "Open story",
      backgroundColor: "var(--color-bg)",
      borderColor: "var(--color-border)",
      textColor: "var(--color-text)",
    },
    resolved: {
      items: [
        {
          id: "fixture-content-list-launch",
          title: "Fixture Launch Brief",
          slug: "launch-brief",
          href: "/fixture-content-list/launch-brief",
          excerpt: "A deterministic item with image, tags, metadata, and CTA proof.",
          imageSrc: contentListFixtureImageSrc,
          imageAlt: "Fixture Content List launch brief image",
          tags: ["launch", "featured"],
          authorName: "Fixture Editor",
          publishedAt: "2026-05-31T10:00:00.000Z",
          status: "published",
        },
        {
          id: "fixture-content-list-roadmap",
          title: "Fixture Roadmap Note",
          slug: "roadmap-note",
          href: "/fixture-content-list/roadmap-note",
          excerpt: "A second deterministic item that proves multi-card layout and gaps.",
          imageSrc: contentListFixtureImageSrc,
          imageAlt: "Fixture Content List roadmap note image",
          tags: ["roadmap", "release"],
          authorName: "Fixture Editor",
          publishedAt: "2026-05-30T10:00:00.000Z",
          status: "published",
        },
      ],
      total: 4,
      sourceTypeId: "fixture-content-type",
      sourceTypeSlug: "fixture-content-list",
      listPath: "/fixture-content-list",
      listingQueryId: "",
      listingTemplateId: "",
      resolvedAt: "2026-05-31T10:05:00.000Z",
      runtime: {
        rejectedTokens: [],
        page: 1,
        pageSize: 2,
        totalPages: 2,
        nextPageHref: `?cl.${blockId}.page=2`,
      },
    },
  };
}

function isContentListFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "content-list";
}

export function buildContentListFixturePageData(
  currentData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  let patchedContentList = false;
  const blocks = sourceBlocks.map((block) => {
    if (!patchedContentList && isContentListFixtureBlock(block)) {
      patchedContentList = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : contentListFixtureFallbackBlockId;
      return {
        ...block,
        id: blockId,
        type: "content-list",
        variant: "cards",
        data: buildContentListFixtureWidgetData(blockId),
      };
    }
    return block;
  });

  if (!patchedContentList) {
    blocks.push({
      id: contentListFixtureFallbackBlockId,
      type: "content-list",
      variant: "cards",
      data: buildContentListFixtureWidgetData(contentListFixtureFallbackBlockId),
    });
  }

  return {
    ...source,
    blocks,
  };
}

function buildProductGalleryFixtureWidgetData(): Record<string, unknown> {
  return {
    source: {
      limit: 2,
      search: "",
      collectionIds: [],
      status: ["published"],
      sortField: "title",
      sortDir: "asc",
    },
    link: {
      basePath: productGalleryFixtureProductBasePath,
      target: "same-tab",
      ctaLabel: "View fixture product",
      ctaStyle: "button",
    },
    header: {
      title: "Product Gallery fixture",
      description: "Populated Product Gallery smoke fixture with image, links, and view-all proof.",
    },
    pagination: {
      mode: "view-all",
      viewAllHref: productGalleryFixtureViewAllHref,
      viewAllLabel: "View all fixture products",
    },
    curation: {
      mode: "query",
      productIds: [],
    },
    fields: {
      showExcerpt: true,
      showPrice: true,
      showStock: true,
      showStatus: true,
    },
    emptyState: {
      title: "No fixture products",
      description: "The Product Gallery smoke fixture should stay populated.",
    },
    style: {
      columns: "3",
      cardStyle: "outlined",
    },
    resolved: {
      items: [],
      total: 0,
      resolvedAt: "",
    },
  };
}

function isProductGalleryFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "product-gallery";
}

export function buildProductGalleryFixturePageData(
  currentData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  let patchedProductGallery = false;
  const blocks = sourceBlocks.map((block) => {
    if (!patchedProductGallery && isProductGalleryFixtureBlock(block)) {
      patchedProductGallery = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : productGalleryFixtureFallbackBlockId;
      return {
        ...block,
        id: blockId,
        type: "product-gallery",
        variant: "cards",
        data: buildProductGalleryFixtureWidgetData(),
      };
    }
    return block;
  });

  if (!patchedProductGallery) {
    blocks.push({
      id: productGalleryFixtureFallbackBlockId,
      type: "product-gallery",
      variant: "cards",
      data: buildProductGalleryFixtureWidgetData(),
    });
  }

  return {
    ...source,
    blocks,
  };
}

function buildProductCompareFixtureWidgetData(): Record<string, unknown> {
  return {
    source: {
      limit: 3,
      search: "",
      collectionIds: [],
      productIds: [],
      status: ["published"],
      sortField: "title",
      sortDir: "asc",
    },
    rows: [
      { key: "price", visible: true },
      { key: "compareAt", visible: true },
      { key: "stock", visible: true },
      { key: "quantity", visible: true },
      { key: "slug", visible: true },
      { key: "excerpt", visible: true },
    ],
    header: {
      showImages: true,
      linkTitles: true,
      ctaMode: "view_product",
      ctaLabel: "Inspect fixture product",
    },
    section: {
      title: "Product Compare fixture",
      description: "Populated Product Compare smoke fixture with images, title links, and CTAs.",
      caption: "Fixture product comparison",
      hideCaption: false,
    },
    layout: {
      featuredProductId: "",
      stickyHeader: false,
    },
    emptyState: {
      title: "No fixture comparisons",
      description: "The Product Compare smoke fixture should stay populated.",
    },
    style: {},
    resolved: {
      rows: [],
      total: 0,
      resolvedAt: "",
    },
  };
}

function isProductCompareFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "product-compare";
}

export function buildProductCompareFixturePageData(
  currentData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  let patchedProductCompare = false;
  const blocks = sourceBlocks.map((block) => {
    if (!patchedProductCompare && isProductCompareFixtureBlock(block)) {
      patchedProductCompare = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : productCompareFixtureFallbackBlockId;
      return {
        ...block,
        id: blockId,
        type: "product-compare",
        variant: "matrix",
        data: buildProductCompareFixtureWidgetData(),
      };
    }
    return block;
  });

  if (!patchedProductCompare) {
    blocks.push({
      id: productCompareFixtureFallbackBlockId,
      type: "product-compare",
      variant: "matrix",
      data: buildProductCompareFixtureWidgetData(),
    });
  }

  return {
    ...source,
    blocks,
  };
}

function buildProductTableFixtureWidgetData(): Record<string, unknown> {
  return {
    source: {
      limit: 3,
      search: "",
      collectionIds: [],
      status: ["published"],
      sortField: "title",
      sortDir: "asc",
    },
    header: {
      eyebrow: "Fixture catalog",
      title: "Product Table fixture",
      description: "Populated Product Table smoke fixture with images, links, and actions.",
    },
    fields: {
      showImage: true,
      showTitle: true,
      showExcerpt: true,
      showSlug: true,
      showPrice: true,
      showCompareAt: true,
      showStatus: true,
      showStock: true,
      showStockQuantity: true,
      showCollections: true,
    },
    links: {
      linkedColumn: "title",
      showAction: true,
      actionLabel: "Inspect fixture product",
      openInNewTab: false,
    },
    controls: {
      showSearchInput: false,
      showCollectionFilter: false,
      showStatusFilter: false,
      sorting: "indicator",
      pagination: "none",
      pageSize: 3,
    },
    format: {
      moneyLocale: "en-US",
      currencyDisplay: "symbol",
    },
    emptyState: {
      title: "No fixture products",
      description: "The Product Table smoke fixture should stay populated.",
    },
    style: {},
    resolved: {
      items: [],
      total: 0,
      resolvedAt: "",
      runtime: {
        availableCollections: [],
        availableStatuses: [],
      },
    },
  };
}

function isProductTableFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "product-table";
}

export function buildProductTableFixturePageData(
  currentData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  let patchedProductTable = false;
  const blocks = sourceBlocks.map((block) => {
    if (!patchedProductTable && isProductTableFixtureBlock(block)) {
      patchedProductTable = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : productTableFixtureFallbackBlockId;
      return {
        ...block,
        id: blockId,
        type: "product-table",
        variant: "default",
        data: buildProductTableFixtureWidgetData(),
      };
    }
    return block;
  });

  if (!patchedProductTable) {
    blocks.push({
      id: productTableFixtureFallbackBlockId,
      type: "product-table",
      variant: "default",
      data: buildProductTableFixtureWidgetData(),
    });
  }

  return {
    ...source,
    blocks,
  };
}

function normalizeCommerceFixtureContentRoutes(value: unknown): CommerceFixtureContentRoute[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      if (typeof entry.type !== "string") return null;
      if (typeof entry.listPath !== "string") return null;
      if (typeof entry.detailPath !== "string") return null;
      const route: CommerceFixtureContentRoute = {
        type: entry.type,
        listPath: entry.listPath,
        detailPath: entry.detailPath,
        enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
      };
      if (Object.prototype.hasOwnProperty.call(entry, "detailPageId")) {
        route.detailPageId =
          typeof entry.detailPageId === "string" && entry.detailPageId.trim()
            ? entry.detailPageId.trim()
            : null;
      }
      return route;
    })
    .filter((entry): entry is CommerceFixtureContentRoute => Boolean(entry));
}

function isCommerceProductsFixtureRoute(route: CommerceFixtureContentRoute): boolean {
  return (
    route.type === "products" &&
    route.listPath === commerceProductFixtureListPath &&
    route.detailPath === commerceProductFixtureDetailPath
  );
}

export function buildCommerceFixtureContentRoutes(
  currentValue: unknown
): CommerceFixtureContentRoute[] {
  const fixtureRoute: CommerceFixtureContentRoute = {
    type: "products",
    listPath: commerceProductFixtureListPath,
    detailPath: commerceProductFixtureDetailPath,
    enabled: true,
  };
  const existingRoutes = normalizeCommerceFixtureContentRoutes(currentValue);
  const remainingRoutes = existingRoutes.filter((route) => !isCommerceProductsFixtureRoute(route));
  return [fixtureRoute, ...remainingRoutes];
}

function buildPostsFeedFixturePostData(seed: PostsFeedFixturePostSeed): Record<string, unknown> {
  return {
    excerpt: seed.excerpt,
    featuredImage: postsFeedFixtureImageSrc,
    featuredImageAlt: seed.imageAlt,
  };
}

function buildPostsFeedFixtureRuntimeItem(seed: PostsFeedFixturePostSeed): Record<string, unknown> {
  return {
    id: seed.slug,
    title: seed.title,
    slug: seed.slug,
    href: `${postsFeedFixtureListPath}/${seed.slug}`,
    excerpt: seed.excerpt,
    imageSrc: postsFeedFixtureImageSrc,
    imageAlt: seed.imageAlt,
    tags: seed.tags,
    authorName: seed.authorName,
    publishedAt: seed.publishedAt,
    status: "published",
  };
}

function buildPostsFeedFixtureWidgetData(blockId: string): Record<string, unknown> {
  return {
    source: {
      mode: "latest",
      category: "",
      manualPostIds: [],
      authorId: "",
      featuredFirst: true,
      dateRange: {
        from: "",
        to: "",
      },
      limit: 3,
      sort: "published-desc",
    },
    title: "Fixture posts",
    description: "Populated Posts Feed smoke fixture.",
    pagination: {
      mode: "load-more",
      pageSize: 2,
      viewAllHref: postsFeedFixtureListPath,
      viewAllLabel: "View all fixture posts",
      loadMoreLabel: "More fixture posts",
    },
    fields: {
      showImage: true,
      showExcerpt: true,
      showAuthor: true,
      showDate: true,
      showCta: true,
    },
    emptyState: {
      title: "No fixture posts",
      description: "The Posts Feed smoke fixture should stay populated.",
    },
    style: {
      columns: "2",
      gap: "lg",
      cardStyle: "elevated",
      imageAspect: "wide",
      ctaLabel: "Read post",
      backgroundColor: "var(--color-bg)",
      borderColor: "var(--color-border)",
      textColor: "var(--color-text)",
      motion: "fade",
    },
    resolved: {
      items: postsFeedFixturePostSeeds.map(buildPostsFeedFixtureRuntimeItem),
      total: postsFeedFixturePostSeeds.length,
      sourceMode: "latest",
      listPath: postsFeedFixtureListPath,
      resolvedAt: "2026-05-31T10:05:00.000Z",
      runtime: {
        page: 1,
        pageSize: 2,
        totalPages: 2,
        nextPageHref: `?cl.${blockId}.page=2`,
      },
    },
  };
}

function normalizePostsFeedFixtureContentRoutes(value: unknown): PostsFeedFixtureContentRoute[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      if (typeof entry.type !== "string") return null;
      if (typeof entry.listPath !== "string") return null;
      if (typeof entry.detailPath !== "string") return null;
      const route: PostsFeedFixtureContentRoute = {
        type: entry.type,
        listPath: entry.listPath,
        detailPath: entry.detailPath,
        enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
      };
      if (Object.prototype.hasOwnProperty.call(entry, "detailPageId")) {
        route.detailPageId =
          typeof entry.detailPageId === "string" && entry.detailPageId.trim()
            ? entry.detailPageId.trim()
            : null;
      }
      return route;
    })
    .filter((entry): entry is PostsFeedFixtureContentRoute => Boolean(entry));
}

function isPostsFeedFixtureRoute(route: PostsFeedFixtureContentRoute): boolean {
  return (
    (route.type === "post" || route.type === "posts") &&
    route.listPath === postsFeedFixtureListPath &&
    route.detailPath === postsFeedFixtureDetailPath
  );
}

export function buildPostsFeedFixtureContentRoutes(
  currentValue: unknown
): PostsFeedFixtureContentRoute[] {
  const fixtureRoute: PostsFeedFixtureContentRoute = {
    type: "posts",
    listPath: postsFeedFixtureListPath,
    detailPath: postsFeedFixtureDetailPath,
    enabled: true,
  };
  const existingRoutes = normalizePostsFeedFixtureContentRoutes(currentValue);
  const remainingRoutes = existingRoutes.filter((route) => !isPostsFeedFixtureRoute(route));
  return [fixtureRoute, ...remainingRoutes];
}

function isPostsFeedFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "posts-feed";
}

export function buildPostsFeedFixturePageData(
  currentData: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  let patchedPostsFeed = false;
  const blocks = sourceBlocks.map((block) => {
    if (!patchedPostsFeed && isPostsFeedFixtureBlock(block)) {
      patchedPostsFeed = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : postsFeedFixtureFallbackBlockId;
      return {
        ...block,
        id: blockId,
        type: "posts-feed",
        variant: "cards",
        data: buildPostsFeedFixtureWidgetData(blockId),
      };
    }
    return block;
  });

  if (!patchedPostsFeed) {
    blocks.push({
      id: postsFeedFixtureFallbackBlockId,
      type: "posts-feed",
      variant: "cards",
      data: buildPostsFeedFixtureWidgetData(postsFeedFixtureFallbackBlockId),
    });
  }

  return {
    ...source,
    blocks,
  };
}

function buildEntryTeaserFixtureSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      excerpt: { type: "string" },
      featuredImage: { type: "string" },
      featuredImageAlt: { type: "string" },
      featured: { type: "boolean" },
    },
  };
}

function buildEntryTeaserFixtureEntryData(
  seed: EntryTeaserFixtureEntrySeed
): Record<string, unknown> {
  return {
    excerpt: seed.excerpt,
    featuredImage: entryTeaserFixtureImageSrc,
    featuredImageAlt: seed.imageAlt,
    featured: seed.featured,
  };
}

function buildEntryTeaserFixtureRuntimeItem(
  seed: EntryTeaserFixtureEntrySeed,
  id: string
): Record<string, unknown> {
  return {
    id,
    title: seed.title,
    slug: seed.slug,
    href: `${entryTeaserFixtureListPath}/${seed.slug}`,
    excerpt: seed.excerpt,
    imageSrc: entryTeaserFixtureImageSrc,
    imageAlt: seed.imageAlt,
    tags: seed.tags,
    authorName: seed.authorName,
    publishedAt: seed.publishedAt,
    status: "published",
  };
}

function findEntryTeaserFixtureSeed(key: EntryTeaserFixtureEntrySeed["key"]) {
  const seed = entryTeaserFixtureEntrySeeds.find((item) => item.key === key);
  if (!seed) throw new Error(`entry_teaser_fixture_seed_missing:${key}`);
  return seed;
}

function resolveEntryTeaserFixtureEntryId(
  context: EntryTeaserFixtureContext,
  key: EntryTeaserFixtureEntrySeed["key"]
) {
  if (key === "manual") return context.manualEntryId;
  if (key === "featured") return context.featuredEntryId;
  return context.fallbackEntryId;
}

function buildEntryTeaserFixtureListingQuery(
  contentTypeId: string,
  options: { fallbackOnly: boolean }
): Record<string, unknown> {
  return {
    source: "entries",
    sourceConfig: {
      contentTypeId,
      includeDrafts: false,
    },
    filters: options.fallbackOnly
      ? [
          {
            field: "tags",
            op: "contains",
            value: "fallback",
          },
        ]
      : [],
    sort: [
      {
        field: "publishedAt",
        dir: "desc",
      },
      {
        field: "id",
        dir: "asc",
      },
    ],
    pagination: {
      limit: 12,
      offset: 0,
    },
    fields: [
      "id",
      "title",
      "slug",
      "status",
      "tags",
      "publishedAt",
      "updatedAt",
      "author.name",
      "data.excerpt",
      "data.featuredImage",
      "data.featuredImageAlt",
      "data.featured",
    ],
  };
}

function buildEntryTeaserFixtureListingTemplateConfig(): Record<string, unknown> {
  return {
    fields: [
      {
        key: "title",
        source: "title",
        label: "Title",
        fallback: null,
        format: "text",
        conditions: [],
      },
      {
        key: "excerpt",
        source: "data.excerpt",
        label: "Excerpt",
        fallback: null,
        format: "text",
        conditions: [],
      },
      {
        key: "image",
        source: "data.featuredImage",
        label: "Image",
        fallback: null,
        format: "text",
        conditions: [],
      },
      {
        key: "tags",
        source: "tags",
        label: "Tags",
        fallback: null,
        format: "badge",
        conditions: [],
      },
      {
        key: "date",
        source: "publishedAt",
        label: "Published",
        fallback: null,
        format: "date",
        conditions: [],
      },
    ],
    itemActions: [
      {
        id: "view-entry",
        label: "Read entry",
        kind: "view",
        href: `${entryTeaserFixtureListPath}/{{slug}}`,
        opensInNewTab: false,
      },
    ],
    emptyState: {
      title: "No fixture entries",
      description: "The Entry Teaser smoke fixture should stay populated.",
      ctaLabel: null,
      ctaHref: null,
    },
    style: {
      columns: 3,
      gap: "md",
      cardVariant: "default",
    },
  };
}

function buildEntryTeaserFixtureWidgetData(
  branch: "legacy-manual" | "listing-featured" | "listing-fallback",
  context: EntryTeaserFixtureContext
): Record<string, unknown> {
  const seed =
    branch === "legacy-manual"
      ? findEntryTeaserFixtureSeed("manual")
      : branch === "listing-featured"
        ? findEntryTeaserFixtureSeed("featured")
        : findEntryTeaserFixtureSeed("fallback");
  const entryId = resolveEntryTeaserFixtureEntryId(context, seed.key);
  const isListing = branch !== "legacy-manual";
  const listingQueryId =
    branch === "listing-fallback" ? context.listingFallbackQueryId : context.listingQueryId;

  return {
    sourceMode: branch === "legacy-manual" ? "manual" : "featured",
    source: isListing
      ? {
          mode: "listing",
          listingQueryId,
          listingTemplateId: context.listingTemplateId,
          listingManualTarget: {
            rowId: "",
            entryId: "",
          },
          contentTypeId: "",
          entryId: "",
        }
      : {
          mode: "legacy",
          listingQueryId: "",
          listingTemplateId: "",
          listingManualTarget: {
            rowId: "",
            entryId: "",
          },
          contentTypeId: context.contentTypeId,
          entryId,
        },
    fields: {
      showImage: true,
      showExcerpt: true,
      showMeta: true,
      showTags: true,
      tagLimit: 5,
    },
    cta: {
      label: "Read entry",
      hrefMode: "auto",
      href: "",
      opensInNewTab: false,
      style: "outline",
    },
    style: {
      radius: "lg",
      spacing: "md",
    },
    section: {
      title:
        branch === "legacy-manual"
          ? "Entry Teaser manual fixture"
          : branch === "listing-featured"
            ? "Entry Teaser listing fixture"
            : "Entry Teaser fallback fixture",
      headingLevel: "h2",
    },
    title: {
      headingLevel: "h3",
    },
    media: {
      mode: "image",
      aspect: "16:9",
      height: "md",
      fit: "cover",
    },
    layout: {
      maxWidth: "lg",
    },
    fallback: {
      title: "No fixture entry",
      description: "The Entry Teaser smoke fixture should stay populated.",
      fallbackToLatest: branch === "listing-fallback",
    },
    resolved: {
      item: buildEntryTeaserFixtureRuntimeItem(seed, entryId),
      sourceTypeId: context.contentTypeId,
      sourceTypeSlug: entryTeaserFixtureContentTypeSlug,
      resolvedAt: "2026-05-31T10:05:00.000Z",
      listingQueryId: isListing ? listingQueryId : "",
      listingTemplateId: isListing ? context.listingTemplateId : "",
    },
  };
}

function normalizeEntryTeaserFixtureContentRoutes(
  value: unknown
): EntryTeaserFixtureContentRoute[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      if (typeof entry.type !== "string") return null;
      if (typeof entry.listPath !== "string") return null;
      if (typeof entry.detailPath !== "string") return null;
      const route: EntryTeaserFixtureContentRoute = {
        type: entry.type,
        listPath: entry.listPath,
        detailPath: entry.detailPath,
        enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
      };
      if (Object.prototype.hasOwnProperty.call(entry, "detailPageId")) {
        route.detailPageId =
          typeof entry.detailPageId === "string" && entry.detailPageId.trim()
            ? entry.detailPageId.trim()
            : null;
      }
      return route;
    })
    .filter((entry): entry is EntryTeaserFixtureContentRoute => Boolean(entry));
}

function isEntryTeaserFixtureRoute(route: EntryTeaserFixtureContentRoute): boolean {
  return (
    route.type === entryTeaserFixtureContentTypeSlug ||
    (route.listPath === entryTeaserFixtureListPath &&
      route.detailPath === entryTeaserFixtureDetailPath)
  );
}

export function buildEntryTeaserFixtureContentRoutes(
  currentValue: unknown
): EntryTeaserFixtureContentRoute[] {
  const fixtureRoute: EntryTeaserFixtureContentRoute = {
    type: entryTeaserFixtureContentTypeSlug,
    listPath: entryTeaserFixtureListPath,
    detailPath: entryTeaserFixtureDetailPath,
    enabled: true,
  };
  const existingRoutes = normalizeEntryTeaserFixtureContentRoutes(currentValue);
  const remainingRoutes = existingRoutes.filter((route) => !isEntryTeaserFixtureRoute(route));
  return [fixtureRoute, ...remainingRoutes];
}

function isEntryTeaserFixtureBlock(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.type === "entry-teaser";
}

function isEntryTeaserManagedFixtureBlock(value: unknown): boolean {
  if (!isEntryTeaserFixtureBlock(value)) return false;
  return (
    value.id === entryTeaserFixturePrimaryBlockId ||
    value.id === entryTeaserFixtureListingBlockId ||
    value.id === entryTeaserFixtureFallbackBlockId
  );
}

export function buildEntryTeaserFixturePageData(
  currentData: Record<string, unknown> | null | undefined,
  context: EntryTeaserFixtureContext
): Record<string, unknown> {
  const source = isRecord(currentData) ? currentData : {};
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  const blocksWithoutManagedFixtures = sourceBlocks.filter(
    (block) => !isEntryTeaserManagedFixtureBlock(block)
  );
  let patchedPrimary = false;
  const blocks = blocksWithoutManagedFixtures.map((block) => {
    if (!patchedPrimary && isEntryTeaserFixtureBlock(block)) {
      patchedPrimary = true;
      const blockId =
        typeof block.id === "string" && block.id.trim()
          ? block.id.trim()
          : entryTeaserFixturePrimaryBlockId;
      return {
        ...block,
        id: blockId,
        type: "entry-teaser",
        variant: "horizontal",
        data: buildEntryTeaserFixtureWidgetData("legacy-manual", context),
      };
    }
    return block;
  });

  if (!patchedPrimary) {
    blocks.push({
      id: entryTeaserFixturePrimaryBlockId,
      type: "entry-teaser",
      variant: "horizontal",
      data: buildEntryTeaserFixtureWidgetData("legacy-manual", context),
    });
  }

  blocks.push(
    {
      id: entryTeaserFixtureListingBlockId,
      type: "entry-teaser",
      variant: "vertical",
      data: buildEntryTeaserFixtureWidgetData("listing-featured", context),
    },
    {
      id: entryTeaserFixtureFallbackBlockId,
      type: "entry-teaser",
      variant: "minimal",
      data: buildEntryTeaserFixtureWidgetData("listing-fallback", context),
    }
  );

  return {
    ...source,
    blocks,
  };
}

function normalizeFixtureSlug(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export async function ensureContentListWidgetFixtures(
  adminUrl: string,
  sessionValue: string,
  selectedCases: WidgetSmokeCase[]
): Promise<void> {
  if (!selectedCasesNeedContentFixtures(selectedCases)) {
    return;
  }

  const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
    adminUrl,
    sessionValue,
    path: "/api/pages",
  });
  let csrfToken: string | null = null;
  const ensureCsrf = async () => {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchAdminCsrfToken(adminUrl, sessionValue);
    return csrfToken;
  };

  for (const item of selectedCases.filter((current) =>
    contentFixtureWidgetTypes.has(current.widgetType)
  )) {
    const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
    const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
    if (!pageRow) {
      throw new Error(`content_list_fixture_page_not_found:${item.adminFixtureSlug}`);
    }
    const detail = await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
    });
    const data = buildContentListFixturePageData(detail.currentData);
    await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      method: "PATCH",
      body: { data },
      csrfToken: await ensureCsrf(),
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}/publish`,
      method: "POST",
      body: { data },
      csrfToken: await ensureCsrf(),
    });
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function buildPostsFeedFixturePostPatch(
  existing: PostsFeedFixturePostListItem,
  seed: PostsFeedFixturePostSeed
): Record<string, unknown> | null {
  const expectedData = buildPostsFeedFixturePostData(seed);
  const patch: Record<string, unknown> = {};
  if (existing.title !== seed.title) patch.title = seed.title;
  if (existing.slug !== seed.slug) patch.slug = seed.slug;
  if (stableJson(existing.data ?? {}) !== stableJson(expectedData)) {
    patch.data = expectedData;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

function postsFeedFixtureMetadataPayload(seed: PostsFeedFixturePostSeed): Record<string, unknown> {
  return {
    status: "published",
    scheduledAt: null,
    tags: seed.tags,
    seo: {
      title: seed.title,
      description: seed.excerpt,
    },
  };
}

function normalizePostFixtureListItems(
  payload: PostsFeedFixturePostListItem[] | PostsFeedFixturePostListPayload
): PostsFeedFixturePostListItem[] {
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

export async function ensurePostsFeedWidgetFixtures(
  adminUrl: string,
  sessionValue: string,
  selectedCases: WidgetSmokeCase[]
): Promise<void> {
  if (!selectedCasesNeedPostsFixtures(selectedCases)) {
    return;
  }

  const postsPayload = await requestAdminJson<
    PostsFeedFixturePostListItem[] | PostsFeedFixturePostListPayload
  >({
    adminUrl,
    sessionValue,
    path: "/api/posts",
  });
  const postBySlug = new Map(
    normalizePostFixtureListItems(postsPayload).map((item) => [item.slug, item] as const)
  );
  let csrfToken: string | null = null;
  const ensureCsrf = async () => {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchAdminCsrfToken(adminUrl, sessionValue);
    return csrfToken;
  };
  const settingsPayload = await requestAdminJson<PostsFeedFixtureSettingsPayload>({
    adminUrl,
    sessionValue,
    path: "/api/settings",
  });
  const currentRoutes = normalizePostsFeedFixtureContentRoutes(
    settingsPayload["site.contentRoutes"]
  );
  const nextRoutes = buildPostsFeedFixtureContentRoutes(currentRoutes);
  if (stableJson(currentRoutes) !== stableJson(nextRoutes)) {
    await requestAdminJson<PostsFeedFixtureSettingsPayload>({
      adminUrl,
      sessionValue,
      path: "/api/settings",
      method: "PATCH",
      body: {
        "site.contentRoutes": nextRoutes,
      },
      csrfToken: await ensureCsrf(),
    });
  }

  for (const seed of postsFeedFixturePostSeeds) {
    const existing = postBySlug.get(seed.slug);
    let postId = existing?.id;
    if (!existing) {
      const created = await requestAdminJson<PostsFeedFixturePostListItem>({
        adminUrl,
        sessionValue,
        path: "/api/posts",
        method: "POST",
        body: {
          title: seed.title,
          slug: seed.slug,
          data: buildPostsFeedFixturePostData(seed),
        },
        csrfToken: await ensureCsrf(),
      });
      postId = created.id;
      postBySlug.set(seed.slug, created);
    } else {
      const patch = buildPostsFeedFixturePostPatch(existing, seed);
      if (patch) {
        await requestAdminJson<PostsFeedFixturePostListItem>({
          adminUrl,
          sessionValue,
          path: `/api/posts/${encodeURIComponent(existing.id)}`,
          method: "PATCH",
          body: patch,
          csrfToken: await ensureCsrf(),
        });
      }
    }

    if (!postId) {
      throw new Error(`posts_feed_fixture_post_id_missing:${seed.slug}`);
    }

    await requestAdminJson<PostsFeedFixturePostListItem>({
      adminUrl,
      sessionValue,
      path: `/api/posts/${encodeURIComponent(postId)}/metadata`,
      method: "PATCH",
      body: postsFeedFixtureMetadataPayload(seed),
      csrfToken: await ensureCsrf(),
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl,
      sessionValue,
      path: `/api/posts/${encodeURIComponent(postId)}/publish`,
      method: "POST",
      csrfToken: await ensureCsrf(),
    });
  }

  const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
    adminUrl,
    sessionValue,
    path: "/api/pages",
  });

  for (const item of selectedCases.filter((current) =>
    postsFixtureWidgetTypes.has(current.widgetType)
  )) {
    const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
    const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
    if (!pageRow) {
      throw new Error(`posts_feed_fixture_page_not_found:${item.adminFixtureSlug}`);
    }
    const detail = await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
    });
    const data = buildPostsFeedFixturePageData(detail.currentData);
    await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      method: "PATCH",
      body: { data },
      csrfToken: await ensureCsrf(),
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}/publish`,
      method: "POST",
      body: { data },
      csrfToken: await ensureCsrf(),
    });
  }
}

function normalizeEntryTeaserFixtureContentTypes(
  payload:
    | EntryTeaserFixtureContentTypeListItem[]
    | { items?: EntryTeaserFixtureContentTypeListItem[] }
): EntryTeaserFixtureContentTypeListItem[] {
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

function buildEntryTeaserFixtureContentTypePatch(
  existing: EntryTeaserFixtureContentTypeListItem
): Record<string, unknown> | null {
  const expectedSchema = buildEntryTeaserFixtureSchema();
  const patch: Record<string, unknown> = {};
  if (existing.name !== entryTeaserFixtureContentTypeName) {
    patch.name = entryTeaserFixtureContentTypeName;
  }
  if (existing.slug !== entryTeaserFixtureContentTypeSlug) {
    patch.slug = entryTeaserFixtureContentTypeSlug;
  }
  if (existing.status !== "published") {
    patch.status = "published";
  }
  if (stableJson(existing.schema ?? {}) !== stableJson(expectedSchema)) {
    patch.schema = expectedSchema;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export function buildEntryTeaserFixtureEntryPatch(
  existing: EntryTeaserFixtureEntryListItem,
  seed: EntryTeaserFixtureEntrySeed
): Record<string, unknown> | null {
  const expectedData = buildEntryTeaserFixtureEntryData(seed);
  const patch: Record<string, unknown> = {};
  if (existing.title !== seed.title) patch.title = seed.title;
  if (existing.slug !== seed.slug) patch.slug = seed.slug;
  if (stableJson(existing.data ?? {}) !== stableJson(expectedData)) {
    patch.data = expectedData;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

function entryTeaserFixtureMetadataPayload(
  seed: EntryTeaserFixtureEntrySeed
): Record<string, unknown> {
  return {
    status: "published",
    scheduledAt: null,
    tags: seed.tags,
    seo: {
      title: seed.title,
      description: seed.excerpt,
    },
  };
}

function normalizeEntryTeaserFixtureEntries(
  payload: EntryTeaserFixtureEntryListItem[] | { items?: EntryTeaserFixtureEntryListItem[] }
): EntryTeaserFixtureEntryListItem[] {
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

function normalizeEntryTeaserFixtureListingQueries(
  payload: EntryTeaserFixtureListingQueryListItem[] | EntryTeaserFixtureListingQueryListPayload
): EntryTeaserFixtureListingQueryListItem[] {
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

function normalizeEntryTeaserFixtureListingTemplates(
  payload:
    | EntryTeaserFixtureListingTemplateListItem[]
    | EntryTeaserFixtureListingTemplateListPayload
): EntryTeaserFixtureListingTemplateListItem[] {
  return Array.isArray(payload) ? payload : (payload.items ?? []);
}

function buildEntryTeaserListingQueryPayload(
  contentTypeId: string,
  options: { fallbackOnly: boolean }
): Record<string, unknown> {
  const name = options.fallbackOnly
    ? entryTeaserFixtureFallbackQueryName
    : entryTeaserFixtureListingQueryName;
  return {
    name,
    description: options.fallbackOnly
      ? "Deterministic fallback-only listing query for Entry Teaser widget smoke."
      : "Deterministic populated listing query for Entry Teaser widget smoke.",
    query: buildEntryTeaserFixtureListingQuery(contentTypeId, options),
  };
}

function buildEntryTeaserListingTemplatePayload(): Record<string, unknown> {
  return {
    name: entryTeaserFixtureListingTemplateName,
    slug: entryTeaserFixtureListingTemplateSlug,
    description: "Deterministic cards template for Entry Teaser widget smoke.",
    layout: "grid",
    config: buildEntryTeaserFixtureListingTemplateConfig(),
  };
}

function entryTeaserListingQueryDrifted(
  existing: EntryTeaserFixtureListingQueryListItem,
  expected: Record<string, unknown>
): boolean {
  return (
    existing.name !== expected.name ||
    (existing.description ?? null) !== (expected.description ?? null) ||
    stableJson(existing.query ?? {}) !== stableJson(expected.query)
  );
}

function entryTeaserListingTemplateDrifted(
  existing: EntryTeaserFixtureListingTemplateListItem,
  expected: Record<string, unknown>
): boolean {
  return (
    existing.name !== expected.name ||
    existing.slug !== expected.slug ||
    (existing.description ?? null) !== (expected.description ?? null) ||
    (existing.layout ?? "grid") !== expected.layout ||
    stableJson(existing.config ?? {}) !== stableJson(expected.config)
  );
}

async function ensureEntryTeaserListingQuery({
  adminUrl,
  sessionValue,
  csrfToken,
  listingQueries,
  contentTypeId,
  fallbackOnly,
}: {
  adminUrl: string;
  sessionValue: string;
  csrfToken: string;
  listingQueries: EntryTeaserFixtureListingQueryListItem[];
  contentTypeId: string;
  fallbackOnly: boolean;
}): Promise<string> {
  const expected = buildEntryTeaserListingQueryPayload(contentTypeId, { fallbackOnly });
  const name = String(expected.name);
  const existing = listingQueries.find((item) => item.name === name);
  if (!existing) {
    const created = await requestAdminJson<EntryTeaserFixtureListingQueryListItem>({
      adminUrl,
      sessionValue,
      path: "/api/listings/queries",
      method: "POST",
      body: expected,
      csrfToken,
    });
    return created.id;
  }

  if (entryTeaserListingQueryDrifted(existing, expected)) {
    await requestAdminJson<EntryTeaserFixtureListingQueryListItem>({
      adminUrl,
      sessionValue,
      path: `/api/listings/queries/${encodeURIComponent(existing.id)}`,
      method: "PATCH",
      body: expected,
      csrfToken,
    });
  }

  return existing.id;
}

async function ensureEntryTeaserListingTemplate({
  adminUrl,
  sessionValue,
  csrfToken,
  listingTemplates,
}: {
  adminUrl: string;
  sessionValue: string;
  csrfToken: string;
  listingTemplates: EntryTeaserFixtureListingTemplateListItem[];
}): Promise<string> {
  const expected = buildEntryTeaserListingTemplatePayload();
  const existing = listingTemplates.find(
    (item) => item.slug === entryTeaserFixtureListingTemplateSlug
  );
  if (!existing) {
    const created = await requestAdminJson<EntryTeaserFixtureListingTemplateListItem>({
      adminUrl,
      sessionValue,
      path: "/api/listings/templates",
      method: "POST",
      body: expected,
      csrfToken,
    });
    return created.id;
  }

  if (entryTeaserListingTemplateDrifted(existing, expected)) {
    await requestAdminJson<EntryTeaserFixtureListingTemplateListItem>({
      adminUrl,
      sessionValue,
      path: `/api/listings/templates/${encodeURIComponent(existing.id)}`,
      method: "PATCH",
      body: expected,
      csrfToken,
    });
  }

  return existing.id;
}

export async function ensureEntryTeaserWidgetFixtures(
  adminUrl: string,
  sessionValue: string,
  selectedCases: WidgetSmokeCase[]
): Promise<void> {
  if (!selectedCasesNeedEntryTeaserFixtures(selectedCases)) {
    return;
  }

  let csrfToken: string | null = null;
  const ensureCsrf = async () => {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchAdminCsrfToken(adminUrl, sessionValue);
    return csrfToken;
  };

  const contentTypesPayload = await requestAdminJson<
    EntryTeaserFixtureContentTypeListItem[] | { items?: EntryTeaserFixtureContentTypeListItem[] }
  >({
    adminUrl,
    sessionValue,
    path: "/api/content-types",
  });
  const contentTypes = normalizeEntryTeaserFixtureContentTypes(contentTypesPayload);
  let contentType = contentTypes.find((item) => item.slug === entryTeaserFixtureContentTypeSlug);
  if (!contentType) {
    contentType = await requestAdminJson<EntryTeaserFixtureContentTypeListItem>({
      adminUrl,
      sessionValue,
      path: "/api/content-types",
      method: "POST",
      body: {
        name: entryTeaserFixtureContentTypeName,
        slug: entryTeaserFixtureContentTypeSlug,
        schema: buildEntryTeaserFixtureSchema(),
        status: "published",
      },
      csrfToken: await ensureCsrf(),
    });
  } else {
    const patch = buildEntryTeaserFixtureContentTypePatch(contentType);
    if (patch) {
      contentType = await requestAdminJson<EntryTeaserFixtureContentTypeListItem>({
        adminUrl,
        sessionValue,
        path: `/api/content-types/${encodeURIComponent(contentType.id)}`,
        method: "PATCH",
        body: patch,
        csrfToken: await ensureCsrf(),
      });
    }
  }

  if (!contentType?.id) {
    throw new Error("entry_teaser_fixture_content_type_id_missing");
  }

  const settingsPayload = await requestAdminJson<EntryTeaserFixtureSettingsPayload>({
    adminUrl,
    sessionValue,
    path: "/api/settings",
  });
  const currentRoutes = normalizeEntryTeaserFixtureContentRoutes(
    settingsPayload["site.contentRoutes"]
  );
  const nextRoutes = buildEntryTeaserFixtureContentRoutes(currentRoutes);
  if (stableJson(currentRoutes) !== stableJson(nextRoutes)) {
    await requestAdminJson<EntryTeaserFixtureSettingsPayload>({
      adminUrl,
      sessionValue,
      path: "/api/settings",
      method: "PATCH",
      body: {
        "site.contentRoutes": nextRoutes,
      },
      csrfToken: await ensureCsrf(),
    });
  }

  const entriesPayload = await requestAdminJson<
    EntryTeaserFixtureEntryListItem[] | { items?: EntryTeaserFixtureEntryListItem[] }
  >({
    adminUrl,
    sessionValue,
    path: `/api/content/${encodeURIComponent(entryTeaserFixtureContentTypeSlug)}/entries`,
  });
  const entryBySlug = new Map(
    normalizeEntryTeaserFixtureEntries(entriesPayload).map((item) => [item.slug, item] as const)
  );
  const entryIdsByKey = new Map<EntryTeaserFixtureEntrySeed["key"], string>();

  for (const seed of entryTeaserFixtureEntrySeeds) {
    const existing = entryBySlug.get(seed.slug);
    let entryId = existing?.id;
    if (!existing) {
      const created = await requestAdminJson<EntryTeaserFixtureEntryListItem>({
        adminUrl,
        sessionValue,
        path: `/api/content/${encodeURIComponent(entryTeaserFixtureContentTypeSlug)}/entries`,
        method: "POST",
        body: {
          title: seed.title,
          slug: seed.slug,
          data: buildEntryTeaserFixtureEntryData(seed),
        },
        csrfToken: await ensureCsrf(),
      });
      entryId = created.id;
      entryBySlug.set(seed.slug, created);
    } else {
      const patch = buildEntryTeaserFixtureEntryPatch(existing, seed);
      if (patch) {
        await requestAdminJson<EntryTeaserFixtureEntryListItem>({
          adminUrl,
          sessionValue,
          path: `/api/content/${encodeURIComponent(
            entryTeaserFixtureContentTypeSlug
          )}/entries/${encodeURIComponent(existing.id)}`,
          method: "PATCH",
          body: patch,
          csrfToken: await ensureCsrf(),
        });
      }
    }

    if (!entryId) {
      throw new Error(`entry_teaser_fixture_entry_id_missing:${seed.slug}`);
    }

    await requestAdminJson<EntryTeaserFixtureEntryListItem>({
      adminUrl,
      sessionValue,
      path: `/api/content/${encodeURIComponent(
        entryTeaserFixtureContentTypeSlug
      )}/entries/${encodeURIComponent(entryId)}/metadata`,
      method: "PATCH",
      body: entryTeaserFixtureMetadataPayload(seed),
      csrfToken: await ensureCsrf(),
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl,
      sessionValue,
      path: `/api/content/${encodeURIComponent(
        entryTeaserFixtureContentTypeSlug
      )}/entries/${encodeURIComponent(entryId)}/publish`,
      method: "POST",
      csrfToken: await ensureCsrf(),
    });
    entryIdsByKey.set(seed.key, entryId);
  }

  const listingQueriesPayload = await requestAdminJson<
    EntryTeaserFixtureListingQueryListItem[] | EntryTeaserFixtureListingQueryListPayload
  >({
    adminUrl,
    sessionValue,
    path: "/api/listings/queries",
  });
  const listingQueries = normalizeEntryTeaserFixtureListingQueries(listingQueriesPayload);
  const listingQueryId = await ensureEntryTeaserListingQuery({
    adminUrl,
    sessionValue,
    csrfToken: await ensureCsrf(),
    listingQueries,
    contentTypeId: contentType.id,
    fallbackOnly: false,
  });
  const listingFallbackQueryId = await ensureEntryTeaserListingQuery({
    adminUrl,
    sessionValue,
    csrfToken: await ensureCsrf(),
    listingQueries,
    contentTypeId: contentType.id,
    fallbackOnly: true,
  });

  const listingTemplatesPayload = await requestAdminJson<
    EntryTeaserFixtureListingTemplateListItem[] | EntryTeaserFixtureListingTemplateListPayload
  >({
    adminUrl,
    sessionValue,
    path: "/api/listings/templates",
  });
  const listingTemplateId = await ensureEntryTeaserListingTemplate({
    adminUrl,
    sessionValue,
    csrfToken: await ensureCsrf(),
    listingTemplates: normalizeEntryTeaserFixtureListingTemplates(listingTemplatesPayload),
  });

  const context: EntryTeaserFixtureContext = {
    contentTypeId: contentType.id,
    listingQueryId,
    listingFallbackQueryId,
    listingTemplateId,
    manualEntryId: entryIdsByKey.get("manual") ?? "",
    featuredEntryId: entryIdsByKey.get("featured") ?? "",
    fallbackEntryId: entryIdsByKey.get("fallback") ?? "",
  };

  if (!context.manualEntryId || !context.featuredEntryId || !context.fallbackEntryId) {
    throw new Error("entry_teaser_fixture_entry_context_incomplete");
  }

  const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
    adminUrl,
    sessionValue,
    path: "/api/pages",
  });

  for (const item of selectedCases.filter((current) =>
    entryTeaserFixtureWidgetTypes.has(current.widgetType)
  )) {
    const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
    const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
    if (!pageRow) {
      throw new Error(`entry_teaser_fixture_page_not_found:${item.adminFixtureSlug}`);
    }
    const detail = await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
    });
    const data = buildEntryTeaserFixturePageData(detail.currentData, context);
    await requestAdminJson<ContentListFixturePageDetail>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      method: "PATCH",
      body: { data },
      csrfToken: await ensureCsrf(),
    });
    await requestAdminJson<{ ok: boolean }>({
      adminUrl,
      sessionValue,
      path: `/api/pages/${encodeURIComponent(pageRow.id)}/publish`,
      method: "POST",
      body: { data },
      csrfToken: await ensureCsrf(),
    });
  }
}

function mediaFixtureMetaDrifted(existing: MediaFixtureListItem, seed: MediaFixtureSeed): boolean {
  return (
    existing.title !== seed.title || existing.alt !== seed.alt || existing.caption !== seed.caption
  );
}

function mediaFixtureMatchesSeed(existing: MediaFixtureListItem, seed: MediaFixtureSeed): boolean {
  return (
    existing.originalName === seed.originalName &&
    existing.type === seed.mediaType &&
    existing.mimeType === seed.mimeType
  );
}

function isOptionalMediaFixtureUploadRejection(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /media_fixture_request_failed:POST:\/api\/media:(400|413|415)$/.test(error.message);
}

async function requestAdminForm<T>({
  adminUrl,
  sessionValue,
  path,
  method = "POST",
  formData,
  csrfToken,
}: {
  adminUrl: string;
  sessionValue: string;
  path: string;
  method?: "POST" | "PATCH" | "PUT";
  formData: FormData;
  csrfToken?: string;
}): Promise<T> {
  const adminBase = adminUrl.replace(/\/$/, "");
  const headers = new Headers({
    cookie: `session=${encodeURIComponent(sessionValue)}`,
  });
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(`${adminBase}${path}`, {
    method,
    headers,
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`media_fixture_request_failed:${method}:${path}:${response.status}`);
  }
  return (await response.json()) as T;
}

function buildMediaFixtureFormData(seed: MediaFixtureSeed): FormData {
  const formData = new FormData();
  const file = new File([seed.content], seed.originalName, { type: seed.mimeType });
  formData.set("file", file, seed.originalName);
  formData.set("alt", seed.alt);
  formData.set("title", seed.title);
  formData.set("caption", seed.caption);
  return formData;
}

export async function ensureMediaWidgetFixtures(
  adminUrl: string,
  sessionValue: string,
  selectedCases: WidgetSmokeCase[]
): Promise<void> {
  if (!selectedCasesNeedMediaFixtures(selectedCases)) {
    return;
  }

  const mediaPayload = await requestAdminJson<MediaFixtureListItem[] | MediaFixtureListPayload>({
    adminUrl,
    sessionValue,
    path: "/api/media",
  });
  const existingItems = Array.isArray(mediaPayload) ? mediaPayload : (mediaPayload.items ?? []);

  let csrfToken: string | null = null;
  const ensureCsrf = async () => {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchAdminCsrfToken(adminUrl, sessionValue);
    return csrfToken;
  };

  for (const seed of resolveMediaFixtureSeedsForCases(selectedCases)) {
    const existing = existingItems.find((item) => mediaFixtureMatchesSeed(item, seed));
    if (existing) {
      if (mediaFixtureMetaDrifted(existing, seed)) {
        await requestAdminJson<MediaFixtureListItem>({
          adminUrl,
          sessionValue,
          path: `/api/media/${existing.id}`,
          method: "PATCH",
          body: {
            alt: seed.alt,
            title: seed.title,
            caption: seed.caption,
          },
          csrfToken: await ensureCsrf(),
        });
      }
      continue;
    }

    try {
      await requestAdminForm<MediaFixtureListItem>({
        adminUrl,
        sessionValue,
        path: "/api/media",
        formData: buildMediaFixtureFormData(seed),
        csrfToken: await ensureCsrf(),
      });
    } catch (error) {
      if (seed.optionalUpload && isOptionalMediaFixtureUploadRejection(error)) {
        continue;
      }
      throw error;
    }
  }
}

export function buildCommerceFixtureProductPatch(
  existing: CommerceProductListItem,
  seed: CommerceFixtureProductSeed,
  expectedMediaIds: string[] = []
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  if (existing.title !== seed.title) patch.title = seed.title;
  if ((existing.excerpt ?? null) !== seed.excerpt) patch.excerpt = seed.excerpt;
  if ((existing.description ?? null) !== seed.description) patch.description = seed.description;
  if (existing.status !== seed.status) patch.status = seed.status;
  if (
    existing.pricing?.amount !== seed.pricing.amount ||
    existing.pricing?.currency !== seed.pricing.currency ||
    (existing.pricing?.compareAtAmount ?? null) !== seed.pricing.compareAtAmount
  ) {
    patch.pricing = seed.pricing;
  }
  if (
    existing.stock?.state !== seed.stock.state ||
    (existing.stock?.quantity ?? null) !== seed.stock.quantity
  ) {
    patch.stock = seed.stock;
  }
  if (expectedMediaIds.length > 0) {
    const existingMediaIds = Array.isArray(existing.mediaIds) ? [...existing.mediaIds].sort() : [];
    const sortedExpectedMediaIds = [...expectedMediaIds].sort();
    if (existingMediaIds.join(",") !== sortedExpectedMediaIds.join(",")) {
      patch.mediaIds = expectedMediaIds;
    }
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export function resolveCommerceFixtureCollectionIds(
  collectionBySlug: Map<string, CommerceCollectionListItem>,
  productSeed: CommerceFixtureProductSeed
): string[] {
  return productSeed.collectionSlugs
    .map((slug) => collectionBySlug.get(slug)?.id ?? "")
    .filter((id) => id.length > 0);
}

function resolveCommerceFixtureMediaIds(
  mediaByOriginalName: Map<string, MediaFixtureListItem>,
  productSeed: CommerceFixtureProductSeed
): string[] {
  if (!productSeed.mediaOriginalName) return [];
  const media = mediaByOriginalName.get(productSeed.mediaOriginalName);
  if (!media || media.type !== "image" || !media.id) return [];
  return [media.id];
}

function isEditorMode(value: unknown): value is EditorMode {
  return value === "wizard" || value === "visual" || value === "advanced";
}

async function readInventory(path: string): Promise<SmokeInventory> {
  const value = JSON.parse(await Bun.file(path).text()) as unknown;
  if (!isRecord(value)) throw new Error("inventory_invalid");
  const widgets = Array.isArray(value.widgets) ? value.widgets : [];
  const excluded = Array.isArray(value.excludedScreenOnlyWidgets)
    ? value.excludedScreenOnlyWidgets.filter((item): item is string => typeof item === "string")
    : [];

  return {
    version: 1,
    expectedWidgetCount:
      typeof value.expectedWidgetCount === "number" ? value.expectedWidgetCount : widgets.length,
    excludedScreenOnlyWidgets: excluded,
    widgets: widgets.map((item) => {
      if (!isRecord(item)) throw new Error("inventory_widget_invalid");
      const requiredModes = Array.isArray(item.requiredModes)
        ? item.requiredModes.filter(isEditorMode)
        : defaultModes;
      return {
        widgetType: String(item.widgetType ?? "").trim(),
        title: String(item.title ?? item.widgetType ?? "").trim(),
        adminInsertLabel: String(
          item.adminInsertLabel ?? item.title ?? item.widgetType ?? ""
        ).trim(),
        adminFixtureSlug: String(item.adminFixtureSlug ?? "").trim(),
        publicPath:
          typeof item.publicPath === "string"
            ? item.publicPath.trim()
            : item.publicPath === null
              ? null
              : undefined,
        publicFixtureStatus: item.publicFixtureStatus as WidgetSmokeCase["publicFixtureStatus"],
        requiredModes: requiredModes.length > 0 ? requiredModes : defaultModes,
        cssChecks: Array.isArray(item.cssChecks)
          ? item.cssChecks.filter(
              (entry): entry is CssCheck =>
                entry === "body-overflow" || entry === "card-overflow" || entry === "empty-fixture"
            )
          : undefined,
        priority: item.priority as WidgetSmokeCase["priority"],
        notes: typeof item.notes === "string" ? item.notes : undefined,
        allowedDuplicateWritablePaths: Array.isArray(item.allowedDuplicateWritablePaths)
          ? item.allowedDuplicateWritablePaths
              .filter((entry): entry is Record<string, unknown> => isRecord(entry))
              .map((entry) => ({
                path: String(entry.path ?? "").trim(),
                reason: String(entry.reason ?? "").trim(),
                expiresWithTask: String(entry.expiresWithTask ?? "").trim(),
              }))
              .filter((entry) => entry.path && entry.reason && entry.expiresWithTask)
          : undefined,
      };
    }),
  };
}

function validateInventory(inventory: SmokeInventory) {
  const seen = new Set<string>();
  for (const widget of inventory.widgets) {
    if (!widget.widgetType) throw new Error("inventory_widget_type_missing");
    if (seen.has(widget.widgetType))
      throw new Error(`inventory_widget_duplicate:${widget.widgetType}`);
    if (screenOnlyWidgets.has(widget.widgetType)) {
      throw new Error(`inventory_screen_only_included:${widget.widgetType}`);
    }
    if (!widget.adminFixtureSlug) {
      throw new Error(`inventory_admin_fixture_slug_missing:${widget.widgetType}`);
    }
    seen.add(widget.widgetType);
  }
  if (inventory.widgets.length !== inventory.expectedWidgetCount) {
    throw new Error(
      `inventory_widget_count_mismatch:${inventory.widgets.length}:${inventory.expectedWidgetCount}`
    );
  }
}

function selectCases(inventory: SmokeInventory, args: ParsedArgs): WidgetSmokeCase[] {
  let cases = inventory.widgets;
  if (args.widgetType) {
    cases = cases.filter((item) => item.widgetType === args.widgetType);
    if (cases.length === 0) throw new Error(`widget_not_found:${args.widgetType}`);
  }
  if (args.limit !== undefined) {
    cases = cases.slice(0, args.limit);
  }
  return cases;
}

async function runCommand(command: string[], env?: Record<string, string>): Promise<CommandResult> {
  const proc = Bun.spawn(command, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

async function openPlaywrightSession(session: string): Promise<CommandResult> {
  const result = await runCommand(["playwright-cli", `-s=${session}`, "open", "about:blank"]);
  if (result.exitCode === 0) {
    await new Promise((resolve) => setTimeout(resolve, playwrightCliOpenSettleMs));
  }
  return result;
}

function resolvePlaywrightCliSessionName(session: string): string {
  const safeSession = session.replace(/[^a-zA-Z0-9_-]+/g, "-");
  if (safeSession.length <= playwrightCliSessionMaxLength) return safeSession;

  const digest = createHash("sha256").update(safeSession).digest("hex").slice(0, 8);
  const prefixLength = playwrightCliSessionMaxLength - digest.length - 1;
  return `${safeSession.slice(0, prefixLength)}-${digest}`;
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "GET", redirect: "manual" });
    return response.status > 0 && response.status < 500;
  } catch {
    return false;
  }
}

async function ensureDirForFile(path: string) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) await mkdir(dir, { recursive: true });
}

async function writeCodeFile(path: string, code: string) {
  await ensureDirForFile(path);
  await Bun.write(path, code);
}

function getSetCookie(headers: Headers, cookieName: string): string | null {
  const headerApi = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headerApi.getSetCookie?.();
  if (cookies?.length) {
    return cookies.find((cookie) => cookie.startsWith(`${cookieName}=`)) ?? null;
  }
  const header = headers.get("set-cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|,\\s*)${cookieName}=([^;]+)[^,]*`, "i"));
  return match?.[0] ?? null;
}

function getCookieValue(setCookie: string, cookieName: string): string | null {
  const match = setCookie.match(new RegExp(`(?:^|,\\s*)${cookieName}=([^;]+)`, "i"));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function getCookieMaxAge(setCookie: string): number | null {
  const match = setCookie.match(/;\s*Max-Age=(\d+)/i);
  return match?.[1] ? Number(match[1]) : null;
}

async function writeAdminAuthState(
  adminUrl: string,
  authStatePath: string
): Promise<AdminAuthStateResult> {
  const email = process.env.CODERSO_PLAYWRIGHT_EMAIL || process.env.PLAYWRIGHT_ADMIN_EMAIL || "";
  const password =
    process.env.CODERSO_PLAYWRIGHT_PASSWORD || process.env.PLAYWRIGHT_ADMIN_PASSWORD || "";
  if (!email || !password) {
    return { attempted: true, authenticated: false, error: "credentials_missing" };
  }

  const adminBase = adminUrl.replace(/\/$/, "");
  const response = await fetch(`${adminBase}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);
  if (!response) return { attempted: true, authenticated: false, error: "login_network_failed" };
  if (!response.ok) {
    return { attempted: true, authenticated: false, error: `login_failed:${response.status}` };
  }

  const sessionCookie = getSetCookie(response.headers, "session");
  if (!sessionCookie) {
    return { attempted: true, authenticated: false, error: "session_cookie_missing" };
  }
  const sessionValue = getCookieValue(sessionCookie, "session");
  if (!sessionValue) {
    return { attempted: true, authenticated: false, error: "session_cookie_invalid" };
  }

  const maxAge = getCookieMaxAge(sessionCookie);
  const expires = maxAge ? Math.floor(Date.now() / 1000) + maxAge : -1;
  const url = new URL(adminUrl);
  await ensureDirForFile(authStatePath);
  await Bun.write(
    authStatePath,
    `${JSON.stringify(
      {
        cookies: [
          {
            name: "session",
            value: sessionValue,
            domain: url.hostname,
            path: "/",
            expires,
            httpOnly: true,
            secure: url.protocol === "https:",
            sameSite: "Strict",
          },
        ],
        origins: [],
      },
      null,
      2
    )}\n`
  );
  await chmodAuthState(authStatePath);
  return { attempted: true, authenticated: true, sessionValue };
}

async function chmodAuthState(authStatePath: string) {
  await chmod(authStatePath, 0o600).catch(() => undefined);
}

async function requestAdminJson<T>({
  adminUrl,
  sessionValue,
  path,
  method = "GET",
  body,
  csrfToken,
}: {
  adminUrl: string;
  sessionValue: string;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT";
  body?: unknown;
  csrfToken?: string;
}): Promise<T> {
  const adminBase = adminUrl.replace(/\/$/, "");
  const headers = new Headers({
    cookie: `session=${encodeURIComponent(sessionValue)}`,
  });
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(`${adminBase}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    throw new Error(`admin_fixture_request_failed:${method}:${path}:${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchAdminCsrfToken(adminUrl: string, sessionValue: string): Promise<string> {
  const payload = await requestAdminJson<{ token?: string }>({
    adminUrl,
    sessionValue,
    path: "/api/auth/csrf",
  });
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!token) {
    throw new Error("admin_fixture_csrf_missing");
  }
  return token;
}

export async function ensureCommerceWidgetFixtures(
  adminUrl: string,
  sessionValue: string,
  selectedCases: WidgetSmokeCase[]
): Promise<void> {
  if (!selectedCasesNeedCommerceFixtures(selectedCases)) {
    return;
  }

  const collectionsPayload = await requestAdminJson<{ items?: CommerceCollectionListItem[] }>({
    adminUrl,
    sessionValue,
    path: "/api/commerce/collections",
  });
  const collectionBySlug = new Map(
    (collectionsPayload.items ?? []).map((item) => [item.slug, item] as const)
  );
  const needsCommerceMedia =
    selectedCasesNeedProductGalleryFixture(selectedCases) ||
    selectedCasesNeedProductCompareFixture(selectedCases) ||
    selectedCasesNeedProductTableFixture(selectedCases);
  const mediaPayload = needsCommerceMedia
    ? await requestAdminJson<MediaFixtureListItem[] | MediaFixtureListPayload>({
        adminUrl,
        sessionValue,
        path: "/api/media",
      })
    : { items: [] };
  const mediaItems = Array.isArray(mediaPayload) ? mediaPayload : (mediaPayload.items ?? []);
  const mediaByOriginalName = new Map(
    mediaItems
      .filter((item) => typeof item.originalName === "string")
      .map((item) => [item.originalName as string, item] as const)
  );

  let csrfToken: string | null = null;
  const ensureCsrf = async () => {
    if (csrfToken) return csrfToken;
    csrfToken = await fetchAdminCsrfToken(adminUrl, sessionValue);
    return csrfToken;
  };

  const needsCommerceProductRoute =
    selectedCasesNeedProductCompareFixture(selectedCases) ||
    selectedCasesNeedProductTableFixture(selectedCases);
  if (needsCommerceProductRoute) {
    const settingsPayload = await requestAdminJson<CommerceFixtureSettingsPayload>({
      adminUrl,
      sessionValue,
      path: "/api/settings",
    });
    const currentRoutes = normalizeCommerceFixtureContentRoutes(
      settingsPayload["site.contentRoutes"]
    );
    const nextRoutes = buildCommerceFixtureContentRoutes(currentRoutes);
    if (stableJson(currentRoutes) !== stableJson(nextRoutes)) {
      await requestAdminJson<CommerceFixtureSettingsPayload>({
        adminUrl,
        sessionValue,
        path: "/api/settings",
        method: "PATCH",
        body: {
          "site.contentRoutes": nextRoutes,
        },
        csrfToken: await ensureCsrf(),
      });
    }
  }

  for (const seed of commerceFixtureCollectionSeeds) {
    if (collectionBySlug.has(seed.slug)) continue;
    const created = await requestAdminJson<CommerceCollectionListItem>({
      adminUrl,
      sessionValue,
      path: "/api/commerce/collections",
      method: "POST",
      body: {
        name: seed.name,
        slug: seed.slug,
        description: seed.description,
      },
      csrfToken: await ensureCsrf(),
    });
    collectionBySlug.set(created.slug, created);
  }

  const productsPayload = await requestAdminJson<{ items?: CommerceProductListItem[] }>({
    adminUrl,
    sessionValue,
    path: "/api/commerce/products",
  });
  const productBySlug = new Map(
    (productsPayload.items ?? []).map((item) => [item.slug, item] as const)
  );

  for (const seed of commerceFixtureProductSeeds) {
    const existing = productBySlug.get(seed.slug);
    const collectionIds = resolveCommerceFixtureCollectionIds(collectionBySlug, seed);
    const mediaIds = resolveCommerceFixtureMediaIds(mediaByOriginalName, seed);
    if (!existing) {
      const created = await requestAdminJson<CommerceProductListItem>({
        adminUrl,
        sessionValue,
        path: "/api/commerce/products",
        method: "POST",
        body: {
          title: seed.title,
          slug: seed.slug,
          status: seed.status,
          excerpt: seed.excerpt,
          description: seed.description,
          pricing: seed.pricing,
          stock: seed.stock,
          ...(mediaIds.length > 0 ? { mediaIds } : {}),
        },
        csrfToken: await ensureCsrf(),
      });
      productBySlug.set(created.slug, created);
      if (collectionIds.length > 0) {
        await requestAdminJson<CommerceProductListItem>({
          adminUrl,
          sessionValue,
          path: `/api/commerce/products/${created.id}/collections`,
          method: "PUT",
          body: { collectionIds },
          csrfToken: await ensureCsrf(),
        });
      }
      continue;
    }

    const patch = buildCommerceFixtureProductPatch(existing, seed, mediaIds);
    if (patch) {
      await requestAdminJson<CommerceProductListItem>({
        adminUrl,
        sessionValue,
        path: `/api/commerce/products/${existing.id}`,
        method: "PATCH",
        body: patch,
        csrfToken: await ensureCsrf(),
      });
    }
    const existingCollections = Array.isArray(existing.collectionIds)
      ? [...existing.collectionIds]
      : [];
    const expectedCollections = [...collectionIds].sort();
    if (existingCollections.sort().join(",") !== expectedCollections.join(",")) {
      await requestAdminJson<CommerceProductListItem>({
        adminUrl,
        sessionValue,
        path: `/api/commerce/products/${existing.id}/collections`,
        method: "PUT",
        body: { collectionIds },
        csrfToken: await ensureCsrf(),
      });
    }
  }

  if (selectedCasesNeedProductGalleryFixture(selectedCases)) {
    const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
      adminUrl,
      sessionValue,
      path: "/api/pages",
    });

    for (const item of selectedCases.filter((current) =>
      productGalleryFixtureWidgetTypes.has(current.widgetType)
    )) {
      const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
      const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
      if (!pageRow) {
        throw new Error(`product_gallery_fixture_page_not_found:${item.adminFixtureSlug}`);
      }
      const detail = await requestAdminJson<ContentListFixturePageDetail>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      });
      const data = buildProductGalleryFixturePageData(detail.currentData);
      await requestAdminJson<ContentListFixturePageDetail>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
        method: "PATCH",
        body: { data },
        csrfToken: await ensureCsrf(),
      });
      await requestAdminJson<{ ok: boolean }>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}/publish`,
        method: "POST",
        body: { data },
        csrfToken: await ensureCsrf(),
      });
    }
  }

  if (selectedCasesNeedProductCompareFixture(selectedCases)) {
    const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
      adminUrl,
      sessionValue,
      path: "/api/pages",
    });

    for (const item of selectedCases.filter((current) =>
      productCompareFixtureWidgetTypes.has(current.widgetType)
    )) {
      const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
      const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
      if (!pageRow) {
        throw new Error(`product_compare_fixture_page_not_found:${item.adminFixtureSlug}`);
      }
      const detail = await requestAdminJson<ContentListFixturePageDetail>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      });
      const data = buildProductCompareFixturePageData(detail.currentData);
      await requestAdminJson<ContentListFixturePageDetail>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
        method: "PATCH",
        body: { data },
        csrfToken: await ensureCsrf(),
      });
      await requestAdminJson<{ ok: boolean }>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}/publish`,
        method: "POST",
        body: { data },
        csrfToken: await ensureCsrf(),
      });
    }
  }

  if (selectedCasesNeedProductTableFixture(selectedCases)) {
    const pages = await requestAdminJson<ContentListFixturePageListItem[]>({
      adminUrl,
      sessionValue,
      path: "/api/pages",
    });

    for (const item of selectedCases.filter((current) =>
      productTableFixtureWidgetTypes.has(current.widgetType)
    )) {
      const expectedSlug = normalizeFixtureSlug(item.adminFixtureSlug);
      const pageRow = pages.find((page) => normalizeFixtureSlug(page.slug) === expectedSlug);
      if (!pageRow) {
        throw new Error(`product_table_fixture_page_not_found:${item.adminFixtureSlug}`);
      }
      const detail = await requestAdminJson<ContentListFixturePageDetail>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
      });
      const data = buildProductTableFixturePageData(detail.currentData);
      await requestAdminJson<ContentListFixturePageDetail>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}`,
        method: "PATCH",
        body: { data },
        csrfToken: await ensureCsrf(),
      });
      await requestAdminJson<{ ok: boolean }>({
        adminUrl,
        sessionValue,
        path: `/api/pages/${encodeURIComponent(pageRow.id)}/publish`,
        method: "POST",
        body: { data },
        csrfToken: await ensureCsrf(),
      });
    }
  }
}

function installAuthStateSignalCleanup(getPath: () => string | null) {
  const cleanupAndExit = async (signal: NodeJS.Signals) => {
    const authStatePath = getPath();
    if (authStatePath) await rm(authStatePath, { force: true }).catch(() => undefined);
    process.exit(signal === "SIGINT" ? 130 : 143);
  };
  process.once("SIGINT", () => {
    void cleanupAndExit("SIGINT");
  });
  process.once("SIGTERM", () => {
    void cleanupAndExit("SIGTERM");
  });
}

function extractCliJson<T>(stdout: string): T {
  const marker = "### Result";
  const markerIndex = stdout.indexOf(marker);
  let raw = stdout.trim();
  if (markerIndex >= 0) {
    const afterMarker = stdout.slice(markerIndex + marker.length).trimStart();
    const nextSectionIndex = afterMarker.search(/\r?\n###\s/);
    raw = (nextSectionIndex >= 0 ? afterMarker.slice(0, nextSectionIndex) : afterMarker).trim();
  } else {
    throw new Error("playwright_cli_result_missing");
  }
  const first = JSON.parse(raw) as unknown;
  const parsed = typeof first === "string" ? (JSON.parse(first) as unknown) : first;
  return parsed as T;
}

async function runPlaywrightCode<T>(
  session: string,
  filename: string,
  env?: Record<string, string>
): Promise<T> {
  const result = await runCommand(
    ["playwright-cli", `-s=${session}`, "run-code", "--filename", filename],
    env
  );
  if (result.exitCode !== 0) {
    throw new Error(`playwright_cli_failed:${result.stderr || result.stdout}`);
  }
  return extractCliJson<T>(result.stdout);
}

function buildAdminProbeCode(adminUrl: string, frontUrl: string, cases: WidgetSmokeCase[]) {
  const probeCases: AdminProbeSmokeCase[] = cases.map((item) => ({
    ...item,
    mediaProofPublicPath: resolveWidgetMediaProofPublicPath(item),
  }));
  return `async (page) => {
  const adminUrl = ${JSON.stringify(adminUrl.replace(/\/$/, ""))};
  const frontUrl = ${JSON.stringify(frontUrl.replace(/\/$/, ""))};
  const cases = ${JSON.stringify(probeCases)};
  const productGalleryMediaFixture = ${JSON.stringify(
    mediaFixtureSeeds.find((seed) => seed.originalName === productGalleryFixtureMediaOriginalName)
  )};
  const commerceProductMediaFixture = productGalleryMediaFixture;
  const logoCloudMediaFixture = ${JSON.stringify(
    mediaFixtureSeeds.find((seed) => seed.originalName === "widget-fixture-logo-cloud-acme.svg")
  )};
  const galleryMosaicImageFixture = ${JSON.stringify(
    mediaFixtureSeeds.find(
      (seed) => seed.originalName === "widget-fixture-gallery-mosaic-image.svg"
    )
  )};
  const teamPhotoFixture = ${JSON.stringify(
    mediaFixtureSeeds.find((seed) => seed.originalName === "widget-fixture-team-photo.svg")
  )};
  const richTextSectionImageFixture = ${JSON.stringify(
    mediaFixtureSeeds.find(
      (seed) => seed.originalName === "widget-fixture-rich-text-section-image.svg"
    )
  )};
  const richTextSectionDocumentFixture = ${JSON.stringify(
    mediaFixtureSeeds.find(
      (seed) => seed.originalName === "widget-fixture-rich-text-section-document.pdf"
    )
  )};
  const requiredLogin = { attempted: false, authenticated: null, error: null };
  const consoleErrors = [];
  page.on("dialog", async (dialog) => {
    await dialog.accept().catch(() => undefined);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error && error.message ? error.message : String(error));
  });
  async function settle() {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
  }
  async function fetchPages() {
    const response = await page.context().request.get(adminUrl + "/api/pages", {
      failOnStatusCode: false,
    });
    return {
      ok: response.ok(),
      status: response.status(),
      text: await response.text(),
    };
  }
  async function verifyAuthenticated() {
    const pagesResponse = await fetchPages();
    if (pagesResponse.ok) {
      requiredLogin.authenticated = true;
      return;
    }
    requiredLogin.authenticated = false;
    requiredLogin.error = "auth_state_invalid:" + pagesResponse.status;
  }
  function duplicatePaths(modes, allowedDuplicateWritablePaths) {
    const allowed = new Set((allowedDuplicateWritablePaths || []).map((entry) => entry.path));
    const owners = new Map();
    for (const mode of modes) {
      for (const path of mode.writablePaths || []) {
        const current = owners.get(path) || new Set();
        current.add(mode.mode);
        owners.set(path, current);
      }
    }
    return Array.from(owners.entries())
      .filter(([path, owners]) => owners.size > 1 && !allowed.has(path))
      .map(([path]) => path);
  }
  async function dismissCustomDirtyDialog() {
    const candidates = [
      /discard/i,
      /leave/i,
      /continue/i,
      /porzuc/i,
      /opuść/i
    ];
    for (const pattern of candidates) {
      const button = page.getByRole("button", { name: pattern }).first();
      if ((await button.count()) > 0 && await button.isVisible().catch(() => false)) {
        await button.click().catch(() => undefined);
        await settle();
        return;
      }
    }
  }
  async function selectFixtureBlock(item) {
    const typedBlocks = page.locator('[data-block-select][data-block-widget-type="' + item.widgetType + '"]');
    await typedBlocks.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
    if ((await typedBlocks.count()) > 0) {
      await typedBlocks.first().click().catch(() => undefined);
      await settle();
      return { ok: true, matchedExpectedBlock: true };
    }
    const blocks = page.locator("[data-block-select]");
    await blocks.first().waitFor({ state: "visible", timeout: 30000 }).catch(() => undefined);
    const blockCount = await blocks.count();
    if (blockCount === 0) return { ok: false, error: "block_select_missing", matchedExpectedBlock: false };
    const expectedLabels = [item.title, item.adminInsertLabel, item.widgetType]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    for (let index = 0; index < blockCount; index += 1) {
      const block = blocks.nth(index);
      const label = ((await block.innerText().catch(() => "")) || "").toLowerCase();
      if (expectedLabels.some((expected) => label.includes(expected))) {
        await block.click().catch(() => undefined);
        await settle();
        return { ok: true, matchedExpectedBlock: true };
      }
    }
    return { ok: false, error: "widget_block_type_missing", matchedExpectedBlock: false };
  }
  async function openFixtureAndSelect(item, pageRow, adminPath) {
    await dismissCustomDirtyDialog();
    await page
      .goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 })
      .catch(async () => {
        await dismissCustomDirtyDialog();
        await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      });
    await settle();
    await dismissCustomDirtyDialog();
    const existingEditor = page.locator('[data-widget-editor="' + item.widgetType + '"]');
    if ((await existingEditor.count()) > 0) {
      return { ok: true, matchedExpectedBlock: true };
    }
    return await selectFixtureBlock(item);
  }
  async function inspectMode(widgetType, mode) {
    const tab = page.getByRole("tab", { name: new RegExp("^" + mode + "$", "i") }).first();
    if ((await tab.count()) > 0) {
      await tab.click().catch(() => undefined);
      await settle();
    } else if (mode !== "wizard") {
      const complete = page
        .getByRole("button", { name: /finish setup and open visual|continue to layout and styling/i })
        .first();
      if ((await complete.count()) > 0) {
        await complete.click().catch(() => undefined);
        await settle();
        const nextTab = page.getByRole("tab", { name: new RegExp("^" + mode + "$", "i") }).first();
        if ((await nextTab.count()) > 0) {
          await nextTab.click().catch(() => undefined);
          await settle();
        }
      }
    }
    const root = page.locator('[data-widget-editor="' + widgetType + '"][data-widget-editor-mode="' + mode + '"]');
    const rootCount = await root.count();
    const firstRoot = root.first();
    const sectionCount = rootCount > 0 ? await firstRoot.locator("[data-widget-editor-section]").count() : 0;
    const visibleSectionCount = rootCount > 0
      ? await firstRoot.locator("[data-widget-editor-section]").evaluateAll((nodes) =>
          nodes.filter((node) => {
            if (!(node instanceof HTMLElement)) return false;
            const style = window.getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          }).length
        )
      : 0;
    const writablePaths = rootCount > 0
      ? await firstRoot.locator('[data-widget-control-path]:not([data-widget-control-readonly="true"])').evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-widget-control-path")).filter(Boolean)
        )
      : [];
    const controlsWithoutPath = rootCount > 0
      ? await firstRoot.locator("[data-widget-control]").evaluateAll((nodes) =>
          nodes.filter((node) => {
            if (node.hasAttribute("data-widget-control-path")) return false;
            const ownership = node.getAttribute("data-widget-control-ownership");
            return ownership !== "action" && ownership !== "preview" && ownership !== "readonly";
          }).length
        )
      : 0;
    return {
      mode,
      status: rootCount === 1 && visibleSectionCount > 0 ? "passed" : "failed",
      rootCount,
      sectionCount,
      visibleSectionCount,
      writablePaths,
      controlsWithoutPath,
      error: rootCount === 1 && visibleSectionCount > 0 ? undefined : "mode_root_or_visible_section_missing",
    };
  }
  async function runLogoCloudMediaPickerProof(item, adminPath) {
    if (item.widgetType !== "logo-cloud") return null;
    const publicPath = item.mediaProofPublicPath || item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminHasImage: false,
      publicHasImage: false,
      publicPath,
      adminAlt: null,
      publicAlt: null,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="logo-cloud"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const imageControl = editor.locator('[data-widget-control="logo-cloud.logo-1.image"]').first();
      await imageControl.waitFor({ state: "visible", timeout: 20000 });
      await imageControl.getByRole("button", { name: /browse media/i }).first().click();
      const dialog = page.getByRole("dialog", { name: /media library/i }).first();
      await dialog.waitFor({ state: "visible", timeout: 10000 });
      const search = dialog.getByPlaceholder(/search by name or title/i).first();
      if ((await search.count()) > 0) {
        await search.fill(logoCloudMediaFixture.title);
      }
      const assetButton = dialog.getByRole("button").filter({ hasText: logoCloudMediaFixture.title }).first();
      await assetButton.waitFor({ state: "visible", timeout: 10000 });
      await assetButton.click();
      await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
      await settle();

      const adminImage = page.locator('[data-logo-cloud-item="1"][data-logo-cloud-has-image="true"] img').first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminAlt = await adminImage.getAttribute("alt");
      const adminClassName = (await adminImage.getAttribute("class")) || "";
      if (proof.adminAlt !== logoCloudMediaFixture.alt) {
        proof.error = "admin_logo_alt_mismatch";
        return proof;
      }
      if (!adminClassName.includes("grayscale") || !adminClassName.includes("group-hover:grayscale-0")) {
        proof.error = "admin_logo_grayscale_hover_class_missing";
        return proof;
      }

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicImage = page.locator('[data-logo-cloud-item="1"][data-logo-cloud-has-image="true"] img').first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicAlt = await publicImage.getAttribute("alt");
      const publicClassName = (await publicImage.getAttribute("class")) || "";
      if (proof.publicAlt !== logoCloudMediaFixture.alt) {
        proof.error = "public_logo_alt_mismatch";
        return proof;
      }
      if (!publicClassName.includes("grayscale") || !publicClassName.includes("group-hover:grayscale-0")) {
        proof.error = "public_logo_grayscale_hover_class_missing";
        return proof;
      }
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function chooseMediaFixtureFromDialog(fixture) {
    const dialog = page.getByRole("dialog", { name: /media library/i }).first();
    await dialog.waitFor({ state: "visible", timeout: 10000 });
    const search = dialog.getByPlaceholder(/search by name or title/i).first();
    if ((await search.count()) > 0) {
      await search.fill(fixture.title);
    }
    const assetButton = dialog.getByRole("button").filter({ hasText: fixture.title }).first();
    await assetButton.waitFor({ state: "visible", timeout: 10000 });
    await assetButton.click();
    await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => undefined);
    await settle();
  }
  async function setRadixSelectOption(control, optionName) {
    const combobox = control.getByRole("combobox").first();
    await combobox.waitFor({ state: "visible", timeout: 10000 });
    await combobox.click();
    const option = page.getByRole("option", { name: optionName }).first();
    await option.waitFor({ state: "visible", timeout: 10000 });
    await option.click();
    await settle();
  }
  async function runProductGalleryFixtureProof(item, adminPath) {
    if (item.widgetType !== "product-gallery") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasReadyLinks: false,
      publicHasReadyLinks: false,
      adminHasViewAll: false,
      publicHasViewAll: false,
      publicPath,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="product-gallery"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const refreshButton = editor.getByRole("button", { name: /refresh products/i }).first();
      if ((await refreshButton.count()) > 0) {
        await refreshButton.click().catch(() => undefined);
        await settle();
      }
      const adminRoot = page.locator('[data-widget="product-gallery"][data-product-gallery-route-state="ready"][data-product-gallery-view-all-state="visible"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 20000 });
      proof.adminItemCount = Number(await adminRoot.getAttribute("data-product-gallery-count")) || await adminRoot.locator("[data-product-id]").count();
      if (proof.adminItemCount < 2) {
        proof.error = "admin_product_gallery_fixture_items_missing";
        return proof;
      }
      const adminImage = adminRoot.locator("img").first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      const adminAlt = await adminImage.getAttribute("alt");
      if (productGalleryMediaFixture?.alt && adminAlt !== productGalleryMediaFixture.alt) {
        proof.error = "admin_product_gallery_image_alt_mismatch";
        return proof;
      }
      const adminReadyLinks = await adminRoot.locator('article[data-product-gallery-card-link="ready"] a[href^="/fixture-products/"]').count();
      proof.adminHasReadyLinks = adminReadyLinks >= 2;
      if (!proof.adminHasReadyLinks) {
        proof.error = "admin_product_gallery_ready_links_missing";
        return proof;
      }
      const adminViewAll = adminRoot.getByRole("link", { name: /view all fixture products/i }).first();
      await adminViewAll.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasViewAll = true;

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicRoot = page.locator('[data-widget="product-gallery"][data-product-gallery-route-state="ready"][data-product-gallery-view-all-state="visible"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 20000 });
      proof.publicItemCount = Number(await publicRoot.getAttribute("data-product-gallery-count")) || await publicRoot.locator("[data-product-id]").count();
      if (proof.publicItemCount < 2) {
        proof.error = "public_product_gallery_fixture_items_missing";
        return proof;
      }
      const publicImage = publicRoot.locator("img").first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      const publicAlt = await publicImage.getAttribute("alt");
      if (productGalleryMediaFixture?.alt && publicAlt !== productGalleryMediaFixture.alt) {
        proof.error = "public_product_gallery_image_alt_mismatch";
        return proof;
      }
      const publicReadyLinks = await publicRoot.locator('article[data-product-gallery-card-link="ready"] a[href^="/fixture-products/"]').count();
      proof.publicHasReadyLinks = publicReadyLinks >= 2;
      if (!proof.publicHasReadyLinks) {
        proof.error = "public_product_gallery_ready_links_missing";
        return proof;
      }
      const publicViewAll = publicRoot.getByRole("link", { name: /view all fixture products/i }).first();
      await publicViewAll.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasViewAll = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function inspectProductCompareSurface(root, fixture, scope) {
    const countFromAttr = Number(await root.getAttribute("data-product-compare-count")) || 0;
    const cardCount = await root.locator("[data-product-id]").count();
    const itemCount = Math.max(countFromAttr, cardCount);
    if (itemCount < 2) {
      return { error: scope + "_product_compare_fixture_items_missing", itemCount };
    }
    const image = root.locator("img").first();
    await image.waitFor({ state: "visible", timeout: 10000 });
    const imageCount = await root.locator("img").count();
    if (imageCount < 2) {
      return { error: scope + "_product_compare_images_missing", itemCount };
    }
    const alt = await image.getAttribute("alt");
    if (fixture?.alt && alt !== fixture.alt) {
      return { error: scope + "_product_compare_image_alt_mismatch", itemCount };
    }
    const starterTitleLink = root.getByRole("link", { name: /^Fixture Starter Home$/i }).first();
    await starterTitleLink.waitFor({ state: "visible", timeout: 10000 });
    const starterHref = await starterTitleLink.getAttribute("href");
    if (!starterHref || !starterHref.startsWith("/fixture-products/fixture-starter-home")) {
      return { error: scope + "_product_compare_title_link_href_mismatch", itemCount };
    }
    const ctaLinks = root.getByRole("link", { name: /^Inspect fixture product$/i });
    const ctaCount = await ctaLinks.count();
    if (ctaCount < 2) {
      return { error: scope + "_product_compare_cta_links_missing", itemCount };
    }
    const firstCtaHref = await ctaLinks.first().getAttribute("href");
    if (!firstCtaHref || !firstCtaHref.startsWith("/fixture-products/")) {
      return { error: scope + "_product_compare_cta_href_mismatch", itemCount };
    }
    return { itemCount };
  }
  async function runProductCompareFixtureProof(item, adminPath) {
    if (item.widgetType !== "product-compare") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasTitleLinks: false,
      publicHasTitleLinks: false,
      adminHasCta: false,
      publicHasCta: false,
      publicPath,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const advancedTab = page.getByRole("tab", { name: /^advanced$/i }).first();
      if ((await advancedTab.count()) > 0) {
        await advancedTab.click().catch(() => undefined);
        await settle();
      }
      const refreshButton = page.getByRole("button", { name: /refresh preview/i }).first();
      if ((await refreshButton.count()) > 0) {
        await refreshButton.click().catch(() => undefined);
        await settle();
      }
      const adminRoot = page.locator('[data-widget="product-compare"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 20000 });
      const adminSurface = await inspectProductCompareSurface(
        adminRoot,
        commerceProductMediaFixture,
        "admin"
      );
      if (adminSurface.error) {
        proof.error = adminSurface.error;
        proof.adminItemCount = adminSurface.itemCount || 0;
        return proof;
      }
      proof.adminItemCount = adminSurface.itemCount;
      proof.adminHasImage = true;
      proof.adminHasTitleLinks = true;
      proof.adminHasCta = true;

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicRoot = page.locator('[data-widget="product-compare"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 20000 });
      const publicSurface = await inspectProductCompareSurface(
        publicRoot,
        commerceProductMediaFixture,
        "public"
      );
      if (publicSurface.error) {
        proof.error = publicSurface.error;
        proof.publicItemCount = publicSurface.itemCount || 0;
        return proof;
      }
      proof.publicItemCount = publicSurface.itemCount;
      proof.publicHasImage = true;
      proof.publicHasTitleLinks = true;
      proof.publicHasCta = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function inspectProductTableSurface(root, fixture, scope) {
    const itemCount = Number(await root.getAttribute("data-product-table-count")) || 0;
    if (itemCount < 2) {
      return { error: scope + "_product_table_fixture_items_missing", itemCount };
    }
    const image = root.locator("img").first();
    await image.waitFor({ state: "visible", timeout: 10000 });
    const imageCount = await root.locator("img").count();
    if (imageCount < 2) {
      return { error: scope + "_product_table_images_missing", itemCount };
    }
    const alt = await image.getAttribute("alt");
    if (fixture?.alt && alt !== fixture.alt) {
      return { error: scope + "_product_table_image_alt_mismatch", itemCount };
    }
    const starterTitleLink = root.getByRole("link", { name: /^Fixture Starter Home$/i }).first();
    await starterTitleLink.waitFor({ state: "visible", timeout: 10000 });
    const starterHref = await starterTitleLink.getAttribute("href");
    if (!starterHref || !starterHref.startsWith("/fixture-products/fixture-starter-home")) {
      return { error: scope + "_product_table_title_link_href_mismatch", itemCount };
    }
    const actionLinks = root.getByRole("link", { name: /^Inspect fixture product$/i });
    const actionCount = await actionLinks.count();
    if (actionCount < 2) {
      return { error: scope + "_product_table_action_links_missing", itemCount };
    }
    const firstActionHref = await actionLinks.first().getAttribute("href");
    if (!firstActionHref || !firstActionHref.startsWith("/fixture-products/")) {
      return { error: scope + "_product_table_action_href_mismatch", itemCount };
    }
    return { itemCount };
  }
  async function runProductTableFixtureProof(item, adminPath) {
    if (item.widgetType !== "product-table") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasTitleLinks: false,
      publicHasTitleLinks: false,
      adminHasCta: false,
      publicHasCta: false,
      publicPath,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const advancedTab = page.getByRole("tab", { name: /^advanced$/i }).first();
      if ((await advancedTab.count()) > 0) {
        await advancedTab.click().catch(() => undefined);
        await settle();
      }
      const refreshButton = page.getByRole("button", { name: /refresh preview/i }).first();
      if ((await refreshButton.count()) > 0) {
        await refreshButton.click().catch(() => undefined);
        await settle();
      }
      const adminRoot = page.locator('[data-widget="product-table"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 20000 });
      const adminSurface = await inspectProductTableSurface(
        adminRoot,
        commerceProductMediaFixture,
        "admin"
      );
      if (adminSurface.error) {
        proof.error = adminSurface.error;
        proof.adminItemCount = adminSurface.itemCount || 0;
        return proof;
      }
      proof.adminItemCount = adminSurface.itemCount;
      proof.adminHasImage = true;
      proof.adminHasTitleLinks = true;
      proof.adminHasCta = true;

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicRoot = page.locator('[data-widget="product-table"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 20000 });
      const publicSurface = await inspectProductTableSurface(
        publicRoot,
        commerceProductMediaFixture,
        "public"
      );
      if (publicSurface.error) {
        proof.error = publicSurface.error;
        proof.publicItemCount = publicSurface.itemCount || 0;
        return proof;
      }
      proof.publicItemCount = publicSurface.itemCount;
      proof.publicHasImage = true;
      proof.publicHasTitleLinks = true;
      proof.publicHasCta = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runContentListFixtureProof(item, adminPath) {
    if (item.widgetType !== "content-list") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasTags: false,
      publicHasTags: false,
      adminHasCta: false,
      publicHasCta: false,
      adminHasLoadMore: false,
      publicHasViewAll: false,
      publicPath,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="content-list"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const adminRoot = page.locator('[data-listing-widget="content-list"][data-content-list-state="ready"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 15000 });
      proof.adminItemCount = Number(await adminRoot.getAttribute("data-content-list-items")) || await adminRoot.locator("[data-content-list-item]").count();
      if (proof.adminItemCount < 2) {
        proof.error = "admin_content_list_fixture_items_missing";
        return proof;
      }
      const adminImage = adminRoot.locator('[data-content-list-item="1"] img').first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminHasTags = (await adminRoot.locator("text=launch").count()) > 0 && (await adminRoot.locator("text=featured").count()) > 0;
      if (!proof.adminHasTags) {
        proof.error = "admin_content_list_tags_missing";
        return proof;
      }
      const adminCta = adminRoot.locator('a[href="/fixture-content-list/launch-brief"]').first();
      await adminCta.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasCta = true;
      const adminLoadMore = adminRoot.getByRole("link", { name: /more fixture stories/i }).first();
      await adminLoadMore.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasLoadMore = true;

      const paginationModeControl = editor.locator('[data-widget-control="content-list.visual.pagination.mode"]').first();
      await paginationModeControl.waitFor({ state: "visible", timeout: 10000 });
      await setRadixSelectOption(paginationModeControl, /view all page/i);

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicRoot = page.locator('[data-listing-widget="content-list"][data-content-list-state="ready"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 15000 });
      proof.publicItemCount = Number(await publicRoot.getAttribute("data-content-list-items")) || await publicRoot.locator("[data-content-list-item]").count();
      if (proof.publicItemCount < 2) {
        proof.error = "public_content_list_fixture_items_missing";
        return proof;
      }
      const publicImage = publicRoot.locator('[data-content-list-item="1"] img').first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicHasTags = (await publicRoot.locator("text=launch").count()) > 0 && (await publicRoot.locator("text=featured").count()) > 0;
      if (!proof.publicHasTags) {
        proof.error = "public_content_list_tags_missing";
        return proof;
      }
      const publicCta = publicRoot.locator('a[href="/fixture-content-list/launch-brief"]').first();
      await publicCta.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasCta = true;
      const publicViewAll = publicRoot.locator('a[href="/fixture-content-list"]').first();
      await publicViewAll.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasViewAll = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runGalleryMosaicMediaPickerProof(item, adminPath) {
    if (item.widgetType !== "gallery-mosaic") return null;
    const publicPath = item.mediaProofPublicPath || item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminHasImage: false,
      publicHasImage: false,
      publicPath,
      adminAlt: null,
      publicAlt: null,
      publicLightboxOpened: false,
      publicLightboxClosed: false,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="gallery-mosaic"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const mediaSection = editor.locator('[data-widget-editor-section="gallery-mosaic.visual.media-items-links"]').first();
      await mediaSection.waitFor({ state: "visible", timeout: 20000 });
      await mediaSection.getByRole("button", { name: /browse media/i }).first().click();
      await chooseMediaFixtureFromDialog(galleryMosaicImageFixture);

      const interactionControl = editor.locator('[data-widget-control="gallery-mosaic.interaction.mode"]').first();
      await interactionControl.waitFor({ state: "visible", timeout: 10000 });
      await setRadixSelectOption(interactionControl, /open lightbox on click/i);

      const adminImage = page.locator('[data-gallery-item="1"][data-gallery-media-type="image"] img').first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminAlt = await adminImage.getAttribute("alt");
      proof.adminSrc = await adminImage.getAttribute("src");
      if (proof.adminAlt !== galleryMosaicImageFixture.alt) {
        proof.error = "admin_gallery_alt_mismatch";
        return proof;
      }

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicImage = page.locator('[data-gallery-item="1"][data-gallery-media-type="image"] img').first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicAlt = await publicImage.getAttribute("alt");
      proof.publicSrc = await publicImage.getAttribute("src");
      if (proof.publicAlt !== galleryMosaicImageFixture.alt) {
        proof.error = "public_gallery_alt_mismatch";
        return proof;
      }
      const root = page.locator('[data-gallery-lightbox-root="1"]').first();
      await root.waitFor({ state: "visible", timeout: 10000 });
      const trigger = root.locator("[data-gallery-lightbox-trigger]").first();
      await trigger.waitFor({ state: "visible", timeout: 10000 });
      await trigger.click();
      const dialog = root.locator("[data-gallery-lightbox-dialog]").first();
      await dialog.waitFor({ state: "visible", timeout: 10000 });
      const isOpen = await root.getAttribute("data-gallery-lightbox-open");
      if (isOpen !== "true") {
        proof.error = "public_gallery_lightbox_not_open";
        return proof;
      }
      proof.publicLightboxOpened = true;
      await dialog.locator("[data-gallery-lightbox-close]").first().click();
      await page.waitForFunction(
        () => document.querySelector('[data-gallery-lightbox-root="1"]')?.getAttribute("data-gallery-lightbox-open") === "false",
        null,
        { timeout: 10000 }
      ).catch(() => undefined);
      const closedState = await root.getAttribute("data-gallery-lightbox-open");
      if (closedState !== "false") {
        proof.error = "public_gallery_lightbox_not_closed";
        return proof;
      }
      proof.publicLightboxClosed = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runTeamMediaPickerProof(item, adminPath) {
    if (item.widgetType !== "team") return null;
    const publicPath = item.mediaProofPublicPath || item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminHasImage: false,
      publicHasImage: false,
      publicPath,
      adminAlt: null,
      publicAlt: null,
      adminSrc: null,
      publicSrc: null,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="team"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const membersSection = editor.locator('[data-widget-editor-section="team.visual.members-content-order"]').first();
      await membersSection.waitFor({ state: "visible", timeout: 20000 });

      await membersSection.getByRole("button", { name: /browse media/i }).first().click();
      await chooseMediaFixtureFromDialog(teamPhotoFixture);
      const firstMember = page.locator('[data-team-member="1"]').first();
      const adminImage = firstMember.locator("img").first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminAlt = await adminImage.getAttribute("alt");
      proof.adminSrc = await adminImage.getAttribute("src");
      if (!proof.adminSrc || /images\\.unsplash\\.com/i.test(proof.adminSrc)) {
        proof.error = "admin_team_seeded_photo_not_selected";
        return proof;
      }
      if (!/^Photo of /.test(proof.adminAlt || "")) {
        proof.error = "admin_team_photo_alt_mismatch";
        return proof;
      }

      await membersSection.getByRole("button", { name: /clear photo/i }).first().click();
      await settle();
      if ((await firstMember.locator("img").count()) > 0) {
        proof.error = "admin_team_clear_photo_failed";
        return proof;
      }

      await membersSection.getByRole("button", { name: /browse media/i }).first().click();
      await chooseMediaFixtureFromDialog(teamPhotoFixture);
      await firstMember.locator("img").first().waitFor({ state: "visible", timeout: 10000 });

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicImage = page.locator('[data-team-member="1"] img').first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicAlt = await publicImage.getAttribute("alt");
      proof.publicSrc = await publicImage.getAttribute("src");
      if (!proof.publicSrc || /images\\.unsplash\\.com/i.test(proof.publicSrc)) {
        proof.error = "public_team_seeded_photo_not_rendered";
        return proof;
      }
      if (!/^Photo of /.test(proof.publicAlt || "")) {
        proof.error = "public_team_photo_alt_mismatch";
        return proof;
      }
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runRichTextSectionMediaAndSanitizerProof(item, adminPath) {
    if (item.widgetType !== "rich-text-section") return null;
    const publicPath = item.mediaProofPublicPath || item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminHasImage: false,
      publicHasImage: false,
      adminHasAttachment: false,
      publicHasAttachment: false,
      publicPath,
      adminAlt: null,
      publicAlt: null,
      adminSrc: null,
      publicSrc: null,
      adminAttachmentHref: null,
      publicAttachmentHref: null,
      sanitizerGuidanceShown: false,
      unsafeHrefBlocked: false,
      rawIframeBlocked: false,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="rich-text-section"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const bodySection = editor.locator('[data-widget-editor-section="rich-text-section.visual.body-content"]').first();
      await bodySection.waitFor({ state: "visible", timeout: 20000 });
      await setRadixSelectOption(bodySection, /use structured blocks only/i);

      const bodyEditable = bodySection.locator('[data-post-editor-primary-editable="true"]').first();
      await bodyEditable.waitFor({ state: "visible", timeout: 10000 });
      await page.evaluate(() => {
        window.__codersoRichTextOriginalPrompt = window.prompt;
        window.prompt = (message, defaultValue) => {
          if (/enter link url/i.test(String(message))) return "javascript:alert(1)";
          return "Unsafe link label";
        };
      });
      await bodyEditable.click();
      await bodySection.getByRole("button", { name: /^link$/i }).first().click();
      await settle();
      await page.evaluate(() => {
        if (window.__codersoRichTextOriginalPrompt) {
          window.prompt = window.__codersoRichTextOriginalPrompt;
          delete window.__codersoRichTextOriginalPrompt;
        }
      }).catch(() => undefined);
      const linkedBodyHtml = await bodyEditable.evaluate((node) => node.innerHTML);
      proof.unsafeHrefBlocked = !/javascript:/i.test(linkedBodyHtml);
      proof.sanitizerGuidanceShown =
        (await bodySection.getByText(/unsafe link urls are rewritten/i).count()) > 0;
      if (!proof.unsafeHrefBlocked) {
        proof.error = "admin_rich_text_unsafe_link_not_blocked";
        return proof;
      }
      if (!proof.sanitizerGuidanceShown) {
        proof.error = "admin_rich_text_unsafe_link_guidance_missing";
        return proof;
      }

      await bodyEditable.evaluate((node) => {
        node.focus();
        const payload = {
          "text/html": '<p>Unsafe pasted embed</p><iframe src="https://example.com/embed"></iframe>',
          "text/plain": "Unsafe pasted embed",
        };
        const clipboardData = {
          files: [],
          items: [],
          getData: (type) => payload[type] || "",
        };
        const event = new Event("paste", { bubbles: true, cancelable: true });
        Object.defineProperty(event, "clipboardData", { value: clipboardData });
        node.dispatchEvent(event);
      });
      await settle();
      const pastedBodyHtml = await bodyEditable.evaluate((node) => node.innerHTML);
      proof.rawIframeBlocked = !/<iframe/i.test(pastedBodyHtml);
      if (!proof.rawIframeBlocked) {
        proof.error = "admin_rich_text_raw_iframe_not_blocked";
        return proof;
      }

      const blocksSection = editor.locator('[data-widget-editor-section="rich-text-section.visual.structured-content-blocks"]').first();
      await blocksSection.waitFor({ state: "visible", timeout: 20000 });
      await blocksSection.getByRole("button", { name: /add image block/i }).first().click();
      await settle();
      await blocksSection.getByRole("button", { name: /browse media/i }).first().click();
      await chooseMediaFixtureFromDialog(richTextSectionImageFixture);
      const adminRoot = page.locator('[data-rich-text-rendered-source="blocks"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 10000 });
      const adminImage = adminRoot.locator("img").first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminAlt = await adminImage.getAttribute("alt");
      proof.adminSrc = await adminImage.getAttribute("src");
      if (proof.adminAlt !== richTextSectionImageFixture.alt) {
        proof.error = "admin_rich_text_image_alt_mismatch";
        return proof;
      }

      await blocksSection.getByRole("button", { name: /add attachment block/i }).first().click();
      await settle();
      await blocksSection.getByRole("button", { name: /browse media/i }).first().click();
      await chooseMediaFixtureFromDialog(richTextSectionDocumentFixture);
      const adminAttachment = adminRoot
        .getByRole("link", { name: richTextSectionDocumentFixture.title })
        .first();
      await adminAttachment.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasAttachment = true;
      proof.adminAttachmentHref = await adminAttachment.getAttribute("href");
      if (!proof.adminAttachmentHref) {
        proof.error = "admin_rich_text_attachment_href_missing";
        return proof;
      }

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicRoot = page.locator('[data-rich-text-rendered-source="blocks"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 10000 });
      const publicImage = publicRoot.locator("img").first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicAlt = await publicImage.getAttribute("alt");
      proof.publicSrc = await publicImage.getAttribute("src");
      if (proof.publicAlt !== richTextSectionImageFixture.alt) {
        proof.error = "public_rich_text_image_alt_mismatch";
        return proof;
      }
      const publicAttachment = publicRoot
        .getByRole("link", { name: richTextSectionDocumentFixture.title })
        .first();
      await publicAttachment.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasAttachment = true;
      proof.publicAttachmentHref = await publicAttachment.getAttribute("href");
      if (!proof.publicAttachmentHref) {
        proof.error = "public_rich_text_attachment_href_missing";
        return proof;
      }
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    } finally {
      await page.evaluate(() => {
        if (window.__codersoRichTextOriginalPrompt) {
          window.prompt = window.__codersoRichTextOriginalPrompt;
          delete window.__codersoRichTextOriginalPrompt;
        }
      }).catch(() => undefined);
    }
  }
  async function runWidgetMediaPickerProof(item, adminPath) {
    const logoProof = await runLogoCloudMediaPickerProof(item, adminPath);
    if (logoProof) return logoProof;
    const galleryProof = await runGalleryMosaicMediaPickerProof(item, adminPath);
    if (galleryProof) return galleryProof;
    const teamProof = await runTeamMediaPickerProof(item, adminPath);
    if (teamProof) return teamProof;
    return await runRichTextSectionMediaAndSanitizerProof(item, adminPath);
  }
  async function runWidgetProductGalleryProof(item, adminPath) {
    return await runProductGalleryFixtureProof(item, adminPath);
  }
  async function runWidgetProductCompareProof(item, adminPath) {
    return await runProductCompareFixtureProof(item, adminPath);
  }
  async function runWidgetProductTableProof(item, adminPath) {
    return await runProductTableFixtureProof(item, adminPath);
  }
  async function runWidgetContentProof(item, adminPath) {
    return await runContentListFixtureProof(item, adminPath);
  }
  async function runPostsFeedFixtureProof(item, adminPath) {
    if (item.widgetType !== "posts-feed") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasTags: false,
      publicHasTags: false,
      adminHasCta: false,
      publicHasCta: false,
      adminHasLoadMore: false,
      publicHasViewAll: false,
      publicPath,
      error: undefined,
    };
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="posts-feed"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const adminMotion = page.locator('[data-posts-feed-motion="fade"]').first();
      await adminMotion.waitFor({ state: "visible", timeout: 15000 });
      const adminRoot = page.locator('[data-listing-widget="content-list"][data-content-list-source="post"][data-content-list-state="ready"]').first();
      await adminRoot.waitFor({ state: "visible", timeout: 15000 });
      proof.adminItemCount = Number(await adminRoot.getAttribute("data-content-list-items")) || await adminRoot.locator("[data-content-list-item]").count();
      if (proof.adminItemCount < 3) {
        proof.error = "admin_posts_feed_fixture_items_missing";
        return proof;
      }
      const adminImage = adminRoot.locator('[data-content-list-item="1"] img').first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminHasTags = (await adminRoot.locator("text=featured").count()) > 0 && (await adminRoot.locator("text=launch").count()) > 0;
      if (!proof.adminHasTags) {
        proof.error = "admin_posts_feed_tags_missing";
        return proof;
      }
      const adminCta = adminRoot.locator('a[href="/fixture-posts/fixture-posts-launch-brief"]').first();
      await adminCta.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasCta = true;
      const adminLoadMore = adminRoot.getByRole("link", { name: /more fixture posts/i }).first();
      await adminLoadMore.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasLoadMore = true;

      const paginationModeControl = editor.locator('[data-widget-control="posts-feed.visual.pagination-mode"]').first();
      await paginationModeControl.waitFor({ state: "visible", timeout: 10000 });
      await setRadixSelectOption(paginationModeControl, /view all link/i);

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicMotion = page.locator('[data-posts-feed-motion="fade"]').first();
      await publicMotion.waitFor({ state: "visible", timeout: 15000 });
      const publicRoot = page.locator('[data-listing-widget="content-list"][data-content-list-source="post"][data-content-list-state="ready"]').first();
      await publicRoot.waitFor({ state: "visible", timeout: 15000 });
      proof.publicItemCount = Number(await publicRoot.getAttribute("data-content-list-items")) || await publicRoot.locator("[data-content-list-item]").count();
      if (proof.publicItemCount < 3) {
        proof.error = "public_posts_feed_fixture_items_missing";
        return proof;
      }
      const publicImage = publicRoot.locator('[data-content-list-item="1"] img').first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicHasTags = (await publicRoot.locator("text=featured").count()) > 0 && (await publicRoot.locator("text=launch").count()) > 0;
      if (!proof.publicHasTags) {
        proof.error = "public_posts_feed_tags_missing";
        return proof;
      }
      const publicCta = publicRoot.locator('a[href="/fixture-posts/fixture-posts-launch-brief"]').first();
      await publicCta.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasCta = true;
      const publicViewAll = publicRoot.locator('a[href="/fixture-posts"]').first();
      await publicViewAll.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasViewAll = true;
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runEntryTeaserFixtureProof(item, adminPath) {
    if (item.widgetType !== "entry-teaser") return null;
    const publicPath = item.publicPath || item.adminFixtureSlug || null;
    const proof = {
      status: "failed",
      adminItemCount: 0,
      publicItemCount: 0,
      adminReadyCount: 0,
      publicReadyCount: 0,
      adminHasImage: false,
      publicHasImage: false,
      adminHasTags: false,
      publicHasTags: false,
      adminHasCta: false,
      publicHasCta: false,
      adminHasLoadMore: false,
      publicHasViewAll: false,
      publicPath,
      consoleErrors: [],
      error: undefined,
    };
    const consoleStartIndex = consoleErrors.length;
    try {
      await dismissCustomDirtyDialog();
      await page.goto(adminPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const selected = await openFixtureAndSelect(item, null, adminPath);
      if (!selected.ok) {
        proof.error = selected.error || "block_select_missing";
        return proof;
      }
      const visualTab = page.getByRole("tab", { name: /^visual$/i }).first();
      if ((await visualTab.count()) > 0) {
        await visualTab.click().catch(() => undefined);
        await settle();
      }
      const editor = page.locator('[data-widget-editor="entry-teaser"][data-widget-editor-mode="visual"]').first();
      await editor.waitFor({ state: "visible", timeout: 20000 });
      const adminRoots = page.locator('[data-listing-widget="entry-teaser"][data-entry-teaser-state="ready"]');
      await adminRoots.first().waitFor({ state: "visible", timeout: 15000 });
      proof.adminReadyCount = await adminRoots.count();
      proof.adminItemCount = proof.adminReadyCount;
      if (proof.adminReadyCount < 3) {
        proof.error = "admin_entry_teaser_ready_roots_missing";
        return proof;
      }
      const adminImage = adminRoots.first().locator("img").first();
      await adminImage.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasImage = true;
      proof.adminHasTags =
        (await page.locator("text=manual").count()) > 0 &&
        (await page.locator("text=launch").count()) > 0 &&
        (await page.locator("text=featured").count()) > 0 &&
        (await page.locator("text=fallback").count()) > 0;
      if (!proof.adminHasTags) {
        proof.error = "admin_entry_teaser_tags_missing";
        return proof;
      }
      const adminCta = page
        .locator('a[href="/fixture-entry-teaser/fixture-entry-teaser-manual-brief"]')
        .first();
      await adminCta.waitFor({ state: "visible", timeout: 10000 });
      proof.adminHasCta = true;

      const publishButton = page.getByRole("button", { name: /^publish$/i }).first();
      if ((await publishButton.count()) === 0) {
        proof.error = "publish_button_missing";
        return proof;
      }
      await publishButton.click();
      await page.getByRole("button", { name: /publishing/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => undefined);
      await settle();

      if (!publicPath) {
        proof.error = "public_path_missing";
        return proof;
      }
      await page.goto(frontUrl + publicPath, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const publicRoots = page.locator('[data-listing-widget="entry-teaser"][data-entry-teaser-state="ready"]');
      await publicRoots.first().waitFor({ state: "visible", timeout: 15000 });
      proof.publicReadyCount = await publicRoots.count();
      proof.publicItemCount = proof.publicReadyCount;
      if (proof.publicReadyCount < 3) {
        proof.error = "public_entry_teaser_ready_roots_missing";
        return proof;
      }
      const publicImage = publicRoots.first().locator("img").first();
      await publicImage.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasImage = true;
      proof.publicHasTags =
        (await page.locator("text=manual").count()) > 0 &&
        (await page.locator("text=launch").count()) > 0 &&
        (await page.locator("text=featured").count()) > 0 &&
        (await page.locator("text=fallback").count()) > 0;
      if (!proof.publicHasTags) {
        proof.error = "public_entry_teaser_tags_missing";
        return proof;
      }
      const publicCta = page
        .locator('a[href="/fixture-entry-teaser/fixture-entry-teaser-manual-brief"]')
        .first();
      await publicCta.waitFor({ state: "visible", timeout: 10000 });
      proof.publicHasCta = true;

      proof.consoleErrors = consoleErrors.slice(consoleStartIndex);
      if (proof.consoleErrors.length > 0) {
        proof.error = "entry_teaser_console_errors";
        return proof;
      }
      proof.status = "passed";
      return proof;
    } catch (error) {
      proof.consoleErrors = consoleErrors.slice(consoleStartIndex);
      proof.error = error instanceof Error ? error.message : String(error);
      return proof;
    }
  }
  async function runWidgetPostsProof(item, adminPath) {
    return await runPostsFeedFixtureProof(item, adminPath);
  }
  async function runWidgetEntryTeaserProof(item, adminPath) {
    return await runEntryTeaserFixtureProof(item, adminPath);
  }
  await verifyAuthenticated();
  if (!requiredLogin.authenticated) {
    return JSON.stringify({ login: requiredLogin, results: [], error: requiredLogin.error || "login_failed" });
  }
  const pagesResponse = await fetchPages();
  if (!pagesResponse.ok) {
    return JSON.stringify({ login: requiredLogin, results: [], error: "pages_api_failed:" + pagesResponse.status });
  }
  const pages = JSON.parse(pagesResponse.text);
  const results = [];
  for (const item of cases) {
    const pageRow = pages.find((page) => page.slug === item.adminFixtureSlug);
    if (!pageRow) {
      results.push({ widgetType: item.widgetType, status: "fixture-gap", modes: [], duplicateWritablePaths: [], error: "admin_fixture_not_found" });
      continue;
    }
    const adminPath = adminUrl + "/pages/" + encodeURIComponent(pageRow.id);
    const modes = [];
    let selected = await openFixtureAndSelect(item, pageRow, adminPath);
    if (!selected.ok) {
      await settle();
      selected = await openFixtureAndSelect(item, pageRow, adminPath);
    }
    if (!selected.ok) {
      results.push({
        widgetType: item.widgetType,
        status: "failed",
        pageId: pageRow.id,
        adminPath,
        modes,
        duplicateWritablePaths: [],
        error: selected.error || "block_select_missing"
      });
      continue;
    }
    for (const mode of item.requiredModes) {
      modes.push(await inspectMode(item.widgetType, mode));
    }
    const hasMetadataGap = modes.some((mode) => mode.controlsWithoutPath > 0);
    const duplicates = hasMetadataGap ? [] : duplicatePaths(modes, item.allowedDuplicateWritablePaths || []);
    const hasModeFailure = modes.some((mode) => mode.status === "failed");
    const mediaProof = hasModeFailure ? null : await runWidgetMediaPickerProof(item, adminPath);
    const productGalleryProof = hasModeFailure ? null : await runWidgetProductGalleryProof(item, adminPath);
    const productCompareProof = hasModeFailure ? null : await runWidgetProductCompareProof(item, adminPath);
    const productTableProof = hasModeFailure ? null : await runWidgetProductTableProof(item, adminPath);
    const contentProof = hasModeFailure ? null : await runWidgetContentProof(item, adminPath);
    const postsProof = hasModeFailure ? null : await runWidgetPostsProof(item, adminPath);
    const entryTeaserProof = hasModeFailure ? null : await runWidgetEntryTeaserProof(item, adminPath);
    const hasMediaProofFailure = Boolean(mediaProof && mediaProof.status !== "passed");
    const hasProductGalleryProofFailure = Boolean(productGalleryProof && productGalleryProof.status !== "passed");
    const hasProductCompareProofFailure = Boolean(productCompareProof && productCompareProof.status !== "passed");
    const hasProductTableProofFailure = Boolean(productTableProof && productTableProof.status !== "passed");
    const hasContentProofFailure = Boolean(contentProof && contentProof.status !== "passed");
    const hasPostsProofFailure = Boolean(postsProof && postsProof.status !== "passed");
    const hasEntryTeaserProofFailure = Boolean(entryTeaserProof && entryTeaserProof.status !== "passed");
    const hasFailure = hasModeFailure || duplicates.length > 0 || hasMediaProofFailure || hasProductGalleryProofFailure || hasProductCompareProofFailure || hasProductTableProofFailure || hasContentProofFailure || hasPostsProofFailure || hasEntryTeaserProofFailure;
    results.push({
      widgetType: item.widgetType,
      status: hasFailure ? "failed" : hasMetadataGap ? "metadata-gap" : "passed",
      pageId: pageRow.id,
      adminPath,
      modes,
      duplicateWritablePaths: duplicates,
      mediaProof: mediaProof || undefined,
      productGalleryProof: productGalleryProof || undefined,
      productCompareProof: productCompareProof || undefined,
      productTableProof: productTableProof || undefined,
      contentProof: contentProof || undefined,
      postsProof: postsProof || undefined,
      entryTeaserProof: entryTeaserProof || undefined,
      error: hasMediaProofFailure
        ? mediaProof.error || "media_picker_proof_failed"
        : hasProductGalleryProofFailure
          ? productGalleryProof.error || "product_gallery_fixture_proof_failed"
          : hasProductCompareProofFailure
            ? productCompareProof.error || "product_compare_fixture_proof_failed"
            : hasProductTableProofFailure
              ? productTableProof.error || "product_table_fixture_proof_failed"
              : hasContentProofFailure
                ? contentProof.error || "content_list_fixture_proof_failed"
                : hasPostsProofFailure
                  ? postsProof.error || "posts_feed_fixture_proof_failed"
                  : hasEntryTeaserProofFailure
                    ? entryTeaserProof.error || "entry_teaser_fixture_proof_failed"
                    : undefined,
    });
  }
  return JSON.stringify({ login: requiredLogin, results });
}`;
}

function buildPublicProbeCode(frontUrl: string, cases: WidgetSmokeCase[], screenshotDir: string) {
  return `async (page) => {
  const frontUrl = ${JSON.stringify(frontUrl.replace(/\/$/, ""))};
  const cases = ${JSON.stringify(cases)};
  const screenshotDir = ${JSON.stringify(screenshotDir)};
  const approvedIntentionalOverflowSelectors = ${JSON.stringify(APPROVED_INTENTIONAL_OVERFLOW_SELECTORS)};
  const results = [];
  async function settle() {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
  }
  function shouldCaptureScreenshot(item) {
    const checks = Array.isArray(item.cssChecks) ? item.cssChecks : [];
    return Boolean(item.priority) || checks.includes("card-overflow") || checks.includes("empty-fixture");
  }
  function safeScreenshotName(widgetType) {
    return String(widgetType).replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  }
  for (const item of cases) {
    if (!item.publicPath) {
      results.push({ widgetType: item.widgetType, status: "fixture-gap", publicPath: item.publicPath || null, error: "public_fixture_missing" });
      continue;
    }
    const url = frontUrl + item.publicPath;
    let response = null;
    try {
      response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await settle();
      const overflow = await page.evaluate(({ widgetType, approvedIntentionalOverflowSelectors }) => {
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
        const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        function hasApprovedIntentionalOverflowAncestor(element) {
          const intentional = element.closest('[data-overflow-intentional="true"]');
          if (!intentional) return false;
          const selectors = approvedIntentionalOverflowSelectors[String(widgetType)] || [];
          return selectors.some((selector) => {
            try {
              return intentional.matches(selector) || Boolean(intentional.querySelector(selector));
            } catch {
              return false;
            }
          });
        }
        const unmarkedOverflowOwners = Array.from(document.body.querySelectorAll("*"))
          .filter((element) => {
            if (!(element instanceof HTMLElement)) return false;
            if (hasApprovedIntentionalOverflowAncestor(element)) return false;
            if (element.closest('[aria-hidden="true"], [hidden]')) return false;
            if (element.getAttribute("aria-hidden") === "true" || element.hidden) return false;
            const className = typeof element.className === "string" ? element.className : "";
            if (/\\bsr-only\\b/.test(className)) return false;
            const style = window.getComputedStyle(element);
            if (style.display === "none" || style.visibility === "hidden") return false;
            const rect = element.getBoundingClientRect();
            if (rect.width <= 1 || rect.height <= 1) return false;
            if (style.clip === "rect(0px, 0px, 0px, 0px)" || style.clipPath === "inset(50%)") return false;
            return element.scrollWidth > element.clientWidth + 1 && element.clientWidth > 0;
          })
          .slice(0, 12)
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            className: element.className ? String(element.className).slice(0, 180) : "",
            text: (element.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 120),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
          }));
        return {
          bodyOverflow: documentWidth > viewportWidth + 1,
          viewportWidth,
          documentWidth,
          unmarkedOverflowOwners,
        };
      }, { widgetType: item.widgetType, approvedIntentionalOverflowSelectors });
      const emptyFixture = await page.evaluate((checks) => {
        if (!Array.isArray(checks) || !checks.includes("empty-fixture")) return false;
        const text = (document.body.innerText || "").replace(/\\s+/g, " ").trim();
        const emptyTextPatterns = [
          /empty stack/i,
          /no items found/i,
          /no products found/i,
          /no products to compare/i,
          /brak produkt/i,
          /nothing to show/i,
          /no entries/i
        ];
        return emptyTextPatterns.some((pattern) => pattern.test(text));
      }, item.cssChecks || []);
      let screenshotPath = undefined;
      if (shouldCaptureScreenshot(item)) {
        screenshotPath = screenshotDir + "/public-" + safeScreenshotName(item.widgetType) + ".png";
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      }
      const statusCode = response ? response.status() : null;
      const checks = Array.isArray(item.cssChecks) ? item.cssChecks : [];
      const hasHttpFailure = !statusCode || statusCode < 200 || statusCode >= 400;
      const hasBodyOverflowFailure = checks.includes("body-overflow") && overflow.bodyOverflow && overflow.unmarkedOverflowOwners.length > 0;
      const hasCardOverflowFailure = checks.includes("card-overflow") && overflow.unmarkedOverflowOwners.length > 0;
      const status = emptyFixture
        ? "fixture-gap"
        : !hasHttpFailure && !hasBodyOverflowFailure && !hasCardOverflowFailure
          ? "passed"
          : "failed";
      const error = emptyFixture
        ? "public_fixture_empty"
        : hasHttpFailure
          ? "public_http_failed"
          : hasBodyOverflowFailure
            ? "body_overflow_unmarked"
            : hasCardOverflowFailure
              ? "card_overflow_unmarked"
              : undefined;
      results.push({ widgetType: item.widgetType, publicPath: item.publicPath, statusCode, status, emptyFixture, screenshotPath, ...overflow, error });
    } catch (error) {
      results.push({ widgetType: item.widgetType, publicPath: item.publicPath, status: "failed", statusCode: response ? response.status() : null, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return JSON.stringify({ results });
}`;
}

function summarize(report: SmokeReport): SmokeReport["summary"] {
  const adminFailures =
    report.admin.results.filter((item) => item.status === "failed").length +
    (report.admin.error ? 1 : 0);
  const publicFailures =
    report.public.results.filter((item) => item.status === "failed").length +
    (report.public.error ? 1 : 0);
  const fixtureGaps =
    report.admin.results.filter(
      (item) =>
        item.status === "fixture-gap" || item.modes.some((mode) => mode.status === "fixture-gap")
    ).length + report.public.results.filter((item) => item.status === "fixture-gap").length;
  const metadataGaps = report.admin.results.filter(
    (item) =>
      item.status === "metadata-gap" || item.modes.some((mode) => mode.controlsWithoutPath > 0)
  ).length;
  return { adminFailures, publicFailures, fixtureGaps, metadataGaps };
}

function renderMarkdown(report: SmokeReport): string {
  const lines = [
    "# Widget Contract Smoke Results",
    "",
    `- **Generated:** ${report.generatedAt}`,
    `- **Dry run:** ${report.dryRun ? "yes" : "no"}`,
    `- **Inventory:** ${report.inventory.actualWidgetCount}/${report.inventory.expectedWidgetCount} widgets`,
    `- **Admin:** ${report.admin.skipped ? "skipped" : report.environment.adminUrl}`,
    `- **Frontend:** ${report.public.skipped ? "skipped" : report.environment.frontUrl}`,
    report.environment.resolvedPlaywrightSession
      ? `- **Playwright session:** ${report.environment.resolvedPlaywrightSession}`
      : undefined,
    "",
    "## Run Health",
    "",
    `- Playwright CLI: ${report.environment.playwrightCliAvailable ? "available" : "unavailable"}`,
    `- Admin reachable: ${report.environment.adminReachable === null ? "not checked" : report.environment.adminReachable ? "yes" : "no"}`,
    `- Frontend reachable: ${report.environment.frontReachable === null ? "not checked" : report.environment.frontReachable ? "yes" : "no"}`,
    `- Admin auth: ${report.admin.authenticated === null ? "not checked" : report.admin.authenticated ? "authenticated" : "failed"}`,
    "",
    "## Summary",
    "",
    `- Admin failures: ${report.summary.adminFailures}`,
    `- Public failures: ${report.summary.publicFailures}`,
    `- Fixture gaps: ${report.summary.fixtureGaps}`,
    `- Metadata gaps: ${report.summary.metadataGaps}`,
    "",
    "## Admin Mode Contract",
    "",
    "| Widget | Status | Modes | Duplicate paths | Notes |",
    "|---|---|---|---|---|",
    ...report.admin.results.map((item) => {
      const modes = item.modes
        .map((mode) => {
          const error = mode.error ? ` (${mode.error})` : "";
          return `${mode.mode}:${mode.status} r${mode.rootCount}/s${mode.sectionCount}/v${mode.visibleSectionCount}${error}`;
        })
        .join("<br>");
      const mediaProof = item.mediaProof
        ? `media proof: ${item.mediaProof.status}${item.mediaProof.error ? ` (${item.mediaProof.error})` : ""}`
        : undefined;
      const productGalleryProof = item.productGalleryProof
        ? `product gallery proof: ${item.productGalleryProof.status}${
            item.productGalleryProof.error ? ` (${item.productGalleryProof.error})` : ""
          }`
        : undefined;
      const productCompareProof = item.productCompareProof
        ? `product compare proof: ${item.productCompareProof.status}${
            item.productCompareProof.error ? ` (${item.productCompareProof.error})` : ""
          }`
        : undefined;
      const productTableProof = item.productTableProof
        ? `product table proof: ${item.productTableProof.status}${
            item.productTableProof.error ? ` (${item.productTableProof.error})` : ""
          }`
        : undefined;
      const contentProof = item.contentProof
        ? `content proof: ${item.contentProof.status}${item.contentProof.error ? ` (${item.contentProof.error})` : ""}`
        : undefined;
      const postsProof = item.postsProof
        ? `posts proof: ${item.postsProof.status}${item.postsProof.error ? ` (${item.postsProof.error})` : ""}`
        : undefined;
      const entryTeaserProof = item.entryTeaserProof
        ? `entry teaser proof: ${item.entryTeaserProof.status}${
            item.entryTeaserProof.error ? ` (${item.entryTeaserProof.error})` : ""
          }`
        : undefined;
      const notes = [
        item.error,
        mediaProof,
        productGalleryProof,
        productCompareProof,
        productTableProof,
        contentProof,
        postsProof,
        entryTeaserProof,
      ]
        .filter(Boolean)
        .join("; ");
      return `| \`${item.widgetType}\` | ${item.status} | ${modes || "-"} | ${item.duplicateWritablePaths.join(", ") || "-"} | ${notes || "-"} |`;
    }),
    "",
    "## Public CSS Smoke",
    "",
    "| Widget | Status | Path | HTTP | Overflow | Notes |",
    "|---|---|---|---|---|---|",
    ...report.public.results.map((item) => {
      const overflow = item.bodyOverflow === undefined ? "-" : item.bodyOverflow ? "yes" : "no";
      const notes = [
        item.error,
        item.emptyFixture ? "empty fixture" : undefined,
        item.screenshotPath ? `screenshot: ${item.screenshotPath}` : undefined,
      ]
        .filter(Boolean)
        .join("; ");
      return `| \`${item.widgetType}\` | ${item.status} | ${item.publicPath ?? "-"} | ${item.statusCode ?? "-"} | ${overflow} | ${notes || "-"} |`;
    }),
  ].filter((line): line is string => typeof line === "string");
  return `${lines.join("\n")}\n`;
}

function createFailedAdminMode(mode: EditorMode, error: string): AdminModeResult {
  return {
    mode,
    status: "failed",
    rootCount: 0,
    sectionCount: 0,
    visibleSectionCount: 0,
    writablePaths: [],
    controlsWithoutPath: 0,
    error,
  };
}

function createAdminFixtureGapMode(mode: EditorMode, error: string): AdminModeResult {
  return {
    mode,
    status: "fixture-gap",
    rootCount: 0,
    sectionCount: 0,
    visibleSectionCount: 0,
    writablePaths: [],
    controlsWithoutPath: 0,
    error: `admin_fixture_unopenable:${error}`,
  };
}

function isAdminFixtureUnopenableError(error: string | undefined): boolean {
  return error === "block_select_missing" || error === "widget_block_type_missing";
}

function findDuplicateWritablePaths(
  modes: AdminModeResult[],
  allowedDuplicateWritablePaths: WidgetSmokeCase["allowedDuplicateWritablePaths"] = []
): string[] {
  const allowed = new Set(allowedDuplicateWritablePaths.map((entry) => entry.path));
  const owners = new Map<string, Set<EditorMode>>();
  for (const mode of modes) {
    for (const path of mode.writablePaths) {
      const current = owners.get(path) ?? new Set<EditorMode>();
      current.add(mode.mode);
      owners.set(path, current);
    }
  }
  return Array.from(owners.entries())
    .filter(([path, modeOwners]) => modeOwners.size > 1 && !allowed.has(path))
    .map(([path]) => path);
}

function finalizeAdminResult(
  item: WidgetSmokeCase,
  partial: Omit<AdminWidgetResult, "status" | "duplicateWritablePaths">
): AdminWidgetResult {
  if (partial.modes.length === 0 && !partial.error) {
    return {
      ...partial,
      status: "failed",
      duplicateWritablePaths: [],
      error: "admin_modes_missing",
    };
  }
  if (partial.error) {
    return {
      ...partial,
      status: "failed",
      duplicateWritablePaths: [],
    };
  }
  const hasMetadataGap = partial.modes.some((mode) => mode.controlsWithoutPath > 0);
  const hasFixtureGap = partial.modes.some((mode) => mode.status === "fixture-gap");
  const duplicates =
    hasMetadataGap || hasFixtureGap
      ? []
      : findDuplicateWritablePaths(partial.modes, item.allowedDuplicateWritablePaths);
  const hasFailure =
    partial.modes.some((mode) => mode.status === "failed") || duplicates.length > 0;
  return {
    ...partial,
    status: hasFailure
      ? "failed"
      : hasFixtureGap
        ? "fixture-gap"
        : hasMetadataGap
          ? "metadata-gap"
          : "passed",
    duplicateWritablePaths: duplicates,
  };
}

function classifyPublicStatus(input: {
  cssChecks: CssCheck[];
  statusCode: number | null;
  emptyFixture: boolean;
  bodyOverflow: boolean;
  unmarkedOverflowOwnerCount: number;
}): Pick<PublicWidgetResult, "status" | "error"> {
  const hasHttpFailure = !input.statusCode || input.statusCode < 200 || input.statusCode >= 400;
  const hasBodyOverflowFailure =
    input.cssChecks.includes("body-overflow") &&
    input.bodyOverflow &&
    input.unmarkedOverflowOwnerCount > 0;
  const hasCardOverflowFailure =
    input.cssChecks.includes("card-overflow") && input.unmarkedOverflowOwnerCount > 0;
  if (input.emptyFixture) return { status: "fixture-gap", error: "public_fixture_empty" };
  if (hasHttpFailure) return { status: "failed", error: "public_http_failed" };
  if (hasBodyOverflowFailure) return { status: "failed", error: "body_overflow_unmarked" };
  if (hasCardOverflowFailure) return { status: "failed", error: "card_overflow_unmarked" };
  return { status: "passed", error: undefined };
}

function shouldCountOverflowOwner(input: {
  className?: string;
  ariaHidden?: string | null;
  hidden?: boolean;
  hasIntentionalOverflowAncestor?: boolean;
  hasApprovedIntentionalOverflowAncestor?: boolean;
  display?: string;
  visibility?: string;
  width?: number;
  height?: number;
  clip?: string;
  clipPath?: string;
  scrollWidth: number;
  clientWidth: number;
}): boolean {
  if (input.hasApprovedIntentionalOverflowAncestor) return false;
  if (input.ariaHidden === "true" || input.hidden) return false;
  if (input.className && /\bsr-only\b/.test(input.className)) return false;
  if (input.display === "none" || input.visibility === "hidden") return false;
  if ((input.width ?? 0) <= 1 || (input.height ?? 0) <= 1) return false;
  if (input.clip === "rect(0px, 0px, 0px, 0px)" || input.clipPath === "inset(50%)") {
    return false;
  }
  return input.scrollWidth > input.clientWidth + 1 && input.clientWidth > 0;
}

function hasStrictFailure(report: SmokeReport): boolean {
  return (
    report.summary.adminFailures > 0 ||
    report.summary.publicFailures > 0 ||
    report.summary.fixtureGaps > 0 ||
    report.summary.metadataGaps > 0 ||
    Boolean(report.admin.error || report.public.error)
  );
}

async function main() {
  const args = parseArgs(Bun.argv.slice(2));
  const inventory = await readInventory(args.inventoryPath);
  validateInventory(inventory);
  const selectedCases = selectCases(inventory, args);
  const command = `bun scripts/playwright-widget-contract-smoke.ts ${Bun.argv.slice(2).join(" ")}`;
  const report: SmokeReport = {
    generatedAt: new Date().toISOString(),
    command,
    dryRun: args.dryRun,
    inventory: {
      expectedWidgetCount: inventory.expectedWidgetCount,
      actualWidgetCount: inventory.widgets.length,
      excludedScreenOnlyWidgets: inventory.excludedScreenOnlyWidgets,
      selectedWidgetTypes: selectedCases.map((item) => item.widgetType),
    },
    environment: {
      adminUrl: args.adminUrl,
      frontUrl: args.frontUrl,
      adminReachable: args.dryRun || args.skipAdmin ? null : await checkUrl(args.adminUrl),
      frontReachable: args.dryRun || args.skipFront ? null : await checkUrl(args.frontUrl),
      playwrightCliAvailable: false,
    },
    admin: {
      skipped: args.skipAdmin || args.dryRun,
      loginAttempted: false,
      authenticated: null,
      results: [],
    },
    public: { skipped: args.skipFront || args.dryRun, results: [] },
    summary: { adminFailures: 0, publicFailures: 0, fixtureGaps: 0, metadataGaps: 0 },
  };

  const cliCheck = await runCommand(["playwright-cli", "--version"]);
  report.environment.playwrightCliAvailable = cliCheck.exitCode === 0;

  if (!args.dryRun && !report.environment.playwrightCliAvailable) {
    if (!args.skipAdmin) report.admin.error = "playwright_cli_unavailable";
    if (!args.skipFront) report.public.error = "playwright_cli_unavailable";
  }
  if (!args.dryRun && !args.skipAdmin && report.environment.adminReachable === false) {
    report.admin.error = "admin_unreachable";
  }
  if (!args.dryRun && !args.skipFront && report.environment.frontReachable === false) {
    report.public.error = "front_unreachable";
  }

  if (!args.dryRun && report.environment.playwrightCliAvailable) {
    const scratchDir = ".tmp/playwright-widget-contract-smoke";
    const screenshotDir = `${scratchDir}/screenshots`;
    const playwrightSession = resolvePlaywrightCliSessionName(args.session);
    report.environment.resolvedPlaywrightSession = playwrightSession;
    let authStatePath: string | null = null;
    installAuthStateSignalCleanup(() => authStatePath);
    await mkdir(scratchDir, { recursive: true });
    await mkdir(screenshotDir, { recursive: true });
    const initialOpen = await openPlaywrightSession(playwrightSession);
    if (initialOpen.exitCode !== 0) {
      const error = `playwright_open_failed:${(initialOpen.stderr || initialOpen.stdout)
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 240)}`;
      if (!args.skipAdmin) report.admin.error = error;
      if (!args.skipFront) report.public.error = error;
    }
    try {
      if (!args.skipAdmin && report.environment.adminReachable && !report.admin.error) {
        authStatePath = `${scratchDir}/admin-auth-state.json`;
        const authState = await writeAdminAuthState(args.adminUrl, authStatePath);
        report.admin.loginAttempted = authState.attempted;
        report.admin.authenticated = authState.authenticated;
        if (!authState.authenticated) {
          report.admin.error = authState.error ?? "login_failed";
        } else if (authState.sessionValue) {
          try {
            await ensureMediaWidgetFixtures(args.adminUrl, authState.sessionValue, selectedCases);
          } catch (error) {
            report.admin.error = error instanceof Error ? error.message : String(error);
          }
          if (!report.admin.error) {
            try {
              await ensureContentListWidgetFixtures(
                args.adminUrl,
                authState.sessionValue,
                selectedCases
              );
            } catch (error) {
              report.admin.error = error instanceof Error ? error.message : String(error);
            }
          }
          if (!report.admin.error) {
            try {
              await ensurePostsFeedWidgetFixtures(
                args.adminUrl,
                authState.sessionValue,
                selectedCases
              );
            } catch (error) {
              report.admin.error = error instanceof Error ? error.message : String(error);
            }
          }
          if (!report.admin.error) {
            try {
              await ensureEntryTeaserWidgetFixtures(
                args.adminUrl,
                authState.sessionValue,
                selectedCases
              );
            } catch (error) {
              report.admin.error = error instanceof Error ? error.message : String(error);
            }
          }
          if (!report.admin.error && !args.skipFront) {
            try {
              await ensureCommerceWidgetFixtures(
                args.adminUrl,
                authState.sessionValue,
                selectedCases
              );
            } catch (error) {
              report.public.error = error instanceof Error ? error.message : String(error);
            }
          }
        }
      }
      if (
        !args.skipAdmin &&
        report.environment.adminReachable &&
        !report.admin.error &&
        authStatePath
      ) {
        for (const item of selectedCases) {
          const widgetPlaywrightSession = resolvePlaywrightCliSessionName(
            `${playwrightSession}-${item.widgetType}`
          );
          await runCommand(["playwright-cli", `-s=${widgetPlaywrightSession}`, "close"]);
          const widgetOpen = await openPlaywrightSession(widgetPlaywrightSession);
          if (widgetOpen.exitCode !== 0) {
            const detail = (widgetOpen.stderr || widgetOpen.stdout).trim().replace(/\s+/g, " ");
            report.admin.results.push(
              finalizeAdminResult(item, {
                widgetType: item.widgetType,
                modes: item.requiredModes.map((mode) =>
                  createFailedAdminMode(
                    mode,
                    detail
                      ? `playwright_open_failed:${detail.slice(0, 240)}`
                      : "playwright_open_failed"
                  )
                ),
              })
            );
            continue;
          }
          const stateLoad = await runCommand([
            "playwright-cli",
            `-s=${widgetPlaywrightSession}`,
            "state-load",
            authStatePath,
          ]);
          if (stateLoad.exitCode !== 0) {
            const detail = (stateLoad.stderr || stateLoad.stdout).trim().replace(/\s+/g, " ");
            report.admin.results.push(
              finalizeAdminResult(item, {
                widgetType: item.widgetType,
                modes: item.requiredModes.map((mode) =>
                  createFailedAdminMode(
                    mode,
                    detail
                      ? `auth_state_load_failed:${detail.slice(0, 240)}`
                      : "auth_state_load_failed"
                  )
                ),
              })
            );
            await runCommand(["playwright-cli", `-s=${widgetPlaywrightSession}`, "close"]);
            continue;
          }
          const adminCodePath = `${scratchDir}/admin-probe-${item.widgetType}.js`;
          await writeCodeFile(
            adminCodePath,
            buildAdminProbeCode(args.adminUrl, args.frontUrl, [item])
          );
          try {
            const adminResult = await runPlaywrightCode<{
              login: { attempted: boolean; authenticated: boolean | null; error?: string | null };
              results: AdminWidgetResult[];
              error?: string;
            }>(widgetPlaywrightSession, adminCodePath);
            report.admin.loginAttempted =
              report.admin.loginAttempted || adminResult.login.attempted;
            report.admin.authenticated =
              report.admin.authenticated === false ? false : adminResult.login.authenticated;
            if (adminResult.error) {
              report.admin.results.push(
                finalizeAdminResult(item, {
                  widgetType: item.widgetType,
                  modes: item.requiredModes.map((mode) =>
                    createFailedAdminMode(mode, adminResult.error ?? "admin_probe_failed")
                  ),
                })
              );
            } else {
              const [widgetResult] = adminResult.results;
              report.admin.results.push(
                widgetResult ??
                  finalizeAdminResult(item, {
                    widgetType: item.widgetType,
                    modes: item.requiredModes.map((mode) =>
                      createFailedAdminMode(mode, "admin_probe_result_missing")
                    ),
                  })
              );
            }
          } catch (error) {
            report.admin.results.push(
              finalizeAdminResult(item, {
                widgetType: item.widgetType,
                modes: item.requiredModes.map((mode) =>
                  createFailedAdminMode(
                    mode,
                    error instanceof Error ? error.message : String(error)
                  )
                ),
              })
            );
          } finally {
            await runCommand(["playwright-cli", `-s=${widgetPlaywrightSession}`, "close"]);
          }
        }
      }
      if (!args.skipFront && report.environment.frontReachable && !report.public.error) {
        await runCommand(["playwright-cli", `-s=${playwrightSession}`, "close"]);
        const publicOpen = await openPlaywrightSession(playwrightSession);
        if (publicOpen.exitCode !== 0) {
          const detail = (publicOpen.stderr || publicOpen.stdout).trim().replace(/\s+/g, " ");
          report.public.error = detail
            ? `playwright_open_failed:${detail.slice(0, 240)}`
            : "playwright_open_failed";
        }
        const publicCodePath = `${scratchDir}/public-probe.js`;
        if (!report.public.error) {
          await writeCodeFile(
            publicCodePath,
            buildPublicProbeCode(args.frontUrl, selectedCases, screenshotDir)
          );
          try {
            const publicResult = await runPlaywrightCode<{ results: PublicWidgetResult[] }>(
              playwrightSession,
              publicCodePath
            );
            report.public.results = publicResult.results;
          } catch (error) {
            report.public.error = error instanceof Error ? error.message : String(error);
          }
        }
      }
      if (!args.keepOpen) {
        await runCommand(["playwright-cli", `-s=${playwrightSession}`, "close"]);
      }
    } finally {
      if (authStatePath) {
        await rm(authStatePath, { force: true });
      }
    }
  }

  report.summary = summarize(report);
  await ensureDirForFile(args.outputJsonPath);
  await Bun.write(args.outputJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await ensureDirForFile(args.outputMarkdownPath);
  await Bun.write(args.outputMarkdownPath, renderMarkdown(report));

  if (args.strict && hasStrictFailure(report)) {
    throw new Error("widget_contract_smoke_failed");
  }
  console.log(
    JSON.stringify(
      {
        dryRun: report.dryRun,
        selected: report.inventory.selectedWidgetTypes.length,
        summary: report.summary,
        outputJson: args.outputJsonPath,
        outputMarkdown: args.outputMarkdownPath,
      },
      null,
      2
    )
  );
}

export {
  parseArgs,
  readInventory,
  validateInventory,
  selectCases,
  extractCliJson,
  createFailedAdminMode,
  createAdminFixtureGapMode,
  findDuplicateWritablePaths,
  finalizeAdminResult,
  classifyPublicStatus,
  shouldCountOverflowOwner,
  isAdminFixtureUnopenableError,
  hasStrictFailure,
  resolvePlaywrightCliSessionName,
  summarize,
  renderMarkdown,
};
export type { AdminModeResult, SmokeInventory, SmokeReport, WidgetSmokeCase };

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
