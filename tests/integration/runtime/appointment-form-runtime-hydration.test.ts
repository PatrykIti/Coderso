import { afterEach, beforeEach, expect, test } from "bun:test";
import { createElement } from "react";

const bunMock = (
  (await import("bun:test")) as { mock?: { module: (id: string, factory: () => unknown) => void } }
).mock;

const rateLimitBuckets = {
  auth: { windowSeconds: 60, maxRequests: 10 },
  admin_read: { windowSeconds: 60, maxRequests: 10 },
  admin_write: { windowSeconds: 60, maxRequests: 10 },
  public_read: { windowSeconds: 60, maxRequests: 10 },
  public_write: { windowSeconds: 60, maxRequests: 10 },
  assistant: { windowSeconds: 60, maxRequests: 10 },
};

type BotProtectionPublicState = {
  enabled: boolean;
  provider: "recaptcha_v3";
  siteKey: string | null;
  secretKey: { configured: boolean };
  thresholds: {
    login: number;
    reset: number;
    publicWrite: number;
  };
  enforceOnLocalhost: boolean;
};

const appointmentFormSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    flowId: { type: "string" },
    resolved: {
      type: "object",
      additionalProperties: false,
      properties: {
        submissionNonce: { type: ["string", "null"] },
        captcha: {
          type: ["object", "null"],
          required: ["provider", "siteKey", "action"],
          additionalProperties: false,
          properties: {
            provider: { enum: ["recaptcha_v3"] },
            siteKey: { type: "string" },
            action: { enum: ["public_write"] },
          },
        },
        error: { type: "string" },
      },
    },
  },
} as const;

let currentBotProtection: BotProtectionPublicState;

bunMock?.module("../../../core/services/settings/securitySettings", () => ({
  getSecuritySettings: async () => ({
    rateLimit: {
      enabled: false,
      buckets: rateLimitBuckets,
    },
    botProtection: {
      enabled: true,
      provider: "recaptcha_v3",
      siteKey: "public-site-key",
      secretKey: "server-secret",
      thresholds: {
        login: 0.5,
        reset: 0.6,
        publicWrite: 0.5,
      },
      enforceOnLocalhost: true,
    },
  }),
  getSecuritySettingsPublic: async () => ({
    botProtection: currentBotProtection,
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
    if (key === "site.contentRoutes") return [];
    return null;
  },
}));

bunMock?.module("../../../core/services/pages/pageService", () => ({
  getPageBySlug: async (slug: string) =>
    slug === "/appointments"
      ? {
          id: "page-appointments",
          title: "Appointments",
          slug: "/appointments",
          status: "published",
          publishedData: {
            blocks: [
              {
                id: "appointment-form-1",
                type: "appointment-form",
                data: {
                  flowId: "booking-flow",
                },
              },
            ],
          },
        }
      : null,
  getPage: async () => null,
  getPageSlugsByIds: async () => new Map<string, string>(),
}));

bunMock?.module("../../../core/services/pages/previewService", () => ({
  validatePreviewToken: async () => ({ status: "invalid" }),
}));

bunMock?.module("../../../core/services/content/entryService", () => ({
  getEntry: async () => null,
  getEntryBySlug: async () => null,
  listEntries: async () => [],
}));

bunMock?.module("../../../core/services/content/typeService", () => ({
  getContentType: async () => null,
  getContentTypeBySlug: async () => null,
}));

bunMock?.module("../../../core/services/content/postsService", () => ({
  DEFAULT_POST_CONTENT_SCHEMA: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  POST_CONTENT_TYPE_NAME: "Posts",
  POST_CONTENT_TYPE_SLUG: "posts",
  getPost: async () => null,
  getPostBySlug: async () => null,
  listPosts: async () => [],
}));

bunMock?.module("../../../core/services/content/contentListResolver", () => ({
  resolveContentListRuntimeData: async () => ({
    items: [],
  }),
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

bunMock?.module("../../../core/services/content/detailPageRuntimeResolver", () => ({
  resolvePublishedDetailPageRuntime: async () => null,
  resolvePreviewDetailPageRuntime: async () => null,
}));

bunMock?.module("../../../core/services/content/entryTeaserResolver", () => ({
  resolveEntryTeaserRuntimeData: async () => null,
}));

bunMock?.module("../../../core/services/content/postsFeedResolver", () => ({
  resolvePostsFeedRuntimeData: async () => ({
    items: [],
  }),
}));

bunMock?.module("../../../core/services/commerce/commerceWidgetRuntime", () => ({
  hydrateProductCompareRuntimeData: async (data: Record<string, unknown>) => data,
  hydrateProductGalleryRuntimeData: async (data: Record<string, unknown>) => data,
  hydrateProductTableRuntimeData: async (data: Record<string, unknown>) => data,
}));

bunMock?.module("../../../core/services/navigation/navigationRuntimeResolver", () => ({
  resolveNavigationRuntimeData: async () => ({
    items: [],
    linksSource: "manual",
  }),
}));

bunMock?.module("../../../core/services/forms/formRuntimeResolver", () => ({
  resolveFormRuntimeData: async () => ({
    error: "form_missing",
  }),
}));

bunMock?.module("../../../core/services/booking/bookingService", () => ({
  listBookingServices: async () => [
    {
      id: "service-1",
      name: "Service One",
      description: null,
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      priceCents: null,
      currency: null,
      status: "active",
      settings: {},
    },
  ],
  listBookingResources: async () => [
    {
      id: "resource-1",
      name: "Resource One",
      type: "staff",
      timezone: "UTC",
      capacity: 1,
      status: "active",
    },
  ],
  listBookingServiceResources: async () => [{ resourceId: "resource-1" }],
}));

bunMock?.module("../../../core/services/booking/bookingSubmissionNonce", () => ({
  createBookingSubmissionNonce: () => "booking-nonce-1",
}));

bunMock?.module("../../../core/services/booking/bookingSlotsToken", () => ({
  createBookingSlotsToken: () => "booking-slots-token-1",
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

bunMock?.module("../../../core/services/search/searchIndexService", () => ({
  searchPublicIndex: async () => ({
    items: [],
  }),
}));

bunMock?.module("../../../core/services/widgets/templateSectionRuntime", () => ({
  resolveTemplateSectionRuntimeData: async () => ({
    blocks: [],
    templateName: null,
    error: null,
  }),
}));

bunMock?.module("../../../core/services/seo/seoService", () => ({
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

bunMock?.module("../../../core/widgets/core/appointmentForm", () => ({
  appointmentFormSchema,
  normalizeAppointmentFormData: (data: Record<string, unknown>) => ({
    flowId: typeof data?.flowId === "string" ? data.flowId : "booking-flow",
    resolved:
      data?.resolved && typeof data.resolved === "object" && !Array.isArray(data.resolved)
        ? data.resolved
        : undefined,
  }),
  createAppointmentFormWidget: (editors: Record<string, unknown>) => ({
    type: "appointment-form",
    title: "Appointment Form",
    description: "Appointment form test widget",
    category: "forms",
    variants: [{ id: "default", label: "Default", description: "Default" }],
    schema: appointmentFormSchema,
    defaults: {},
    editor: editors,
    render: ({ data }: { data: Record<string, unknown> }) =>
      createElement(
        "pre",
        { "data-appointment-runtime": "1" },
        JSON.stringify(data.resolved ?? null)
      ),
  }),
}));

const { renderPublicPageRuntimeHtml } = await import("../../../core/site/renderPublicPage");
const { resolveBookingRuntimeData } =
  await import("../../../core/services/booking/bookingRuntimeResolver");
const { ensureRuntimeWidgetsRegistered } = await import("../../../core/widgets/runtime");

ensureRuntimeWidgetsRegistered();

const renderAppointmentRuntimeHtml = async () => {
  const resolved = await resolveBookingRuntimeData({ preview: false });
  return renderPublicPageRuntimeHtml({
    title: "Appointments",
    cssHref: null,
    inlineCss: "",
    devModuleScripts: null,
    blocks: [
      {
        id: "appointment-form-1",
        type: "appointment-form",
        variant: "default",
        data: {
          flowId: "booking-flow",
          resolved: {
            submissionNonce: resolved.submissionNonce,
            captcha: resolved.captcha,
            ...(resolved.error ? { error: resolved.error } : {}),
          },
        },
      },
    ],
  });
};

beforeEach(() => {
  currentBotProtection = {
    enabled: true,
    provider: "recaptcha_v3",
    siteKey: "public-site-key",
    secretKey: { configured: true },
    thresholds: {
      login: 0.5,
      reset: 0.6,
      publicWrite: 0.5,
    },
    enforceOnLocalhost: true,
  };
});

afterEach(() => {
  currentBotProtection = {
    enabled: true,
    provider: "recaptcha_v3",
    siteKey: "public-site-key",
    secretKey: { configured: true },
    thresholds: {
      login: 0.5,
      reset: 0.6,
      publicWrite: 0.5,
    },
    enforceOnLocalhost: true,
  };
});

test("appointment form runtime hydration includes public captcha bridge without secret leakage", async () => {
  const html = await renderAppointmentRuntimeHtml();

  expect(html).toContain("&quot;submissionNonce&quot;:&quot;booking-nonce-1&quot;");
  expect(html).toContain("&quot;provider&quot;:&quot;recaptcha_v3&quot;");
  expect(html).toContain("&quot;siteKey&quot;:&quot;public-site-key&quot;");
  expect(html).toContain("&quot;action&quot;:&quot;public_write&quot;");
  expect(html).not.toContain("server-secret");
});

test("appointment form runtime hydration keeps captcha bridge null when no public site key is configured", async () => {
  currentBotProtection = {
    ...currentBotProtection,
    siteKey: null,
  };

  const html = await renderAppointmentRuntimeHtml();

  expect(html).toContain("&quot;submissionNonce&quot;:&quot;booking-nonce-1&quot;");
  expect(html).toContain("&quot;captcha&quot;:null");
  expect(html).not.toContain("server-secret");
});
