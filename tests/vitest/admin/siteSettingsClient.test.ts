import { expect, test } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import {
  getSiteSettings,
  resolveContentSlugDisplay,
  resolveContentSlugRouteContext,
  resolvePostSlugDisplay,
  resolvePostSlugRouteContext,
  updateSiteSettings,
} from "../../../core/admin/services/siteSettingsClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("getSiteSettings normalizes raw settings payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      "site.adminBaseUrl": "   ",
      "site.publicBaseUrl": " https://coderso.test ",
      "site.adminPath": 42,
      "site.adminRedirectEnabled": "yes",
      "site.homepageId": " homepage ",
      "site.notFoundPageId": null,
      "site.previewEnabled": "no",
      "site.cacheTtlSeconds": -4,
      "site.contentRoutes": [
        {
          type: "posts",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: false,
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
        {
          type: "pages",
          listPath: "/pages",
        },
        "bad-record",
      ],
    });
  };

  try {
    await expect(getSiteSettings()).resolves.toEqual({
      adminBaseUrl: null,
      publicBaseUrl: "https://coderso.test",
      adminPath: "/admin",
      adminRedirectEnabled: false,
      homepageId: "homepage",
      notFoundPageId: null,
      previewEnabled: true,
      cacheTtlSeconds: 0,
      contentRoutes: [
        {
          type: "posts",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: false,
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      ],
    });
    expect(calls[0]?.input).toBe("/admin/api/settings");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateSiteSettings patches normalized payload with csrf token", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }

    return jsonResponse({
      "site.adminBaseUrl": "https://admin.coderso.test",
      "site.publicBaseUrl": "https://public.coderso.test",
      "site.adminPath": "/cms",
      "site.adminRedirectEnabled": true,
      "site.homepageId": "home-1",
      "site.notFoundPageId": "404-1",
      "site.previewEnabled": false,
      "site.cacheTtlSeconds": 91.4,
      "site.contentRoutes": [
        {
          type: "posts",
          listPath: "/news",
          detailPath: "/news/:slug",
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      ],
    });
  };

  try {
    resetCsrfToken();
    await expect(
      updateSiteSettings({
        publicBaseUrl: " https://public.coderso.test ",
        adminBaseUrl: " ",
        adminPath: "/cms",
        adminRedirectEnabled: true,
        homepageId: " home-1 ",
        notFoundPageId: null,
        previewEnabled: false,
        cacheTtlSeconds: 91.4,
        contentRoutes: [
          {
            type: "posts",
            listPath: "/news",
            detailPath: "/news/:slug",
            enabled: true,
            detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
          },
        ],
      })
    ).resolves.toEqual({
      adminBaseUrl: "https://admin.coderso.test",
      publicBaseUrl: "https://public.coderso.test",
      adminPath: "/cms",
      adminRedirectEnabled: true,
      homepageId: "home-1",
      notFoundPageId: "404-1",
      previewEnabled: false,
      cacheTtlSeconds: 91,
      contentRoutes: [
        {
          type: "posts",
          listPath: "/news",
          detailPath: "/news/:slug",
          enabled: true,
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      ],
    });

    expect(calls[1]?.input).toBe("/admin/api/settings");
    expect(calls[1]?.init?.method).toBe("PATCH");
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      "site.publicBaseUrl": "https://public.coderso.test",
      "site.adminBaseUrl": null,
      "site.adminPath": "/cms",
      "site.adminRedirectEnabled": true,
      "site.homepageId": "home-1",
      "site.notFoundPageId": null,
      "site.previewEnabled": false,
      "site.cacheTtlSeconds": 91.4,
      "site.contentRoutes": [
        {
          type: "posts",
          listPath: "/news",
          detailPath: "/news/:slug",
          enabled: true,
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      ],
    });
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("updateSiteSettings omits undefined fields and keeps explicit string values", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }

    return jsonResponse({});
  };

  try {
    resetCsrfToken();
    await updateSiteSettings({
      adminPath: "/backoffice",
      homepageId: undefined,
      notFoundPageId: undefined,
    });

    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      "site.adminPath": "/backoffice",
    });
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("post slug helpers derive concrete and fallback route hints", () => {
  const context = resolvePostSlugRouteContext({
    publicBaseUrl: "https://coderso.test",
    contentRoutes: [
      {
        type: "posts",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
      },
    ],
  });

  expect(resolvePostSlugDisplay(context, "launch-post")).toEqual({
    label: "Public URL",
    value: "https://coderso.test/blog/launch-post",
    concrete: true,
  });

  expect(
    resolvePostSlugDisplay(
      {
        publicBaseUrl: null,
        detailPathPattern: "/blog/:slug",
      },
      "launch-post"
    )
  ).toEqual({
    label: "Route hint",
    value: "/blog/launch-post",
    concrete: false,
  });

  expect(
    resolvePostSlugDisplay(
      {
        publicBaseUrl: "https://coderso.test",
        detailPathPattern: "/blog/:id",
      },
      "launch-post"
    )
  ).toEqual({
    label: "Route hint",
    value: "https://coderso.test/blog/:id",
    concrete: false,
  });
});

test("content slug helpers derive generic content route hints", () => {
  const context = resolveContentSlugRouteContext(
    {
      publicBaseUrl: "https://coderso.test",
      contentRoutes: [
        {
          type: "articles",
          listPath: "/articles",
          detailPath: "/articles/:slug",
          enabled: true,
        },
      ],
    },
    "articles"
  );

  expect(context).toEqual({
    publicBaseUrl: "https://coderso.test",
    contentTypeSlug: "articles",
    detailPathPattern: "/articles/:slug",
    routeEnabled: true,
  });
  expect(resolveContentSlugDisplay(context, "hello-world")).toEqual({
    label: "Public URL",
    value: "https://coderso.test/articles/hello-world",
    concrete: true,
  });

  const fallback = resolveContentSlugRouteContext(
    {
      publicBaseUrl: null,
      contentRoutes: [],
    },
    "projects"
  );
  expect(resolveContentSlugDisplay(fallback, "alpha")).toEqual({
    label: "Route hint",
    value: "/projects/alpha",
    concrete: false,
  });
});
