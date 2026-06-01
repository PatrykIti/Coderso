import { expect, test } from "bun:test";

import { getDefaultAdminThemeTokens } from "../../../core/services/adminThemes/tokenUtils";
import {
  filterExportBundleForScope,
  normalizeExportRequest,
  previewImport,
} from "../../../core/services/tools/importExportService";
import type { ExportBundle } from "../../../core/services/tools/importExportTypes";

const ids = {
  menu: "11111111-1111-4111-8111-111111111111",
  menuItem: "22222222-2222-4222-8222-222222222222",
  themeProfile: "33333333-3333-4333-8333-333333333333",
  themeRoute: "44444444-4444-4444-8444-444444444444",
  adminTemplate: "55555555-5555-4555-8555-555555555555",
  adminProfile: "66666666-6666-4666-8666-666666666666",
  redirect: "77777777-7777-4777-8777-777777777777",
};

const makeBundle = (): ExportBundle => ({
  version: 1,
  exportedAt: "2026-06-01T10:00:00.000Z",
  settings: { "site.name": "Coderso" },
  menus: [
    {
      id: ids.menu,
      name: "Main",
      location: "primary",
      items: [
        {
          id: ids.menuItem,
          label: "Home",
          href: "/",
          orderIndex: 0,
        },
      ],
    },
  ],
  themeProfiles: [
    {
      id: ids.themeProfile,
      name: "Default",
      description: null,
      themeName: "admin-default",
      tokens: {},
      isActive: true,
      routes: [{ id: ids.themeRoute, path: "/", pageId: null }],
    },
  ],
  adminThemes: {
    templates: [
      {
        id: ids.adminTemplate,
        name: "Admin Default",
        description: null,
        tokens: getDefaultAdminThemeTokens(),
      },
    ],
    profiles: [
      {
        id: ids.adminProfile,
        name: "Admin Profile",
        description: null,
        templateId: ids.adminTemplate,
        isActive: true,
      },
    ],
  },
  redirects: [
    {
      id: ids.redirect,
      fromPath: "/old",
      toPath: "/new",
      statusCode: 301,
      enabled: true,
    },
  ],
});

test("previewImport summarizes bundle contents", async () => {
  const result = await previewImport(makeBundle());

  expect(result.summary.settings).toBe(1);
  expect(result.summary.menus).toBe(1);
  expect(result.summary.menuItems).toBe(1);
  expect(result.summary.themeProfiles).toBe(1);
  expect(result.summary.themeRoutes).toBe(1);
  expect(result.summary.adminThemeTemplates).toBe(1);
  expect(result.summary.adminThemeProfiles).toBe(1);
  expect(result.summary.redirects).toBe(1);
});

test("previewImport rejects malformed persisted identifiers", async () => {
  const bundle = makeBundle();
  bundle.menus[0]!.id = "not-a-uuid";

  await expect(previewImport(bundle)).rejects.toThrow("import_menu_id_invalid");
});

test("previewImport rejects duplicate route and redirect paths before apply", async () => {
  const duplicateRouteBundle = makeBundle();
  duplicateRouteBundle.themeProfiles[0]!.routes.push({
    id: "88888888-8888-4888-8888-888888888888",
    path: "/",
    pageId: null,
  });

  await expect(previewImport(duplicateRouteBundle)).rejects.toThrow("theme_routes_duplicate");

  const duplicateRedirectBundle = makeBundle();
  duplicateRedirectBundle.redirects.push({
    id: "99999999-9999-4999-8999-999999999999",
    fromPath: "old",
    toPath: "/other",
    statusCode: 302,
    enabled: true,
  });

  await expect(previewImport(duplicateRedirectBundle)).rejects.toThrow("redirects_duplicate");
});

test("previewImport uses the redirect domain destination policy", async () => {
  const bundle = makeBundle();
  bundle.redirects[0]!.toPath = "https://evil.example.com";

  await expect(previewImport(bundle)).rejects.toThrow("redirect_target_external");
});

test("filterExportBundleForScope keeps only selected target sections", () => {
  const scope = normalizeExportRequest({
    target: "menus",
    include: ["menus"],
  });
  const filtered = filterExportBundleForScope(makeBundle(), scope);

  expect(filtered.scope).toEqual(scope);
  expect(filtered.settings).toEqual({});
  expect(filtered.menus).toHaveLength(1);
  expect(filtered.menus[0]!.items).toEqual([]);
  expect(filtered.themeProfiles).toEqual([]);
  expect(filtered.adminThemes.templates).toEqual([]);
  expect(filtered.adminThemes.profiles).toEqual([]);
  expect(filtered.redirects).toEqual([]);
});

test("normalizeExportRequest rejects unsupported include options", () => {
  expect(() =>
    normalizeExportRequest({
      target: "settings",
      include: ["menus"],
    })
  ).toThrow("export_include_invalid");
  expect(() =>
    normalizeExportRequest({
      target: "menus",
      include: [],
    })
  ).toThrow("export_include_required");
});
