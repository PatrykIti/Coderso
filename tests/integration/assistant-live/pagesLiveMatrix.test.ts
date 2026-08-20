import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import {
  canConnectToLiveDatabase,
  createEnabledLiveProviderRuntimes,
  createLiveCleanupStack,
  createLiveRunPrefix,
  dryRunLivePlan,
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

const loadPageService = () => import("../../../core/services/pages/pageService");

const createActor = async (prefix: string) => {
  const { db, users } = await loadDb();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${prefix}-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Live Pages Actor",
      status: "active",
    })
    .returning();
  if (!actor) throw new Error("assistant_live_actor_create_failed");
  globalCleanup.add(`user:${actor.id}`, async () => {
    await db
      .delete(users)
      .where(eq(users.id, actor.id))
      .catch(() => undefined);
  });
  return actor;
};

const pageData = (title: string) => ({
  blocks: [
    {
      id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-hero`,
      type: "hero",
      data: {
        headline: title,
        body: `${title} body`,
      },
    },
  ],
});

const createPublishedFixturePage = async (input: {
  title: string;
  slug: string;
  actorId: string;
  cleanup: ReturnType<typeof createLiveCleanupStack>;
}) => {
  const { createPage, deletePage, publishPage } = await loadPageService();
  const page = await createPage({
    title: input.title,
    slug: input.slug,
    data: pageData(input.title),
    authorId: input.actorId,
  });
  if (!page) throw new Error("assistant_live_page_create_failed");
  input.cleanup.add(`page:${page.id}`, async () => {
    await deletePage(page.id).catch(() => undefined);
  });
  await publishPage(page.id, input.actorId);
  return page;
};

const buildPageContext = async (): Promise<AssistantActionContext> => {
  const { listPages } = await loadPageService();
  const pages = await listPages();
  return {
    page: "/admin/pages",
    locale: "pl-PL",
    includeResourceCatalog: true,
    resourceCatalog: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      budget: {
        maxItemsPerGroup: 100,
        maxFieldsPerResource: 24,
        truncated: false,
      },
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
      menus: [],
      seoDocuments: [],
      warnings: [],
    },
    runtimeSnapshot: {
      schemaVersion: 2,
      route: "/admin/pages",
      activeHref: "/admin/pages",
      area: "other",
      advancedModule: null,
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

const expectPageMissing = async (slug: string) => {
  const { getPageBySlug } = await loadPageService();
  const page = await getPageBySlug(slug);
  expect(page).toBeNull();
};

const runPagesMatrixForProvider = async (provider: LiveProviderRuntime) => {
  const cleanup = createLiveCleanupStack();
  const prefix = createLiveRunPrefix(`pages-${provider.id}`);
  const actor = await createActor(prefix);
  const searchTerm = `${prefix}-needle`;
  const alpha = await createPublishedFixturePage({
    title: `${searchTerm} Alpha`,
    slug: `/${searchTerm}-alpha`,
    actorId: actor.id,
    cleanup,
  });
  const beta = await createPublishedFixturePage({
    title: `${searchTerm} Beta`,
    slug: `/${searchTerm}-beta`,
    actorId: actor.id,
    cleanup,
  });
  await createPublishedFixturePage({
    title: `${prefix} Unrelated`,
    slug: `/${prefix}-unrelated`,
    actorId: actor.id,
    cleanup,
  });

  try {
    const createSlug = `/${prefix}-created`;
    const createPlan = await planWithLiveProvider({
      provider,
      context: await buildPageContext(),
      prompt: [
        `Utworz jedna strone z tytulem "${prefix} Created"`,
        `slug "${createSlug}"`,
        `status "draft"`,
        `introTitle "${prefix} Created intro"`,
        `introBody "Live matrix body for ${prefix}"`,
      ].join(", "),
    });
    expect(
      createPlan.actions.map((action) => action.type),
      provider.id
    ).toContain("page.upsert");
    const createPreview = await dryRunLivePlan(createPlan);
    expect(createPreview.readyToExecute, provider.id).toBe(true);
    const createResult = await executeLivePlan({
      plan: createPlan,
      actorId: actor.id,
      idempotencyKey: `${prefix}-page-create`,
    });
    expectSuccessfulExecution(createResult);
    const createdPageId = createResult.results.find(
      (item) => item.type === "page.upsert"
    )?.resourceId;
    if (createdPageId) {
      cleanup.add(`page:${createdPageId}`, async () => {
        const { deletePage } = await loadPageService();
        await deletePage(createdPageId).catch(() => undefined);
      });
    }
    const { getPage, getPageBySlug } = await loadPageService();
    const created = await getPageBySlug(createSlug);
    expect(created?.title, provider.id).toBe(`${prefix} Created`);

    const searchPlan = await planWithLiveProvider({
      provider,
      context: await buildPageContext(),
      prompt: `Znajdz wszystkie opublikowane strony, ktore maja w tytule "${searchTerm}"`,
    });
    expect(searchPlan.responseKind, provider.id).toBe("inspection");
    const labels = searchPlan.inspection?.candidates.map((candidate) => candidate.label) ?? [];
    expect(labels, provider.id).toContain(`${searchTerm} Alpha`);
    expect(labels, provider.id).toContain(`${searchTerm} Beta`);
    expect(labels, provider.id).not.toContain(`${prefix} Unrelated`);

    const renamedTitle = `${searchTerm} Renamed Alpha`;
    const updatePlan = await planWithLiveProvider({
      provider,
      context: await buildPageContext(),
      prompt: `Zmien tytul strony "${alpha.title}" na "${renamedTitle}"`,
    });
    expect(
      updatePlan.actions.map((action) => action.type),
      provider.id
    ).toContain("page.update");
    const updatePreview = await dryRunLivePlan(updatePlan);
    expect(updatePreview.readyToExecute, provider.id).toBe(true);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: updatePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-page-update`,
      })
    );
    expect((await getPage(alpha.id))?.title, provider.id).toBe(renamedTitle);

    const broadDeletePlan = await planWithLiveProvider({
      provider,
      context: await buildPageContext(),
      prompt: "usun wszystkie strony",
    });
    expect(broadDeletePlan.status, provider.id).toBe("needs_input");
    expect(broadDeletePlan.actions, provider.id).toEqual([]);

    const deletePlan = await planWithLiveProvider({
      provider,
      context: await buildPageContext(),
      prompt: `Usun dokladnie dwie opublikowane strony, ktore maja w tytule "${searchTerm}"`,
    });
    expect(
      deletePlan.actions.map((action) => action.type),
      provider.id
    ).toEqual(["page.delete", "page.delete"]);
    const deletePreview = await dryRunLivePlan(deletePlan);
    expect(deletePreview.readyToExecute, provider.id).toBe(true);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: deletePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-page-delete`,
      })
    );
    await expectPageMissing(beta.slug);
    await expectPageMissing(alpha.slug);
  } finally {
    await cleanup.run();
  }
};

afterAll(async () => {
  await globalCleanup.run();
});

testIfLive(
  "assistant live providers handle pages create search update delete safety matrix",
  async () => {
    for (const provider of providers) {
      await runPagesMatrixForProvider(provider);
    }
  },
  180_000
);
