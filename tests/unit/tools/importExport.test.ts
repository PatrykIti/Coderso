import { expect, test } from "bun:test";

import { getDefaultAdminThemeTokens } from "../../../core/services/adminThemes/tokenUtils";
import { previewImport } from "../../../core/services/tools/importExportService";

test("previewImport summarizes bundle contents", async () => {
  const tokens = getDefaultAdminThemeTokens();
  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: { "site.name": "Nextless" },
    menus: [
      {
        name: "Main",
        location: "primary",
        items: [
          {
            id: "menu-item-1",
            label: "Home",
            href: "/",
            orderIndex: 0,
          },
        ],
      },
    ],
    themeProfiles: [
      {
        id: "profile-1",
        name: "Default",
        description: null,
        themeName: "admin-default",
        tokens: {},
        isActive: true,
        routes: [{ id: "route-1", path: "/", pageId: null }],
      },
    ],
    adminThemes: {
      templates: [
        {
          id: "template-1",
          name: "Admin Default",
          description: null,
          tokens,
        },
      ],
      profiles: [
        {
          id: "admin-profile-1",
          name: "Admin Profile",
          description: null,
          templateId: "template-1",
          isActive: true,
        },
      ],
    },
    redirects: [],
  };

  const result = await previewImport(bundle);
  expect(result.summary.menus).toBe(1);
  expect(result.summary.menuItems).toBe(1);
  expect(result.summary.themeProfiles).toBe(1);
  expect(result.summary.adminThemeTemplates).toBe(1);
  expect(result.summary.adminThemeProfiles).toBe(1);
});
