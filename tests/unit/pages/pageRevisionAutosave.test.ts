import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { pageRevisions, pages, users } from "../../../core/db/schema";
import { createPage, autosavePage } from "../../../core/services/pages/pageService";
import {
  discardAutosaveRevision,
  listRevisions,
  restoreRevision,
} from "../../../core/services/pages/revisionService";

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
          props: { text: "Landing copy", format: "plain", align: "left" },
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

testIfDb(
  "page settings autosave keeps only the latest snapshot and can be restored or discarded",
  async () => {
    const email = `page-autosave-${randomUUID()}@example.com`;
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash: "test", status: "active" })
      .returning();
    userId = user?.id;

    const page = await createPage({
      title: "Landing",
      slug: `/landing-${randomUUID()}`,
      data: buildPageData({ template: "landing", showInNav: true, revisionRetention: 10 }),
    });
    pageId = page.id;

    const first = await autosavePage(
      page.id,
      {
        title: "Landing draft one",
        slug: "/landing-draft-one",
        data: buildPageData({ template: "landing", showInNav: false, revisionRetention: 12 }),
      },
      userId!
    );
    expect(first.reusedRevision).toBe(false);
    expect(first.revision.kind).toBe("autosave");

    const second = await autosavePage(
      page.id,
      {
        title: "Landing draft two",
        slug: "/landing-draft-two",
        data: buildPageData({ template: "landing", showInNav: true, revisionRetention: 14 }),
      },
      userId!
    );
    expect(second.reusedRevision).toBe(false);
    expect(second.revision.version).toBe(2);

    const revisions = await listRevisions(page.id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.kind).toBe("autosave");
    expect(revisions[0]?.title).toBe("Landing draft two");
    expect(revisions[0]?.slug).toBe("/landing-draft-two");

    const restored = await restoreRevision(page.id, revisions[0]!.id);
    expect(restored.restored).toBe(true);
    expect(restored.page.title).toBe("Landing draft two");
    expect(restored.page.slug).toBe("/landing-draft-two");

    const discarded = await discardAutosaveRevision(page.id, revisions[0]!.id);
    expect(discarded.kind).toBe("autosave");
    const afterDiscard = await listRevisions(page.id);
    expect(afterDiscard).toHaveLength(0);

    await cleanup();
    pageId = undefined;
    userId = undefined;
  }
);
