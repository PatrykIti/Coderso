import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { menuItems, menus, pageTemplates } from "../../../core/db/schema";
import {
  createMenu,
  publishMenu,
  replaceMenuItems,
} from "../../../core/services/menus/menuService";
import {
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  createPageTemplate,
  updatePageTemplate,
} from "../../../core/services/pages/pageTemplateLibraryService";
import {
  SITE_FOOTER_TEMPLATE_SETTING_KEY,
  SITE_NAVIGATION_MENU_SETTING_KEY,
  assertSiteShellMenuExists,
  assertSiteShellTemplateExists,
  resolvePublicSiteShell,
} from "../../../core/services/pages/publicSiteShell";
import { deleteSetting, setSetting } from "../../../core/services/settings/settingsService";
import { canConnect, hasTable } from "../../utils/db";

const hasDb =
  Boolean(process.env.DATABASE_URL) &&
  (await canConnect()) &&
  (await hasTable("page_templates")) &&
  (await hasTable("menus"));
const testIfDb = hasDb ? test : test.skip;
const dbTestTimeoutMs = 15_000;

const createdMenuIds: string[] = [];
const createdTemplateIds: string[] = [];

afterAll(async () => {
  if (!hasDb) return;
  await deleteSetting(SITE_NAVIGATION_MENU_SETTING_KEY);
  await deleteSetting(SITE_FOOTER_TEMPLATE_SETTING_KEY);
  for (const menuId of createdMenuIds) {
    await db.delete(menuItems).where(eq(menuItems.menuId, menuId));
    await db.delete(menus).where(eq(menus.id, menuId));
  }
  for (const templateId of createdTemplateIds) {
    await db.delete(pageTemplates).where(eq(pageTemplates.id, templateId));
  }
}, dbTestTimeoutMs);

const templateDocument = (): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: false },
  sections: [createPageSectionV2("hero", { id: `sec_${randomUUID().slice(0, 12)}` })],
});

const createDraftMenuFixture = async () => {
  const menu = await createMenu({ name: `Shell Menu ${randomUUID()}` });
  createdMenuIds.push(menu.id);
  await replaceMenuItems(menu.id, [{ label: "Home", href: "/" }]);
  return menu;
};

const createDraftTemplateFixture = async () => {
  const template = await createPageTemplate({
    name: `Shell Footer ${randomUUID()}`,
    document: templateDocument(),
  });
  createdTemplateIds.push(template.id);
  return template;
};

const setShellSettings = async (menuId: string | null, templateId: string | null) => {
  await setSetting(SITE_NAVIGATION_MENU_SETTING_KEY, menuId);
  await setSetting(SITE_FOOTER_TEMPLATE_SETTING_KEY, templateId);
};

testIfDb(
  "resolves a fully null shell when no references are configured",
  async () => {
    await deleteSetting(SITE_NAVIGATION_MENU_SETTING_KEY);
    await deleteSetting(SITE_FOOTER_TEMPLATE_SETTING_KEY);

    const shell = await resolvePublicSiteShell();
    expect(shell.navigation).toBeNull();
    expect(shell.footerDocument).toBeNull();
  },
  dbTestTimeoutMs
);

testIfDb(
  "draft menu and draft template references fail closed to null",
  async () => {
    const menu = await createDraftMenuFixture();
    const template = await createDraftTemplateFixture();
    await setShellSettings(menu.id, template.id);

    const shell = await resolvePublicSiteShell();
    expect(shell.navigation).toBeNull();
    expect(shell.footerDocument).toBeNull();
  },
  dbTestTimeoutMs
);

testIfDb(
  "published menu and published template resolve into the shell",
  async () => {
    const menu = await createDraftMenuFixture();
    const template = await createDraftTemplateFixture();
    await publishMenu(menu.id);
    await updatePageTemplate(template.id, { status: "published" });
    await setShellSettings(menu.id, template.id);

    const shell = await resolvePublicSiteShell();
    expect(shell.navigation?.menu.id).toBe(menu.id);
    expect(shell.navigation?.menu.status).toBe("published");
    expect(shell.navigation?.items[0]?.label).toBe("Home");
    expect(shell.navigation?.items[0]?.href).toBe("/");
    expect(shell.footerDocument?.schemaVersion).toBe(2);
    expect(shell.footerDocument?.sections).toHaveLength(1);
  },
  dbTestTimeoutMs
);

testIfDb(
  "missing and malformed references fail closed to null",
  async () => {
    await setShellSettings(randomUUID(), randomUUID());
    let shell = await resolvePublicSiteShell();
    expect(shell.navigation).toBeNull();
    expect(shell.footerDocument).toBeNull();

    await setShellSettings("not-a-uuid", "not-a-uuid");
    shell = await resolvePublicSiteShell();
    expect(shell.navigation).toBeNull();
    expect(shell.footerDocument).toBeNull();
  },
  dbTestTimeoutMs
);

testIfDb(
  "published template with an unreadable stored document fails closed to null",
  async () => {
    const now = new Date();
    const [row] = await db
      .insert(pageTemplates)
      .values({
        name: `Shell Corrupt ${randomUUID()}`,
        slug: `shell-corrupt-${randomUUID().slice(0, 12)}`,
        status: "published",
        document: { blocks: [{ id: "w1", type: "hero", data: {} }] },
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    createdTemplateIds.push(row.id);
    await setShellSettings(null, row.id);

    const shell = await resolvePublicSiteShell();
    expect(shell.footerDocument).toBeNull();

    // The admin validation path still treats the existing record as present.
    await expect(assertSiteShellTemplateExists(row.id)).resolves.toBeUndefined();
  },
  dbTestTimeoutMs
);

testIfDb(
  "admin validation helpers accept null and existing references",
  async () => {
    const menu = await createDraftMenuFixture();
    const template = await createDraftTemplateFixture();

    await expect(assertSiteShellMenuExists(null)).resolves.toBeUndefined();
    await expect(assertSiteShellTemplateExists(null)).resolves.toBeUndefined();
    await expect(assertSiteShellMenuExists(menu.id)).resolves.toBeUndefined();
    await expect(assertSiteShellTemplateExists(template.id)).resolves.toBeUndefined();
  },
  dbTestTimeoutMs
);

testIfDb(
  "admin validation helpers throw machine-readable site_shell_* errors",
  async () => {
    await expect(assertSiteShellMenuExists(randomUUID())).rejects.toThrow(
      "site_shell_menu_not_found"
    );
    await expect(assertSiteShellMenuExists("not-a-uuid")).rejects.toThrow(
      "site_shell_menu_not_found"
    );
    await expect(assertSiteShellTemplateExists(randomUUID())).rejects.toThrow(
      "site_shell_template_not_found"
    );
    await expect(assertSiteShellTemplateExists("not-a-uuid")).rejects.toThrow(
      "site_shell_template_not_found"
    );
  },
  dbTestTimeoutMs
);
