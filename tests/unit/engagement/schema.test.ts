import { afterAll, beforeEach, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { menuItems, menus, popups, reviews } from "../../../core/db/schema";

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

const cleanup = async () => {
  if (!hasDb) return;
  await db.delete(menuItems);
  await db.delete(menus);
  await db.delete(popups);
  await db.delete(reviews);
};

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

testIfDb("menu_items stores mega-menu settings metadata", async () => {
  const [menu] = await db
    .insert(menus)
    .values({
      name: "Primary",
      location: "primary",
    })
    .returning();

  const settings = {
    badge: { label: "New", tone: "accent" },
    visibility: "logged_out",
    description: "Highlighted item",
    icon: "sparkles",
  };

  const [item] = await db
    .insert(menuItems)
    .values({
      menuId: menu.id,
      label: "Offer",
      href: "/offer",
      settings,
    })
    .returning();

  const [stored] = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.id, item.id));

  expect(stored?.settings).toEqual(settings);
});

testIfDb("popups slug must be unique", async () => {
  await db.insert(popups).values({
    name: "Welcome Promo",
    slug: "welcome-promo",
    status: "draft",
    trigger: { type: "time_delay", delaySeconds: 5 },
    targeting: { include: ["/"] },
    frequency: { strategy: "session_once" },
    content: { templateId: null },
    settings: {},
  });

  await expect(
    db
      .insert(popups)
      .values({
        name: "Welcome Promo Duplicate",
        slug: "welcome-promo",
        status: "draft",
        trigger: { type: "scroll_depth", percent: 60 },
        targeting: { include: ["/"] },
        frequency: { strategy: "daily_once" },
        content: { templateId: null },
        settings: {},
      })
      .execute()
  ).rejects.toThrow();
});

testIfDb("reviews table supports moderation lifecycle fields", async () => {
  const [created] = await db
    .insert(reviews)
    .values({
      entityType: "product",
      entityId: "product-1",
      status: "pending",
      rating: 5,
      title: "Great quality",
      body: "Everything matched the listing.",
      authorName: "Jane Doe",
      authorEmail: "jane@example.com",
      metadata: { source: "form" },
    })
    .returning();

  const now = new Date();
  await db
    .update(reviews)
    .set({
      status: "approved",
      moderatedAt: now,
      publishedAt: now,
    })
    .where(eq(reviews.id, created.id));

  const [stored] = await db.select().from(reviews).where(eq(reviews.id, created.id));
  expect(stored?.status).toBe("approved");
  expect(stored?.publishedAt).not.toBeNull();
});
