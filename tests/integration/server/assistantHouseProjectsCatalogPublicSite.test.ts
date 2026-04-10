import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { users } from "../../../core/db/schema";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import { executeAssistantActionPlan } from "../../../core/services/assistant/actionExecutorService";
import { createEntry, deleteEntry, getEntryBySlug, publishEntry } from "../../../core/services/content/entryService";
import { deleteContentType, getContentTypeBySlug } from "../../../core/services/content/typeService";
import { deleteCustomScreen, listCustomScreens } from "../../../core/services/customScreens/customScreenService";
import { deleteListingQuery, listListingQueries } from "../../../core/services/content/listingQueriesService";
import { deleteListingTemplate, listListingTemplates } from "../../../core/services/content/listingTemplatesService";
import { deletePage, getPageBySlug } from "../../../core/services/pages/pageService";
import { getSetting, setSetting, type ContentRouteSetting } from "../../../core/services/settings/settingsService";
import { startHttpServer } from "../../../core/server/httpServer";

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

let server: ReturnType<typeof Bun.serve> | null = null;
const createdUserIds = new Set<string>();
const createdEntryIds = new Set<string>();
const plansToCleanup: Array<{
  contentTypeSlug: string;
  listingQueryName: string;
  listingTemplateSlug: string;
  pageSlug: string;
}> = [];
let originalContentRoutes: ContentRouteSetting[] | null = null;

const stopServer = () => {
  if (!server) return;
  server.stop(true);
  server = null;
};

const clonePlanWithToken = (token: string) => {
  const plan = JSON.parse(
    JSON.stringify(buildHouseProjectsCatalogPlan())
  ) as ReturnType<typeof buildHouseProjectsCatalogPlan>;

  const contentTypeSlug = `house-projects-${token}`;
  const listingQueryName = `House Projects Catalog Query ${token}`;
  const listingTemplateSlug = `house-projects-catalog-grid-${token}`;
  const pageSlug = `/projekty-domow-${token}`;
  const listPath = `/_catalog/house-projects-${token}`;
  const detailPath = `${pageSlug}/:slug`;

  plan.id = `plan-house-projects-catalog-${token}`;
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
            name: `House Projects ${token}`,
            sidebarLabel: `House Projects ${token}`,
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
    listingQueryName,
    listingTemplateSlug,
    pageSlug,
  });

  return {
    plan,
    contentTypeSlug,
    pageSlug,
    listPath,
    detailPath,
  };
};

const createActor = async () => {
  const [created] = await db
    .insert(users)
    .values({
      email: `assistant-public-${randomUUID()}@nextless.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Public Runtime Actor",
      status: "active",
    })
    .returning();
  if (!created) throw new Error("actor_create_failed");
  createdUserIds.add(created.id);
  return created;
};

afterAll(async () => {
  stopServer();

  if (!hasDb) return;

  if (originalContentRoutes) {
    await setSetting("site.contentRoutes", originalContentRoutes);
  }

  for (const entryId of createdEntryIds) {
    await deleteEntry(entryId).catch(() => undefined);
  }
  createdEntryIds.clear();

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
  "executed house-projects plan renders public catalog page and entry detail route",
  async () => {
    originalContentRoutes =
      originalContentRoutes ??
      (((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? []);

    const token = randomUUID().slice(0, 8);
    const actor = await createActor();
  const { plan, contentTypeSlug, pageSlug, detailPath } = clonePlanWithToken(token);

    await executeAssistantActionPlan({
      plan,
      actorId: actor.id,
      idempotencyKey: `assistant-public-${token}-1`,
    });

    const contentType = await getContentTypeBySlug(contentTypeSlug);
    if (!contentType) throw new Error("missing_content_type");

    const entry = await createEntry(contentType.id, {
      title: `Projekt Domu ${token}`,
      slug: `projekt-domu-${token}`,
      data: {
        title: `Projekt Domu ${token}`,
        slug: `projekt-domu-${token}`,
        summary: `Nowoczesny projekt domu ${token}`,
        description: `Szczegoly projektu domu ${token}`,
        areaM2: 148,
        rooms: 5,
        bathrooms: 2,
        floors: 2,
        priceFrom: 790000,
        location: "Warsaw",
        projectStatus: "available",
      },
      authorId: actor.id,
    });
    createdEntryIds.add(entry.id);
    await publishEntry(entry.id, actor.id);

    server = startHttpServer({ port: 0 });
    const baseUrl = `http://127.0.0.1:${server.port}`;

    const catalogResponse = await fetch(`${baseUrl}${pageSlug}`);
    expect(catalogResponse.status).toBe(200);
    const catalogHtml = await catalogResponse.text();
    expect(catalogHtml).toContain('data-listing-widget="content-list"');
    expect(catalogHtml).toContain(`Projekt Domu ${token}`);
    expect(catalogHtml).not.toContain('data-template="content-list"');

    const detailUrl = detailPath.replace(":slug", `projekt-domu-${token}`);
    const detailResponse = await fetch(`${baseUrl}${detailUrl}`);
    expect(detailResponse.status).toBe(200);
    const detailHtml = await detailResponse.text();
    expect(detailHtml).toContain(`Projekt Domu ${token}`);
    expect(detailHtml).toContain(`Nowoczesny projekt domu ${token}`);

    const bySlug = await getEntryBySlug(contentType.id, `projekt-domu-${token}`);
    expect(bySlug?.id).toBe(entry.id);
  },
  { timeout: 20_000 }
);
