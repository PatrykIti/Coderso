import { expect, test } from "vitest";

import {
  mergeContentRoutes,
  normalizeDetailPageIdInput,
  normalizeRouteInput,
  validateBaseUrl,
  validateContentRoutes,
  type SiteContentRouteForm,
} from "../../../core/admin/ui/site/siteSettingsValidation";

test("validateBaseUrl allows http for RFC 6761 loopback hosts and keeps HTTPS for everything else", () => {
  // Client-readiness FIX 4a: the multi-tenant dev host serves the public site
  // on http://*.localhost; rejecting it blocked configuring the dev public
  // origin (and the preview-target fix path) entirely.
  expect(validateBaseUrl("http://localhost:3000")).toBeNull();
  expect(validateBaseUrl("http://127.0.0.1:3000")).toBeNull();
  expect(validateBaseUrl("http://coderso-a.localhost:3000")).toBeNull();
  expect(validateBaseUrl("http://sub.tenant.localhost:5173")).toBeNull();
  expect(validateBaseUrl("http://[::1]:3000")).toBeNull();
  expect(validateBaseUrl("https://www.example.com")).toBeNull();
  expect(validateBaseUrl("  ")).toBeNull();

  expect(validateBaseUrl("http://example.com")).toBe("HTTPS is required for non-localhost URLs.");
  // Lookalike domains never inherit the loopback exemption.
  expect(validateBaseUrl("http://notlocalhost.dev")).toBe(
    "HTTPS is required for non-localhost URLs."
  );
  expect(validateBaseUrl("not a url")).toBe("Enter a valid URL (e.g. https://example.com).");
});

test("normalizeRouteInput prefixes leading slash", () => {
  expect(normalizeRouteInput("blog", true)).toBe("/blog");
  expect(normalizeRouteInput("/blog/", true)).toBe("/blog");
  expect(normalizeRouteInput("/", true)).toBe("/");
  expect(normalizeRouteInput("/", false)).toBeNull();
});

test("validateContentRoutes flags invalid and conflicting paths", () => {
  const routes: SiteContentRouteForm[] = [
    {
      type: "blog",
      listPath: "/blog",
      detailPath: "/blog/item",
      enabled: true,
    },
    {
      type: "news",
      listPath: "/blog",
      detailPath: "/news/:slug",
      enabled: true,
    },
  ];

  const result = validateContentRoutes(routes);

  expect(result.hasErrors).toBe(true);
  expect(result.errorsByType.blog?.detailPath).toBeDefined();
  expect(result.errorsByType.news?.listPath).toBeDefined();
});

test("mergeContentRoutes preserves existing detailPageId metadata", () => {
  const routes = mergeContentRoutes(
    [
      {
        type: "blog",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
        detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
      },
    ],
    [{ slug: "blog" }]
  );

  expect(routes[0]?.detailPageId).toBe("4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");
});

test("normalizeDetailPageIdInput trims, lowercases, and clears blank values", () => {
  expect(normalizeDetailPageIdInput(" 4DD7F4D4-48D8-53F7-A9E6-0D01F6B89E6C ")).toBe(
    "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c"
  );
  expect(normalizeDetailPageIdInput("   ")).toBeNull();
  expect(normalizeDetailPageIdInput(undefined)).toBeNull();
});

test("validateContentRoutes flags invalid detailPageId values", () => {
  const routes: SiteContentRouteForm[] = [
    {
      type: "blog",
      listPath: "/blog",
      detailPath: "/blog/:slug",
      enabled: true,
      detailPageId: "not-a-uuid",
    },
  ];

  const result = validateContentRoutes(routes);

  expect(result.hasErrors).toBe(true);
  expect(result.errorsByType.blog?.detailPageId).toBe("Detail page ID must be a valid UUID.");
});

test("validateContentRoutes flags detail routes that shadow exact list routes", () => {
  const routes: SiteContentRouteForm[] = [
    {
      type: "generic",
      listPath: "/generic",
      detailPath: "/:slug",
      enabled: true,
    },
    {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
    },
  ];

  const result = validateContentRoutes(routes);

  expect(result.hasErrors).toBe(true);
  expect(result.errorsByType.products?.listPath).toContain("/products");
  expect(result.errorsByType.generic?.detailPath).toContain("/:slug");
});

test("validateContentRoutes ignores disabled routes", () => {
  const routes: SiteContentRouteForm[] = [
    {
      type: "blog",
      listPath: "",
      detailPath: "",
      enabled: false,
    },
  ];

  const result = validateContentRoutes(routes);

  expect(result.hasErrors).toBe(false);
  expect(result.errorsByType.blog).toBeUndefined();
});

test("validateContentRoutes requires a list path", () => {
  const routes: SiteContentRouteForm[] = [
    {
      type: "blog",
      listPath: "",
      detailPath: "/blog/:slug",
      enabled: true,
    },
  ];

  const result = validateContentRoutes(routes);

  expect(result.hasErrors).toBe(true);
  expect(result.errorsByType.blog?.listPath).toBe("List path is required.");
});

test("validateContentRoutes: a ':'-containing list path is invalid (never 'static URL')", () => {
  // normalizeContentRouteListPath (contentRoutePaths.ts:18-24) throws on any ':'
  // in the path, and normalizeRouteInput catches that throw and returns null, so a
  // normalized list path can never contain ':' -- the "List path must be a static
  // URL." branch (siteSettingsValidation.ts:114-115) is unreachable. Because a
  // valid detail path always ends in ':slug'/':id' (contentRoutePaths.ts:26-51),
  // the same string can validate as a detail path but never as a list path, so
  // normalizedList === normalizedDetail (siteSettingsValidation.ts:133-137) is an
  // impossible state.
  const routes: SiteContentRouteForm[] = [
    {
      type: "blog",
      listPath: "/blog/:slug",
      detailPath: "/blog/:slug",
      enabled: true,
    },
  ];

  const result = validateContentRoutes(routes);

  expect(result.hasErrors).toBe(true);
  // The ':' list path is rejected by the contract and surfaces as the null-path
  // error, not the dead "List path must be a static URL." branch.
  expect(result.errorsByType.blog?.listPath).toBe("List path is required.");
  // Equality with the valid detail path is impossible, so no "different" error.
  expect(result.errorsByType.blog?.detailPath).toBeUndefined();
});

test("validateContentRoutes flags duplicate detail paths across content types", () => {
  const routes: SiteContentRouteForm[] = [
    {
      type: "blog",
      listPath: "/blog",
      detailPath: "/blog/:slug",
      enabled: true,
    },
    {
      type: "news",
      listPath: "/news",
      detailPath: "/blog/:slug",
      enabled: true,
    },
  ];

  const result = validateContentRoutes(routes);

  expect(result.hasErrors).toBe(true);
  expect(result.errorsByType.blog?.detailPath).toBe(
    "Conflict: blog/:slug is used by multiple content types."
  );
  expect(result.errorsByType.news?.detailPath).toBe(
    "Conflict: blog/:slug is used by multiple content types."
  );
});
