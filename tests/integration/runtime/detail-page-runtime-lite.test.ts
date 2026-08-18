import { afterEach, beforeEach, expect, test } from "bun:test";

import { normalizeDetailPageDocument } from "../../../core/services/content/detailPageSchema";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsService";

const contentType = {
  id: "8f530de0-9954-4ad3-bfce-2ee6d2e7f8d2",
  slug: "products",
  name: "Products",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      headline: { type: "string", xFieldType: "text" },
    },
  },
};

const entry: {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: "published";
  visibility: "public";
  hasPassword: false;
  tags: string[];
  data: Record<string, unknown>;
  publishedAt: Date;
  scheduledAt: null;
  createdAt: Date;
  updatedAt: Date;
  author: null;
  seo: {
    canonicalUrl: string;
  };
} = {
  id: "entry-1",
  typeId: contentType.id,
  title: "Runtime product",
  slug: "runtime-product",
  status: "published",
  visibility: "public",
  hasPassword: false,
  tags: [],
  data: {
    headline: "Bound headline",
    apiKey: "secret-api-key",
  },
  publishedAt: new Date("2026-05-08T10:00:00.000Z"),
  scheduledAt: null,
  createdAt: new Date("2026-05-01T10:00:00.000Z"),
  updatedAt: new Date("2026-05-08T10:00:00.000Z"),
  author: null,
  seo: {
    canonicalUrl: "https://example.test/products/runtime-product",
  },
};

const detailPageDocument = normalizeDetailPageDocument({
  schemaVersion: 1,
  id: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
  name: "Product detail page",
  contentTypeId: contentType.id,
  contentTypeSlug: contentType.slug,
  status: "published",
  titlePattern: "{{ title }}",
  settings: {
    template: "detail",
    layout: {
      wrapper: {
        container: "default",
        padding: { top: "md", bottom: "lg" },
        background: {
          color: "#ffffff",
          image: null,
          media: {
            type: "none",
            source: "external",
            src: null,
          },
        },
      },
      sections: {
        gap: "lg",
        defaults: {
          container: "default",
          padding: { top: "xl", bottom: "xl" },
          margin: { top: "none", bottom: "none" },
        },
      },
      applyDefaultsToNewBlocks: false,
    },
  },
  blocks: [
    {
      id: "hero",
      type: "hero",
      variant: "centered",
      data: {
        headline: "Mock detail headline",
        body: "Mock detail body",
      },
    },
  ],
  bindings: [],
});

let currentContentRoutes: ContentRouteSetting[] = [];
let currentResolvedDetailPage: {
  document: typeof detailPageDocument;
  blocks: typeof detailPageDocument.blocks;
} | null = null;
const bunMock = (
  (await import("bun:test")) as { mock?: { module: (id: string, factory: () => unknown) => void } }
).mock;

bunMock?.module("../../../core/services/settings/securitySettings", () => ({
  getSecuritySettings: async () => ({
    rateLimit: {
      enabled: false,
      buckets: {
        auth: { windowSeconds: 60, maxRequests: 10 },
        admin_read: { windowSeconds: 60, maxRequests: 10 },
        admin_write: { windowSeconds: 60, maxRequests: 10 },
        public_read: { windowSeconds: 60, maxRequests: 10 },
        public_write: { windowSeconds: 60, maxRequests: 10 },
        assistant: { windowSeconds: 60, maxRequests: 10 },
      },
    },
  }),
}));

bunMock?.module("../../../core/server/publicBookingApi", () => ({
  handlePublicBookingApi: async () => null,
}));

bunMock?.module("../../../core/server/middleware/rateLimit", () => ({
  checkRateLimit: () => undefined,
  resetRateLimitBuckets: () => undefined,
}));

bunMock?.module("../../../core/services/theme/tokenService", () => ({
  getResolvedTokens: async () => ({
    colors: {
      primary: "#2563eb",
      secondary: "#0f172a",
      accent: "#14b8a6",
    },
    neutrals: {
      bg: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      border: "#cbd5e1",
    },
    spacing: {
      xs: "0.25rem",
      sm: "0.5rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
      "2xl": "3rem",
    },
    radius: {
      sm: "0.125rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
    },
    typography: {
      sans: "Inter, sans-serif",
      display: "Inter, sans-serif",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
    },
  }),
}));

bunMock?.module("../../../core/services/themes/themeProfileService", () => ({
  getActiveThemeProfile: async () => ({
    id: "default",
    themeName: "default",
  }),
}));

bunMock?.module("../../../core/services/settings/settingsService", () => ({
  getSetting: async (key: string) => {
    if (key === "site.cacheTtlSeconds") return 0;
    if (key === "site.contentRoutes") return currentContentRoutes;
    return null;
  },
}));

bunMock?.module("../../../core/services/content/typeService", () => ({
  getContentTypeBySlug: async (slug: string) => (slug === contentType.slug ? contentType : null),
  getContentType: async (id: string) => (id === contentType.id ? contentType : null),
}));

bunMock?.module("../../../core/services/content/entryService", () => ({
  getEntryBySlug: async (typeId: string, slug: string) =>
    typeId === contentType.id && slug === entry.slug
      ? {
          id: entry.id,
          typeId: entry.typeId,
          title: entry.title,
          slug: entry.slug,
          status: entry.status,
          visibility: entry.visibility,
          hasPassword: entry.hasPassword,
          tags: [...entry.tags],
          data: { ...entry.data },
          publishedAt: entry.publishedAt,
          scheduledAt: entry.scheduledAt,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }
      : null,
  getEntry: async (id: string) => (id === entry.id ? { ...entry, data: { ...entry.data } } : null),
  listEntries: async () => [],
}));

// TASK-573 narrow gated-route probe seam: publicSite calls
// getEntryVisibilityById/getEntryVisibilityBySlug (entryReadService) BEFORE the
// shared-cache read. Stub them against the fixture so the lite suite stays a
// true no-DB fixture test (the probe must not hit a live database).
bunMock?.module("../../../core/services/content/entryReadService", () => ({
  getEntryVisibilityById: async (id: string) =>
    id === entry.id ? { id: entry.id, visibility: entry.visibility } : null,
  getEntryVisibilityBySlug: async (typeId: string, slug: string) =>
    typeId === contentType.id && slug === entry.slug
      ? { id: entry.id, visibility: entry.visibility }
      : null,
  // publicEntryUnlockApi imports this from entryReadService; the fixture entry
  // has no password so the unlock seam must resolve to null without a DB hit.
  getEntryAccessPasswordHash: async () => null,
}));

bunMock?.module("../../../core/services/content/detailPageRuntimeResolver", () => ({
  resolvePublishedDetailPageRuntime: async () => currentResolvedDetailPage,
  resolvePreviewDetailPageRuntime: async () => currentResolvedDetailPage,
}));

bunMock?.module("../../../core/services/pages/pageService", () => ({
  getPageBySlug: async () => null,
  getPage: async () => null,
  getPageSlugsByIds: async () => new Map<string, string>(),
}));

bunMock?.module("../../../core/services/navigation/navigationRuntimeResolver", () => ({
  resolveNavigationRuntimeData: async () => ({
    items: [],
    linksSource: "manual",
  }),
}));

bunMock?.module("../../../core/services/widgets/templateSectionRuntime", () => ({
  resolveTemplateSectionRuntimeData: async () => ({
    blocks: [],
    templateName: null,
    error: null,
  }),
}));

bunMock?.module("../../../core/services/forms/formRuntimeResolver", () => ({
  resolveFormRuntimeData: async () => ({
    error: "form_missing",
  }),
}));

bunMock?.module("../../../core/services/booking/bookingRuntimeResolver", () => ({
  resolveBookingRuntimeData: async () => ({
    services: [],
    resources: [],
    slotsToken: null,
    submissionNonce: null,
    error: "booking_unavailable",
  }),
}));

bunMock?.module("../../../core/services/search/listingRuntimeService", () => ({
  resolveListingFiltersRuntimeData: async () => ({
    listingQueryId: "",
    metrics: [],
    searchQuery: "",
    rejectedTokens: [],
  }),
  resolveListingSearchRuntimeState: () => ({
    searchQuery: "",
    rejectedTokens: [],
  }),
}));

bunMock?.module("../../../core/services/commerce/commerceWidgetRuntime", () => ({
  hydrateProductCompareRuntimeData: async (data: Record<string, unknown>) => data,
  hydrateProductGalleryRuntimeData: async (data: Record<string, unknown>) => data,
  hydrateProductTableRuntimeData: async (data: Record<string, unknown>) => data,
}));

bunMock?.module("../../../core/services/content/contentListResolver", () => ({
  resolveContentListRuntimeData: async () => ({
    items: [],
  }),
  // Pure list-route helpers publicSite imports from the same module
  // (TASK-459-03); detail-page renders never reach them, so inert stubs keep
  // the mocked module's export surface honest.
  resolveContentListRequestedPage: () => 1,
  resolveContentListRuntimeNavigationMeta: () => ({
    page: 1,
    pageSize: 24,
    totalPages: 1,
    pageParamKey: "page",
    search: "",
  }),
  sortContentListRuntimeEntries: <T>(entries: T[]) => entries,
}));

bunMock?.module("../../../core/services/content/postsFeedResolver", () => ({
  resolvePostsFeedRuntimeData: async () => ({
    items: [],
  }),
}));

bunMock?.module("../../../core/services/content/entryTeaserResolver", () => ({
  resolveEntryTeaserRuntimeData: async () => null,
}));

bunMock?.module("../../../core/services/seo/seoService", () => ({
  getSeoDocumentByTarget: async () => null,
  resolvePublicSeoMetadata: async (input: {
    fallback?: {
      title?: string | null;
      description?: string | null;
      canonicalUrl?: string | null;
      robots?: string | null;
    } | null;
  }) => ({
    title: input.fallback?.title ?? null,
    description: input.fallback?.description ?? null,
    canonicalUrl: input.fallback?.canonicalUrl ?? null,
    robots: input.fallback?.robots ?? null,
  }),
}));

const { handlePublicRequest } = await import("../../../core/server/publicSite");

const requestPublicPath = (path: string) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${path}`, {
      headers: {
        "user-agent": "detail-page-runtime-lite-test",
        "x-forwarded-for": "127.0.0.1",
      },
    })
  );

beforeEach(() => {
  currentResolvedDetailPage = {
    document: detailPageDocument,
    blocks: detailPageDocument.blocks,
  };
  currentContentRoutes = [
    {
      type: contentType.slug,
      listPath: `/${contentType.slug}`,
      detailPath: `/${contentType.slug}/:id`,
      enabled: true,
      detailPageId: detailPageDocument.id,
    },
  ];
});

afterEach(() => {
  currentResolvedDetailPage = null;
  currentContentRoutes = [];
});

test("public detail routes render composed detail pages without requiring a live DB fixture", async () => {
  const response = await requestPublicPath(`/${contentType.slug}/${entry.id}`);

  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain("Mock detail headline");
  expect(html).toContain("Mock detail body");
  expect(html).toContain('rel="canonical" href="https://example.test/products/runtime-product"');
});

test("public detail routes do not render unsafe title pattern tokens", async () => {
  currentResolvedDetailPage = {
    document: {
      ...detailPageDocument,
      titlePattern: "{{ data.apiKey }} - {{ title }}",
    },
    blocks: detailPageDocument.blocks,
  };

  const response = await requestPublicPath(`/${contentType.slug}/${entry.id}`);

  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).not.toContain("secret-api-key");
  expect(html).toContain("<title>Runtime product</title>");
});

test("public detail routes fail closed when linked detail-page resolution returns null", async () => {
  currentResolvedDetailPage = null;

  const response = await requestPublicPath(`/${contentType.slug}/${entry.id}`);

  expect(response.status).toBe(404);
});
