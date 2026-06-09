import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { pageRevisions, pages, users } from "../../../core/db/schema";
import {
  createPage,
  deletePage,
  duplicatePage,
  getPageBySlug,
  listPublishedPagesForNavigation,
  publishPage,
  unpublishPage,
  updatePage,
} from "../../../core/services/pages/pageService";
import { listRevisions } from "../../../core/services/pages/revisionService";

const buildPageData = (settings: Record<string, unknown> = {}) => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: {
    template: "page-v2",
    showInNav: true,
    ...settings,
  },
  sections: [
    {
      id: "sec_hero",
      type: "hero",
      name: "Hero",
      variant: "split",
      layout: { columns: 2, align: "center", justify: "between", maxWidth: 1080 },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "sm",
      },
      spacing: {
        paddingTop: 72,
        paddingBottom: 72,
        paddingLeft: 40,
        paddingRight: 40,
        gap: 32,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: "hero",
        startsAt: null,
        endsAt: null,
      },
      responsive: {},
      blocks: [
        {
          id: "blk_heading",
          type: "heading",
          props: { text: "Home", level: "h1", align: "left" },
          visibility: { visible: true },
        },
      ],
    },
  ],
});

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

const cleanup = async (pageId?: string, userId?: string) => {
  if (pageId) {
    await db.delete(pageRevisions).where(eq(pageRevisions.pageId, pageId));
    await db.delete(pages).where(eq(pages.id, pageId));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
};

let createdPageId: string | undefined;
let createdUserId: string | undefined;

beforeAll(async () => {
  if (!hasDb) return;

  const email = `admin-${randomUUID()}@example.com`;
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: "test",
      status: "active",
    })
    .returning();

  createdUserId = user?.id;
});

afterAll(async () => {
  await cleanup(createdPageId, createdUserId);
});

testIfDb("create/update/publish/unpublish page", async () => {
  if (!createdUserId) throw new Error("missing_test_user");

  const slug = `page-${randomUUID()}`;
  const page = await createPage({
    title: "Home",
    slug,
    data: buildPageData({
      collectionLink: {
        contentTypeId: "content-type-1",
        pageRole: "canonical-list-page",
        listingQueryId: "query-1",
        listingTemplateId: "template-1",
      },
    }),
  });

  createdPageId = page.id;
  expect(page.currentData).toMatchObject({
    schemaVersion: 2,
    sections: [expect.objectContaining({ id: "sec_hero", type: "hero" })],
  });
  expect(
    (page.currentData as { settings?: { collectionLink?: Record<string, unknown> } }).settings
      ?.collectionLink
  ).toEqual({
    contentTypeId: "content-type-1",
    pageRole: "canonical-list-page",
    listingQueryId: "query-1",
    listingTemplateId: "template-1",
  });

  const updated = await updatePage(page.id, {
    title: "Home Updated",
    data: buildPageData({
      collectionLink: {
        contentTypeId: "content-type-1",
        pageRole: "canonical-list-page",
        listingQueryId: "query-2",
        listingTemplateId: "template-2",
      },
    }),
  });
  expect(updated?.title).toBe("Home Updated");
  expect(
    (
      updated?.currentData as {
        settings?: { collectionLink?: Record<string, unknown> };
      }
    )?.settings?.collectionLink
  ).toEqual({
    contentTypeId: "content-type-1",
    pageRole: "canonical-list-page",
    listingQueryId: "query-2",
    listingTemplateId: "template-2",
  });

  const published = await publishPage(page.id, createdUserId, {
    ...buildPageData({
      collectionLink: {
        contentTypeId: "content-type-1",
        pageRole: "canonical-list-page",
        listingQueryId: "query-2",
        listingTemplateId: "template-2",
      },
    }),
  });
  expect(published?.status).toBe("published");
  expect(published?.publishedData).toMatchObject({ schemaVersion: 2 });
  expect(JSON.stringify(published?.publishedData)).not.toContain("editor");
  expect(
    (
      published?.publishedData as {
        settings?: { collectionLink?: Record<string, unknown> };
      }
    )?.settings?.collectionLink
  ).toEqual({
    contentTypeId: "content-type-1",
    pageRole: "canonical-list-page",
    listingQueryId: "query-2",
    listingTemplateId: "template-2",
  });

  const revisions = await listRevisions(page.id);
  expect(revisions.length).toBe(1);
  expect(revisions[0]?.kind).toBe("publish");
  expect(revisions[0]?.title).toBe("Home Updated");

  const clone = await duplicatePage(page.id, createdUserId);
  expect(clone?.id).not.toBe(page.id);
  expect(clone?.slug).not.toBe(page.slug);
  expect(clone?.title).toContain("copy");
  await cleanup(clone?.id, undefined);

  const draft = await unpublishPage(page.id);
  expect(draft?.status).toBe("draft");

  await cleanup(page.id, createdUserId);
  createdPageId = undefined;
  createdUserId = undefined;
});

testIfDb(
  "navigation summaries reset legacy published page rows before reading showInNav",
  async () => {
    const slug = `legacy-nav-${randomUUID()}`;
    const page = await createPage({
      title: "Legacy Nav",
      slug,
      data: buildPageData(),
    });
    createdPageId = page.id;
    await db
      .update(pages)
      .set({
        status: "published",
        publishedData: {
          blocks: [],
          settings: {
            showInNav: false,
          },
        },
      })
      .where(eq(pages.id, page.id));

    const summaries = await listPublishedPagesForNavigation();
    const summary = summaries.find((entry) => entry.id === page.id);

    expect(summary).toMatchObject({
      id: page.id,
      slug: `/${slug}`,
      showInNav: true,
    });
  }
);

testIfDb("publish respects revision retention", async () => {
  const email = `editor-${randomUUID()}@example.com`;
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: "test", status: "active" })
    .returning();
  const userId = user?.id;
  if (!userId) throw new Error("missing_test_user");

  const slug = `retain-${randomUUID()}`;
  const page = await createPage({
    title: "Retention",
    slug,
    data: buildPageData({ revisionRetention: 2 }),
  });

  const payload = buildPageData({ revisionRetention: 2 });

  await publishPage(page.id, userId!, payload);
  await publishPage(page.id, userId!, payload);
  await publishPage(page.id, userId!, payload);

  const revisions = await listRevisions(page.id);
  expect(revisions.length).toBe(2);
  expect(revisions[0]?.version).toBe(3);
  expect(revisions[1]?.version).toBe(2);

  await cleanup(page.id, userId);
});

testIfDb("delete page removes it", async () => {
  const page = await createPage({
    title: "Delete Me",
    slug: `delete-${randomUUID()}`,
    data: buildPageData(),
  });

  const deleted = await deletePage(page.id);
  expect(deleted?.id).toBe(page.id);

  const [row] = await db.select().from(pages).where(eq(pages.id, page.id));
  expect(row).toBeUndefined();
});

testIfDb("getPageBySlug resolves normalized and legacy slug variants", async () => {
  const plainSlug = `lookup-${randomUUID()}`;
  const legacySlug = `/legacy-${randomUUID()}`;
  const plainPage = await createPage({
    title: "Plain Lookup",
    slug: plainSlug,
    data: buildPageData(),
  });
  const legacyPage = await createPage({
    title: "Legacy Lookup",
    slug: legacySlug,
    data: buildPageData(),
  });

  try {
    expect((await getPageBySlug(`/${plainSlug}`))?.id).toBe(plainPage.id);
    expect((await getPageBySlug(legacySlug.slice(1)))?.id).toBe(legacyPage.id);
  } finally {
    await cleanup(plainPage.id, undefined);
    await cleanup(legacyPage.id, undefined);
  }
});
