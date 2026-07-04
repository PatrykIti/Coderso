import { afterEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  menuItems,
  menus,
  pageRevisions,
  pages,
  pageTemplates,
  previewTokens,
  seoDocuments,
  users,
} from "../../../core/db/schema";
import { createDefaultMenuDocumentV2 } from "../../../core/services/menus/menuDocumentV2";
import {
  createMenu,
  publishMenu,
  replaceMenuItems,
  updateMenu,
} from "../../../core/services/menus/menuService";
import type { MenuAppearance } from "../../../core/services/menus/normalizeMenuAppearance";
import { buildSiteShellCss } from "../../../core/site/siteShellCss";
import { createPage, publishPage } from "../../../core/services/pages/pageService";
import { createPageTemplate } from "../../../core/services/pages/pageTemplateLibraryService";
import { createPreviewToken } from "../../../core/services/pages/previewService";
import {
  SITE_FOOTER_TEMPLATE_SETTING_KEY,
  SITE_NAVIGATION_MENU_SETTING_KEY,
} from "../../../core/services/pages/publicSiteShell";
import {
  deleteSetting,
  getSettingRecord,
  setSetting,
} from "../../../core/services/settings/settingsService";
import { handlePublicRequest } from "../../../core/server/publicSite";
import { resetRateLimitBuckets } from "../../../core/server/middleware/rateLimit";
import { clearSiteCache, getSiteCacheStats } from "../../../core/site/cache/siteCache";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect()) && (await hasShellTables());
const testIfDb = hasDb ? test : test.skip;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;
const dbRuntimeTimeout = 15_000;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

async function hasShellTables() {
  try {
    await db.execute(sql`select 1 from menus limit 1`);
    await db.execute(sql`select 1 from page_templates limit 1`);
    return true;
  } catch {
    return false;
  }
}

const trackedPageIds = new Set<string>();
const trackedUserIds = new Set<string>();
const trackedMenuIds = new Set<string>();
const trackedTemplateIds = new Set<string>();
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

const restoreSettings = async () => {
  for (const [key, snapshot] of [...settingSnapshots].reverse()) {
    if (snapshot.exists) {
      await setSetting(key, snapshot.value);
    } else {
      await deleteSetting(key);
    }
  }
  settingSnapshots.clear();
};

const cleanupTrackedRows = async () => {
  const pageIds = [...trackedPageIds];
  const userIds = [...trackedUserIds];
  const menuIds = [...trackedMenuIds];
  const templateIds = [...trackedTemplateIds];

  if (menuIds.length > 0) {
    await db.delete(menuItems).where(inArray(menuItems.menuId, menuIds));
    await db.delete(menus).where(inArray(menus.id, menuIds));
  }
  if (templateIds.length > 0) {
    await db.delete(pageTemplates).where(inArray(pageTemplates.id, templateIds));
  }
  if (pageIds.length > 0) {
    await db.delete(seoDocuments).where(inArray(seoDocuments.targetId, pageIds));
    await db.delete(previewTokens).where(inArray(previewTokens.targetId, pageIds));
    await db.delete(pageRevisions).where(inArray(pageRevisions.pageId, pageIds));
    await db.delete(pages).where(inArray(pages.id, pageIds));
  }
  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds));
  }

  trackedPageIds.clear();
  trackedUserIds.clear();
  trackedMenuIds.clear();
  trackedTemplateIds.clear();
};

afterEach(async () => {
  clearSiteCache();
  resetRateLimitBuckets();
  if (!hasDb) return;
  await restoreSettings();
  await cleanupTrackedRows();
});

const pageData = (headline: string, sectionToken: string) => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  sections: [
    {
      id: `sec-shell-page-${sectionToken}`,
      type: "content",
      name: "Shell Page",
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
      spacing: { paddingTop: 48, paddingBottom: 48, paddingLeft: 32, paddingRight: 32, gap: 24 },
      visibility: { visible: true, authOnly: false, anchor: null, startsAt: null, endsAt: null },
      responsive: {},
      blocks: [
        {
          id: `heading-shell-page-${sectionToken}`,
          type: "heading",
          props: { text: headline, level: "h1", align: "left" },
          visibility: { visible: true },
        },
      ],
    },
  ],
  settings: { template: "page-v2", showInNav: false },
  seo: { description: `${headline} description` },
});

const footerTemplateDocument = (token: string) => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: false },
  sections: [
    {
      id: `sec-shell-footer-${token}`,
      type: "content",
      name: "Footer Columns",
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
      spacing: { paddingTop: 32, paddingBottom: 32, paddingLeft: 24, paddingRight: 24, gap: 16 },
      visibility: { visible: true, authOnly: false, anchor: null, startsAt: null, endsAt: null },
      responsive: {
        mobile: { layout: { maxWidth: 480 } },
      },
      blocks: [
        {
          id: `heading-shell-footer-${token}`,
          type: "heading",
          props: { text: `Footer columns ${token}`, level: "h2", align: "left" },
          visibility: { visible: true },
        },
      ],
    },
  ],
});

const createActor = async () => {
  const [actor] = await db
    .insert(users)
    .values({
      email: `site-shell-runtime-${randomUUID()}@example.com`,
      passwordHash: "test",
      status: "active",
    })
    .returning();
  if (actor?.id) trackedUserIds.add(actor.id);
  if (!actor?.id) throw new Error("missing_test_actor");
  return actor;
};

const createPublishedPage = async (token: string) => {
  const actor = await createActor();
  const slug = `/site-shell-${token}`;
  const data = pageData(`Shell page headline ${token}`, token);
  const created = await createPage({
    title: `Site Shell Page ${token}`,
    slug,
    authorId: actor.id,
    data,
  });
  if (created?.id) trackedPageIds.add(created.id);
  if (!created?.id) throw new Error("missing_test_page");
  await publishPage(created.id, actor.id, data);
  return { page: created, slug, headline: `Shell page headline ${token}` };
};

const createShellMenu = async (
  token: string,
  options?: { publish?: boolean; pageId?: string; appearance?: MenuAppearance }
) => {
  const menu = await createMenu({ name: `Shell Menu ${token}` });
  trackedMenuIds.add(menu.id);
  const parentId = randomUUID();
  const items = [
    { id: randomUUID(), label: `Home ${token}`, href: "/" },
    { id: parentId, label: `Services ${token}`, href: `/services-${token}` },
    {
      id: randomUUID(),
      label: `Consulting ${token}`,
      href: `/services-${token}/consulting`,
      parentId,
    },
    ...(options?.pageId
      ? [{ id: randomUUID(), label: `Linked page ${token}`, pageId: options.pageId }]
      : []),
  ];
  await replaceMenuItems(menu.id, items);
  if (options?.appearance) {
    await updateMenu(menu.id, { appearance: options.appearance });
  }
  if (options?.publish !== false) {
    await publishMenu(menu.id);
  }
  return menu;
};

const createShellFooterTemplate = async (token: string, options?: { publish?: boolean }) => {
  const template = await createPageTemplate({
    name: `Shell Footer ${token}`,
    document: footerTemplateDocument(token),
    ...(options?.publish === false ? {} : { status: "published" }),
  });
  trackedTemplateIds.add(template.id);
  return template;
};

const requestPublicPath = (path: string) =>
  handlePublicRequest(
    new Request(`http://public.coderso.test${path}`, {
      headers: {
        "user-agent": "site-shell-runtime-test",
        "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}`,
      },
    })
  );

testIfDbWithOptions(
  "public page renders the published menu nav and footer template with scoped responsive CSS",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const token = randomUUID().slice(0, 8);
    const fixture = await createPublishedPage(token);
    const menu = await createShellMenu(token, { pageId: fixture.page.id });
    const template = await createShellFooterTemplate(token);
    await setTestSetting(SITE_NAVIGATION_MENU_SETTING_KEY, menu.id);
    await setTestSetting(SITE_FOOTER_TEMPLATE_SETTING_KEY, template.id);

    const response = await requestPublicPath(fixture.slug);
    expect(response.status).toBe(200);
    const html = await response.text();

    // Header navigation from the published menu tree.
    expect(html).toContain('data-site-header="true"');
    expect(html).toContain(`aria-label="Shell Menu ${token}"`);
    expect(html).toContain(`>Home ${token}</a>`);
    expect(html).toContain('data-site-nav-link="true" href="/"');
    // Nested item renders as a CSS-only <details> dropdown group.
    expect(html).toContain('data-site-nav-group="true"');
    expect(html).toContain(`<summary>Services ${token}</summary>`);
    expect(html).toContain(`href="/services-${token}/consulting"`);
    // pageId-linked item resolves to the published page slug.
    expect(html).toContain(`>Linked page ${token}</a>`);
    expect(html).toContain(`href="${fixture.slug}"`);
    // Mobile collapse is a CSS-only disclosure; no shell client script ships.
    expect(html).toContain('data-site-nav-disclosure="true"');
    expect(html).toContain('[data-site-header="true"] .site-nav-disclosure[open]~.site-nav-list');

    // Footer template rides the Page v2 pipeline under the footer scope.
    expect(html).toContain('data-site-footer="true"');
    expect(html).toContain(`Footer columns ${token}`);

    // Footer responsive CSS is appended with the distinct footer scope.
    expect(html).toContain('<style data-page-responsive="true">');
    expect(html).toContain(
      `[data-site-footer="true"] [data-section-id="sec-shell-footer-${token}"] > [data-page-section-content="true"]{max-width:480px !important}`
    );

    // Page content still renders between the shell parts.
    expect(html).toContain(fixture.headline);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "draft menu and draft footer template references fail closed to no shell",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const token = randomUUID().slice(0, 8);
    const fixture = await createPublishedPage(token);
    const draftMenu = await createShellMenu(token, { publish: false });
    const draftTemplate = await createShellFooterTemplate(token, { publish: false });
    await setTestSetting(SITE_NAVIGATION_MENU_SETTING_KEY, draftMenu.id);
    await setTestSetting(SITE_FOOTER_TEMPLATE_SETTING_KEY, draftTemplate.id);

    const response = await requestPublicPath(fixture.slug);
    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain(fixture.headline);
    expect(html).not.toContain("data-site-header");
    expect(html).not.toContain("data-site-footer");
    expect(html).not.toContain(`Home ${token}`);
    expect(html).not.toContain(`Footer columns ${token}`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "tokenized page preview includes the same site shell as the public render",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);
    await setTestSetting("site.previewEnabled", true);

    const token = randomUUID().slice(0, 8);
    const fixture = await createPublishedPage(token);
    const menu = await createShellMenu(token);
    const template = await createShellFooterTemplate(token);
    await setTestSetting(SITE_NAVIGATION_MENU_SETTING_KEY, menu.id);
    await setTestSetting(SITE_FOOTER_TEMPLATE_SETTING_KEY, template.id);

    const { token: previewToken } = await createPreviewToken({
      targetType: "page",
      targetId: fixture.page.id,
      ttlMinutes: 5,
    });
    const response = await requestPublicPath(
      `/preview?type=page&token=${encodeURIComponent(previewToken)}&device=mobile`
    );
    expect(response.status).toBe(200);
    const html = await response.text();

    expect(html).toContain("Preview mode");
    expect(html).toContain('data-site-header="true"');
    expect(html).toContain(`>Home ${token}</a>`);
    expect(html).toContain('data-site-footer="true"');
    expect(html).toContain(`Footer columns ${token}`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "site shell settings writes invalidate cached public HTML",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 60);
    await setTestSetting("site.contentRoutes", []);

    const token = randomUUID().slice(0, 8);
    const otherToken = `${token}-b`;
    const fixture = await createPublishedPage(token);
    const firstMenu = await createShellMenu(token);
    const secondMenu = await createShellMenu(otherToken);
    await setTestSetting(SITE_NAVIGATION_MENU_SETTING_KEY, firstMenu.id);
    await setTestSetting(SITE_FOOTER_TEMPLATE_SETTING_KEY, null);

    const firstResponse = await requestPublicPath(fixture.slug);
    expect(firstResponse.status).toBe(200);
    const firstHtml = await firstResponse.text();
    expect(firstHtml).toContain(`aria-label="Shell Menu ${token}"`);
    expect(getSiteCacheStats().size).toBe(1);

    // The settings write for a shell key clears the whole site cache.
    await setSetting(SITE_NAVIGATION_MENU_SETTING_KEY, secondMenu.id);
    expect(getSiteCacheStats().size).toBe(0);

    const secondResponse = await requestPublicPath(fixture.slug);
    expect(secondResponse.status).toBe(200);
    const secondHtml = await secondResponse.text();
    expect(secondHtml).toContain(`aria-label="Shell Menu ${otherToken}"`);
    expect(secondHtml).not.toContain(`aria-label="Shell Menu ${token}"`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a published styled menu injects its appearance-driven shell CSS (TASK-458-02)",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const token = randomUUID().slice(0, 8);
    const appearance: MenuAppearance = {
      surfaceColor: "#0f172a",
      linkColor: "var(--color-primary)",
      itemGap: 16,
      paddingY: 20,
      alignment: "center",
      sticky: true,
    };
    const fixture = await createPublishedPage(token);
    const menu = await createShellMenu(token, { appearance });
    await setTestSetting(SITE_NAVIGATION_MENU_SETTING_KEY, menu.id);

    const response = await requestPublicPath(fixture.slug);
    expect(response.status).toBe(200);
    const html = await response.text();

    // The published appearance is rendered exactly as the builder emits it.
    const styled = buildSiteShellCss(appearance);
    expect(html).toContain(styled);
    expect(html).toContain(
      '[data-site-header="true"]{background:#0f172a;border-bottom:1px solid rgba(15,23,42,.08);position:sticky;top:0;z-index:50}'
    );
    expect(html).toContain("justify-content:center");
    expect(html).toContain("padding:20px 24px");
    // The legacy stylesheet is NOT present once an appearance is applied.
    expect(html).not.toContain(
      '[data-site-header="true"]{border-bottom:1px solid rgba(15,23,42,.08)}'
    );
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a published menu item with settings.variant:button renders the button affordance; default items stay byte-identical (TASK-499-01)",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const token = randomUUID().slice(0, 8);
    const fixture = await createPublishedPage(token);
    const menu = await createMenu({ name: `Shell Menu ${token}` });
    trackedMenuIds.add(menu.id);
    await replaceMenuItems(menu.id, [
      { id: randomUUID(), label: `Home ${token}`, href: "/" },
      {
        id: randomUUID(),
        label: `Sign up ${token}`,
        href: `/signup-${token}`,
        settings: { variant: "button", openInNewTab: true },
      },
    ]);
    await publishMenu(menu.id);
    await setTestSetting(SITE_NAVIGATION_MENU_SETTING_KEY, menu.id);

    const response = await requestPublicPath(fixture.slug);
    expect(response.status).toBe(200);
    const html = await response.text();

    // The button item renders the server-rendered button affordance + new tab.
    expect(html).toContain('data-site-nav-variant="button"');
    expect(html).toContain(`href="/signup-${token}"`);
    expect(html).toMatch(/href="\/signup-[^"]+"[^>]*target="_blank"/);
    // The default link item carries NO variant marker (byte-identical to today).
    expect(html).toContain(`data-site-nav-link="true" href="/"`);
    expect(html).not.toMatch(new RegExp(`href="/"[^>]*data-site-nav-variant`));
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a published menu with a design document renders the custom menu with base layout CSS; clearing it falls back to the default nav (TASK-499-04)",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const token = randomUUID().slice(0, 8);
    const fixture = await createPublishedPage(token);
    // createShellMenu seeds a nested item tree (Services > Consulting) + publishes.
    const menu = await createShellMenu(token, { pageId: fixture.page.id });
    await updateMenu(menu.id, { document: createDefaultMenuDocumentV2() });
    await publishMenu(menu.id);
    await setTestSetting(SITE_NAVIGATION_MENU_SETTING_KEY, menu.id);

    const response = await requestPublicPath(fixture.slug);
    expect(response.status).toBe(200);
    const html = await response.text();

    // The custom document render replaces the default nav.
    expect(html).toContain('data-site-menu-doc="true"');
    // It reuses the base .site-header* class names, so the base layout sheet
    // (buildSiteShellCss(null)) MUST still be emitted in the head.
    expect(html).toContain(buildSiteShellCss(null));
    // The live item tree is bound into nav-items. TASK-502-03: the
    // menu-document header renders in HOVER mode (details-FREE), so `Services`
    // is NO longer a `<summary>` — it renders ONCE as its own link inside a
    // `li[data-site-nav-group="true"]`, with the child in a nested sublist.
    expect(html).toContain(`>Home ${token}</a>`);
    expect(html).toContain('data-site-nav-group="true"');
    expect(html).not.toContain(`<summary>Services ${token}</summary>`);
    expect(html).toMatch(
      new RegExp(
        `<li class="site-nav-item" data-site-nav-group="true"><a class="site-nav-link"[^>]*href="/services-${token}"`
      )
    );
    expect(html).toMatch(
      new RegExp(`<ul class="site-nav-sublist">.*href="/services-${token}/consulting"`)
    );

    // Clearing the document falls back to today's default SiteHeaderNav.
    await updateMenu(menu.id, { document: null });
    await publishMenu(menu.id);
    clearSiteCache();

    const clearedResponse = await requestPublicPath(fixture.slug);
    expect(clearedResponse.status).toBe(200);
    const clearedHtml = await clearedResponse.text();
    expect(clearedHtml).not.toContain('data-site-menu-doc="true"');
    expect(clearedHtml).toContain('data-site-header="true"');
    expect(clearedHtml).toContain(`>Home ${token}</a>`);
  },
  { timeout: dbRuntimeTimeout }
);

testIfDbWithOptions(
  "a published menu without appearance renders today's legacy shell CSS byte-identically",
  async () => {
    resetRateLimitBuckets();
    await setTestSetting("site.cacheTtlSeconds", 0);
    await setTestSetting("site.contentRoutes", []);

    const token = randomUUID().slice(0, 8);
    const fixture = await createPublishedPage(token);
    const menu = await createShellMenu(token);
    await setTestSetting(SITE_NAVIGATION_MENU_SETTING_KEY, menu.id);

    const response = await requestPublicPath(fixture.slug);
    expect(response.status).toBe(200);
    const html = await response.text();

    // Null/legacy appearance reproduces the pre-appearance stylesheet.
    expect(html).toContain(buildSiteShellCss(null));
    expect(html).toContain('[data-site-header="true"]{border-bottom:1px solid rgba(15,23,42,.08)}');
  },
  { timeout: dbRuntimeTimeout }
);
