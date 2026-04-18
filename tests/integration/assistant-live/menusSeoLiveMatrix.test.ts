import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import {
  canConnectToLiveDatabase,
  createEnabledLiveProviderRuntimes,
  createLiveCleanupStack,
  createLiveRunPrefix,
  executeLivePlan,
  expectSuccessfulExecution,
  planWithLiveProvider,
  type LiveProviderRuntime,
} from "./liveCmsHarness";

const hasDb = await canConnectToLiveDatabase();
const providers = createEnabledLiveProviderRuntimes();
const testIfLive = hasDb && providers.length > 0 ? test : test.skip;
const globalCleanup = createLiveCleanupStack();

const loadDb = async () => {
  const [{ db }, { users }] = await Promise.all([
    import("../../../core/db/client"),
    import("../../../core/db/schema"),
  ]);
  return { db, users };
};

const loadMenus = () => import("../../../core/services/menus/menuService");
const loadPages = () => import("../../../core/services/pages/pageService");
const loadSeo = () => import("../../../core/services/seo/seoService");

const createActor = async (prefix: string) => {
  const { db, users } = await loadDb();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${prefix}-${randomUUID()}@nextless.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Live Menu SEO Actor",
      status: "active",
    })
    .returning();
  if (!actor) throw new Error("assistant_live_actor_create_failed");
  globalCleanup.add(`user:${actor.id}`, async () => {
    await db.delete(users).where(eq(users.id, actor.id)).catch(() => undefined);
  });
  return actor;
};

const createPageFixture = async (
  input: {
    title: string;
    slug: string;
    actorId: string;
    cleanup: ReturnType<typeof createLiveCleanupStack>;
  }
) => {
  const { createPage, deletePage, publishPage } = await loadPages();
  const page = await createPage({
    title: input.title,
    slug: input.slug,
    data: { blocks: [] },
    authorId: input.actorId,
  });
  if (!page) throw new Error("assistant_live_page_create_failed");
  input.cleanup.add(`page:${page.id}`, async () => {
    await deletePage(page.id).catch(() => undefined);
  });
  await publishPage(page.id, input.actorId);
  return page;
};

const createMenuFixture = async (
  input: {
    prefix: string;
    cleanup: ReturnType<typeof createLiveCleanupStack>;
  }
) => {
  const { createMenu, deleteMenu, replaceMenuItems } = await loadMenus();
  const menu = await createMenu({ name: `${input.prefix} Menu` });
  if (!menu) throw new Error("assistant_live_menu_create_failed");
  input.cleanup.add(`menu:${menu.id}`, async () => {
    await deleteMenu(menu.id).catch(() => undefined);
  });
  const items = await replaceMenuItems(menu.id, [
    {
      id: randomUUID(),
      label: `${input.prefix} Products`,
      href: `/${input.prefix}-products`,
      orderIndex: 0,
    },
    {
      id: randomUUID(),
      label: `${input.prefix} About`,
      href: `/${input.prefix}-about`,
      orderIndex: 1,
    },
  ]);
  return { menu, items };
};

const buildContext = async (): Promise<AssistantActionContext> => {
  const [{ listMenus, listMenuItems }, { listPages }, { listExistingSeoDocuments }] = await Promise.all([
    loadMenus(),
    loadPages(),
    loadSeo(),
  ]);
  const [menus, pages, seoDocuments] = await Promise.all([
    listMenus(),
    listPages(),
    listExistingSeoDocuments(),
  ]);
  const menusWithItems = await Promise.all(
    menus.map(async (menu) => ({ menu, items: await listMenuItems(menu.id) }))
  );
  return {
    page: "/admin/menus",
    locale: "pl-PL",
    resourceCatalog: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      budget: { maxItemsPerGroup: 100, maxFieldsPerResource: 24, truncated: false },
      pages: pages.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
      })),
      contentTypes: [],
      customScreens: [],
      listings: { queries: [], templates: [] },
      forms: [],
      menus: menusWithItems.map(({ menu, items }) => ({
        id: menu.id,
        name: menu.name,
        location: menu.location,
        itemCount: items.length,
        items: items.map((item) => ({
          id: item.id,
          label: item.label,
          href: item.href,
          pageId: item.pageId,
          parentId: item.parentId,
          orderIndex: item.orderIndex,
          depth: 0,
        })),
      })),
      seoDocuments: seoDocuments.map((doc) => ({
        id: doc.id,
        targetType: doc.targetType,
        targetId: doc.targetId,
        targetTitle: doc.targetTitle,
        slug: doc.slug,
        title: doc.title,
        status: doc.status,
      })),
      widgets: [],
      warnings: [],
    },
    runtimeSnapshot: {
      schemaVersion: 1,
      route: "/admin/menus",
      activeHref: "/admin/menus",
      area: "other",
      codersoModule: null,
      selectedResource: null,
      visibleActions: [],
      permissionHints: {
        known: false,
        requiredForVisibleActions: [],
        reason: "frontend_user_has_no_permissions",
      },
    },
  };
};

const runMenusSeoMatrixForProvider = async (provider: LiveProviderRuntime) => {
  const cleanup = createLiveCleanupStack();
  const prefix = createLiveRunPrefix(`menus-seo-${provider.id}`);
  const actor = await createActor(prefix);
  const page = await createPageFixture({
    title: `${prefix} SEO Page`,
    slug: `/${prefix}-seo-page`,
    actorId: actor.id,
    cleanup,
  });
  const { menu } = await createMenuFixture({ prefix, cleanup });
  const { upsertSeoDocument, getSeoDocumentByTarget, getSeoDocument } = await loadSeo();
  const seo = await upsertSeoDocument({
    targetType: "page",
    targetId: page.id,
    slug: page.slug,
    title: `${prefix} SEO Initial`,
    description: "Initial description",
  });
  if (!seo) throw new Error("assistant_live_seo_create_failed");
  cleanup.add(`seo:${seo.id}`, async () => {
    const { deleteSeoDocument } = await loadSeo();
    await deleteSeoDocument(seo.id).catch(() => undefined);
  });

  try {
    const menuLookup = await planWithLiveProvider({
      provider,
      context: await buildContext(),
      prompt: `Znajdz menu item z href "/${prefix}-products"`,
    });
    expect(menuLookup.responseKind, provider.id).toBe("inspection");
    expect(menuLookup.inspection?.resourceKind, provider.id).toBe("menu-item");
    expect(menuLookup.inspection?.candidates.map((candidate) => candidate.label), provider.id).toContain(`${prefix} Products`);

    const updateMenuPlan = await planWithLiveProvider({
      provider,
      context: await buildContext(),
      prompt: `Zmien menu item "/${prefix}-products" na "${prefix} Products Catalog"`,
    });
    expect(updateMenuPlan.actions.map((action) => action.type), provider.id).toContain("menu.item.update");
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: updateMenuPlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-menu-update`,
      })
    );
    const { listMenuItems } = await loadMenus();
    expect(
      (await listMenuItems(menu.id)).map((item) => item.label),
      provider.id
    ).toContain(`${prefix} Products Catalog`);

    const deleteMenuPlan = await planWithLiveProvider({
      provider,
      context: await buildContext(),
      prompt: `Usun menu item "/${prefix}-about"`,
    });
    expect(deleteMenuPlan.actions.map((action) => action.type), provider.id).toEqual(["menu.item.delete"]);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: deleteMenuPlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-menu-delete`,
      })
    );
    expect(
      (await listMenuItems(menu.id)).map((item) => item.href),
      provider.id
    ).not.toContain(`/${prefix}-about`);

    const updateSeoPlan = await planWithLiveProvider({
      provider,
      context: await buildContext(),
      prompt: `Zmien seo document "${page.slug}" title na "${prefix} SEO Updated"`,
    });
    expect(updateSeoPlan.actions.map((action) => action.type), provider.id).toContain("seo.document.update");
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: updateSeoPlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-seo-update`,
      })
    );
    const updatedSeo = await getSeoDocumentByTarget("page", page.id);
    expect(updatedSeo?.title, provider.id).toBe(`${prefix} SEO Updated`);
    expect((await getSeoDocument(seo.id))?.targetId, provider.id).toBe(page.id);

    const deleteSeoPlan = await planWithLiveProvider({
      provider,
      context: await buildContext(),
      prompt: `Usun seo document "${page.slug}"`,
    });
    expect(deleteSeoPlan.actions.map((action) => action.type), provider.id).toEqual(["seo.document.delete"]);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: deleteSeoPlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-seo-delete`,
      })
    );
    expect(await getSeoDocument(seo.id), provider.id).toBeNull();
    const { getPage } = await loadPages();
    expect(await getPage(page.id), provider.id).toBeTruthy();
  } finally {
    await cleanup.run();
  }
};

afterAll(async () => {
  await globalCleanup.run();
});

testIfLive(
  "assistant live providers handle menus and seo matrix",
  async () => {
    for (const provider of providers) {
      await runMenusSeoMatrixForProvider(provider);
    }
  },
  180_000
);
