import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  menuItems,
  menus,
  pageRevisions,
  pages,
  seoDocuments,
  users,
} from "../../../core/db/schema";
import {
  createMenu,
  getMenu,
  publishMenu,
  replaceMenuItems,
  updateMenu,
} from "../../../core/services/menus/menuService";
import {
  MENU_NAV_EXTRAS_INVALID,
  resolvePublishedMenuNavExtras,
  resolveStoredMenuNavExtras,
} from "../../../core/services/menus/menuNavExtras";
import { resolvePublishedMenuAppearance } from "../../../core/services/menus/normalizeMenuAppearance";
import { createPage, publishPage } from "../../../core/services/pages/pageService";
import { SITE_NAVIGATION_MENU_SETTING_KEY } from "../../../core/services/pages/publicSiteShell";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
} from "../../../core/services/settings/settingsService";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { clearSiteCache } from "../../../core/site/cache/siteCache";

/**
 * Menu nav extras (TASK-458-03): settings-envelope merge semantics in the
 * menu service plus the published extras render in the public shell header.
 */

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const dbRuntimeTimeout = 30_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const trackedMenuIds = new Set<string>();
const trackedPageIds = new Set<string>();
const trackedUserIds = new Set<string>();
const settingSnapshots = new Map<string, { exists: boolean; value: unknown }>();

const rememberSetting = async (key: string) => {
  if (settingSnapshots.has(key)) return;
  const row = await getSettingRecord(key);
  settingSnapshots.set(key, { exists: Boolean(row), value: row?.value });
};

const setTestSetting = async (key: string, value: unknown) => {
  await rememberSetting(key);
  await setSetting(key, value);
};

afterEach(async () => {
  clearSiteCache();
  resetRateLimitBuckets();
  if (!hasDb) return;
  for (const [key, snapshot] of [...settingSnapshots].reverse()) {
    if (snapshot.exists) {
      await setSetting(key, snapshot.value);
    } else {
      await deleteSetting(key);
    }
  }
  settingSnapshots.clear();
  const menuIds = [...trackedMenuIds];
  const pageIds = [...trackedPageIds];
  const userIds = [...trackedUserIds];
  if (menuIds.length > 0) {
    await db.delete(menuItems).where(inArray(menuItems.menuId, menuIds));
    await db.delete(menus).where(inArray(menus.id, menuIds));
  }
  if (pageIds.length > 0) {
    await db.delete(seoDocuments).where(inArray(seoDocuments.targetId, pageIds));
    await db.delete(pageRevisions).where(inArray(pageRevisions.pageId, pageIds));
    await db.delete(pages).where(inArray(pages.id, pageIds));
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
  trackedMenuIds.clear();
  trackedPageIds.clear();
  trackedUserIds.clear();
});

const ctaExtras = (token: string) => [
  {
    id: `blk-cta-${token}`,
    type: "button",
    props: { label: `Book now ${token}`, href: "/contact" },
    visibility: { visible: true },
  },
];

const createTrackedMenu = async (token: string) => {
  const menu = await createMenu({ name: `Design Menu ${token}` });
  trackedMenuIds.add(menu.id);
  await replaceMenuItems(menu.id, [
    { id: randomUUID(), label: `Home ${token}`, href: "/" },
    { id: randomUUID(), label: `Services ${token}`, href: `/services-${token}` },
  ]);
  return menu;
};

testIfDb("updateMenu merges appearance and extras per envelope key", async () => {
  const token = randomUUID().slice(0, 8);
  const menu = await createTrackedMenu(token);

  // Extras alone: envelope carries only extras.
  await updateMenu(menu.id, { extras: ctaExtras(token) });
  let row = await getMenu(menu.id);
  expect(resolveStoredMenuNavExtras(row?.settings).map((block) => block.type)).toEqual(["button"]);
  expect((row?.settings as Record<string, unknown>).appearance).toBeUndefined();

  // Appearance update preserves the stored extras (per-key merge).
  await updateMenu(menu.id, { appearance: { surfaceColor: "#0f172a" } });
  row = await getMenu(menu.id);
  expect((row?.settings as Record<string, unknown>).appearance).toEqual({
    surfaceColor: "#0f172a",
  });
  expect(resolveStoredMenuNavExtras(row?.settings)).toHaveLength(1);

  // Publish snapshots the draft design state for public rendering.
  await publishMenu(menu.id);
  row = await getMenu(menu.id);
  expect(row?.status).toBe("published");
  expect(resolveStoredMenuNavExtras(row?.settings)).toHaveLength(1);
  expect(resolvePublishedMenuNavExtras(row?.settings)).toHaveLength(1);

  // Clearing draft extras keeps the published snapshot unchanged.
  await updateMenu(menu.id, { extras: null });
  row = await getMenu(menu.id);
  expect((row?.settings as Record<string, unknown>).extras).toBeUndefined();
  expect((row?.settings as Record<string, unknown>).appearance).toEqual({
    surfaceColor: "#0f172a",
  });
  expect(resolvePublishedMenuNavExtras(row?.settings)).toHaveLength(1);
  await updateMenu(menu.id, { appearance: null });
  row = await getMenu(menu.id);
  expect((row?.settings as Record<string, unknown>).appearance).toBeUndefined();
  expect((row?.settings as Record<string, unknown>).extras).toBeUndefined();
  expect(resolvePublishedMenuNavExtras(row?.settings)).toHaveLength(1);
  expect(resolvePublishedMenuAppearance(row?.settings)).toEqual({ surfaceColor: "#0f172a" });
  await publishMenu(menu.id);
  row = await getMenu(menu.id);
  expect(row?.settings).toEqual({ published: {} });
});

testIfDb("updateMenu rejects invalid extras with menu_nav_extras_invalid", async () => {
  const token = randomUUID().slice(0, 8);
  const menu = await createTrackedMenu(token);
  await updateMenu(menu.id, { extras: ctaExtras(token) });

  expect(updateMenu(menu.id, { extras: "nope" })).rejects.toThrow(MENU_NAV_EXTRAS_INVALID);
  expect(
    updateMenu(menu.id, {
      extras: [
        {
          id: `blk-heading-${token}`,
          type: "heading",
          props: { text: "Not allowed", level: "h2" },
          visibility: { visible: true },
        },
      ],
    })
  ).rejects.toThrow(MENU_NAV_EXTRAS_INVALID);

  // Nothing was persisted by the rejected writes.
  const row = await getMenu(menu.id);
  expect(resolveStoredMenuNavExtras(row?.settings).map((block) => block.type)).toEqual(["button"]);
});

testIfDbWithOptions(
  "published nav extras render in the public shell header; legacy menus emit no extras slot",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const token = randomUUID().slice(0, 8);
    const [actor] = await db
      .insert(users)
      .values({
        email: `menu-extras-runtime-${randomUUID()}@example.com`,
        passwordHash: "test",
        status: "active",
      })
      .returning();
    if (!actor?.id) throw new Error("missing_test_actor");
    trackedUserIds.add(actor.id);

    const data = {
      schemaVersion: 2,
      breakpoints: ["desktop", "tablet", "mobile"],
      seo: {},
      settings: { template: "page-v2", showInNav: false },
      sections: [
        {
          id: `sec-extras-${token}`,
          type: "content",
          name: "Body",
          variant: "default",
          layout: { columns: 1, align: "stretch", justify: "start", maxWidth: 1080 },
          style: {
            background: "#ffffff",
            backgroundType: "color",
            backgroundImage: null,
            accent: "#0d9488",
            radius: 0,
            shadow: "none",
          },
          spacing: {
            paddingTop: 48,
            paddingBottom: 48,
            paddingLeft: 32,
            paddingRight: 32,
            gap: 24,
          },
          visibility: {
            visible: true,
            authOnly: false,
            anchor: null,
            startsAt: null,
            endsAt: null,
          },
          responsive: {},
          blocks: [
            {
              id: `heading-extras-${token}`,
              type: "heading",
              props: { text: `Extras page ${token}`, level: "h1", align: "left" },
              visibility: { visible: true },
            },
          ],
        },
      ],
    };
    const page = await createPage({
      title: `Menu Extras Page ${token}`,
      slug: `/menu-extras-${token}`,
      authorId: actor.id,
      data,
    });
    if (!page?.id) throw new Error("missing_test_page");
    trackedPageIds.add(page.id);
    await publishPage(page.id, actor.id, data);

    const menu = await createTrackedMenu(token);
    await updateMenu(menu.id, { extras: ctaExtras(token) });
    await publishMenu(menu.id);
    await setTestSetting(SITE_NAVIGATION_MENU_SETTING_KEY, menu.id);

    const request = (path: string) =>
      handlePublicRequest(
        new Request(`http://public.coderso.test${path}`, {
          headers: {
            "user-agent": "menu-extras-runtime-test",
            "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
          },
        })
      );

    const response = await request(`/menu-extras-${token}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('data-site-nav-extras="true"');
    expect(html).toContain(`Book now ${token}`);
    expect(html).toContain('href="/contact"');

    // Draft appearance edits on an already-published menu do not reach the
    // public shell until publish copies the draft into the public snapshot.
    await updateMenu(menu.id, { appearance: { surfaceColor: "#123456" } });
    clearSiteCache();
    const draftAppearanceResponse = await request(`/menu-extras-${token}`);
    expect(draftAppearanceResponse.status).toBe(200);
    const draftAppearanceHtml = await draftAppearanceResponse.text();
    expect(draftAppearanceHtml).not.toContain("#123456");

    await publishMenu(menu.id);
    clearSiteCache();
    const publishedAppearanceResponse = await request(`/menu-extras-${token}`);
    expect(publishedAppearanceResponse.status).toBe(200);
    const publishedAppearanceHtml = await publishedAppearanceResponse.text();
    expect(publishedAppearanceHtml).toContain("#123456");

    // Clearing the draft extras also stays private until publish.
    clearSiteCache();
    await updateMenu(menu.id, { extras: null });
    const draftClearedResponse = await request(`/menu-extras-${token}`);
    expect(draftClearedResponse.status).toBe(200);
    const draftClearedHtml = await draftClearedResponse.text();
    expect(draftClearedHtml).toContain('data-site-nav-extras="true"');
    expect(draftClearedHtml).toContain(`Book now ${token}`);

    await publishMenu(menu.id);
    clearSiteCache();
    const legacyResponse = await request(`/menu-extras-${token}`);
    expect(legacyResponse.status).toBe(200);
    const legacyHtml = await legacyResponse.text();
    expect(legacyHtml).not.toContain("data-site-nav-extras");
    expect(legacyHtml).toContain(`Home ${token}`);
  },
  // This scenario performs five full public-shell renders plus fixture cleanup.
  { timeout: dbRuntimeTimeout * 2 }
);
