import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../core/db/client";
import { pageRevisions, pages, users } from "../../../core/db/schema";
import { createPage } from "../../../core/services/pages/pageService";
import {
  createRevision,
  listRevisions,
  restoreRevision,
} from "../../../core/services/pages/revisionService";

// Pages are v2-only on write (`normalizePageDocumentV2ForWrite`) and revision
// snapshots normalize through `normalizeStoredPageDocumentV2ForRead` on read
// and restore; the fixture mirrors the minimal valid document used by the
// sibling autosave suite, with a per-snapshot text marker.
const buildPageData = (text = "Revision copy") => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: {
    template: "page-v2",
    showInNav: true,
  },
  sections: [
    {
      id: "sec_content",
      type: "content",
      name: "Content",
      variant: "default",
      layout: { columns: 1, align: "start", justify: "start", maxWidth: 960 },
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
          id: "blk_text",
          type: "text",
          props: { text, format: "plain", align: "left" },
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

let pageId: string | undefined;
let userId: string | undefined;

const cleanup = async () => {
  if (pageId) {
    await db.delete(pageRevisions).where(eq(pageRevisions.pageId, pageId));
    await db.delete(pages).where(eq(pages.id, pageId));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
};

afterAll(async () => {
  await cleanup();
});

testIfDb("creates and restores revisions", async () => {
  const email = `editor-${randomUUID()}@example.com`;
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: "test", status: "active" })
    .returning();
  userId = user?.id;

  const page = await createPage({
    title: "Page",
    slug: `page-${randomUUID()}`,
    data: buildPageData(),
  });
  pageId = page.id;

  const revision1 = await createRevision(page.id, buildPageData("Step one"), userId!);
  const revision2 = await createRevision(page.id, buildPageData("Step two"), userId!);

  expect(revision1?.version).toBe(1);
  expect(revision2?.version).toBe(2);

  const revisions = await listRevisions(page.id);
  expect(revisions.length).toBe(2);
  expect(revisions[0]?.kind).toBe("publish");

  await restoreRevision(page.id, revision1!.id);
  const [updated] = await db.select().from(pages).where(eq(pages.id, page.id));
  // Restore writes the normalized stored snapshot back as currentData; the
  // revision-1 marker proves which snapshot won.
  expect(updated?.currentData).toMatchObject({
    schemaVersion: 2,
    sections: [
      expect.objectContaining({
        blocks: [expect.objectContaining({ props: expect.objectContaining({ text: "Step one" }) })],
      }),
    ],
  });

  await cleanup();
  pageId = undefined;
  userId = undefined;
});
