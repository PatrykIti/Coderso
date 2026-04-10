import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { users } from "../../../core/db/schema";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import { executeAssistantActionPlan } from "../../../core/services/assistant/actionExecutorService";
import { deleteContentType, getContentTypeBySlug } from "../../../core/services/content/typeService";
import { deleteCustomScreen, listCustomScreens } from "../../../core/services/customScreens/customScreenService";
import { deleteListingQuery, listListingQueries } from "../../../core/services/content/listingQueriesService";
import { deleteListingTemplate, listListingTemplates } from "../../../core/services/content/listingTemplatesService";
import { deletePage, getPageBySlug } from "../../../core/services/pages/pageService";
import { getSetting, setSetting, type ContentRouteSetting } from "../../../core/services/settings/settingsService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const createdUserIds = new Set<string>();
const plansToCleanup: Array<{
  contentTypeSlug: string;
  customScreenName: string;
  listingQueryName: string;
  listingTemplateSlug: string;
  pageSlug: string;
}> = [];
let originalContentRoutes: ContentRouteSetting[] | null = null;

const clonePlanWithToken = (token: string) => {
  const plan = JSON.parse(
    JSON.stringify(buildHouseProjectsCatalogPlan())
  ) as ReturnType<typeof buildHouseProjectsCatalogPlan>;

  const contentTypeSlug = `house-projects-${token}`;
  const listingQueryName = `House Projects Catalog Query ${token}`;
  const listingTemplateSlug = `house-projects-catalog-grid-${token}`;
  const customScreenName = `House Projects ${token}`;
  const pageSlug = `/projekty-domow-${token}`;
  const listPath = `/_catalog/house-projects-${token}`;
  const detailPath = `${pageSlug}/:slug`;

  plan.id = `plan-house-projects-catalog-${token}`;
  plan.title = `House Projects Catalog ${token}`;

  plan.actions = plan.actions.map((action) => {
    switch (action.type) {
      case "setting.content-route.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            typeSlug: contentTypeSlug,
            listPath,
            detailPath,
          },
        };
      case "content-type.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            slug: contentTypeSlug,
            name: `House Projects ${token}`,
          },
        };
      case "custom-screen.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            name: customScreenName,
            sidebarLabel: customScreenName,
            contentTypeSlug,
          },
        };
      case "listing-query.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            name: listingQueryName,
            description: `Published house projects used by the public catalog page (${token}).`,
            contentTypeSlug,
          },
        };
      case "listing-template.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            name: `House Projects Catalog Grid ${token}`,
            slug: listingTemplateSlug,
          },
        };
      case "page.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            title: `Katalog Projektów Domów ${token}`,
            slug: pageSlug,
            listingQueryName,
            listingTemplateSlug,
            introTitle: `Katalog Projektów Domów ${token}`,
          },
        };
    }
  });

  plansToCleanup.push({
    contentTypeSlug,
    customScreenName,
    listingQueryName,
    listingTemplateSlug,
    pageSlug,
  });

  return {
    plan,
    contentTypeSlug,
    customScreenName,
    listingQueryName,
    listingTemplateSlug,
    pageSlug,
  };
};

const createActor = async () => {
  const [created] = await db
    .insert(users)
    .values({
      email: `assistant-action-${randomUUID()}@nextless.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Action DB Actor",
      status: "active",
    })
    .returning();
  if (!created) throw new Error("actor_create_failed");
  createdUserIds.add(created.id);
  return created;
};

afterAll(async () => {
  if (!hasDb) return;

  if (originalContentRoutes) {
    await setSetting("site.contentRoutes", originalContentRoutes);
  }

  for (const plan of plansToCleanup.reverse()) {
    const page = await getPageBySlug(plan.pageSlug);
    if (page) {
      await deletePage(page.id).catch(() => undefined);
    }

    const templates = await listListingTemplates();
    const template = templates.find((entry) => entry.slug === plan.listingTemplateSlug);
    if (template) {
      await deleteListingTemplate(template.id).catch(() => undefined);
    }

    const queries = await listListingQueries();
    const query = queries.find((entry) => entry.name === plan.listingQueryName);
    if (query) {
      await deleteListingQuery(query.id).catch(() => undefined);
    }

    const contentType = await getContentTypeBySlug(plan.contentTypeSlug);
    if (contentType) {
      const screens = await listCustomScreens();
      for (const screen of screens.filter((entry) => entry.contentTypeId === contentType.id)) {
        await deleteCustomScreen(screen.id).catch(() => undefined);
      }
      await deleteContentType(contentType.id).catch(() => undefined);
    }
  }

  for (const userId of createdUserIds) {
    await db.delete(users).where(eq(users.id, userId)).catch(() => undefined);
  }
  createdUserIds.clear();
});

testIfDb(
  "executeAssistantActionPlan persists resources and reruns without duplicates",
  async () => {
    originalContentRoutes =
      originalContentRoutes ??
      (((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? []);

    const token = randomUUID().slice(0, 8);
    const actor = await createActor();
    const {
      plan,
      contentTypeSlug,
      customScreenName,
      listingQueryName,
      listingTemplateSlug,
      pageSlug,
    } = clonePlanWithToken(token);

    const first = await executeAssistantActionPlan({
      plan,
      actorId: actor.id,
      idempotencyKey: `assistant-action-${token}-1`,
    });

    expect(first.summary.failed).toBe(0);
    expect(first.summary.create).toBeGreaterThan(0);

    const contentType = await getContentTypeBySlug(contentTypeSlug);
    expect(contentType?.slug).toBe(contentTypeSlug);

    const screens = await listCustomScreens();
    const customScreen = screens.find((entry) => entry.name === customScreenName);
    expect(customScreen?.showInSidebar).toBe(true);

    const queries = await listListingQueries();
    expect(queries.filter((entry) => entry.name === listingQueryName)).toHaveLength(1);

    const templates = await listListingTemplates();
    expect(templates.filter((entry) => entry.slug === listingTemplateSlug)).toHaveLength(1);

    const page = await getPageBySlug(pageSlug);
    expect(page?.status).toBe("published");

    const contentRoutes =
      ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
    expect(contentRoutes.some((route) => route.type === contentTypeSlug)).toBe(true);

    const second = await executeAssistantActionPlan({
      plan,
      actorId: actor.id,
      idempotencyKey: `assistant-action-${token}-2`,
    });

    expect(second.summary.failed).toBe(0);
    expect(second.summary.create).toBe(0);

    const queriesAfterSecond = await listListingQueries();
    const templatesAfterSecond = await listListingTemplates();
    const screensAfterSecond = await listCustomScreens();

    expect(queriesAfterSecond.filter((entry) => entry.name === listingQueryName)).toHaveLength(
      1
    );
    expect(
      templatesAfterSecond.filter((entry) => entry.slug === listingTemplateSlug)
    ).toHaveLength(1);
    expect(screensAfterSecond.filter((entry) => entry.name === customScreenName)).toHaveLength(
      1
    );

    const replay = await executeAssistantActionPlan({
      plan,
      actorId: actor.id,
      idempotencyKey: `assistant-action-${token}-2`,
    });

    expect(replay.summary).toEqual(second.summary);
    expect(replay.results).toEqual(second.results);
  },
  { timeout: 20_000 }
);
